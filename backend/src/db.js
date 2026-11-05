import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '..', 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

export const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'backstage.db');
export const db = new DatabaseSync(DB_PATH);

const SCHEMA = `
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('manager','guardian','student','teacher')),
  phone TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  birth_date TEXT,
  email TEXT,
  phone TEXT,
  level TEXT NOT NULL DEFAULT 'Iniciante',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  guardian_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  monthly_fee REAL NOT NULL DEFAULT 180,
  notes TEXT,
  joined_at TEXT NOT NULL DEFAULT (date('now','localtime'))
);

CREATE TABLE IF NOT EXISTS teachers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  specialties TEXT,
  bio TEXT,
  hourly_rate REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  hired_at TEXT NOT NULL DEFAULT (date('now','localtime')),
  dismissed_at TEXT,
  dismissal_reason TEXT,
  show_on_site INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS classes (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  style TEXT NOT NULL,
  level TEXT,
  teacher_id INTEGER REFERENCES teachers(id) ON DELETE SET NULL,
  teacher TEXT, -- denormalized teacher name, kept in sync with teacher_id
  room TEXT,
  capacity INTEGER NOT NULL DEFAULT 20,
  color TEXT NOT NULL DEFAULT '#e8b04b',
  description TEXT,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS class_schedules (
  id INTEGER PRIMARY KEY,
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  weekday INTEGER NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS enrollments (
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  enrolled_at TEXT NOT NULL DEFAULT (date('now','localtime')),
  PRIMARY KEY (student_id, class_id)
);

CREATE TABLE IF NOT EXISTS attendance (
  id INTEGER PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present','absent','late')),
  UNIQUE (student_id, class_id, date)
);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  reference_month TEXT NOT NULL,
  amount REAL NOT NULL,
  due_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('paid','pending','overdue')),
  paid_at TEXT,
  UNIQUE (student_id, reference_month)
);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  date TEXT NOT NULL,
  time TEXT,
  location TEXT,
  category TEXT DEFAULT 'Evento',
  image_url TEXT,
  published INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS event_rsvps (
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('going','maybe','not_going')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  PRIMARY KEY (event_id, student_id)
);

CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  year INTEGER,
  category TEXT,
  description TEXT,
  image_url TEXT,
  color TEXT DEFAULT '#e8b04b',
  highlight INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS announcements (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT,
  audience TEXT NOT NULL DEFAULT 'public' CHECK (audience IN ('public','students')),
  pinned INTEGER NOT NULL DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS class_logs (
  id INTEGER PRIMARY KEY,
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  teacher_id INTEGER REFERENCES teachers(id) ON DELETE SET NULL,
  date TEXT NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS site_content (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS contact_messages (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  interest TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','read','answered')),
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE INDEX IF NOT EXISTS idx_att_student ON attendance(student_id, date);
CREATE INDEX IF NOT EXISTS idx_att_class ON attendance(class_id, date);
CREATE INDEX IF NOT EXISTS idx_pay_month ON payments(reference_month);
`;

db.exec(SCHEMA);

const TABLES = ['class_logs', 'contact_messages', 'site_content', 'announcements', 'projects', 'event_rsvps', 'events',
  'payments', 'attendance', 'enrollments', 'class_schedules', 'classes', 'teachers', 'students', 'users'];

export function resetDatabase() {
  db.exec('PRAGMA foreign_keys = OFF;');
  for (const t of TABLES) db.exec(`DROP TABLE IF EXISTS ${t};`);
  db.exec(SCHEMA);
  migrate();
}

// node:sqlite only binds null/number/bigint/string/buffer
const clean = (args) => args.map((a) => (a === undefined ? null : typeof a === 'boolean' ? (a ? 1 : 0) : a));

export const all = (sql, ...a) => db.prepare(sql).all(...clean(a));
export const get = (sql, ...a) => db.prepare(sql).get(...clean(a));
export const run = (sql, ...a) => db.prepare(sql).run(...clean(a));

export function tx(fn) {
  db.exec('BEGIN');
  try {
    const r = fn();
    db.exec('COMMIT');
    return r;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

/** Local date helpers (YYYY-MM-DD) */
export const ymd = (d) => {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
export const today = () => ymd(new Date());
export const parseYmd = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export function refreshOverdue() {
  run(`UPDATE payments SET status='overdue' WHERE status='pending' AND due_date < ?`, today());
}

/**
 * Lightweight migrations for databases created before a feature existed.
 * v2: teachers table + classes.teacher_id (teachers were free text before).
 */
function migrate() {
  // v3: 'teacher' role — SQLite can't alter a CHECK constraint, so rebuild the users table
  const usersSql = get(`SELECT sql FROM sqlite_master WHERE type='table' AND name='users'`).sql;
  if (!usersSql.includes("'teacher'")) {
    db.exec('PRAGMA foreign_keys = OFF;');
    tx(() => {
      db.exec(`CREATE TABLE users_v3 (
        id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE COLLATE NOCASE, password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('manager','guardian','student','teacher')), phone TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')))`);
      db.exec(`INSERT INTO users_v3 SELECT id, name, email, password_hash, role, phone, created_at FROM users`);
      db.exec(`DROP TABLE users`);
      db.exec(`ALTER TABLE users_v3 RENAME TO users`);
    });
    db.exec('PRAGMA foreign_keys = ON;');
  }
  if (!all(`PRAGMA table_info(teachers)`).some((c) => c.name === 'user_id')) {
    db.exec(`ALTER TABLE teachers ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE SET NULL`);
  }

  const cols = all(`PRAGMA table_info(classes)`).map((c) => c.name);
  if (!cols.includes('teacher_id')) {
    db.exec(`ALTER TABLE classes ADD COLUMN teacher_id INTEGER REFERENCES teachers(id) ON DELETE SET NULL`);
  }
  db.exec(`CREATE INDEX IF NOT EXISTS idx_classes_teacher ON classes(teacher_id)`);
  // Promote free-text teacher names into teacher records
  const orphan = all(`SELECT DISTINCT teacher FROM classes WHERE teacher_id IS NULL AND teacher IS NOT NULL AND teacher != ''`);
  if (orphan.length) {
    tx(() => {
      for (const { teacher } of orphan) {
        const name = teacher.replace(/^Prof\.?(ª|a)?\s+/i, '').trim();
        let t = get(`SELECT id FROM teachers WHERE name = ?`, name);
        if (!t) t = { id: Number(run(`INSERT INTO teachers (name) VALUES (?)`, name).lastInsertRowid) };
        run(`UPDATE classes SET teacher_id = ?, teacher = ? WHERE teacher = ?`, t.id, name, teacher);
      }
    });
  }
}
migrate();
