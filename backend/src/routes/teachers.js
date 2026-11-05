import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { all, get, run, tx, today, ymd } from '../db.js';
import { required, HttpError } from '../auth.js';
import { attachSchedules } from '../services.js';

const r = Router();
const WEEKS_PER_MONTH = 4.33;

const minutes = (s) => { const [a, b] = s.end_time.split(':').map(Number); const [c, d] = s.start_time.split(':').map(Number); return a * 60 + b - (c * 60 + d); };

/** Aggregates per teacher: classes, weekly hours, distinct active students, estimated monthly cost */
export function workload(teacherIds) {
  if (!teacherIds.length) return {};
  const ph = teacherIds.map(() => '?').join(',');
  const sessions = all(`SELECT c.teacher_id, cs.start_time, cs.end_time FROM class_schedules cs JOIN classes c ON c.id = cs.class_id
    WHERE c.active = 1 AND c.teacher_id IN (${ph})`, ...teacherIds);
  const classes = all(`SELECT teacher_id, COUNT(*) n FROM classes WHERE active = 1 AND teacher_id IN (${ph}) GROUP BY teacher_id`, ...teacherIds);
  const students = all(`SELECT c.teacher_id, COUNT(DISTINCT e.student_id) n FROM enrollments e JOIN classes c ON c.id = e.class_id
    JOIN students s ON s.id = e.student_id WHERE c.active = 1 AND s.status = 'active' AND c.teacher_id IN (${ph}) GROUP BY c.teacher_id`, ...teacherIds);
  const out = {};
  for (const id of teacherIds) {
    const mins = sessions.filter((s) => s.teacher_id === id).reduce((t, s) => t + minutes(s), 0);
    out[id] = {
      class_count: classes.find((c) => c.teacher_id === id)?.n || 0,
      weekly_sessions: sessions.filter((s) => s.teacher_id === id).length,
      weekly_hours: Math.round((mins / 60) * 10) / 10,
      student_count: students.find((c) => c.teacher_id === id)?.n || 0,
    };
  }
  return out;
}

export const shape = (t, w) => {
  const load = w[t.id] || { class_count: 0, weekly_sessions: 0, weekly_hours: 0, student_count: 0 };
  return { ...t, show_on_site: !!t.show_on_site, ...load, monthly_cost: Math.round(load.weekly_hours * WEEKS_PER_MONTH * t.hourly_rate) };
};

function loadTeacher(id) {
  const t = get(`SELECT * FROM teachers WHERE id = ?`, id);
  if (!t) throw new HttpError(404, 'Professor não encontrado');
  const classes = attachSchedules(all(`SELECT c.*, (SELECT COUNT(*) FROM enrollments e JOIN students s ON s.id = e.student_id
      WHERE e.class_id = c.id AND s.status = 'active') enrolled FROM classes c WHERE c.teacher_id = ? ORDER BY c.name`, id));
  const since = ymd(new Date(Date.now() - 30 * 864e5));
  const att = get(`SELECT COUNT(*) n, SUM(a.status != 'absent') ok FROM attendance a JOIN classes c ON c.id = a.class_id
    WHERE c.teacher_id = ? AND a.date >= ?`, id, since);
  const login = t.user_id ? get(`SELECT email FROM users WHERE id = ?`, t.user_id) : null;
  return { ...shape(t, workload([id])), classes, attendance_rate: att.n ? Math.round((att.ok / att.n) * 100) : null, login_email: login?.email || null };
}

r.get('/teachers', (req, res) => {
  const { status } = req.query;
  const rows = status
    ? all(`SELECT * FROM teachers WHERE status = ? ORDER BY name`, status)
    : all(`SELECT * FROM teachers ORDER BY status, name`);
  const w = workload(rows.map((t) => t.id));
  res.json(rows.map((t) => shape(t, w)));
});

r.get('/teachers/:id', (req, res) => res.json(loadTeacher(Number(req.params.id))));

const num = (v, d = 0) => (v === undefined || v === null || v === '' ? d : Number(v));

/** Hire */
r.post('/teachers', (req, res) => {
  required(req.body, ['name']);
  const b = req.body;
  const { lastInsertRowid } = run(`INSERT INTO teachers (name, email, phone, specialties, bio, hourly_rate, hired_at, show_on_site, notes)
    VALUES (?,?,?,?,?,?,?,?,?)`, String(b.name).trim(), b.email, b.phone, b.specialties, b.bio, num(b.hourly_rate),
  b.hired_at || today(), b.show_on_site === false ? 0 : 1, b.notes);
  const id = Number(lastInsertRowid);
  if (Array.isArray(b.classIds) && b.classIds.length) assignClasses(id, b.classIds);
  if (b.login?.email) setLogin(id, b.login);
  res.status(201).json(loadTeacher(id));
});

function assignClasses(teacherId, classIds) {
  const t = get(`SELECT name FROM teachers WHERE id = ?`, teacherId);
  for (const cid of classIds) run(`UPDATE classes SET teacher_id = ?, teacher = ? WHERE id = ?`, teacherId, t.name, Number(cid));
}

r.put('/teachers/:id', (req, res) => {
  const id = Number(req.params.id);
  const cur = get(`SELECT * FROM teachers WHERE id = ?`, id);
  if (!cur) throw new HttpError(404, 'Professor não encontrado');
  const b = { ...cur, ...req.body };
  if (!String(b.name || '').trim()) throw new HttpError(400, 'Campos obrigatórios: name');
  tx(() => {
    run(`UPDATE teachers SET name=?, email=?, phone=?, specialties=?, bio=?, hourly_rate=?, hired_at=?, show_on_site=?, notes=? WHERE id=?`,
      String(b.name).trim(), b.email, b.phone, b.specialties, b.bio, num(b.hourly_rate), b.hired_at, b.show_on_site ? 1 : 0, b.notes, id);
    run(`UPDATE classes SET teacher = ? WHERE teacher_id = ?`, String(b.name).trim(), id);
    if (cur.user_id) run(`UPDATE users SET name = ? WHERE id = ?`, String(b.name).trim(), cur.user_id);
    if (Array.isArray(req.body.classIds)) assignClasses(id, req.body.classIds);
  });
  res.json(loadTeacher(id));
});

/**
 * Dismiss: marks the teacher inactive and hands each of their classes to another
 * active teacher (reassign: { [classId]: teacherId | null }). Unmapped classes are left without a teacher.
 */
r.post('/teachers/:id/dismiss', (req, res) => {
  const id = Number(req.params.id);
  const t = get(`SELECT * FROM teachers WHERE id = ?`, id);
  if (!t) throw new HttpError(404, 'Professor não encontrado');
  if (t.status === 'inactive') throw new HttpError(400, 'Este professor já está desligado');
  const reassign = req.body?.reassign || {};
  const date = req.body?.date || today();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new HttpError(400, 'date deve estar no formato YYYY-MM-DD');
  const moved = tx(() => {
    const out = [];
    for (const c of all(`SELECT id, name FROM classes WHERE teacher_id = ?`, id)) {
      const target = reassign[c.id] ? Number(reassign[c.id]) : null;
      if (target) {
        const nt = get(`SELECT id, name FROM teachers WHERE id = ? AND status = 'active'`, target);
        if (!nt || nt.id === id) throw new HttpError(400, `Professor substituto inválido para a turma ${c.name}`);
        run(`UPDATE classes SET teacher_id = ?, teacher = ? WHERE id = ?`, nt.id, nt.name, c.id);
        out.push({ class_id: c.id, class_name: c.name, teacher_id: nt.id, teacher: nt.name });
      } else {
        run(`UPDATE classes SET teacher_id = NULL, teacher = NULL WHERE id = ?`, c.id);
        out.push({ class_id: c.id, class_name: c.name, teacher_id: null, teacher: null });
      }
    }
    run(`UPDATE teachers SET status='inactive', dismissed_at=?, dismissal_reason=?, show_on_site=0 WHERE id=?`, date, req.body?.reason, id);
    return out;
  });
  res.json({ teacher: loadTeacher(id), classes: moved });
});

/** Rehire a dismissed teacher (new contract date) */
r.post('/teachers/:id/rehire', (req, res) => {
  const id = Number(req.params.id);
  const t = get(`SELECT * FROM teachers WHERE id = ?`, id);
  if (!t) throw new HttpError(404, 'Professor não encontrado');
  if (t.status === 'active') throw new HttpError(400, 'Este professor já está ativo');
  run(`UPDATE teachers SET status='active', hired_at=?, dismissed_at=NULL, dismissal_reason=NULL, show_on_site=1 WHERE id=?`, req.body?.date || today(), id);
  res.json(loadTeacher(id));
});

/** Create or update the teacher's access to the teacher area */
function setLogin(teacherId, { email, password }) {
  const t = get(`SELECT * FROM teachers WHERE id = ?`, teacherId);
  if (!t) throw new HttpError(404, 'Professor não encontrado');
  if (!email) throw new HttpError(400, 'Campos obrigatórios: email');
  const clash = get(`SELECT id FROM users WHERE email = ? AND id IS NOT ?`, email, t.user_id);
  if (clash) throw new HttpError(409, 'Já existe uma conta com este e-mail');
  if (t.user_id) {
    run(`UPDATE users SET email = ?, name = ? WHERE id = ?`, email, t.name, t.user_id);
    if (password) {
      if (String(password).length < 6) throw new HttpError(400, 'A senha precisa de ao menos 6 caracteres');
      run(`UPDATE users SET password_hash = ? WHERE id = ?`, bcrypt.hashSync(String(password), 10), t.user_id);
    }
    return;
  }
  if (!password || String(password).length < 6) throw new HttpError(400, 'A senha precisa de ao menos 6 caracteres');
  const uid = Number(run(`INSERT INTO users (name, email, password_hash, role, phone) VALUES (?,?,?,?,?)`,
    t.name, email, bcrypt.hashSync(String(password), 10), 'teacher', t.phone).lastInsertRowid);
  run(`UPDATE teachers SET user_id = ? WHERE id = ?`, uid, teacherId);
}

r.put('/teachers/:id/login', (req, res) => {
  const id = Number(req.params.id);
  tx(() => setLogin(id, req.body || {}));
  res.json(loadTeacher(id));
});

r.delete('/teachers/:id/login', (req, res) => {
  const id = Number(req.params.id);
  const t = get(`SELECT user_id FROM teachers WHERE id = ?`, id);
  if (!t) throw new HttpError(404, 'Professor não encontrado');
  if (!t.user_id) throw new HttpError(400, 'Este professor não tem acesso ao sistema');
  tx(() => { run(`UPDATE teachers SET user_id = NULL WHERE id = ?`, id); run(`DELETE FROM users WHERE id = ?`, t.user_id); });
  res.json(loadTeacher(id));
});

r.delete('/teachers/:id', (req, res) => {
  const id = Number(req.params.id);
  tx(() => {
    run(`UPDATE classes SET teacher_id = NULL, teacher = NULL WHERE teacher_id = ?`, id);
    const uid = get(`SELECT user_id FROM teachers WHERE id = ?`, id)?.user_id;
    const { changes } = run(`DELETE FROM teachers WHERE id = ?`, id);
    if (uid) run(`DELETE FROM users WHERE id = ?`, uid);
    if (!changes) throw new HttpError(404, 'Professor não encontrado');
  });
  res.status(204).end();
});

export default r;
