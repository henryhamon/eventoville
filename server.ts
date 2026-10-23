import express from 'express';
import cookieParser from 'cookie-parser';
import { initDatabase, getPublicEvents, getDb, hashPassword } from './db.js';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

type SessionUser = { userId: number, role: string, name: string };

// Initialize database
initDatabase();

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(express.static(join(__dirname, 'dist')));

// Sessions are persisted in SQLite so they survive server restarts
function createSession(userId: number) {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  getDb().prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(token, userId, expiresAt);
  return token;
}

function getSession(token: string | undefined): SessionUser | null {
  if (!token) return null;
  const row = getDb().prepare(`
    SELECT u.id, u.role, u.name, s.expires_at FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token = ?
  `).get(token) as any;
  if (!row) return null;
  if (new Date(row.expires_at) < new Date()) {
    getDb().prepare('DELETE FROM sessions WHERE token = ?').run(token);
    return null;
  }
  return { userId: row.id, role: row.role, name: row.name };
}

// Auth middleware
function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const user = getSession(req.cookies.session);
  if (!user) {
    return res.status(401).json({ error: 'Não autenticado' });
  }
  (req as any).user = user;
  next();
}

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const user = getSession(req.cookies.session);
  if (!user) {
    return res.status(401).json({ error: 'Não autenticado' });
  }
  if (user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Sem permissão' });
  }
  (req as any).user = user;
  next();
}

function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(':');
  const testHash = scryptSync(password, salt, 64);
  return timingSafeEqual(testHash, Buffer.from(hash, 'hex'));
}

// API routes
app.get('/api/public/events', (req, res) => {
  try {
    const events = getPublicEvents();
    res.json(events);
  } catch (error) {
    console.error('Error fetching public events:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Auth routes
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Informe e-mail e senha' });
    }
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    const user = stmt.get(String(email).trim().toLowerCase()) as any;

    if (!user || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: 'E-mail ou senha inválidos' });
    }

    const token = createSession(user.id);
    res.cookie('session', token, { httpOnly: true, sameSite: 'lax', maxAge: SESSION_TTL_MS });
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
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  const token = req.cookies.session;
  if (token) {
    getDb().prepare('DELETE FROM sessions WHERE token = ?').run(token);
  }
  res.clearCookie('session');
  res.json({ message: 'Sessão encerrada' });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  const session = (req as any).user as SessionUser;
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
    res.status(500).json({ error: 'Erro interno do servidor' });
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

    const updateUser = db.prepare('UPDATE users SET password_hash = ? WHERE id = ?');
    updateUser.run(hashPassword(newPassword), resetToken.user_id);

    const updateToken = db.prepare('UPDATE password_reset_tokens SET used = 1 WHERE id = ?');
    updateToken.run(resetToken.id);

    res.json({ message: 'Password updated' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Event request routes
const EDITABLE_FIELDS = [
  'title', 'theme_id', 'course_id', 'event_date', 'start_time', 'end_time', 'location_id',
  'speaker', 'target_audience', 'justification', 'objective', 'requester_name',
  'needs_ceremonial', 'needs_certificates', 'observations',
] as const;

const REQUIRED_FOR_SUBMIT: [string, string][] = [
  ['title', 'Nome do Evento'],
  ['theme_id', 'Tema'],
  ['course_id', 'Curso/Coordenação'],
  ['event_date', 'Data'],
  ['start_time', 'Hora de Início'],
  ['end_time', 'Hora de Fim'],
  ['location_id', 'Local'],
  ['requester_name', 'Nome do Solicitante'],
  ['target_audience', 'Público-alvo'],
  ['justification', 'Justificativa'],
  ['objective', 'Objetivo'],
];

class HttpError extends Error {
  constructor(public status: number, message: string, public extra: Record<string, unknown> = {}) {
    super(message);
  }
}

function sendError(res: express.Response, error: unknown, context: string) {
  if (error instanceof HttpError) {
    return res.status(error.status).json({ error: error.message, ...error.extra });
  }
  console.error(`${context} error:`, error);
  res.status(500).json({ error: 'Erro interno do servidor' });
}

// Returns the approved event that overlaps the given slot, if any
function checkConflict(db: any, locationId: number, eventDate: string, startTime: string, endTime: string, excludeId?: number) {
  let query = `
    SELECT id, title, start_time, end_time FROM events
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
  return (stmt.get(...params) as any) ?? null;
}

// Full validation applied whenever an event enters or stays in the approval flow
function validateForApproval(db: any, event: any, excludeId?: number) {
  const missing = REQUIRED_FOR_SUBMIT.filter(([key]) => !event[key]).map(([, label]) => label);
  if (missing.length) {
    throw new HttpError(400, `Preencha os campos obrigatórios: ${missing.join(', ')}`, { missing });
  }
  if (event.start_time >= event.end_time) {
    throw new HttpError(400, 'A hora de fim deve ser posterior à hora de início');
  }
  const conflict = checkConflict(db, event.location_id, event.event_date, event.start_time, event.end_time, excludeId);
  if (conflict) {
    throw new HttpError(409, `Conflito de agenda com "${conflict.title}" (${conflict.start_time}–${conflict.end_time}) neste local`, { conflict });
  }
}

function pickFields(body: any) {
  const data: Record<string, any> = {};
  for (const key of EDITABLE_FIELDS) {
    const value = body[key];
    if (key === 'needs_ceremonial' || key === 'needs_certificates') {
      data[key] = value ? 1 : 0;
    } else if (typeof value === 'string') {
      data[key] = value.trim() || null;
    } else {
      data[key] = value ?? null;
    }
  }
  if (!data.title) throw new HttpError(400, 'Informe o nome do evento');
  if (data.start_time && data.end_time && data.start_time >= data.end_time) {
    throw new HttpError(400, 'A hora de fim deve ser posterior à hora de início');
  }
  return data;
}

// Course defines cost center and realization (organizer)
function deriveCourseFields(db: any, courseId: number | null) {
  if (!courseId) return { cost_center: null, realization: '' };
  const course = db.prepare('SELECT name, cost_center FROM courses WHERE id = ?').get(courseId) as any;
  if (!course) throw new HttpError(400, 'Curso/Coordenação inválido');
  return { cost_center: course.cost_center, realization: course.name };
}

function validateResources(db: any, locationId: number | null, resourceIds: unknown) {
  if (!Array.isArray(resourceIds) || resourceIds.length === 0) return [];
  if (!locationId) throw new HttpError(400, 'Selecione um local antes de escolher recursos');
  const allowed = new Set(
    (db.prepare('SELECT resource_id FROM location_resources WHERE location_id = ?').all(locationId) as any[]).map(r => r.resource_id)
  );
  const ids = resourceIds.map(Number);
  const invalid = ids.filter(id => !allowed.has(id));
  if (invalid.length) throw new HttpError(400, 'Há recursos que não estão disponíveis no local selecionado');
  return ids;
}

function saveResources(db: any, eventId: number, resourceIds: number[]) {
  db.prepare('DELETE FROM event_resources WHERE event_id = ?').run(eventId);
  const resStmt = db.prepare('INSERT INTO event_resources (event_id, resource_id) VALUES (?, ?)');
  for (const rid of resourceIds) resStmt.run(eventId, rid);
}

function logAudit(db: any, eventId: number, userId: number, action: string, fromStatus: string | null, toStatus: string | null, comment: string | null = null) {
  db.prepare('INSERT INTO event_audit (event_id, user_id, action, from_status, to_status, comment) VALUES (?, ?, ?, ?, ?, ?)')
    .run(eventId, userId, action, fromStatus, toStatus, comment);
}

function setStatus(db: any, eventId: number, status: string, rejectionReason: string | null = null) {
  db.prepare("UPDATE events SET status = ?, rejection_reason = ?, updated_at = datetime('now') WHERE id = ?")
    .run(status, rejectionReason, eventId);
}

function loadEvent(db: any, id: string, user: SessionUser) {
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(id) as any;
  if (!event) throw new HttpError(404, 'Solicitação não encontrada');
  if (user.role !== 'ADMIN' && event.user_id !== user.userId) {
    throw new HttpError(403, 'Sem permissão para esta solicitação');
  }
  return event;
}

// Who may edit an event in each state (data-model.md)
function canEdit(user: SessionUser, event: any) {
  if (user.role === 'ADMIN') return ['AGUARDANDO_APROVACAO', 'APROVADO'].includes(event.status);
  return ['RASCUNHO', 'REJEITADO', 'AGUARDANDO_APROVACAO'].includes(event.status);
}

const EVENT_LIST_SELECT = `
  SELECT e.*, t.name as theme_name, c.name as course_name, l.name as location_name, u.name as author_name
  FROM events e
  LEFT JOIN themes t ON e.theme_id = t.id
  LEFT JOIN courses c ON e.course_id = c.id
  LEFT JOIN locations l ON e.location_id = l.id
  LEFT JOIN users u ON e.user_id = u.id
`;

app.get('/api/events', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const user = (req as any).user as SessionUser;
    const where: string[] = [];
    const params: any[] = [];

    if (user.role !== 'ADMIN') {
      where.push('e.user_id = ?');
      params.push(user.userId);
    }
    if (typeof req.query.status === 'string' && req.query.status) {
      where.push('e.status = ?');
      params.push(req.query.status);
    }
    const query = EVENT_LIST_SELECT + (where.length ? ` WHERE ${where.join(' AND ')}` : '') +
      ' ORDER BY e.updated_at DESC, e.id DESC';

    res.json(db.prepare(query).all(...params));
  } catch (error) {
    sendError(res, error, 'Get events');
  }
});

app.get('/api/events/counts', requireAdmin, (req, res) => {
  try {
    const rows = getDb().prepare('SELECT status, COUNT(*) as count FROM events GROUP BY status').all() as any[];
    const counts: Record<string, number> = { RASCUNHO: 0, AGUARDANDO_APROVACAO: 0, REJEITADO: 0, APROVADO: 0, CANCELADO: 0 };
    for (const row of rows) counts[row.status] = row.count;
    res.json(counts);
  } catch (error) {
    sendError(res, error, 'Event counts');
  }
});

app.get('/api/events/:id', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const user = (req as any).user as SessionUser;
    loadEvent(db, req.params.id, user);

    const event = db.prepare(EVENT_LIST_SELECT + ' WHERE e.id = ?').get(req.params.id) as any;
    event.resource_ids = (db.prepare('SELECT resource_id FROM event_resources WHERE event_id = ?').all(event.id) as any[])
      .map(r => r.resource_id);
    event.audit = db.prepare(`
      SELECT a.action, a.from_status, a.to_status, a.comment, a.created_at, u.name as user_name
      FROM event_audit a JOIN users u ON u.id = a.user_id
      WHERE a.event_id = ? ORDER BY a.id ASC
    `).all(event.id);
    event.can_edit = canEdit(user, event);

    res.json(event);
  } catch (error) {
    sendError(res, error, 'Get event');
  }
});

app.post('/api/events', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const user = (req as any).user as SessionUser;
    const data: Record<string, any> = { ...pickFields(req.body), ...deriveCourseFields(db, req.body.course_id || null) };
    const resourceIds = validateResources(db, data.location_id, req.body.resource_ids);

    // Clients may only create drafts or submit directly; the stored status
    // is always decided here, never taken from the request body
    const submit = req.body.submit === true;
    if (submit) validateForApproval(db, data);
    const status = submit ? 'AGUARDANDO_APROVACAO' : 'RASCUNHO';

    const columns = [...Object.keys(data), 'status', 'user_id'];
    const stmt = db.prepare(`INSERT INTO events (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`);
    const result = stmt.run(...Object.values(data), status, user.userId);
    const eventId = Number(result.lastInsertRowid);

    saveResources(db, eventId, resourceIds);
    logAudit(db, eventId, user.userId, 'CRIADO', null, 'RASCUNHO');
    if (submit) logAudit(db, eventId, user.userId, 'ENVIADO', 'RASCUNHO', status);

    res.status(201).json({ id: eventId, status });
  } catch (error) {
    sendError(res, error, 'Create event');
  }
});

app.put('/api/events/:id', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const user = (req as any).user as SessionUser;
    const event = loadEvent(db, req.params.id, user);

    if (!canEdit(user, event)) {
      throw new HttpError(403, event.status === 'APROVADO'
        ? 'Eventos aprovados só podem ser alterados pelo Administrador'
        : 'Esta solicitação não pode ser editada no estado atual');
    }

    const data: Record<string, any> = { ...pickFields(req.body), ...deriveCourseFields(db, req.body.course_id || null) };
    const resourceIds = validateResources(db, data.location_id, req.body.resource_ids);

    // Events in the approval flow or published must stay valid and conflict-free
    if (event.status === 'AGUARDANDO_APROVACAO' || event.status === 'APROVADO') {
      validateForApproval(db, data, event.id);
    }

    const assignments = Object.keys(data).map(k => `${k} = ?`).join(', ');
    db.prepare(`UPDATE events SET ${assignments}, updated_at = datetime('now') WHERE id = ?`).run(...Object.values(data), event.id);
    saveResources(db, event.id, resourceIds);
    logAudit(db, event.id, user.userId, 'EDITADO', event.status, event.status);

    res.json({ message: 'Solicitação atualizada' });
  } catch (error) {
    sendError(res, error, 'Update event');
  }
});

app.put('/api/events/:id/submit', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const user = (req as any).user as SessionUser;
    const event = loadEvent(db, req.params.id, user);

    if (event.user_id !== user.userId) {
      throw new HttpError(403, 'Apenas o autor pode enviar a solicitação');
    }
    if (event.status !== 'RASCUNHO' && event.status !== 'REJEITADO') {
      throw new HttpError(400, 'Esta solicitação não pode ser enviada no estado atual');
    }

    validateForApproval(db, event, event.id);
    setStatus(db, event.id, 'AGUARDANDO_APROVACAO');
    logAudit(db, event.id, user.userId, 'ENVIADO', event.status, 'AGUARDANDO_APROVACAO');

    res.json({ message: 'Enviada para aprovação' });
  } catch (error) {
    sendError(res, error, 'Submit event');
  }
});

app.put('/api/events/:id/cancel', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const user = (req as any).user as SessionUser;
    const event = loadEvent(db, req.params.id, user);

    const allowed = user.role === 'ADMIN' ? ['AGUARDANDO_APROVACAO', 'APROVADO'] : ['AGUARDANDO_APROVACAO'];
    if (!allowed.includes(event.status)) {
      throw new HttpError(event.status === 'APROVADO' ? 403 : 400, event.status === 'APROVADO'
        ? 'Eventos aprovados só podem ser cancelados pelo Administrador'
        : 'Esta solicitação não pode ser cancelada no estado atual');
    }

    setStatus(db, event.id, 'CANCELADO');
    logAudit(db, event.id, user.userId, 'CANCELADO', event.status, 'CANCELADO');

    res.json({ message: 'Solicitação cancelada' });
  } catch (error) {
    sendError(res, error, 'Cancel event');
  }
});

app.put('/api/events/:id/approve', requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const user = (req as any).user as SessionUser;
    const event = loadEvent(db, req.params.id, user);

    if (event.status !== 'AGUARDANDO_APROVACAO') {
      throw new HttpError(400, 'Apenas solicitações aguardando aprovação podem ser aprovadas');
    }

    // Check conflicts again on approval
    validateForApproval(db, event, event.id);
    setStatus(db, event.id, 'APROVADO');
    logAudit(db, event.id, user.userId, 'APROVADO', event.status, 'APROVADO');

    res.json({ message: 'Evento aprovado e publicado na agenda pública' });
  } catch (error) {
    sendError(res, error, 'Approve event');
  }
});

app.put('/api/events/:id/reject', requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const user = (req as any).user as SessionUser;
    const rejection_reason = typeof req.body.rejection_reason === 'string' ? req.body.rejection_reason.trim() : '';

    if (!rejection_reason) {
      throw new HttpError(400, 'Informe a justificativa da rejeição');
    }

    const event = loadEvent(db, req.params.id, user);
    if (event.status !== 'AGUARDANDO_APROVACAO') {
      throw new HttpError(400, 'Apenas solicitações aguardando aprovação podem ser rejeitadas');
    }

    setStatus(db, event.id, 'REJEITADO', rejection_reason);
    logAudit(db, event.id, user.userId, 'REJEITADO', event.status, 'REJEITADO', rejection_reason);

    res.json({ message: 'Solicitação rejeitada' });
  } catch (error) {
    sendError(res, error, 'Reject event');
  }
});

app.delete('/api/events/:id', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const user = (req as any).user as SessionUser;
    const event = loadEvent(db, req.params.id, user);

    if (event.user_id !== user.userId) {
      throw new HttpError(403, 'Apenas o autor pode eliminar o rascunho');
    }
    if (event.status !== 'RASCUNHO') {
      throw new HttpError(400, 'Apenas rascunhos podem ser eliminados');
    }

    db.prepare('DELETE FROM events WHERE id = ?').run(event.id);
    res.json({ message: 'Rascunho eliminado' });
  } catch (error) {
    sendError(res, error, 'Delete event');
  }
});

app.get('/api/meta/courses', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM courses ORDER BY name');
    res.json(stmt.all());
  } catch (error) {
    sendError(res, error, 'Courses');
  }
});

app.get('/api/meta/locations', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const locations = db.prepare('SELECT * FROM locations ORDER BY name').all() as any[];
    const links = db.prepare('SELECT location_id, resource_id FROM location_resources').all() as any[];
    for (const location of locations) {
      location.resource_ids = links.filter(l => l.location_id === location.id).map(l => l.resource_id);
    }
    res.json(locations);
  } catch (error) {
    sendError(res, error, 'Locations');
  }
});

app.get('/api/meta/resources', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM resources ORDER BY name');
    res.json(stmt.all());
  } catch (error) {
    sendError(res, error, 'Resources');
  }
});

app.get('/api/meta/themes', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM themes ORDER BY name');
    res.json(stmt.all());
  } catch (error) {
    sendError(res, error, 'Themes');
  }
});

// Admin catalog CRUD (users, courses, themes, locations, resources)
type CatalogField = { name: string, label: string, required?: boolean, type?: 'text' | 'int' };
type CatalogEntity = {
  table: string,
  fields: CatalogField[],
  columns: string,
  // Tables/columns that reference a row; deletion is blocked while any exist
  references: { sql: string, label: string }[],
};

const CATALOG: Record<string, CatalogEntity> = {
  users: {
    table: 'users',
    fields: [
      { name: 'name', label: 'Nome', required: true },
      { name: 'email', label: 'E-mail', required: true },
      { name: 'role', label: 'Perfil', required: true },
      { name: 'course_id', label: 'Curso', type: 'int' },
    ],
    columns: 'id, name, email, role, course_id, created_at',
    references: [{ sql: 'SELECT COUNT(*) as count FROM events WHERE user_id = ?', label: 'solicitações registradas por este usuário' }],
  },
  courses: {
    table: 'courses',
    fields: [
      { name: 'name', label: 'Nome', required: true },
      { name: 'code', label: 'Código', required: true },
      { name: 'cost_center', label: 'Centro de Custo', required: true },
    ],
    columns: 'id, name, code, cost_center',
    references: [
      { sql: 'SELECT COUNT(*) as count FROM events WHERE course_id = ?', label: 'eventos vinculados' },
      { sql: 'SELECT COUNT(*) as count FROM users WHERE course_id = ?', label: 'usuários vinculados' },
    ],
  },
  themes: {
    table: 'themes',
    fields: [{ name: 'name', label: 'Nome', required: true }],
    columns: 'id, name',
    references: [{ sql: 'SELECT COUNT(*) as count FROM events WHERE theme_id = ?', label: 'eventos vinculados' }],
  },
  locations: {
    table: 'locations',
    fields: [
      { name: 'name', label: 'Nome', required: true },
      { name: 'capacity', label: 'Capacidade', type: 'int' },
      { name: 'description', label: 'Descrição' },
    ],
    columns: 'id, name, capacity, description',
    references: [{ sql: 'SELECT COUNT(*) as count FROM events WHERE location_id = ?', label: 'eventos vinculados' }],
  },
  resources: {
    table: 'resources',
    fields: [
      { name: 'name', label: 'Nome', required: true },
      { name: 'description', label: 'Descrição' },
    ],
    columns: 'id, name, description',
    references: [{ sql: 'SELECT COUNT(*) as count FROM event_resources WHERE resource_id = ?', label: 'eventos que usam este recurso' }],
  },
};

function catalogEntity(name: string) {
  const entity = CATALOG[name];
  if (!entity) throw new HttpError(404, 'Cadastro não encontrado');
  return entity;
}

function catalogValues(entity: CatalogEntity, body: any) {
  const values: Record<string, any> = {};
  for (const field of entity.fields) {
    let value = body[field.name];
    if (typeof value === 'string') value = value.trim();
    if (value === '' || value === undefined) value = null;
    if (value !== null && field.type === 'int') {
      value = Number(value);
      if (!Number.isInteger(value) || value < 0) throw new HttpError(400, `${field.label} deve ser um número inteiro`);
    }
    if (field.required && value === null) throw new HttpError(400, `Informe: ${field.label}`);
    values[field.name] = value;
  }
  if (entity.table === 'users') {
    values.email = String(values.email).toLowerCase();
    if (!['SOLICITANTE', 'ADMIN'].includes(values.role)) throw new HttpError(400, 'Perfil inválido');
  }
  return values;
}

function rethrowUnique(error: unknown): never {
  const message = (error as Error)?.message ?? '';
  if (message.includes('UNIQUE constraint failed')) {
    const field = message.split('.').pop();
    const label = field === 'email' ? 'e-mail' : field === 'code' ? 'código' : 'nome';
    throw new HttpError(409, `Já existe um cadastro com este ${label}`);
  }
  throw error;
}

function withLocationResources(db: any, rows: any[]) {
  const links = db.prepare('SELECT location_id, resource_id FROM location_resources').all() as any[];
  for (const row of rows) row.resource_ids = links.filter(l => l.location_id === row.id).map(l => l.resource_id);
  return rows;
}

function saveLocationResources(db: any, locationId: number, resourceIds: unknown) {
  if (!Array.isArray(resourceIds)) return;
  db.prepare('DELETE FROM location_resources WHERE location_id = ?').run(locationId);
  const stmt = db.prepare('INSERT INTO location_resources (location_id, resource_id) VALUES (?, ?)');
  for (const rid of new Set(resourceIds.map(Number))) stmt.run(locationId, rid);
}

app.get('/api/admin/:entity', requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const entity = catalogEntity(req.params.entity);
    const rows = db.prepare(`SELECT ${entity.columns} FROM ${entity.table} ORDER BY name`).all() as any[];
    res.json(entity.table === 'locations' ? withLocationResources(db, rows) : rows);
  } catch (error) {
    sendError(res, error, 'List catalog');
  }
});

app.post('/api/admin/:entity', requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const entity = catalogEntity(req.params.entity);
    const values = catalogValues(entity, req.body);

    if (entity.table === 'users') {
      if (!req.body.password || String(req.body.password).length < 6) {
        throw new HttpError(400, 'A senha inicial deve ter ao menos 6 caracteres');
      }
      values.password_hash = hashPassword(String(req.body.password));
    }

    const columns = Object.keys(values);
    let result;
    try {
      result = db.prepare(`INSERT INTO ${entity.table} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`)
        .run(...Object.values(values));
    } catch (error) {
      rethrowUnique(error);
    }
    const id = Number(result.lastInsertRowid);
    if (entity.table === 'locations') saveLocationResources(db, id, req.body.resource_ids);

    res.status(201).json({ id });
  } catch (error) {
    sendError(res, error, 'Create catalog');
  }
});

app.put('/api/admin/:entity/:id', requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const user = (req as any).user as SessionUser;
    const entity = catalogEntity(req.params.entity);
    const id = Number(req.params.id);
    if (!db.prepare(`SELECT id FROM ${entity.table} WHERE id = ?`).get(id)) {
      throw new HttpError(404, 'Registro não encontrado');
    }

    const values = catalogValues(entity, req.body);
    if (entity.table === 'users') {
      if (id === user.userId && values.role !== 'ADMIN') {
        throw new HttpError(400, 'Você não pode remover o próprio perfil de Administrador');
      }
      // Password is optional on update; when present it resets the user's password
      if (req.body.password) {
        if (String(req.body.password).length < 6) throw new HttpError(400, 'A senha deve ter ao menos 6 caracteres');
        values.password_hash = hashPassword(String(req.body.password));
      }
    }

    const assignments = Object.keys(values).map(k => `${k} = ?`).join(', ');
    try {
      db.prepare(`UPDATE ${entity.table} SET ${assignments} WHERE id = ?`).run(...Object.values(values), id);
    } catch (error) {
      rethrowUnique(error);
    }
    if (entity.table === 'locations') saveLocationResources(db, id, req.body.resource_ids);

    res.json({ message: 'Cadastro atualizado' });
  } catch (error) {
    sendError(res, error, 'Update catalog');
  }
});

app.delete('/api/admin/:entity/:id', requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const user = (req as any).user as SessionUser;
    const entity = catalogEntity(req.params.entity);
    const id = Number(req.params.id);

    if (entity.table === 'users' && id === user.userId) {
      throw new HttpError(409, 'Você não pode remover o próprio usuário');
    }
    // Keep history intact: referenced rows cannot be removed
    for (const ref of entity.references) {
      const { count } = db.prepare(ref.sql).get(id) as { count: number };
      if (count > 0) throw new HttpError(409, `Não é possível remover: existem ${count} ${ref.label}`);
    }

    const result = db.prepare(`DELETE FROM ${entity.table} WHERE id = ?`).run(id);
    if (!result.changes) throw new HttpError(404, 'Registro não encontrado');
    res.json({ message: 'Cadastro removido' });
  } catch (error) {
    sendError(res, error, 'Delete catalog');
  }
});

// Reports: the table and the CSV share one query so they always match
const REPORT_COLUMNS: [string, string][] = [
  ['title', 'Nome do evento'],
  ['event_date', 'Data'],
  ['start_time', 'Horário inicial'],
  ['end_time', 'Horário final'],
  ['theme_name', 'Tema'],
  ['course_name', 'Curso/Coordenação'],
  ['cost_center', 'Centro de Custo'],
  ['location_name', 'Local'],
  ['requester_name', 'Solicitante'],
  ['status', 'Estado'],
];

const STATUS_LABELS: Record<string, string> = {
  RASCUNHO: 'Rascunho',
  AGUARDANDO_APROVACAO: 'Aguardando aprovação',
  REJEITADO: 'Rejeitado',
  APROVADO: 'Aprovado',
  CANCELADO: 'Cancelado',
};

function queryReport(query: any) {
  const where: string[] = [];
  const params: any[] = [];
  const isDate = (v: unknown) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

  if (isDate(query.start_date)) { where.push('e.event_date >= ?'); params.push(query.start_date); }
  if (isDate(query.end_date)) { where.push('e.event_date <= ?'); params.push(query.end_date); }
  if (query.course_id) { where.push('e.course_id = ?'); params.push(Number(query.course_id)); }
  if (query.theme_id) { where.push('e.theme_id = ?'); params.push(Number(query.theme_id)); }

  return getDb().prepare(`
    SELECT e.id, e.title, e.event_date, e.start_time, e.end_time, t.name as theme_name,
      c.name as course_name, e.cost_center, l.name as location_name, e.requester_name, e.status
    FROM events e
    LEFT JOIN themes t ON e.theme_id = t.id
    LEFT JOIN courses c ON e.course_id = c.id
    LEFT JOIN locations l ON e.location_id = l.id
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY e.event_date IS NULL, e.event_date ASC, e.start_time ASC, e.id ASC
  `).all(...params) as any[];
}

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? '' : String(value);
  return /[";\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function formatBrDate(date: string | null) {
  if (!date) return '';
  const [y, m, d] = date.split('-');
  return `${d}/${m}/${y}`;
}

app.get('/api/admin/reports/events', requireAdmin, (req, res) => {
  try {
    res.json(queryReport(req.query));
  } catch (error) {
    sendError(res, error, 'Report');
  }
});

app.get('/api/admin/reports/events.csv', requireAdmin, (req, res) => {
  try {
    const rows = queryReport(req.query);
    const lines = [REPORT_COLUMNS.map(([, label]) => csvCell(label)).join(';')];
    for (const row of rows) {
      lines.push(REPORT_COLUMNS.map(([key]) => {
        if (key === 'event_date') return csvCell(formatBrDate(row.event_date));
        if (key === 'status') return csvCell(STATUS_LABELS[row.status] ?? row.status);
        return csvCell(row[key]);
      }).join(';'));
    }

    // BOM + semicolon lets Excel (pt-BR locale) open accents and columns correctly
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="relatorio-eventos.csv"');
    res.send('﻿' + lines.join('\r\n') + '\r\n');
  } catch (error) {
    sendError(res, error, 'Report CSV');
  }
});

// Serve frontend for all other routes
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
