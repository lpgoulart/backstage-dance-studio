import { Router } from 'express';
import { all, get, ymd, today, parseYmd, refreshOverdue } from '../db.js';
import { WEEKDAYS } from '../services.js';

const r = Router();

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const monthLabel = (key) => { const [y, m] = key.split('-'); return `${MONTHS[Number(m) - 1]}/${y.slice(2)}`; };

function lastMonths(n) {
  const now = new Date();
  return Array.from({ length: n }, (_, i) => monthKey(new Date(now.getFullYear(), now.getMonth() - (n - 1 - i), 1)));
}

r.get('/analytics', (req, res) => {
  refreshOverdue();
  const t = today();
  const thisMonth = t.slice(0, 7);
  const since30 = ymd(new Date(Date.now() - 30 * 864e5));
  const since60 = ymd(new Date(Date.now() - 60 * 864e5));

  const students = all(`SELECT id, status, birth_date, joined_at FROM students`);
  const active = students.filter((s) => s.status === 'active');

  const att30 = get(`SELECT COUNT(*) n, SUM(status != 'absent') ok FROM attendance WHERE date >= ?`, since30);
  const attPrev = get(`SELECT COUNT(*) n, SUM(status != 'absent') ok FROM attendance WHERE date >= ? AND date < ?`, since60, since30);
  const rate = (x) => (x.n ? Math.round((x.ok / x.n) * 100) : 0);

  const classes = all(`SELECT c.id, c.name, c.style, c.capacity, c.color,
      (SELECT COUNT(*) FROM enrollments e JOIN students s ON s.id = e.student_id WHERE e.class_id = c.id AND s.status='active') enrolled,
      (SELECT COUNT(*) FROM class_schedules cs WHERE cs.class_id = c.id) sessions
    FROM classes c WHERE c.active = 1 ORDER BY c.name`);
  const totalCap = classes.reduce((a, c) => a + c.capacity, 0);
  const totalEnr = classes.reduce((a, c) => a + c.enrolled, 0);

  const monthPay = get(`SELECT
      COALESCE(SUM(CASE WHEN status='paid' THEN amount END),0) paid,
      COALESCE(SUM(CASE WHEN status='pending' THEN amount END),0) pending,
      COALESCE(SUM(CASE WHEN status='overdue' THEN amount END),0) overdue
    FROM payments WHERE reference_month = ?`, thisMonth);
  const overdueAll = get(`SELECT COUNT(*) n, COALESCE(SUM(amount),0) total FROM payments WHERE status='overdue'`);

  // Enrollment distribution per style
  const byStyle = all(`SELECT c.style name, COUNT(*) value FROM enrollments e JOIN classes c ON c.id = e.class_id
    JOIN students s ON s.id = e.student_id WHERE s.status='active' GROUP BY c.style ORDER BY value DESC`);

  // New students per month (12 months)
  const months12 = lastMonths(12);
  const newByMonth = months12.map((m) => ({
    key: m,
    month: monthLabel(m),
    novos: students.filter((s) => s.joined_at.slice(0, 7) === m).length,
  }));
  let running = students.filter((s) => s.joined_at.slice(0, 7) < months12[0]).length;
  newByMonth.forEach((row) => { running += row.novos; row.total = running; });

  // Revenue per month (6 months)
  const months6 = lastMonths(6);
  const payRows = all(`SELECT reference_month m, status, SUM(amount) total FROM payments
    WHERE reference_month >= ? GROUP BY reference_month, status`, months6[0]);
  const revenue = months6.map((m) => {
    const pick = (st) => payRows.find((p) => p.m === m && p.status === st)?.total || 0;
    return { key: m, month: monthLabel(m), recebido: pick('paid'), pendente: pick('pending'), atrasado: pick('overdue') };
  });

  // Attendance rate per week (12 weeks)
  const attRows = all(`SELECT date, status FROM attendance WHERE date >= ?`, ymd(new Date(Date.now() - 84 * 864e5)));
  const weeks = {};
  for (const a of attRows) {
    const d = parseYmd(a.date);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    const k = ymd(d);
    weeks[k] ||= { n: 0, ok: 0 };
    weeks[k].n++;
    if (a.status !== 'absent') weeks[k].ok++;
  }
  const attendanceWeekly = Object.keys(weeks).sort().map((k) => ({
    start: k,
    week: `${k.slice(8, 10)}/${k.slice(5, 7)}`,
    taxa: Math.round((weeks[k].ok / weeks[k].n) * 100),
    aulas: weeks[k].n,
  }));

  // Weekday load
  const wd = all(`SELECT cs.weekday, COUNT(*) sessions,
      SUM((SELECT COUNT(*) FROM enrollments e JOIN students s ON s.id=e.student_id WHERE e.class_id = cs.class_id AND s.status='active')) students
    FROM class_schedules cs JOIN classes c ON c.id = cs.class_id WHERE c.active = 1 GROUP BY cs.weekday`);
  const weekdayLoad = [1, 2, 3, 4, 5, 6, 0].map((d) => {
    const row = wd.find((x) => x.weekday === d);
    return { weekday: d, day: WEEKDAYS[d].slice(0, 3), aulas: row?.sessions || 0, alunos: row?.students || 0 };
  });

  // Age groups
  const now = new Date();
  const age = (b) => { if (!b) return null; const d = parseYmd(b); let a = now.getFullYear() - d.getFullYear(); if (now < new Date(now.getFullYear(), d.getMonth(), d.getDate())) a--; return a; };
  const groups = [['3–5', 3, 5], ['6–10', 6, 10], ['11–14', 11, 14], ['15–17', 15, 17], ['18–29', 18, 29], ['30+', 30, 200]];
  const ageGroups = groups.map(([name, lo, hi]) => ({ name, value: active.filter((s) => { const a = age(s.birth_date); return a !== null && a >= lo && a <= hi; }).length }));

  // Top absentees (risk of churn): lowest attendance in last 30 days with >= 4 records
  const atRisk = all(`SELECT s.id, s.name, COUNT(*) n, SUM(a.status != 'absent') ok FROM attendance a JOIN students s ON s.id = a.student_id
    WHERE a.date >= ? AND s.status='active' GROUP BY s.id HAVING n >= 4 ORDER BY (1.0 * ok / n) ASC LIMIT 5`, since30)
    .map((x) => ({ id: x.id, name: x.name, rate: Math.round((x.ok / x.n) * 100), classes: x.n }));

  const upcomingEvents = all(`SELECT e.id, e.title, e.date, (SELECT COUNT(*) FROM event_rsvps r WHERE r.event_id=e.id AND r.status='going') going
    FROM events e WHERE e.date >= ? AND e.published = 1 ORDER BY e.date LIMIT 4`, t);

  res.json({
    kpis: {
      activeStudents: active.length,
      inactiveStudents: students.length - active.length,
      newThisMonth: students.filter((s) => s.joined_at.slice(0, 7) === thisMonth).length,
      classes: classes.length,
      weeklySessions: classes.reduce((a, c) => a + c.sessions, 0),
      occupancy: totalCap ? Math.round((totalEnr / totalCap) * 100) : 0,
      attendanceRate: rate(att30),
      attendanceRatePrev: rate(attPrev),
      revenueMonth: monthPay.paid,
      expectedMonth: monthPay.paid + monthPay.pending + monthPay.overdue,
      overdueCount: overdueAll.n,
      overdueTotal: overdueAll.total,
      newMessages: get(`SELECT COUNT(*) n FROM contact_messages WHERE status='new'`).n,
      activeTeachers: get(`SELECT COUNT(*) n FROM teachers WHERE status='active'`).n,
      classesWithoutTeacher: get(`SELECT COUNT(*) n FROM classes WHERE active = 1 AND teacher_id IS NULL`).n,
    },
    byStyle,
    newByMonth,
    revenue,
    attendanceWeekly,
    weekdayLoad,
    ageGroups,
    occupancy: classes.map((c) => ({ name: c.name, enrolled: c.enrolled, capacity: c.capacity, color: c.color, pct: Math.round((c.enrolled / c.capacity) * 100) }))
      .sort((a, b) => b.pct - a.pct),
    atRisk,
    upcomingEvents,
  });
});

export default r;
