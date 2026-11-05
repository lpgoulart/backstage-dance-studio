import { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, CalendarCheck, Flame, Wallet, Pin } from 'lucide-react';
import { usePortalReady } from './PortalLayout.jsx';
import { WEEKDAYS_SHORT, MONTHS_SHORT, parseDate, money, fmtMonth, fmtDate } from '../../lib/format.js';
import { Bar } from '../../components/ui.jsx';
import { RsvpButtons } from './PortalEvents.jsx';
import { t } from '../../i18n/index.jsx';

function useCountdown(iso) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  if (!iso) return null;
  const diff = Math.max(0, new Date(iso).getTime() - now);
  return { d: Math.floor(diff / 864e5), h: Math.floor((diff / 36e5) % 24), m: Math.floor((diff / 6e4) % 60), s: Math.floor((diff / 1e3) % 60), done: diff === 0 };
}

export function LevelRing({ journey, size = 132 }) {
  const r = (size - 14) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="level-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--bg-4)" strokeWidth="8" fill="none" />
        <motion.circle cx={size / 2} cy={size / 2} r={r} stroke="url(#gold)" strokeWidth="8" fill="none" strokeLinecap="round"
          strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - journey.progress / 100) }}
          transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }} />
        <defs><linearGradient id="gold" x1="0" x2="1"><stop offset="0" stopColor="#e8b04b" /><stop offset="1" stopColor="#f5d08a" /></linearGradient></defs>
      </svg>
      <div className="center"><div><strong>{journey.level}</strong><span>{t('nível')}</span></div></div>
    </div>
  );
}

export function SessionItem({ s }) {
  const d = parseDate(s.date);
  return (
    <div className="session" style={{ '--c': s.color }}>
      <div className="d"><span>{WEEKDAYS_SHORT[d.getDay()]}</span><strong>{d.getDate()}</strong><span>{MONTHS_SHORT[d.getMonth()]}</span></div>
      <div>
        <h4>{s.class_name}</h4>
        <small>{s.start_time}–{s.end_time} · {s.room} · {s.teacher}</small>
      </div>
      {s.in_progress && <span className="badge ok">{t('agora')}</span>}
    </div>
  );
}

export default function PortalHome() {
  const ctx = useOutletContext();
  const gate = usePortalReady(ctx);
  const o = ctx.overview;
  const next = o?.upcoming?.[0];
  const cd = useCountdown(next?.starts_at);
  if (gate) return gate;

  const first = o.student.name.split(' ')[0];
  const unlocked = o.achievements.filter((a) => a.unlocked).length;
  const hour = new Date().getHours();
  const greet = hour < 12 ? t('Bom dia') : hour < 18 ? t('Boa tarde') : t('Boa noite');

  return (
    <div className="grid" style={{ gap: 18 }}>
      <motion.section className="hello grain" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <div>
          <span className="eyebrow">{greet}</span>
          <h1 style={{ marginTop: 14 }}>
            {ctx.students.length > 1 || o.student.guardian_id ? <>{t('Agenda de ')}<em>{first}</em></> : <>{t('Olá, ')}<em>{first}</em>.</>}
          </h1>
          <p className="muted" style={{ marginTop: 12 }}>
            {t('Nível')} <strong className="gold">{o.journey.levelName}</strong> · {o.journey.xp} XP · {t('{a}/{b} conquistas', { a: unlocked, b: o.achievements.length })}
          </p>
        </div>
        {next ? (
          <div className="countdown">
            <span className="dim" style={{ fontSize: 12, letterSpacing: '.14em', textTransform: 'uppercase' }}>
              {next.in_progress ? t('Aula acontecendo agora') : t('Próxima aula em')}
            </span>
            {!next.in_progress && cd && (
              <div className="digits" aria-live="off">
                {cd.d > 0 && <div><strong>{cd.d}</strong><span>{t('dias')}</span></div>}
                <div><strong>{String(cd.h).padStart(2, '0')}</strong><span>{t('horas')}</span></div>
                <div><strong>{String(cd.m).padStart(2, '0')}</strong><span>{t('min')}</span></div>
                <div><strong>{String(cd.s).padStart(2, '0')}</strong><span>{t('seg')}</span></div>
              </div>
            )}
            <div><strong>{next.class_name}</strong> <span className="muted">· {fmtDate(next.date, { weekday: 'long', day: '2-digit', month: 'long' })}, {next.start_time} · {next.room}</span></div>
          </div>
        ) : <div className="countdown muted">{t('Nenhuma aula nos próximos dias.')}</div>}
      </motion.section>

      <div className="grid g-4">
        <div className="card kpi">
          <div className="label"><CalendarCheck />{t('Presença (30 dias)')}</div>
          <div className="value">{o.stats.rate30 ?? '—'}{o.stats.rate30 !== null && <span style={{ fontSize: '0.5em' }}>%</span>}</div>
          <div className="hint">{t('{n} aulas no total', { n: o.stats.present + o.stats.late })}</div>
        </div>
        <div className="card kpi">
          <div className="label"><Flame />{t('Sequência')}</div>
          <div className="value">{o.stats.streakWeeks}<span style={{ fontSize: '0.45em' }}>{t(' sem.')}</span></div>
          <div className="hint">{t('semanas seguidas dançando')}</div>
        </div>
        <div className="card kpi">
          <div className="label"><Wallet />{t('Mensalidades')}</div>
          <div className="value" style={{ color: o.payments.open.length ? 'var(--gold)' : 'var(--mint)' }}>{o.payments.open.length ? money(o.payments.openTotal) : t('Em dia')}</div>
          <div className="hint">{o.payments.open.length ? t('{n} em aberto', { n: o.payments.open.length }) : o.payments.last ? t('último: {m}', { m: fmtMonth(o.payments.last.reference_month) }) : ''}</div>
        </div>
        <div className="card kpi">
          <div className="label">{t('Turmas')}</div>
          <div className="value">{o.classes.length}</div>
          <div className="hint">{o.classes.map((c) => c.style).filter((v, i, a) => a.indexOf(v) === i).join(' · ')}</div>
        </div>
      </div>

      <div className="grid g-3">
        <div className="card span-2">
          <div className="card-head"><div><h2>{t('Próximas aulas')}</h2><div className="sub">{t('Atualizado com a grade do estúdio')}</div></div><Link to="/portal/agenda" className="btn btn-sm">{t('Agenda ')}<ArrowRight size={15} /></Link></div>
          <div className="session-list">{o.upcoming.slice(0, 4).map((s) => <SessionItem key={s.class_id + s.date + s.start_time} s={s} />)}</div>
        </div>
        <div className="card">
          <div className="card-head"><h2>{t('Jornada')}</h2><Link to="/portal/jornada" className="btn btn-sm">{t('Ver tudo')}</Link></div>
          <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
            <LevelRing journey={o.journey} size={112} />
            <div>
              <div className="serif" style={{ fontSize: 26 }}>{o.journey.levelName}</div>
              <p className="muted" style={{ fontSize: 13.5, marginTop: 4 }}>{t(o.journey.description)}</p>
              {o.journey.next && <p className="dim" style={{ fontSize: 12.5, marginTop: 8 }}>{t('{n} XP para', { n: o.journey.nextAt - o.journey.xp })} <span className="gold">{o.journey.next}</span></p>}
            </div>
          </div>
          <div style={{ display: 'grid', gap: 10, marginTop: 18 }}>
            {o.achievements.filter((a) => !a.unlocked).slice(0, 2).map((a) => (
              <div key={a.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}><span>{t(a.title)}</span><span className="dim">{a.current}/{a.target}</span></div>
                <Bar pct={(a.current / a.target) * 100} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid g-2">
        <div className="card">
          <div className="card-head"><h2>{t('Eventos')}</h2><Link to="/portal/eventos" className="btn btn-sm">{t('Todos')}</Link></div>
          {o.events.length === 0 && <div className="empty">{t('Sem eventos próximos.')}</div>}
          {o.events.map((e) => (
            <div className="list-row" key={e.id}>
              <div><div style={{ fontWeight: 600 }}>{e.title}</div><small className="muted">{fmtDate(e.date)} · {e.location}</small></div>
              <RsvpButtons event={e} studentId={o.student.id} onDone={ctx.reloadOverview} compact />
            </div>
          ))}
        </div>
        <div className="card">
          <div className="card-head"><h2>{t('Avisos')}</h2><Link to="/portal/avisos" className="btn btn-sm">{t('Mural')}</Link></div>
          <div style={{ display: 'grid', gap: 10 }}>
            {o.announcements.map((a) => (
              <div key={a.id} className={`notice ${a.pinned ? 'pin' : ''}`}>
                <h4>{a.pinned && <Pin size={14} className="gold" />}{a.title}</h4>
                <p>{a.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
