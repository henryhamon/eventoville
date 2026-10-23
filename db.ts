import { DatabaseSync } from 'node:sqlite';
import { randomBytes, scryptSync } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, 'database.sqlite');

const db = new DatabaseSync(dbPath);

// Drafts may be incomplete, so date, times and location are nullable
function eventsTableDdl(table: string) {
  return `
    CREATE TABLE IF NOT EXISTS ${table} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      event_date TEXT,
      start_time TEXT,
      end_time TEXT,
      theme_id INTEGER,
      course_id INTEGER,
      location_id INTEGER,
      user_id INTEGER,
      speaker TEXT,
      realization TEXT NOT NULL DEFAULT '',
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
  `;
}

export function initDatabase() {
  // Enable foreign keys
  db.exec('PRAGMA foreign_keys = ON');

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE,
      cost_center TEXT NOT NULL DEFAULT ''
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
    CREATE TABLE IF NOT EXISTS location_resources (
      location_id INTEGER NOT NULL,
      resource_id INTEGER NOT NULL,
      PRIMARY KEY (location_id, resource_id),
      FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
      FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE
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

  db.exec(eventsTableDdl('events'));

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
    CREATE TABLE IF NOT EXISTS event_audit (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      from_status TEXT,
      to_status TEXT,
      comment TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      expires_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS email_outbox (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      to_email TEXT NOT NULL,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
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

  // Seed only an empty database
  const countStmt = db.prepare('SELECT COUNT(*) as count FROM users');
  const result = countStmt.get() as { count: number };

  if (result.count === 0) {
    seedDatabase();
  }
}

function columnsOf(table: string) {
  return db.prepare(`PRAGMA table_info(${table})`).all() as { name: string, notnull: number }[];
}

// Bring databases created by earlier versions up to the current schema
// (CREATE TABLE IF NOT EXISTS does not alter tables that already exist)
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

  const existing = new Set(columnsOf('events').map(c => c.name));
  for (const [name, definition] of eventColumns) {
    if (!existing.has(name)) {
      db.exec(`ALTER TABLE events ADD COLUMN ${name} ${definition}`);
    }
  }

  if (!columnsOf('courses').some(c => c.name === 'cost_center')) {
    db.exec("ALTER TABLE courses ADD COLUMN cost_center TEXT NOT NULL DEFAULT ''");
  }

  // Early schema had NOT NULL on location/date/times, which blocks incomplete drafts
  const location = columnsOf('events').find(c => c.name === 'location_id');
  if (location?.notnull) {
    const cols = columnsOf('events').map(c => c.name).join(', ');
    db.exec('PRAGMA foreign_keys = OFF');
    db.exec('BEGIN');
    db.exec(eventsTableDdl('events_new'));
    db.exec(`INSERT INTO events_new (${cols}) SELECT ${cols} FROM events`);
    db.exec('DROP TABLE events');
    db.exec('ALTER TABLE events_new RENAME TO events');
    db.exec('COMMIT');
    db.exec('PRAGMA foreign_keys = ON');
  }
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return salt + ':' + hash;
}

// Format as YYYY-MM-DD in local time (toISOString shifts the day in positive offsets)
export function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function seedDatabase() {
  // Insert courses
  const insertCourse = db.prepare('INSERT INTO courses (name, code, cost_center) VALUES (?, ?, ?)');
  insertCourse.run('Sistemas de Informação', 'SI', 'CC-101 Sistemas de Informação');
  insertCourse.run('Engenharia de Software', 'ES', 'CC-102 Engenharia de Software');
  insertCourse.run('Ciência da Computação', 'CC', 'CC-103 Ciência da Computação');
  insertCourse.run('Coordenação de Extensão', 'EXT', 'CC-200 Extensão e Cultura');

  // Insert themes
  const insertTheme = db.prepare('INSERT INTO themes (name) VALUES (?)');
  for (const name of ['Palestra', 'Workshop', 'Congresso', 'Seminário', 'Mesa-redonda']) {
    insertTheme.run(name);
  }

  // Insert locations
  const insertLocation = db.prepare('INSERT INTO locations (name, capacity, description) VALUES (?, ?, ?)');
  insertLocation.run('Auditório Principal', 200, 'Auditório do bloco A');
  insertLocation.run('Sala 101', 40, 'Sala de aula do bloco B');
  insertLocation.run('Laboratório de Informática', 30, 'Laboratório do bloco C');

  // Insert resources
  const insertResource = db.prepare('INSERT INTO resources (name, description) VALUES (?, ?)');
  insertResource.run('Projetor', 'Projetor multimídia');
  insertResource.run('Microfone', 'Microfone sem fio');
  insertResource.run('Sistema de som', 'Caixas de som e mesa');
  insertResource.run('Transmissão ao vivo', 'Câmera e streaming');
  insertResource.run('Quadro branco', 'Quadro e marcadores');
  insertResource.run('Computadores', 'Estações de trabalho');

  // Associate resources to locations
  const insertLocationResource = db.prepare('INSERT INTO location_resources (location_id, resource_id) VALUES (?, ?)');
  const locationResources: Record<number, number[]> = { 1: [1, 2, 3, 4], 2: [1, 5], 3: [1, 5, 6] };
  for (const [locationId, resourceIds] of Object.entries(locationResources)) {
    for (const resourceId of resourceIds) insertLocationResource.run(Number(locationId), resourceId);
  }

  // Insert users
  const insertUser = db.prepare('INSERT INTO users (name, email, password_hash, role, course_id) VALUES (?, ?, ?, ?, ?)');
  insertUser.run('Admin Setor de Eventos', 'admin@univille.br', hashPassword('admin123'), 'ADMIN', null);
  insertUser.run('Solicitante Teste', 'solicitante@univille.br', hashPassword('sol123'), 'SOLICITANTE', 1);
  insertUser.run('Maria Souza', 'maria.souza@univille.br', hashPassword('sol123'), 'SOLICITANTE', 2);

  // Dates relative to today so the public window always has data
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const day = (monthOffset: number, d: number) => formatLocalDate(new Date(y, m + monthOffset, d));
  const inDays = (n: number) => formatLocalDate(new Date(y, m, now.getDate() + n));

  const courses = db.prepare('SELECT id, name, cost_center FROM courses').all() as any[];
  const courseById = new Map(courses.map(c => [c.id, c]));

  const insertEvent = db.prepare(`
    INSERT INTO events (
      title, description, event_date, start_time, end_time, theme_id, course_id, location_id,
      user_id, speaker, realization, status, rejection_reason, requester_name, target_audience,
      justification, objective, needs_ceremonial, needs_certificates, observations, cost_center
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertEventResource = db.prepare('INSERT INTO event_resources (event_id, resource_id) VALUES (?, ?)');
  const insertAudit = db.prepare('INSERT INTO event_audit (event_id, user_id, action, from_status, to_status, comment) VALUES (?, ?, ?, ?, ?, ?)');

  type SeedEvent = {
    title: string, date: string, start: string, end: string, theme: number, course: number,
    location: number, user: number, speaker: string, status: string, requester: string,
    audience: string, resources: number[], reason?: string, ceremonial?: boolean, certificates?: boolean
  };

  const events: SeedEvent[] = [
    { title: 'Workshop de Inteligência Artificial', date: day(0, 15), start: '14:00', end: '16:00', theme: 2, course: 1, location: 1, user: 2, speaker: 'Prof. João Silva', status: 'APROVADO', requester: 'Prof. João Silva', audience: 'Acadêmicos de computação', resources: [1, 2], certificates: true },
    { title: 'Palestra Noturna: Carreira em Tecnologia', date: inDays(7), start: '19:00', end: '20:00', theme: 1, course: 2, location: 1, user: 3, speaker: 'Dra. Ana Costa', status: 'APROVADO', requester: 'Coord. Engenharia de Software', audience: 'Comunidade acadêmica', resources: [1, 2, 3], ceremonial: true },
    { title: 'Palestra sobre Inovação Tecnológica', date: day(1, 10), start: '19:00', end: '21:00', theme: 1, course: 4, location: 2, user: 3, speaker: 'Dra. Maria Santos', status: 'APROVADO', requester: 'Maria Souza', audience: 'Público externo', resources: [1] },
    { title: 'Seminário de Sustentabilidade', date: day(2, 5), start: '09:00', end: '12:00', theme: 4, course: 1, location: 1, user: 2, speaker: 'Eng. Carlos Oliveira', status: 'APROVADO', requester: 'Núcleo de Sustentabilidade', audience: 'Comunidade acadêmica', resources: [1, 2, 4], certificates: true },
    { title: 'Congresso de Computação (edição passada)', date: day(-1, 10), start: '08:00', end: '18:00', theme: 3, course: 3, location: 1, user: 2, speaker: 'Diversos', status: 'APROVADO', requester: 'Coord. Ciência da Computação', audience: 'Acadêmicos', resources: [1, 2, 3] },
    { title: 'Mesa-redonda: Mercado de Trabalho', date: day(1, 20), start: '15:00', end: '17:00', theme: 5, course: 1, location: 2, user: 2, speaker: 'Egressos de SI', status: 'AGUARDANDO_APROVACAO', requester: 'Centro Acadêmico de SI', audience: 'Acadêmicos de SI', resources: [1] },
    { title: 'Oficina de Git e GitHub', date: day(1, 22), start: '10:00', end: '12:00', theme: 2, course: 2, location: 3, user: 3, speaker: 'Monitoria ES', status: 'AGUARDANDO_APROVACAO', requester: 'Maria Souza', audience: 'Calouros', resources: [1, 6] },
    { title: 'Hackathon Univille', date: day(1, 12), start: '08:00', end: '22:00', theme: 2, course: 3, location: 3, user: 2, speaker: 'Mentores convidados', status: 'REJEITADO', requester: 'Liga de Programação', audience: 'Acadêmicos', resources: [6], reason: 'O laboratório não pode ficar reservado por 14 horas. Divida o evento em dois turnos ou solicite o Auditório.' },
    { title: 'Workshop Noturno de UX', date: inDays(7), start: '19:30', end: '21:00', theme: 2, course: 1, location: 1, user: 2, speaker: 'Prof. Lucas Pereira', status: 'RASCUNHO', requester: 'Prof. Lucas Pereira', audience: 'Acadêmicos de SI e ES', resources: [1, 2] },
    { title: 'Semana Acadêmica (cancelada)', date: day(1, 25), start: '19:00', end: '22:00', theme: 3, course: 4, location: 1, user: 3, speaker: 'Diversos', status: 'CANCELADO', requester: 'Coord. Extensão', audience: 'Comunidade', resources: [1, 2, 3] },
  ];

  for (const e of events) {
    const course = courseById.get(e.course);
    const result = insertEvent.run(
      e.title, null, e.date, e.start, e.end, e.theme, e.course, e.location,
      e.user, e.speaker, course.name, e.status, e.reason ?? null, e.requester, e.audience,
      'Atividade alinhada ao plano de extensão do curso.', 'Promover integração e formação complementar.',
      e.ceremonial ? 1 : 0, e.certificates ? 1 : 0, null, course.cost_center
    );
    const eventId = Number(result.lastInsertRowid);
    for (const rid of e.resources) insertEventResource.run(eventId, rid);

    insertAudit.run(eventId, e.user, 'CRIADO', null, 'RASCUNHO', null);
    if (e.status !== 'RASCUNHO') {
      insertAudit.run(eventId, e.user, 'ENVIADO', 'RASCUNHO', 'AGUARDANDO_APROVACAO', null);
    }
    if (e.status === 'APROVADO') insertAudit.run(eventId, 1, 'APROVADO', 'AGUARDANDO_APROVACAO', 'APROVADO', null);
    if (e.status === 'REJEITADO') insertAudit.run(eventId, 1, 'REJEITADO', 'AGUARDANDO_APROVACAO', 'REJEITADO', e.reason ?? null);
    if (e.status === 'CANCELADO') insertAudit.run(eventId, e.user, 'CANCELADO', 'AGUARDANDO_APROVACAO', 'CANCELADO', null);
  }
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

  return stmt.all(formatLocalDate(startDate), formatLocalDate(endDate));
}

export function getDb() {
  return db;
}

export default db;
