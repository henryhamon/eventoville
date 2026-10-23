import { DatabaseSync } from 'node:sqlite';
import { randomBytes, scryptSync } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, 'database.sqlite');

const db = new DatabaseSync(dbPath);

export function initDatabase() {
  // Enable foreign keys
  db.exec('PRAGMA foreign_keys = ON');

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS themes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      capacity INTEGER,
      description TEXT
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS resources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('VISITANTE','SOLICITANTE','ADMIN')),
      course_id INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (course_id) REFERENCES courses(id)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      event_date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      theme_id INTEGER,
      course_id INTEGER,
      location_id INTEGER NOT NULL,
      user_id INTEGER,
      speaker TEXT,
      realization TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('RASCUNHO','AGUARDANDO_APROVACAO','REJEITADO','APROVADO','CANCELADO')),
      rejection_reason TEXT,
      requester_name TEXT,
      target_audience TEXT,
      justification TEXT,
      objective TEXT,
      needs_ceremonial INTEGER DEFAULT 0,
      needs_certificates INTEGER DEFAULT 0,
      observations TEXT,
      cost_center TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (theme_id) REFERENCES themes(id),
      FOREIGN KEY (course_id) REFERENCES courses(id),
      FOREIGN KEY (location_id) REFERENCES locations(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS event_resources (
      event_id INTEGER NOT NULL,
      resource_id INTEGER NOT NULL,
      PRIMARY KEY (event_id, resource_id),
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
      FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL,
      expires_at TEXT NOT NULL,
      used INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  migrateDatabase();

  // Check if seed data exists
  const countStmt = db.prepare('SELECT COUNT(*) as count FROM events');
  const result = countStmt.get() as { count: number };
  
  if (result.count === 0) {
    seedDatabase();
  }
}

// Add columns introduced after the initial schema (CREATE TABLE IF NOT EXISTS
// does not alter tables that already exist)
function migrateDatabase() {
  const eventColumns: [string, string][] = [
    ['requester_name', 'TEXT'],
    ['target_audience', 'TEXT'],
    ['justification', 'TEXT'],
    ['objective', 'TEXT'],
    ['needs_ceremonial', 'INTEGER DEFAULT 0'],
    ['needs_certificates', 'INTEGER DEFAULT 0'],
    ['observations', 'TEXT'],
    ['cost_center', 'TEXT'],
  ];

  const existing = new Set(
    (db.prepare('PRAGMA table_info(events)').all() as { name: string }[]).map(c => c.name)
  );

  for (const [name, definition] of eventColumns) {
    if (!existing.has(name)) {
      db.exec(`ALTER TABLE events ADD COLUMN ${name} ${definition}`);
    }
  }
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return salt + ':' + hash;
}

function seedDatabase() {
  // Insert courses
  const insertCourse = db.prepare('INSERT INTO courses (name, code) VALUES (?, ?)');
  insertCourse.run('Sistemas de Informação', 'SI');
  insertCourse.run('Engenharia de Software', 'ES');
  insertCourse.run('Ciência da Computação', 'CC');

  // Insert themes
  const insertTheme = db.prepare('INSERT INTO themes (name) VALUES (?)');
  insertTheme.run('Tecnologia');
  insertTheme.run('Inovação');
  insertTheme.run('Empreendedorismo');
  insertTheme.run('Sustentabilidade');

  // Insert locations
  const insertLocation = db.prepare('INSERT INTO locations (name, capacity, description) VALUES (?, ?, ?)');
  insertLocation.run('Auditório Principal', 200, 'Main auditorium');
  insertLocation.run('Sala 101', 40, 'Classroom');
  insertLocation.run('Laboratório de Informática', 30, 'Computer lab');

  // Insert resources
  const insertResource = db.prepare('INSERT INTO resources (name, description) VALUES (?, ?)');
  insertResource.run('Projetor', 'Data projector');
  insertResource.run('Microfone', 'Wireless microphone');

  // Insert users
  const insertUser = db.prepare('INSERT INTO users (name, email, password_hash, role, course_id) VALUES (?, ?, ?, ?, ?)');
  insertUser.run('Admin User', 'admin@univille.br', hashPassword('admin123'), 'ADMIN', 1);
  insertUser.run('Solicitante Teste', 'solicitante@univille.br', hashPassword('sol123'), 'SOLICITANTE', 2);

  // Insert events - current month and next 2 months
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-based

  const insertEvent = db.prepare(`
    INSERT INTO events (title, description, event_date, start_time, end_time, theme_id, course_id, location_id, user_id, speaker, realization, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Approved events in current month
  const date1 = new Date(currentYear, currentMonth, 15);
  insertEvent.run(
    'Workshop de Inteligência Artificial',
    'Introdução ao Machine Learning e aplicações práticas',
    date1.toISOString().split('T')[0],
    '14:00',
    '16:00',
    1, 1, 1, 2, 'Prof. João Silva', 'Departamento de Computação', 'APROVADO'
  );

  // Approved event next month
  const date2 = new Date(currentYear, currentMonth + 1, 10);
  insertEvent.run(
    'Palestra sobre Inovação Tecnológica',
    'Tendências em transformação digital',
    date2.toISOString().split('T')[0],
    '19:00',
    '21:00',
    2, 2, 2, 2, 'Dra. Maria Santos', 'Centro de Inovação', 'APROVADO'
  );

  // Approved event in 2 months ahead
  const date3 = new Date(currentYear, currentMonth + 2, 5);
  insertEvent.run(
    'Seminário de Sustentabilidade',
    'Práticas sustentáveis nas empresas',
    date3.toISOString().split('T')[0],
    '09:00',
    '12:00',
    4, 1, 1, 2, 'Eng. Carlos Oliveira', 'Núcleo de Sustentabilidade', 'APROVADO'
  );

  // Events in other states (should not appear in public portal)
  const date4 = new Date(currentYear, currentMonth + 1, 20);
  insertEvent.run(
    'Evento em Análise',
    'Aguardando aprovação',
    date4.toISOString().split('T')[0],
    '15:00',
    '17:00',
    1, 1, 2, 2, 'Prof. Ana Costa', 'Departamento de Computação', 'AGUARDANDO_APROVACAO'
  );

  insertEvent.run(
    'Evento Rascunho',
    'Ainda em elaboração',
    date4.toISOString().split('T')[0],
    '10:00',
    '11:00',
    3, 2, 3, 2, 'Prof. Pedro Lima', 'Departamento de Gestão', 'RASCUNHO'
  );
}

export function getPublicEvents() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  
  // Current month start
  const startDate = new Date(currentYear, currentMonth, 1);
  // End of month + 2 months
  const endDate = new Date(currentYear, currentMonth + 3, 0); // Last day of month + 2
  
  const stmt = db.prepare(`
    SELECT 
      e.id, e.title, e.description, e.event_date, e.start_time, e.end_time,
      e.theme_id, t.name as theme_name,
      e.location_id, l.name as location_name,
      e.speaker, e.realization, e.status
    FROM events e
    LEFT JOIN themes t ON e.theme_id = t.id
    LEFT JOIN locations l ON e.location_id = l.id
    WHERE e.status = 'APROVADO'
      AND e.event_date >= ?
      AND e.event_date <= ?
    ORDER BY e.event_date ASC, e.start_time ASC
  `);
  
  return stmt.all(startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]);
}

export function getDb() {
  return db;
}

export default db;
