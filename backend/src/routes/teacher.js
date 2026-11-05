import { Router } from 'express';
import { all, get, run, tx, today, ymd, parseYmd } from '../db.js';
import { requireAuth, requireRole, required, HttpError } from '../auth.js';
import { attachSchedules, upcomingSessions, buildIcs } from '../services.js';
import { workload, shape } from './teachers.js';

/**
 * Teacher area: a teacher (role "teacher", linked through teachers.user_id) manages only their own classes.
 */
const r = Router();
r.use(requireAuth, requireRole('teacher'));

function me(req) {
  const t = get(`SELECT * FROM teachers WHERE user_id = ?`, req.user.id);
  if (!t) throw new HttpError(403, 'Esta conta não está vinculada a um professor');
  if (t.status !== 'active') throw new HttpError(403, 'Acesso de professor desativado');
  return t;
}

const myClasses = (t) => attachSchedules(all(`SELECT c.*, (SELECT COUNT(*) FROM enrollments e JOIN students s ON s.id = e.student_id
    WHERE e.class_id = c.id AND s.status = 'active') enrolled FROM classes c WHERE c.teacher_id = ? AND c.active = 1 ORDER BY c.name`, t.id));

function ownClass(t, classId) {
  const c = get(`SELECT * FROM classes WHERE id = ? AND teacher_id = ?`, Number(classId), t.id);
  if (!c) throw new HttpError(404, 'Turma não encontrada entre as suas');
  return c;
}

const minutes = (s) => { const [a, b] = s.end_time.split(':').map(Number); const [c, d] = s.start_time.split(':').map(Number); return a * 60 + b - (c * 60 + d); };
const daysBack = (n) => ymd(new Date(Date.now() - n * 864e5));
const age = (b) => { if (!b) return null; const d = parseYmd(b); const n = new Date(); let a = n.getFullYear() - d.getFullYear(); if (n < new Date(n.getFullYear(), d.getMonth(), d.getDate())) a--; return a; };

/** Past sessions (up to now) of the given classes in the last N days */
function pastSessions(classes, days) {
  const now = new Date();
  const out = [];
  for (let i = days; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    for (const c of classes) for (const s of c.schedules) {
      if (s.weekday !== d.getDay()) continue;
      const [h, m] = s.end_time.split(':').map(Number);
      if (new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m) > now) continue;
      out.push({ class_id: c.id, class_name: c.name, color: c.color, date: ymd(d), start_time: s.start_time, end_time: s.end_time, minutes: minutes(s) });
    }
  }
  return out;
}

/* ───────────── Profile ───────────── */

r.get('/me', (req, res) => {
  const t = me(req);
  res.json({ ...shape(t, workload([t.id])), email_login: get(`SELECT email FROM users WHERE id = ?`, req.user.id).email });
});

r.put('/me', (req, res) => {
  const t = me(req);
  const b = { ...t, ...req.body };
  run(`UPDATE teachers SET phone = ?, email = ?, bio = ?, specialties = ? WHERE id = ?`, b.phone, b.email, b.bio, b.specialties, t.id);
  run(`UPDATE users SET phone = ? WHERE id = ?`, b.phone, req.user.id);
  res.json(shape(get(`SELECT * FROM teachers WHERE id = ?`, t.id), workload([t.id])));
});

r.get('/calendar.ics', (req, res) => {
  const t = me(req);
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="aulas-backstage.ics"');
  res.send(buildIcs({ id: `prof${t.id}`, name: req.lang === 'en' ? `${t.name}'s classes` : `Aulas de ${t.name}` }, myClasses(t), req.lang));
});

/* ───────────── Dashboard ───────────── */

r.get('/dashboard', (req, res) => {
  const t = me(req);
  const classes = myClasses(t);
  const ids = classes.map((c) => c.id);
  const ph = ids.map(() => '?').join(',') || 'NULL';
  const t0 = today();
  const now = new Date();

  // Attendance rates
  const att30 = ids.length ? all(`SELECT class_id, COUNT(*) n, SUM(status != 'absent') ok FROM attendance WHERE class_id IN (${ph}) AND date >= ? GROUP BY class_id`, ...ids, daysBack(30)) : [];
  const takenDates = new Set(ids.length ? all(`SELECT DISTINCT class_id, date FROM attendance WHERE class_id IN (${ph}) AND date >= ?`, ...ids, daysBack(15)).map((x) => `${x.class_id}|${x.date}`) : []);

  // Today
  const todaySessions = classes.flatMap((c) => c.schedules.filter((s) => s.weekday === now.getDay()).map((s) => {
    const [h, m] = s.start_time.split(':').map(Number); const [eh, em] = s.end_time.split(':').map(Number);
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), eh, em);
    return {
      class_id: c.id, class_name: c.name, color: c.color, room: c.room, enrolled: c.enrolled, start_time: s.start_time, end_time: s.end_time,
      state: now < start ? 'upcoming' : now <= end ? 'live' : 'done', attendance_taken: takenDates.has(`${c.id}|${t0}`),
    };
  })).sort((a, b) => a.start_time.localeCompare(b.start_time));

  // Roll calls not done in the last 14 days
  const pending = pastSessions(classes, 14).filter((s) => !takenDates.has(`${s.class_id}|${s.date}`)).reverse();

  // Students in my classes
  const students = ids.length ? all(`SELECT DISTINCT s.id, s.name, s.birth_date, s.level FROM enrollments e JOIN students s ON s.id = e.student_id
    WHERE e.class_id IN (${ph}) AND s.status = 'active'`, ...ids) : [];

  const birthdays = students.filter((s) => s.birth_date).map((s) => {
    const b = parseYmd(s.birth_date);
    let next = new Date(now.getFullYear(), b.getMonth(), b.getDate());
    if (next < new Date(now.getFullYear(), now.getMonth(), now.getDate())) next = new Date(now.getFullYear() + 1, b.getMonth(), b.getDate());
    return { id: s.id, name: s.name, date: ymd(next), in_days: Math.round((next - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 864e5), turning: next.getFullYear() - b.getFullYear() };
  }).filter((b) => b.in_days <= 30).sort((a, b) => a.in_days - b.in_days);

  const atRisk = ids.length ? all(`SELECT s.id, s.name, c.name class_name, COUNT(*) n, SUM(a.status != 'absent') ok FROM attendance a
    JOIN students s ON s.id = a.student_id JOIN classes c ON c.id = a.class_id
    WHERE a.class_id IN (${ph}) AND a.date >= ? AND s.status = 'active' GROUP BY s.id, a.class_id HAVING n >= 3 AND (1.0 * ok / n) < 0.7
    ORDER BY (1.0 * ok / n) LIMIT 6`, ...ids, daysBack(30)).map((x) => ({ id: x.id, name: x.name, class_name: x.class_name, rate: Math.round((x.ok / x.n) * 100) })) : [];

  // Weekly attendance trend (8 weeks)
  const trendRows = ids.length ? all(`SELECT date, status FROM attendance WHERE class_id IN (${ph}) AND date >= ?`, ...ids, daysBack(56)) : [];
  const weeks = {};
  for (const a of trendRows) {
    const d = parseYmd(a.date); d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    const k = ymd(d); weeks[k] ||= { n: 0, ok: 0 }; weeks[k].n++; if (a.status !== 'absent') weeks[k].ok++;
  }
  const trend = Object.keys(weeks).sort().map((k) => ({ start: k, week: `${k.slice(8, 10)}/${k.slice(5, 7)}`, taxa: Math.round((weeks[k].ok / weeks[k].n) * 100) }));

  // This month (sessions already given)
  const monthSessions = pastSessions(classes, now.getDate() - 1).filter((s) => s.date.slice(0, 7) === t0.slice(0, 7));
  const monthHours = Math.round((monthSessions.reduce((x, s) => x + s.minutes, 0) / 60) * 10) / 10;

  res.json({
    teacher: shape(t, workload([t.id])),
    today: todaySessions,
    next: upcomingSessions(classes, 1)[0] || null,
    pending,
    classes: classes.map((c) => {
      const a = att30.find((x) => x.class_id === c.id);
      return { id: c.id, name: c.name, style: c.style, level: c.level, color: c.color, room: c.room, capacity: c.capacity, enrolled: c.enrolled,
        schedules: c.schedules, attendance_rate: a ? Math.round((a.ok / a.n) * 100) : null };
    }),
    totals: {
      students: students.length,
      classes: classes.length,
      attendance_rate: (() => { const n = att30.reduce((x, a) => x + a.n, 0); return n ? Math.round((att30.reduce((x, a) => x + a.ok, 0) / n) * 100) : null; })(),
      month_sessions: monthSessions.length,
      month_hours: monthHours,
      month_earnings: Math.round(monthHours * t.hourly_rate),
    },
    birthdays,
    atRisk,
    trend,
    events: all(`SELECT id, title, date, time, location, category FROM events WHERE published = 1 AND date >= ? ORDER BY date LIMIT 3`, t0),
    logs: ids.length ? all(`SELECT l.*, c.name class_name, c.color FROM class_logs l JOIN classes c ON c.id = l.class_id WHERE l.class_id IN (${ph}) ORDER BY l.date DESC, l.id DESC LIMIT 3`, ...ids) : [],
  });
});

/* ───────────── Classes ───────────── */

r.get('/classes', (req, res) => res.json(myClasses(me(req))));

r.get('/classes/:id', (req, res) => {
  const t = me(req);
  const c = ownClass(t, req.params.id);
  const [cls] = attachSchedules([c]);
  const since = daysBack(30);
  const roster = all(`SELECT s.id, s.name, s.birth_date, s.level, s.notes, e.enrolled_at, g.name guardian_name, g.phone guardian_phone, s.phone
    FROM enrollments e JOIN students s ON s.id = e.student_id LEFT JOIN users g ON g.id = s.guardian_id
    WHERE e.class_id = ? AND s.status = 'active' ORDER BY s.name`, c.id);
  const att = all(`SELECT student_id, date, status FROM attendance WHERE class_id = ? ORDER BY date DESC`, c.id);
  cls.students = roster.map((s) => {
    const mine = att.filter((a) => a.student_id === s.id);
    const recent = mine.filter((a) => a.date >= since);
    return {
      ...s, age: age(s.birth_date),
      total_present: mine.filter((a) => a.status !== 'absent').length,
      rate30: recent.length ? Math.round((recent.filter((a) => a.status !== 'absent').length / recent.length) * 100) : null,
      last: mine.slice(0, 5).map((a) => a.status),
    };
  });
  cls.enrolled = roster.length;
  const ages = cls.students.map((s) => s.age).filter((a) => a !== null);
  cls.stats = {
    avg_age: ages.length ? Math.round((ages.reduce((a, b) => a + b, 0) / ages.length) * 10) / 10 : null,
    attendance_rate: (() => { const r30 = att.filter((a) => a.date >= since); return r30.length ? Math.round((r30.filter((a) => a.status !== 'absent').length / r30.length) * 100) : null; })(),
    sessions_given: new Set(att.map((a) => a.date)).size,
    levels: cls.students.reduce((m, s) => ({ ...m, [s.level]: (m[s.level] || 0) + 1 }), {}),
  };
  res.json(cls);
});

/* ───────────── Attendance (own classes only) ───────────── */

r.get('/attendance', (req, res) => {
  const t = me(req);
  if (!req.query.classId) throw new HttpError(400, 'Informe classId');
  const c = ownClass(t, req.query.classId);
  const date = req.query.date || today();
  const roster = all(`SELECT s.id student_id, s.name, s.level, a.status FROM enrollments e
    JOIN students s ON s.id = e.student_id
    LEFT JOIN attendance a ON a.student_id = s.id AND a.class_id = e.class_id AND a.date = ?
    WHERE e.class_id = ? AND s.status = 'active' ORDER BY s.name`, date, c.id);
  res.json({ classId: c.id, date, roster });
});

r.post('/attendance', (req, res) => {
  const t = me(req);
  required(req.body, ['classId', 'date', 'records']);
  const c = ownClass(t, req.body.classId);
  const { date, records } = req.body;
  if (date > today()) throw new HttpError(400, 'Não é possível fazer chamada de uma data futura');
  if (!Array.isArray(records)) throw new HttpError(400, 'records deve ser uma lista');
  const enrolled = new Set(all(`SELECT student_id FROM enrollments WHERE class_id = ?`, c.id).map((x) => x.student_id));
  tx(() => {
    for (const rec of records) {
      const sid = Number(rec.studentId);
      if (!enrolled.has(sid)) throw new HttpError(400, 'Aluno não pertence a esta turma');
      if (!rec.status) { run(`DELETE FROM attendance WHERE student_id=? AND class_id=? AND date=?`, sid, c.id, date); continue; }
      if (!['present', 'absent', 'late'].includes(rec.status)) throw new HttpError(400, 'Status de presença inválido');
      run(`INSERT INTO attendance (student_id, class_id, date, status) VALUES (?,?,?,?)
        ON CONFLICT(student_id, class_id, date) DO UPDATE SET status = excluded.status`, sid, c.id, date, rec.status);
    }
  });
  res.json({ ok: true, saved: records.length });
});

/* ───────────── Class diary ───────────── */

r.get('/logs', (req, res) => {
  const t = me(req);
  if (req.query.classId) ownClass(t, req.query.classId);
  res.json(all(`SELECT l.*, c.name class_name, c.color FROM class_logs l JOIN classes c ON c.id = l.class_id
    WHERE c.teacher_id = ? ${req.query.classId ? 'AND l.class_id = ?' : ''} ORDER BY l.date DESC, l.id DESC`,
  t.id, ...(req.query.classId ? [Number(req.query.classId)] : [])));
});

r.post('/logs', (req, res) => {
  const t = me(req);
  required(req.body, ['classId', 'date', 'content']);
  const c = ownClass(t, req.body.classId);
  const { lastInsertRowid } = run(`INSERT INTO class_logs (class_id, teacher_id, date, title, content) VALUES (?,?,?,?,?)`,
    c.id, t.id, req.body.date, req.body.title, String(req.body.content).trim());
  res.status(201).json(get(`SELECT l.*, c.name class_name, c.color FROM class_logs l JOIN classes c ON c.id = l.class_id WHERE l.id = ?`, Number(lastInsertRowid)));
});

function ownLog(t, id) {
  const l = get(`SELECT l.* FROM class_logs l JOIN classes c ON c.id = l.class_id WHERE l.id = ? AND c.teacher_id = ?`, Number(id), t.id);
  if (!l) throw new HttpError(404, 'Registro não encontrado');
  return l;
}

r.put('/logs/:id', (req, res) => {
  const t = me(req);
  const l = { ...ownLog(t, req.params.id), ...req.body };
  if (!String(l.content || '').trim()) throw new HttpError(400, 'Campos obrigatórios: content');
  run(`UPDATE class_logs SET date = ?, title = ?, content = ? WHERE id = ?`, l.date, l.title, String(l.content).trim(), l.id);
  res.json(get(`SELECT l.*, c.name class_name, c.color FROM class_logs l JOIN classes c ON c.id = l.class_id WHERE l.id = ?`, l.id));
});

r.delete('/logs/:id', (req, res) => {
  const t = me(req);
  ownLog(t, req.params.id);
  run(`DELETE FROM class_logs WHERE id = ?`, Number(req.params.id));
  res.status(204).end();
});

export default r;
