import express from 'express';
import cookieParser from 'cookie-parser';
import { initDatabase, getPublicEvents, getDb } from './db.js';
import { randomBytes, scryptSync } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Session store (in-memory)
const sessions = new Map<string, { userId: number, role: string }>();

// Initialize database
initDatabase();

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(express.static(join(__dirname, 'dist')));

// Auth middleware
function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = req.cookies.session;
  if (!token || !sessions.has(token)) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  (req as any).user = sessions.get(token);
  next();
}

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = req.cookies.session;
  if (!token || !sessions.has(token)) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const user = sessions.get(token);
  if (user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  (req as any).user = user;
  next();
}

// API routes
app.get('/api/public/events', (req, res) => {
  try {
    const events = getPublicEvents();
    res.json(events);
  } catch (error) {
    console.error('Error fetching public events:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Auth routes
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    const user = stmt.get(email) as any;
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const [salt, hash] = user.password_hash.split(':');
    const testHash = scryptSync(password, salt, 64).toString('hex');
    
    if (testHash !== hash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = randomBytes(32).toString('hex');
    sessions.set(token, { userId: user.id, role: user.role });
    
    res.cookie('session', token, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 });
    res.json({ 
      user: { 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        role: user.role 
      } 
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  const token = req.cookies.session;
  if (token) {
    sessions.delete(token);
  }
  res.clearCookie('session');
  res.json({ message: 'Logged out' });
});

app.get('/api/auth/me', (req, res) => {
  const token = req.cookies.session;
  if (!token || !sessions.has(token)) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const session = sessions.get(token)!;
  const db = getDb();
  const stmt = db.prepare('SELECT id, name, email, role FROM users WHERE id = ?');
  const user = stmt.get(session.userId);
  res.json({ user });
});

app.post('/api/auth/forgot-password', (req, res) => {
  try {
    const { email } = req.body;
    const db = getDb();
    const stmt = db.prepare('SELECT id FROM users WHERE email = ?');
    const user = stmt.get(email) as any;
    
    if (!user) {
      return res.json({ message: 'Password reset token generated' });
    }
    
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000).toISOString();
    
    const insertStmt = db.prepare('INSERT INTO password_reset_tokens (token, user_id, expires_at) VALUES (?, ?, ?)');
    insertStmt.run(token, user.id, expiresAt);
    
    res.json({ message: 'Password reset token generated', token });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/reset-password', (req, res) => {
  try {
    const { token, newPassword } = req.body;
    const db = getDb();
    
    const stmt = db.prepare('SELECT * FROM password_reset_tokens WHERE token = ? AND used = 0');
    const resetToken = stmt.get(token) as any;
    
    if (!resetToken) {
      return res.status(400).json({ error: 'Invalid token' });
    }
    
    if (new Date(resetToken.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Token expired' });
    }
    
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(newPassword, salt, 64).toString('hex');
    const passwordHash = salt + ':' + hash;
    
    const updateUser = db.prepare('UPDATE users SET password_hash = ? WHERE id = ?');
    updateUser.run(passwordHash, resetToken.user_id);
    
    const updateToken = db.prepare('UPDATE password_reset_tokens SET used = 1 WHERE id = ?');
    updateToken.run(resetToken.id);
    
    res.json({ message: 'Password updated' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin routes
app.post('/api/admin/users', requireAdmin, (req, res) => {
  try {
    const { name, email, password, role, course_id } = req.body;
    const db = getDb();
    
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(password, salt, 64).toString('hex');
    const passwordHash = salt + ':' + hash;
    
    const stmt = db.prepare('INSERT INTO users (name, email, password_hash, role, course_id) VALUES (?, ?, ?, ?, ?)');
    const result = stmt.run(name, email, passwordHash, role || 'SOLICITANTE', course_id || null);
    
    res.status(201).json({ 
      user: { 
        id: result.lastInsertRowid, 
        name, 
        email, 
        role: role || 'SOLICITANTE' 
      } 
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Event request routes
function checkConflict(db: any, locationId: number, eventDate: string, startTime: string, endTime: string, excludeId?: number) {
  let query = `
    SELECT COUNT(*) as count FROM events 
    WHERE location_id = ? 
      AND event_date = ? 
      AND status = 'APROVADO'
      AND start_time < ? 
      AND end_time > ?
  `;
  const params: any[] = [locationId, eventDate, endTime, startTime];
  if (excludeId) {
    query += ' AND id != ?';
    params.push(excludeId);
  }
  const stmt = db.prepare(query);
  const result = stmt.get(...params) as any;
  return result.count > 0;
}

app.get('/api/events', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const user = (req as any).user;
    let query = 'SELECT * FROM events';
    const params: any[] = [];
    
    if (user.role === 'SOLICITANTE') {
      query += ' WHERE user_id = ?';
      params.push(user.userId);
    }
    query += ' ORDER BY created_at DESC';
    
    const stmt = db.prepare(query);
    const events = stmt.all(...params);
    res.json(events);
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/events', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const user = (req as any).user;
    const data = req.body;

    // Clients may only create drafts or submit for approval; APROVADO,
    // REJEITADO and CANCELADO are reached exclusively through admin routes
    const status = data.status === 'AGUARDANDO_APROVACAO' ? 'AGUARDANDO_APROVACAO' : 'RASCUNHO';

    if (!data.title || !data.event_date || !data.start_time || !data.end_time || !data.location_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (data.start_time >= data.end_time) {
      return res.status(400).json({ error: 'End time must be after start time' });
    }
    if (status === 'AGUARDANDO_APROVACAO') {
      if (!data.requester_name) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      if (checkConflict(db, data.location_id, data.event_date, data.start_time, data.end_time)) {
        return res.status(409).json({ error: 'Schedule conflict detected' });
      }
    }

    // Get cost center from course
    let costCenter = null;
    if (data.course_id) {
      const courseStmt = db.prepare('SELECT name FROM courses WHERE id = ?');
      const course = courseStmt.get(data.course_id) as any;
      if (course) costCenter = course.name;
    }
    
    const stmt = db.prepare(`
      INSERT INTO events (
        title, theme_id, course_id, event_date, start_time, end_time,
        location_id, speaker, realization, requester_name, target_audience,
        justification, objective, needs_ceremonial, needs_certificates,
        observations, cost_center, status, user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      data.title,
      data.theme_id || null,
      data.course_id || null,
      data.event_date,
      data.start_time,
      data.end_time,
      data.location_id,
      data.speaker || null,
      data.realization || costCenter || '',
      data.requester_name,
      data.target_audience || null,
      data.justification || null,
      data.objective || null,
      data.needs_ceremonial ? 1 : 0,
      data.needs_certificates ? 1 : 0,
      data.observations || null,
      costCenter,
      status,
      user.userId
    );
    
    // Add resources
    if (data.resource_ids && Array.isArray(data.resource_ids)) {
      const resStmt = db.prepare('INSERT INTO event_resources (event_id, resource_id) VALUES (?, ?)');
      for (const rid of data.resource_ids) {
        resStmt.run(result.lastInsertRowid, rid);
      }
    }
    
    res.status(201).json({ id: result.lastInsertRowid });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/events/:id/submit', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const user = (req as any).user;
    const eventId = req.params.id;
    
    const eventStmt = db.prepare('SELECT * FROM events WHERE id = ?');
    const event = eventStmt.get(eventId) as any;
    
    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (user.role === 'SOLICITANTE' && event.user_id !== user.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (event.status !== 'RASCUNHO' && event.status !== 'REJEITADO') {
      return res.status(400).json({ error: 'Cannot submit this event' });
    }
    
    // Check conflicts
    if (checkConflict(db, event.location_id, event.event_date, event.start_time, event.end_time, eventId)) {
      return res.status(409).json({ error: 'Schedule conflict detected' });
    }
    
    const updateStmt = db.prepare("UPDATE events SET status = 'AGUARDANDO_APROVACAO', updated_at = datetime('now') WHERE id = ?");
    updateStmt.run(eventId);
    
    res.json({ message: 'Submitted for approval' });
  } catch (error) {
    console.error('Submit event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/events/:id/approve', requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const eventId = req.params.id;
    
    const eventStmt = db.prepare('SELECT * FROM events WHERE id = ?');
    const event = eventStmt.get(eventId) as any;
    
    if (!event) return res.status(404).json({ error: 'Event not found' });
    
    // Check conflicts again on approval
    if (checkConflict(db, event.location_id, event.event_date, event.start_time, event.end_time, eventId)) {
      return res.status(409).json({ error: 'Schedule conflict detected' });
    }
    
    const updateStmt = db.prepare("UPDATE events SET status = 'APROVADO', updated_at = datetime('now') WHERE id = ?");
    updateStmt.run(eventId);
    
    res.json({ message: 'Event approved' });
  } catch (error) {
    console.error('Approve event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/events/:id/reject', requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const eventId = req.params.id;
    const rejection_reason = typeof req.body.rejection_reason === 'string' ? req.body.rejection_reason.trim() : '';

    if (!rejection_reason) {
      return res.status(400).json({ error: 'Rejection reason required' });
    }

    const eventStmt = db.prepare('SELECT * FROM events WHERE id = ?');
    const event = eventStmt.get(eventId) as any;

    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (event.status !== 'AGUARDANDO_APROVACAO') {
      return res.status(400).json({ error: 'Only events awaiting approval can be rejected' });
    }

    const updateStmt = db.prepare("UPDATE events SET status = 'REJEITADO', rejection_reason = ?, updated_at = datetime('now') WHERE id = ?");
    updateStmt.run(rejection_reason, eventId);
    
    res.json({ message: 'Event rejected' });
  } catch (error) {
    console.error('Reject event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/events/:id', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const user = (req as any).user;
    const eventId = req.params.id;
    
    const eventStmt = db.prepare('SELECT * FROM events WHERE id = ?');
    const event = eventStmt.get(eventId) as any;
    
    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (user.role === 'SOLICITANTE' && event.user_id !== user.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (event.status !== 'RASCUNHO') {
      return res.status(400).json({ error: 'Only drafts can be deleted' });
    }
    
    const deleteStmt = db.prepare('DELETE FROM events WHERE id = ?');
    deleteStmt.run(eventId);
    
    res.json({ message: 'Event deleted' });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/meta/courses', (req, res) => {
  try {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM courses');
    res.json(stmt.all());
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/meta/locations', (req, res) => {
  try {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM locations');
    res.json(stmt.all());
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/meta/resources', (req, res) => {
  try {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM resources');
    res.json(stmt.all());
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/meta/themes', (req, res) => {
  try {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM themes');
    res.json(stmt.all());
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Serve frontend for all other routes
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
