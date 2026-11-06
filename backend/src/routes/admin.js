import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { all, get, run, tx, today, refreshOverdue } from '../db.js';
import { requireAuth, requireRole, required, HttpError } from '../auth.js';
import { attachSchedules, studentClasses, attendanceStats, ACHIEVEMENT_METRICS, ACHIEVEMENT_ICONS, studentMetrics } from '../services.js';
import cms from './cms.js';
import analytics from './analytics.js';
import teachers from './teachers.js';

const r = Router();
r.use(requireAuth, requireRole('manager'));
r.use(cms);
r.use(analytics);
r.use(teachers);

const num = (v) => (v === undefined || v === null || v === '' ? null : Number(v));

/* ───────────── Users (guardian / student / manager logins) ───────────── */

r.get('/users', (req, res) => {
  const { role } = req.query;
  const rows = role
    ? all(`SELECT id, name, email, role, phone, created_at FROM users WHERE role = ? ORDER BY name`, role)
    : all(`SELECT id, name, email, role, phone, created_at FROM users ORDER BY role, name`);
  res.json(rows);
});

function createUser({ name, email, password, role, phone }) {
  if (!['manager', 'guardian', 'student', 'teacher'].includes(role)) throw new HttpError(400, 'Perfil inválido');
  if (get(`SELECT id FROM users WHERE email = ?`, email)) throw new HttpError(409, 'Já existe uma conta com este e-mail');
  if (!password || String(password).length < 6) throw new HttpError(400, 'A senha precisa de ao menos 6 caracteres');
  const { lastInsertRowid } = run(`INSERT INTO users (name, email, password_hash, role, phone) VALUES (?,?,?,?,?)`,
    name, email, bcrypt.hashSync(String(password), 10), role, phone);
  return Number(lastInsertRowid);
}

r.post('/users', (req, res) => {
  required(req.body, ['name', 'email', 'password', 'role']);
  const id = createUser(req.body);
  res.status(201).json(get(`SELECT id, name, email, role, phone, created_at FROM users WHERE id = ?`, id));
});

r.delete('/users/:id', (req, res) => {
  if (Number(req.params.id) === req.user.id) throw new HttpError(400, 'Você não pode excluir a própria conta');
  const { changes } = run(`DELETE FROM users WHERE id = ?`, Number(req.params.id));
  if (!changes) throw new HttpError(404, 'Usuário não encontrado');
  res.status(204).end();
});

/* ───────────── Students ───────────── */

const STUDENT_SELECT = `SELECT s.*, g.name guardian_name, g.email guardian_email, g.phone guardian_phone, u.email login_email,
  (SELECT COUNT(*) FROM enrollments e WHERE e.student_id = s.id) class_count
  FROM students s LEFT JOIN users g ON g.id = s.guardian_id LEFT JOIN users u ON u.id = s.user_id`;

r.get('/students', (req, res) => {
  const { search, status, classId } = req.query;
  const where = [];
  const args = [];
  if (search) { where.push(`(s.name LIKE ? OR s.email LIKE ? OR g.name LIKE ?)`); args.push(`%${search}%`, `%${search}%`, `%${search}%`); }
  if (status) { where.push(`s.status = ?`); args.push(status); }
  if (classId) { where.push(`s.id IN (SELECT student_id FROM enrollments WHERE class_id = ?)`); args.push(Number(classId)); }
  const rows = all(`${STUDENT_SELECT} ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY s.name`, ...args);
  const classMap = {};
  for (const e of all(`SELECT e.student_id, c.id, c.name, c.color, c.style FROM enrollments e JOIN classes c ON c.id = e.class_id`)) {
    (classMap[e.student_id] ||= []).push({ id: e.id, name: e.name, color: e.color, style: e.style });
  }
  res.json(rows.map((s) => ({ ...s, classes: classMap[s.id] || [] })));
});

function loadStudent(id) {
  const s = get(`${STUDENT_SELECT} WHERE s.id = ?`, id);
  if (!s) throw new HttpError(404, 'Aluno não encontrado');
  refreshOverdue();
  return {
    ...s,
    classes: studentClasses(id),
    stats: attendanceStats(id),
    payments: all(`SELECT * FROM payments WHERE student_id = ? ORDER BY reference_month DESC LIMIT 12`, id),
    recentAttendance: all(`SELECT a.date, a.status, c.name class_name FROM attendance a JOIN classes c ON c.id = a.class_id
      WHERE a.student_id = ? ORDER BY a.date DESC LIMIT 15`, id),
  };
}

r.get('/students/:id', (req, res) => res.json(loadStudent(Number(req.params.id))));

function setEnrollments(studentId, classIds = []) {
  if (!classIds.length) run(`DELETE FROM enrollments WHERE student_id = ?`, studentId);
  else run(`DELETE FROM enrollments WHERE student_id = ? AND class_id NOT IN (${classIds.map(() => '?').join(',')})`, studentId, ...classIds);
  for (const cid of classIds) run(`INSERT OR IGNORE INTO enrollments (student_id, class_id) VALUES (?,?)`, studentId, Number(cid));
}

/** Resolve guardian: existing id, or create one from {name,email,password,phone} */
function resolveGuardian(body) {
  if (body.guardian_id) return Number(body.guardian_id);
  const g = body.guardian;
  if (g?.email) {
    const existing = get(`SELECT id, role FROM users WHERE email = ?`, g.email);
    if (existing) return existing.id;
    required(g, ['name', 'email', 'password']);
    return createUser({ ...g, role: 'guardian' });
  }
  return null;
}

function resolveStudentLogin(body, name) {
  const l = body.login;
  if (!l?.email) return null;
  required(l, ['email', 'password']);
  return createUser({ name, email: l.email, password: l.password, role: 'student', phone: body.phone });
}

r.post('/students', (req, res) => {
  required(req.body, ['name']);
  const b = req.body;
  const id = tx(() => {
    const guardianId = resolveGuardian(b);
    const userId = resolveStudentLogin(b, b.name);
    const { lastInsertRowid } = run(
      `INSERT INTO students (name, birth_date, email, phone, level, status, guardian_id, user_id, monthly_fee, notes, joined_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      b.name, b.birth_date, b.email, b.phone, b.level || 'Iniciante', b.status || 'active', guardianId, userId,
      num(b.monthly_fee) ?? 180, b.notes, b.joined_at || today());
    const sid = Number(lastInsertRowid);
    if (Array.isArray(b.classIds)) setEnrollments(sid, b.classIds.map(Number));
    return sid;
  });
  res.status(201).json(loadStudent(id));
});

r.put('/students/:id', (req, res) => {
  const id = Number(req.params.id);
  const cur = get(`SELECT * FROM students WHERE id = ?`, id);
  if (!cur) throw new HttpError(404, 'Aluno não encontrado');
  const b = { ...cur, ...req.body };
  tx(() => {
    const guardianId = req.body.guardian_id !== undefined || req.body.guardian ? resolveGuardian(req.body) : cur.guardian_id;
    const userId = req.body.login?.email ? resolveStudentLogin(req.body, b.name) : cur.user_id;
    run(`UPDATE students SET name=?, birth_date=?, email=?, phone=?, level=?, status=?, guardian_id=?, user_id=?, monthly_fee=?, notes=?, joined_at=? WHERE id=?`,
      b.name, b.birth_date, b.email, b.phone, b.level, b.status, guardianId, userId, num(b.monthly_fee) ?? 180, b.notes, b.joined_at, id);
    if (Array.isArray(req.body.classIds)) setEnrollments(id, req.body.classIds.map(Number));
  });
  res.json(loadStudent(id));
});

r.put('/students/:id/classes', (req, res) => {
  const id = Number(req.params.id);
  if (!get(`SELECT id FROM students WHERE id = ?`, id)) throw new HttpError(404, 'Aluno não encontrado');
  if (!Array.isArray(req.body?.classIds)) throw new HttpError(400, 'classIds deve ser uma lista');
  tx(() => setEnrollments(id, req.body.classIds.map(Number)));
  res.json(studentClasses(id));
});

r.delete('/students/:id', (req, res) => {
  const { changes } = run(`DELETE FROM students WHERE id = ?`, Number(req.params.id));
  if (!changes) throw new HttpError(404, 'Aluno não encontrado');
  res.status(204).end();
});

/* ───────────── Classes ───────────── */

const CLASS_SELECT = `SELECT c.*, (SELECT COUNT(*) FROM enrollments e JOIN students s ON s.id = e.student_id
  WHERE e.class_id = c.id AND s.status = 'active') enrolled FROM classes c`;

r.get('/classes', (req, res) => res.json(attachSchedules(all(`${CLASS_SELECT} ORDER BY c.style, c.name`))));

function loadClass(id) {
  const c = get(`${CLASS_SELECT} WHERE c.id = ?`, id);
  if (!c) throw new HttpError(404, 'Turma não encontrada');
  const [withSched] = attachSchedules([c]);
  withSched.students = all(`SELECT s.id, s.name, s.level, s.status, s.birth_date, e.enrolled_at FROM enrollments e
    JOIN students s ON s.id = e.student_id WHERE e.class_id = ? ORDER BY s.name`, id);
  return withSched;
}

r.get('/classes/:id', (req, res) => res.json(loadClass(Number(req.params.id))));

function resolveTeacher(teacherId) {
  if (!teacherId) return null;
  const t = get(`SELECT id, name, status FROM teachers WHERE id = ?`, Number(teacherId));
  if (!t) throw new HttpError(400, 'Professor não encontrado');
  if (t.status !== 'active') throw new HttpError(400, `${t.name} está desligado(a) e não pode assumir turmas`);
  return t;
}

function validateSchedules(list) {
  if (!Array.isArray(list)) return [];
  const re = /^\d{2}:\d{2}$/;
  for (const s of list) {
    if (!(s.weekday >= 0 && s.weekday <= 6) || !re.test(s.start_time) || !re.test(s.end_time) || s.end_time <= s.start_time) {
      throw new HttpError(400, 'Horário inválido: informe weekday (0-6), start_time e end_time (HH:MM) com fim após o início');
    }
  }
  return list;
}

function saveSchedules(classId, list) {
  run(`DELETE FROM class_schedules WHERE class_id = ?`, classId);
  for (const s of list) run(`INSERT INTO class_schedules (class_id, weekday, start_time, end_time) VALUES (?,?,?,?)`,
    classId, Number(s.weekday), s.start_time, s.end_time);
}

r.post('/classes', (req, res) => {
  required(req.body, ['name', 'style']);
  const b = req.body;
  const schedules = validateSchedules(b.schedules);
  const teacher = resolveTeacher(b.teacher_id);
  const id = tx(() => {
    const { lastInsertRowid } = run(`INSERT INTO classes (name, style, level, teacher_id, teacher, room, capacity, color, description, active)
      VALUES (?,?,?,?,?,?,?,?,?,?)`, b.name, b.style, b.level, teacher?.id, teacher?.name, b.room, num(b.capacity) ?? 20, b.color || '#e8b04b',
      b.description, b.active === false ? 0 : 1);
    saveSchedules(Number(lastInsertRowid), schedules);
    return Number(lastInsertRowid);
  });
  res.status(201).json(loadClass(id));
});

r.put('/classes/:id', (req, res) => {
  const id = Number(req.params.id);
  const cur = get(`SELECT * FROM classes WHERE id = ?`, id);
  if (!cur) throw new HttpError(404, 'Turma não encontrada');
  const b = { ...cur, ...req.body };
  const schedules = req.body.schedules ? validateSchedules(req.body.schedules) : null;
  const teacher = req.body.teacher_id !== undefined ? resolveTeacher(req.body.teacher_id) : (cur.teacher_id ? { id: cur.teacher_id, name: cur.teacher } : null);
  tx(() => {
    run(`UPDATE classes SET name=?, style=?, level=?, teacher_id=?, teacher=?, room=?, capacity=?, color=?, description=?, active=? WHERE id=?`,
      b.name, b.style, b.level, teacher?.id, teacher?.name, b.room, num(b.capacity) ?? 20, b.color, b.description, b.active ? 1 : 0, id);
    if (schedules) saveSchedules(id, schedules);
  });
  res.json(loadClass(id));
});

r.delete('/classes/:id', (req, res) => {
  const { changes } = run(`DELETE FROM classes WHERE id = ?`, Number(req.params.id));
  if (!changes) throw new HttpError(404, 'Turma não encontrada');
  res.status(204).end();
});

/** Class roster management */
r.post('/classes/:id/students', (req, res) => {
  const id = Number(req.params.id);
  required(req.body, ['studentId']);
  const c = get(`SELECT id, capacity FROM classes WHERE id = ?`, id);
  if (!c) throw new HttpError(404, 'Turma não encontrada');
  if (!get(`SELECT id FROM students WHERE id = ?`, Number(req.body.studentId))) throw new HttpError(404, 'Aluno não encontrado');
  run(`INSERT OR IGNORE INTO enrollments (student_id, class_id) VALUES (?,?)`, Number(req.body.studentId), id);
  res.status(201).json(loadClass(id));
});

r.delete('/classes/:id/students/:studentId', (req, res) => {
  const id = Number(req.params.id);
  const { changes } = run(`DELETE FROM enrollments WHERE class_id = ? AND student_id = ?`, id, Number(req.params.studentId));
  if (!changes) throw new HttpError(404, 'Aluno não está matriculado nesta turma');
  res.json(loadClass(id));
});

/** Class diaries written by teachers (read-only for management), filterable by teacher / class / period */
r.get('/logs', (req, res) => {
  const { teacherId, classId, from, to, search } = req.query;
  const where = [];
  const args = [];
  if (teacherId) { where.push('l.teacher_id = ?'); args.push(Number(teacherId)); }
  if (classId) { where.push('l.class_id = ?'); args.push(Number(classId)); }
  if (from) { where.push('l.date >= ?'); args.push(from); }
  if (to) { where.push('l.date <= ?'); args.push(to); }
  if (search) { where.push('(l.title LIKE ? OR l.content LIKE ?)'); args.push(`%${search}%`, `%${search}%`); }
  const entries = all(`SELECT l.*, c.name class_name, c.color, c.style, c.teacher_id current_teacher_id, t.name teacher_name
    FROM class_logs l JOIN classes c ON c.id = l.class_id LEFT JOIN teachers t ON t.id = l.teacher_id
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY c.name, l.date DESC, l.id DESC`, ...args);
  // Group by class, keeping each class's latest entry date for quick scanning
  const byClass = [];
  for (const e of entries) {
    let g = byClass.find((x) => x.class_id === e.class_id);
    if (!g) { g = { class_id: e.class_id, class_name: e.class_name, color: e.color, style: e.style, count: 0, last_date: e.date, teachers: [], entries: [] }; byClass.push(g); }
    g.count++;
    if (e.teacher_name && !g.teachers.includes(e.teacher_name)) g.teachers.push(e.teacher_name);
    g.entries.push(e);
  }
  res.json({ total: entries.length, classes: byClass });
});

/* ───────── Achievements (rules shown in the student portal) ───────── */

r.get('/achievements/options', (req, res) => {
  res.json({ metrics: Object.entries(ACHIEVEMENT_METRICS).map(([key, label]) => ({ key, label })), icons: ACHIEVEMENT_ICONS });
});

r.get('/achievements', (req, res) => {
  const rules = all(`SELECT * FROM achievements ORDER BY sort_order, id`);
  // How many active students currently meet each rule
  const metrics = all(`SELECT id FROM students WHERE status = 'active'`).map((s) => studentMetrics(s.id));
  res.json({
    active_students: metrics.length,
    achievements: rules.map((a) => {
      const unlocked = metrics.filter((m) => (m[a.metric] ?? 0) >= a.target).length;
      return { ...a, active: !!a.active, unlocked_count: unlocked, unlocked_pct: metrics.length ? Math.round((unlocked / metrics.length) * 100) : 0 };
    }),
  });
});

function validAchievement(b, partial = false) {
  if (!partial || b.title !== undefined) if (!String(b.title || '').trim()) throw new HttpError(400, 'Campos obrigatórios: title');
  if (!partial || b.metric !== undefined) if (!ACHIEVEMENT_METRICS[b.metric]) throw new HttpError(400, 'Métrica inválida');
  if (!partial || b.target !== undefined) if (!(Number.isInteger(Number(b.target)) && Number(b.target) >= 1)) throw new HttpError(400, 'A meta deve ser um número inteiro maior que zero');
  if (b.icon !== undefined && !ACHIEVEMENT_ICONS.includes(b.icon)) throw new HttpError(400, 'Ícone inválido');
}

const loadAchievement = (id) => {
  const a = get(`SELECT * FROM achievements WHERE id = ?`, id);
  if (!a) throw new HttpError(404, 'Conquista não encontrada');
  return { ...a, active: !!a.active };
};

r.post('/achievements', (req, res) => {
  const b = req.body || {};
  validAchievement(b);
  const order = b.sort_order ?? (get(`SELECT COALESCE(MAX(sort_order), 0) + 1 n FROM achievements`).n);
  const { lastInsertRowid } = run(`INSERT INTO achievements (title, description, icon, metric, target, active, sort_order) VALUES (?,?,?,?,?,?,?)`,
    String(b.title).trim(), b.description, b.icon || 'star', b.metric, Number(b.target), b.active === false ? 0 : 1, Number(order));
  res.status(201).json(loadAchievement(Number(lastInsertRowid)));
});

r.put('/achievements/:id', (req, res) => {
  const cur = loadAchievement(Number(req.params.id));
  validAchievement(req.body || {}, true);
  const b = { ...cur, ...req.body };
  run(`UPDATE achievements SET title=?, description=?, icon=?, metric=?, target=?, active=?, sort_order=? WHERE id=?`,
    String(b.title).trim(), b.description, b.icon, b.metric, Number(b.target), b.active ? 1 : 0, Number(b.sort_order) || 0, cur.id);
  res.json(loadAchievement(cur.id));
});

r.delete('/achievements/:id', (req, res) => {
  const { changes } = run(`DELETE FROM achievements WHERE id = ?`, Number(req.params.id));
  if (!changes) throw new HttpError(404, 'Conquista não encontrada');
  res.status(204).end();
});

/** Weekly timetable: one row per (class, weekday, time) */
r.get('/schedule/week', (req, res) => {
  res.json(all(`SELECT cs.id schedule_id, cs.weekday, cs.start_time, cs.end_time, c.id class_id, c.name, c.style, c.level,
      c.teacher, c.room, c.color, c.capacity,
      (SELECT COUNT(*) FROM enrollments e JOIN students s ON s.id = e.student_id WHERE e.class_id = c.id AND s.status='active') enrolled
    FROM class_schedules cs JOIN classes c ON c.id = cs.class_id WHERE c.active = 1 ORDER BY cs.weekday, cs.start_time`));
});

/* ───────────── Attendance ───────────── */

r.get('/attendance', (req, res) => {
  const classId = Number(req.query.classId);
  const date = req.query.date || today();
  if (!classId) throw new HttpError(400, 'Informe classId');
  const roster = all(`SELECT s.id student_id, s.name, s.level, a.status FROM enrollments e
    JOIN students s ON s.id = e.student_id
    LEFT JOIN attendance a ON a.student_id = s.id AND a.class_id = e.class_id AND a.date = ?
    WHERE e.class_id = ? AND s.status = 'active' ORDER BY s.name`, date, classId);
  res.json({ classId, date, roster });
});

r.post('/attendance', (req, res) => {
  required(req.body, ['classId', 'date', 'records']);
  const { classId, date, records } = req.body;
  if (!Array.isArray(records)) throw new HttpError(400, 'records deve ser uma lista');
  tx(() => {
    for (const rec of records) {
      if (!rec.status) { run(`DELETE FROM attendance WHERE student_id=? AND class_id=? AND date=?`, rec.studentId, classId, date); continue; }
      if (!['present', 'absent', 'late'].includes(rec.status)) throw new HttpError(400, 'Status de presença inválido');
      run(`INSERT INTO attendance (student_id, class_id, date, status) VALUES (?,?,?,?)
        ON CONFLICT(student_id, class_id, date) DO UPDATE SET status = excluded.status`, Number(rec.studentId), Number(classId), date, rec.status);
    }
  });
  res.json({ ok: true, saved: records.length });
});

/* ───────────── Payments ───────────── */

r.get('/payments', (req, res) => {
  refreshOverdue();
  const { month, status } = req.query;
  const where = [];
  const args = [];
  if (month) { where.push('p.reference_month = ?'); args.push(month); }
  if (status) { where.push('p.status = ?'); args.push(status); }
  res.json(all(`SELECT p.*, s.name student_name, g.name guardian_name FROM payments p JOIN students s ON s.id = p.student_id
    LEFT JOIN users g ON g.id = s.guardian_id ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY p.reference_month DESC, s.name`, ...args));
});

r.post('/payments/generate', (req, res) => {
  required(req.body, ['month']);
  const { month } = req.body;
  if (!/^\d{4}-\d{2}$/.test(month)) throw new HttpError(400, 'month deve estar no formato YYYY-MM');
  const due = `${month}-${String(req.body.dueDay || 10).padStart(2, '0')}`;
  const created = tx(() => {
    let n = 0;
    for (const s of all(`SELECT id, monthly_fee FROM students WHERE status = 'active'`)) {
      n += Number(run(`INSERT OR IGNORE INTO payments (student_id, reference_month, amount, due_date, status) VALUES (?,?,?,?, 'pending')`,
        s.id, month, s.monthly_fee, due).changes);
    }
    return n;
  });
  refreshOverdue();
  res.status(201).json({ month, created });
});

r.patch('/payments/:id', (req, res) => {
  const id = Number(req.params.id);
  const { status, amount } = req.body || {};
  const cur = get(`SELECT * FROM payments WHERE id = ?`, id);
  if (!cur) throw new HttpError(404, 'Cobrança não encontrada');
  if (status && !['paid', 'pending', 'overdue'].includes(status)) throw new HttpError(400, 'Status inválido');
  const newStatus = status || cur.status;
  run(`UPDATE payments SET status=?, amount=?, paid_at=? WHERE id=?`, newStatus, num(amount) ?? cur.amount,
    newStatus === 'paid' ? (cur.paid_at || today()) : null, id);
  refreshOverdue();
  res.json(get(`SELECT * FROM payments WHERE id = ?`, id));
});

export default r;
