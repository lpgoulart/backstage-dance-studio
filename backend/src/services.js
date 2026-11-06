import { all, get, ymd, today, parseYmd } from './db.js';

export const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export const parseJson = (s, fallback = null) => {
  try { return JSON.parse(s); } catch { return fallback; }
};

export function schedulesFor(classIds) {
  if (!classIds.length) return {};
  const rows = all(
    `SELECT * FROM class_schedules WHERE class_id IN (${classIds.map(() => '?').join(',')}) ORDER BY weekday, start_time`,
    ...classIds,
  );
  const map = {};
  for (const r of rows) (map[r.class_id] ||= []).push({ id: r.id, weekday: r.weekday, start_time: r.start_time, end_time: r.end_time });
  return map;
}

export function attachSchedules(classes) {
  const map = schedulesFor(classes.map((c) => c.id));
  return classes.map((c) => ({ ...c, active: !!c.active, schedules: map[c.id] || [] }));
}

export function studentClasses(studentId) {
  const classes = all(
    `SELECT c.*, e.enrolled_at FROM classes c JOIN enrollments e ON e.class_id = c.id
     WHERE e.student_id = ? ORDER BY c.name`, studentId);
  return attachSchedules(classes);
}

/** Next occurrences (from now) of the given classes, sorted ascending */
export function upcomingSessions(classes, count = 5) {
  const now = new Date();
  const out = [];
  for (let i = 0; i < 14 && out.length < 60; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    for (const c of classes) {
      for (const s of c.schedules) {
        if (s.weekday !== d.getDay()) continue;
        const [h, m] = s.start_time.split(':').map(Number);
        const [eh, em] = s.end_time.split(':').map(Number);
        const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m);
        const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), eh, em);
        if (end <= now) continue;
        out.push({
          class_id: c.id, class_name: c.name, style: c.style, teacher: c.teacher, room: c.room, color: c.color,
          date: ymd(d), weekday: s.weekday, start_time: s.start_time, end_time: s.end_time,
          starts_at: start.toISOString(), in_progress: start <= now,
        });
      }
    }
  }
  return out.sort((a, b) => a.starts_at.localeCompare(b.starts_at)).slice(0, count);
}

const mondayOf = (d) => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return ymd(x);
};

export function attendanceStats(studentId) {
  const rows = all(`SELECT date, status FROM attendance WHERE student_id = ? ORDER BY date`, studentId);
  const present = rows.filter((r) => r.status === 'present').length;
  const late = rows.filter((r) => r.status === 'late').length;
  const absent = rows.filter((r) => r.status === 'absent').length;
  const since = ymd(new Date(Date.now() - 30 * 864e5));
  const last30 = rows.filter((r) => r.date >= since);
  const rate30 = last30.length ? Math.round((last30.filter((r) => r.status !== 'absent').length / last30.length) * 100) : null;

  // Weekly streak: consecutive weeks (ending this or last week) with at least one presence
  const weeks = new Set(rows.filter((r) => r.status !== 'absent').map((r) => mondayOf(parseYmd(r.date))));
  let streak = 0;
  const cursor = new Date();
  if (!weeks.has(mondayOf(cursor))) cursor.setDate(cursor.getDate() - 7);
  while (weeks.has(mondayOf(cursor))) { streak++; cursor.setDate(cursor.getDate() - 7); }

  // Best run of on-time presences
  let onTimeRun = 0, bestOnTime = 0;
  for (const r of rows) {
    if (r.status === 'present') { onTimeRun++; bestOnTime = Math.max(bestOnTime, onTimeRun); }
    else if (r.status === 'late') onTimeRun = 0;
  }
  return { total: rows.length, present, late, absent, rate30, streakWeeks: streak, bestOnTimeRun: bestOnTime };
}

const LEVELS = [
  { name: 'Plié', min: 0, description: 'Todo grande salto começa dobrando os joelhos.' },
  { name: 'Tendu', min: 150, description: 'Pés esticados e postura firme: você já tem base.' },
  { name: 'Pas de Bourrée', min: 400, description: 'Os passos estão ganhando fluidez.' },
  { name: 'Pirouette', min: 800, description: 'Equilíbrio e giro — a dança já é sua.' },
  { name: 'Grand Jeté', min: 1400, description: 'Voando alto! Você é inspiração para a turma.' },
  { name: 'Estrela do Palco', min: 2200, description: 'Lenda dos bastidores do Backstage.' },
];

export function journey(stats) {
  const xp = stats.present * 10 + stats.late * 6 + stats.streakWeeks * 15;
  let idx = 0;
  LEVELS.forEach((l, i) => { if (xp >= l.min) idx = i; });
  const cur = LEVELS[idx];
  const next = LEVELS[idx + 1] || null;
  const progress = next ? Math.round(((xp - cur.min) / (next.min - cur.min)) * 100) : 100;
  return { xp, level: idx + 1, levelName: cur.name, description: cur.description, next: next?.name || null, nextAt: next?.min || null, progress, levels: LEVELS };
}

/** Metrics an achievement rule can use. Values are computed per student. */
export const ACHIEVEMENT_METRICS = {
  classes_attended: 'Aulas frequentadas (presença ou atraso)',
  on_time_run: 'Presenças seguidas sem atraso (melhor sequência)',
  week_streak: 'Semanas seguidas com presença (sequência atual)',
  attendance_rate_30: 'Frequência nos últimos 30 dias (%)',
  styles_count: 'Modalidades diferentes matriculadas',
  classes_enrolled: 'Turmas matriculadas',
  events_going: 'Eventos com presença confirmada',
  days_enrolled: 'Dias desde a matrícula',
  xp: 'XP acumulado na jornada',
};
export const ACHIEVEMENT_ICONS = ['footprints', 'clock', 'flame', 'medal', 'sparkles', 'star', 'crown', 'trophy', 'award', 'heart', 'music', 'zap', 'target', 'gem', 'rocket', 'calendar-check'];

export function studentMetrics(studentId) {
  const student = get(`SELECT * FROM students WHERE id = ?`, studentId);
  const stats = attendanceStats(studentId);
  const enr = get(`SELECT COUNT(*) n, COUNT(DISTINCT c.style) styles FROM enrollments e JOIN classes c ON c.id = e.class_id WHERE e.student_id = ?`, studentId);
  return {
    classes_attended: stats.present + stats.late,
    on_time_run: stats.bestOnTimeRun,
    week_streak: stats.streakWeeks,
    attendance_rate_30: stats.rate30 ?? 0,
    styles_count: enr.styles,
    classes_enrolled: enr.n,
    events_going: get(`SELECT COUNT(*) n FROM event_rsvps WHERE student_id = ? AND status = 'going'`, studentId).n,
    days_enrolled: student ? Math.max(0, Math.floor((Date.now() - parseYmd(student.joined_at).getTime()) / 864e5)) : 0,
    xp: journey(stats).xp,
  };
}

/** Active achievement rules evaluated for one student */
export function achievements(studentId, metrics = studentMetrics(studentId)) {
  return all(`SELECT * FROM achievements WHERE active = 1 ORDER BY sort_order, id`).map((a) => {
    const value = metrics[a.metric] ?? 0;
    return { id: a.id, icon: a.icon, title: a.title, description: a.description, metric: a.metric, target: a.target,
      current: Math.min(value, a.target), unlocked: value >= a.target };
  });
}

/** iCalendar feed with weekly recurring events for each class schedule (Manaus = UTC-4, no DST) */
export function buildIcs(student, classes, lang = 'pt') {
  const L = lang === 'en' ? { with: 'with', team: 'the Backstage team', studio: 'Backstage Dance Studio' } : { with: 'com', team: 'equipe Backstage', studio: 'Backstage Studio de Dança' };
  const pad = (n) => String(n).padStart(2, '0');
  const utc = (d) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
  const BYDAY = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
  const esc = (s = '') => String(s).replace(/[\\,;]/g, (m) => `\\${m}`).replace(/\n/g, '\\n');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Backstage Studio de Danca//Agenda//PT-BR', 'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:Backstage · ${esc(student.name)}`];
  const base = new Date();
  for (const c of classes) {
    for (const s of c.schedules) {
      const d = new Date(base.getFullYear(), base.getMonth(), base.getDate());
      d.setDate(d.getDate() + ((s.weekday - d.getDay() + 7) % 7));
      const [h, m] = s.start_time.split(':').map(Number);
      const [eh, em] = s.end_time.split(':').map(Number);
      const start = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), h + 4, m));
      const end = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), eh + 4, em));
      lines.push('BEGIN:VEVENT', `UID:bs-${student.id}-${s.id}@backstage`, `DTSTAMP:${utc(new Date())}`,
        `DTSTART:${utc(start)}`, `DTEND:${utc(end)}`, `RRULE:FREQ=WEEKLY;BYDAY=${BYDAY[s.weekday]}`,
        `SUMMARY:${esc(`${c.name} · Backstage`)}`, `LOCATION:${esc(`${L.studio} — ${c.room || ''}`)}`,
        `DESCRIPTION:${esc(`${c.style} ${L.with} ${c.teacher || L.team}`)}`, 'END:VEVENT');
    }
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export const todayStr = today;
