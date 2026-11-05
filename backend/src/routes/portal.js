import { Router } from 'express';
import { all, get, run, today, refreshOverdue } from '../db.js';
import { requireAuth, requireRole, required, HttpError } from '../auth.js';
import { studentClasses, upcomingSessions, attendanceStats, journey, achievements, buildIcs } from '../services.js';

const r = Router();
r.use(requireAuth, requireRole('guardian', 'student'));

const myStudents = (user) =>
  all(`SELECT * FROM students WHERE guardian_id = ? OR user_id = ? ORDER BY name`, user.id, user.id);

function ownStudent(req) {
  const id = Number(req.params.id ?? req.body?.studentId ?? req.query.studentId);
  const s = get(`SELECT * FROM students WHERE id = ? AND (guardian_id = ? OR user_id = ?)`, id, req.user.id, req.user.id);
  if (!s) throw new HttpError(404, 'Aluno não encontrado nesta conta');
  return s;
}

r.get('/students', (req, res) => {
  res.json(myStudents(req.user).map((s) => ({ ...s, classes: studentClasses(s.id) })));
});

r.get('/students/:id/overview', (req, res) => {
  const s = ownStudent(req);
  refreshOverdue();
  const classes = studentClasses(s.id);
  const stats = attendanceStats(s.id);
  const pay = all(`SELECT * FROM payments WHERE student_id = ? ORDER BY reference_month DESC`, s.id);
  const openPayments = pay.filter((p) => p.status !== 'paid');
  const events = all(
    `SELECT e.*, r.status rsvp FROM events e
     LEFT JOIN event_rsvps r ON r.event_id = e.id AND r.student_id = ?
     WHERE e.published = 1 AND e.date >= ? ORDER BY e.date LIMIT 3`, s.id, today());
  const announcements = all(`SELECT * FROM announcements WHERE published = 1
     ORDER BY pinned DESC, created_at DESC LIMIT 4`).map((a) => ({ ...a, pinned: !!a.pinned }));
  res.json({
    student: s,
    classes,
    upcoming: upcomingSessions(classes, 6),
    stats,
    journey: journey(stats),
    achievements: achievements(s.id),
    payments: { open: openPayments, openTotal: openPayments.reduce((t, p) => t + p.amount, 0), last: pay[0] || null },
    events,
    announcements,
  });
});

r.get('/students/:id/schedule', (req, res) => {
  const s = ownStudent(req);
  const classes = studentClasses(s.id);
  res.json({ classes, upcoming: upcomingSessions(classes, 10) });
});

r.get('/students/:id/attendance', (req, res) => {
  const s = ownStudent(req);
  const rows = all(`SELECT a.date, a.status, c.name class_name, c.color, c.style FROM attendance a
    JOIN classes c ON c.id = a.class_id WHERE a.student_id = ? ORDER BY a.date DESC`, s.id);
  res.json({ stats: attendanceStats(s.id), records: rows });
});

r.get('/students/:id/achievements', (req, res) => {
  const s = ownStudent(req);
  const stats = attendanceStats(s.id);
  res.json({ journey: journey(stats), achievements: achievements(s.id) });
});

r.get('/students/:id/payments', (req, res) => {
  const s = ownStudent(req);
  refreshOverdue();
  res.json(all(`SELECT * FROM payments WHERE student_id = ? ORDER BY reference_month DESC`, s.id));
});

r.get('/students/:id/calendar.ics', (req, res) => {
  const s = ownStudent(req);
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="agenda-backstage-${s.id}.ics"`);
  res.send(buildIcs(s, studentClasses(s.id), req.lang));
});

r.get('/events', (req, res) => {
  const s = ownStudent(req);
  res.json(all(`SELECT e.*, r.status rsvp,
      (SELECT COUNT(*) FROM event_rsvps x WHERE x.event_id = e.id AND x.status = 'going') going_count
    FROM events e LEFT JOIN event_rsvps r ON r.event_id = e.id AND r.student_id = ?
    WHERE e.published = 1 AND e.date >= ? ORDER BY e.date`, s.id, today()));
});

r.put('/events/:eventId/rsvp', (req, res) => {
  required(req.body, ['studentId', 'status']);
  const s = ownStudent(req);
  if (!['going', 'maybe', 'not_going'].includes(req.body.status)) throw new HttpError(400, 'Status inválido');
  const ev = get(`SELECT id FROM events WHERE id = ? AND published = 1`, Number(req.params.eventId));
  if (!ev) throw new HttpError(404, 'Evento não encontrado');
  run(`INSERT INTO event_rsvps (event_id, student_id, status) VALUES (?,?,?)
       ON CONFLICT(event_id, student_id) DO UPDATE SET status = excluded.status, updated_at = datetime('now','localtime')`,
    ev.id, s.id, req.body.status);
  res.json({ event_id: ev.id, student_id: s.id, status: req.body.status });
});

r.get('/announcements', (req, res) => {
  res.json(all(`SELECT * FROM announcements WHERE published = 1
    ORDER BY pinned DESC, created_at DESC`).map((a) => ({ ...a, pinned: !!a.pinned })));
});

export default r;
