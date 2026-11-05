import { getLang, locale, t } from '../i18n/index.jsx';

const PT = {
  weekdays: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'],
  short: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
  months: ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'],
  monthsShort: ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'],
};
const EN = {
  weekdays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  short: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  monthsShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};
const L = () => (getLang() === 'en' ? EN : PT);

// Language-aware arrays: index them like normal arrays (WEEKDAYS[1], MONTHS.map…)
const live = (k) => new Proxy([], { get: (_, p) => { const a = L()[k]; const v = a[p]; return typeof v === 'function' ? v.bind(a) : v; } });
export const WEEKDAYS = live('weekdays');
export const WEEKDAYS_SHORT = live('short');
export const MONTHS = live('months');
export const MONTHS_SHORT = live('monthsShort');

export const parseDate = (s) => {
  if (!s) return null;
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const fmtDate = (s, opts = { day: '2-digit', month: 'short', year: 'numeric' }) => {
  const d = parseDate(s);
  return d ? d.toLocaleDateString(locale(), opts).replace('.', '') : '—';
};

export const fmtLongDate = (s) => {
  const d = parseDate(s);
  if (!d) return '—';
  return getLang() === 'en'
    ? `${EN.weekdays[d.getDay()]}, ${EN.months[d.getMonth()]} ${d.getDate()}`
    : `${PT.weekdays[d.getDay()]}, ${d.getDate()} de ${PT.months[d.getMonth()]}`;
};

export const fmtMonth = (ym) => {
  if (!ym) return '—';
  const [y, m] = ym.split('-').map(Number);
  return getLang() === 'en' ? `${EN.months[m - 1]} ${y}` : `${PT.months[m - 1]} de ${y}`;
};

/** "nov/26" | "Nov '26" — for chart axes */
export const fmtMonthShort = (ym) => {
  const [y, m] = ym.split('-').map(Number);
  return getLang() === 'en' ? `${EN.monthsShort[m - 1]} '${String(y).slice(2)}` : `${PT.monthsShort[m - 1]}/${String(y).slice(2)}`;
};

/** Day/month for chart axes from YYYY-MM-DD */
export const fmtDayMonth = (s) => {
  const [, m, d] = s.split('-');
  return getLang() === 'en' ? `${m}/${d}` : `${d}/${m}`;
};

export const fmtDateTime = (s) => new Date(s.replace(' ', 'T')).toLocaleString(locale(), { dateStyle: 'short', timeStyle: 'short' });

export const fmtHours = (h) => `${(Number(h) || 0).toLocaleString(locale(), { maximumFractionDigits: 1 })}h`;

export const money = (v) => (Number(v) || 0).toLocaleString(locale(), { style: 'currency', currency: 'BRL' });

export const ageFrom = (birth) => {
  const d = parseDate(birth);
  if (!d) return null;
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  if (now < new Date(now.getFullYear(), d.getMonth(), d.getDate())) a--;
  return a;
};

export const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const daysUntil = (s) => {
  const d = parseDate(s);
  const tday = parseDate(todayStr());
  return Math.round((d - tday) / 864e5);
};

export const initials = (name = '') => name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();

/** Translated label maps (read at render time) */
const labels = (map) => new Proxy({}, { get: (_, k) => (map[k] ? t(map[k]) : undefined) });
export const PAYMENT_STATUS = labels({ paid: 'Pago', pending: 'Em aberto', overdue: 'Atrasado' });
export const ATT_STATUS = labels({ present: 'Presente', late: 'Atrasado', absent: 'Falta' });
export const RSVP = labels({ going: 'Vou', maybe: 'Talvez', not_going: 'Não vou' });
