import { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Users, Layers, CalendarCheck, Wallet, AlertTriangle, Cake, CalendarPlus, NotebookPen, ArrowRight, CheckCircle2, Radio } from 'lucide-react';
import { Loading, Bar, Avatar, useToast } from '../../components/ui.jsx';
import { downloadFile } from '../../lib/api.js';
import { fmtDate, money, todayStr, WEEKDAYS_SHORT, fmtHours, fmtDayMonth } from '../../lib/format.js';
import { t } from '../../i18n/index.jsx';

function Countdown({ iso }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const diff = Math.max(0, new Date(iso).getTime() - now);
  const d = Math.floor(diff / 864e5), h = Math.floor((diff / 36e5) % 24), m = Math.floor((diff / 6e4) % 60), s = Math.floor((diff / 1e3) % 60);
  return (
    <div className="digits">
      {d > 0 && <div><strong>{d}</strong><span>{t('dias')}</span></div>}
      <div><strong>{String(h).padStart(2, '0')}</strong><span>{t('horas')}</span></div>
      <div><strong>{String(m).padStart(2, '0')}</strong><span>{t('min')}</span></div>
      <div><strong>{String(s).padStart(2, '0')}</strong><span>{t('seg')}</span></div>
    </div>
  );
}

const STATE = { upcoming: ['Em breve', 'info'], live: ['Agora', 'ok'], done: ['Encerrada', ''] };

export default function TeacherHome() {
  const { dash: d } = useOutletContext();
  const toast = useToast();
  if (!d) return <Loading />;
  const first = d.teacher.name.split(' ')[0];
  const hour = new Date().getHours();
  const greet = hour < 12 ? t('Bom dia') : hour < 18 ? t('Boa tarde') : t('Boa noite');
  const t0 = todayStr();

  const exportIcs = async () => {
    try { await downloadFile('/teacher/calendar.ics', 'minhas-aulas-backstage.ics'); toast(t('Agenda exportada! Abra o arquivo para adicionar ao seu calendário.')); }
    catch (e) { toast(e.message, 'err'); }
  };

  return (
    <div className="grid" style={{ gap: 18 }}>
      <motion.section className="hello grain" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <div>
          <span className="eyebrow">{greet}</span>
          <h1 style={{ marginTop: 14 }}>{t('Olá, ')}<em>{first}</em>.</h1>
          <p className="muted" style={{ marginTop: 12 }}>
            {t('{c} turma(s) · {s} alunos · {h} de aula por semana', { c: d.totals.classes, s: d.totals.students, h: fmtHours(d.teacher.weekly_hours) })}
          </p>
          <div style={{ display: 'flex', gap: 8, marginTop: 18, flexWrap: 'wrap' }}>
            <Link to="/professor/chamada" className="btn btn-primary btn-sm">{t('Fazer chamada')}</Link>
            <button className="btn btn-sm" onClick={exportIcs}><CalendarPlus size={15} />{t(' Exportar minhas aulas')}</button>
          </div>
        </div>
        {d.next ? (
          <div className="countdown">
            <span className="dim" style={{ fontSize: 12, letterSpacing: '.14em', textTransform: 'uppercase' }}>{d.next.in_progress ? t('Aula acontecendo agora') : t('Sua próxima aula em')}</span>
            {!d.next.in_progress && <Countdown iso={d.next.starts_at} />}
            <div><strong>{d.next.class_name}</strong> <span className="muted">· {fmtDate(d.next.date, { weekday: 'long', day: '2-digit', month: 'long' })}, {d.next.start_time} · {d.next.room}</span></div>
          </div>
        ) : <div className="countdown muted">{t('Nenhuma aula nos próximos dias.')}</div>}
      </motion.section>

      {d.pending.length > 0 && (
        <div className="card" style={{ borderColor: 'rgba(232,176,75,.4)', background: 'linear-gradient(90deg, var(--gold-soft), transparent 70%), var(--bg-2)' }}>
          <div className="card-head"><div><h2 style={{ display: 'flex', gap: 8, alignItems: 'center' }}><AlertTriangle size={17} className="gold" />{t('{n} chamada(s) pendente(s)', { n: d.pending.length })}</h2><div className="sub">{t('Aulas dos últimos 14 dias sem registro de presença')}</div></div></div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {d.pending.slice(0, 6).map((p) => (
              <Link key={p.class_id + p.date} to={`/professor/chamada?classId=${p.class_id}&date=${p.date}`} className="tag" style={{ '--c': p.color, padding: '8px 12px', fontSize: 13 }}>
                <i />{p.class_name} · {fmtDate(p.date, { weekday: 'short', day: '2-digit', month: 'short' })} <ArrowRight size={13} />
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="grid g-4">
        <div className="card kpi"><div className="label"><Users />{t('Meus alunos')}</div><div className="value">{d.totals.students}</div><div className="hint">{t('em {n} turma(s)', { n: d.totals.classes })}</div></div>
        <div className="card kpi"><div className="label"><CalendarCheck />{t('Presença (30 dias)')}</div><div className="value">{d.totals.attendance_rate ?? '—'}{d.totals.attendance_rate !== null && '%'}</div><div className="hint">{t('média das suas turmas')}</div></div>
        <div className="card kpi"><div className="label"><Layers />{t('Aulas no mês')}</div><div className="value">{d.totals.month_sessions}</div><div className="hint">{t('{h} horas dadas', { h: fmtHours(d.totals.month_hours).replace('h', '') })}</div></div>
        <div className="card kpi"><div className="label"><Wallet />{t('Meu mês (estimativa)')}</div><div className="value">{money(d.totals.month_earnings)}</div><div className="hint">{t('{v}/hora-aula', { v: money(d.teacher.hourly_rate) })}</div></div>
      </div>

      <div className="grid g-3">
        <div className="card">
          <div className="card-head"><div><h2>{t('Hoje')}</h2><div className="sub">{fmtDate(t0, { weekday: 'long', day: '2-digit', month: 'long' })}</div></div></div>
          {d.today.length === 0 && <div className="empty">{t('Sem aulas hoje. Bom descanso! ✨')}</div>}
          <div className="session-list">
            {d.today.map((s) => (
              <div className="session" key={s.class_id + s.start_time} style={{ '--c': s.color, gridTemplateColumns: '64px 1fr' }}>
                <div className="d"><strong style={{ fontSize: 18 }}>{s.start_time}</strong><span>{s.end_time}</span></div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                    <h4>{s.class_name}</h4>
                    <span className={`badge ${STATE[s.state][1]}`}>{s.state === 'live' && <Radio size={11} />}{t(STATE[s.state][0])}</span>
                  </div>
                  <small>{s.room} · {t('{n} alunos', { n: s.enrolled })}</small>
                  <div style={{ marginTop: 8 }}>
                    {s.attendance_taken
                      ? <span className="badge ok plain"><CheckCircle2 size={12} />{t(' Chamada feita')}</span>
                      : s.state !== 'upcoming' && <Link to={`/professor/chamada?classId=${s.class_id}&date=${t0}`} className="btn btn-sm btn-primary">{t('Fazer chamada')}</Link>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card span-2">
          <div className="card-head"><div><h2>{t('Frequência das minhas turmas')}</h2><div className="sub">{t('% de presença por semana')}</div></div></div>
          <div style={{ height: 220 }}>
            <ResponsiveContainer>
              <AreaChart data={d.trend} margin={{ left: -22, right: 8, top: 6 }}>
                <defs><linearGradient id="tTrend" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#6fcfa5" stopOpacity={0.35} /><stop offset="1" stopColor="#6fcfa5" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid stroke="rgba(244,236,228,.06)" vertical={false} />
                <XAxis dataKey="start" tickFormatter={fmtDayMonth} stroke="#6f6670" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#6f6670" fontSize={12} tickLine={false} axisLine={false} domain={[40, 100]} />
                <Tooltip contentStyle={{ background: '#231d28', border: '1px solid rgba(244,236,228,.15)', borderRadius: 12 }} formatter={(v) => [`${v}%`, t('Presença')]} labelFormatter={fmtDayMonth} />
                <Area type="monotone" dataKey="taxa" stroke="#6fcfa5" strokeWidth={2.5} fill="url(#tTrend)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head"><h2>{t('Minhas turmas')}</h2><Link to="/professor/turmas" className="btn btn-sm">{t('Ver alunos ')}<ArrowRight size={15} /></Link></div>
        <div className="grid g-3">
          {d.classes.map((c) => {
            const pct = Math.round((c.enrolled / c.capacity) * 100);
            return (
              <Link key={c.id} to={`/professor/turmas?id=${c.id}`} className="cms-item" style={{ borderTop: `3px solid ${c.color}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <strong className="serif" style={{ fontSize: 22, fontWeight: 400 }}>{c.name}</strong>
                  {c.attendance_rate !== null && <span className={`badge ${c.attendance_rate >= 80 ? 'ok' : c.attendance_rate >= 65 ? 'warn' : 'bad'}`}>{c.attendance_rate}%</span>}
                </div>
                <small className="muted">{c.level} · {c.room} · {c.schedules.map((s) => `${WEEKDAYS_SHORT[s.weekday]} ${s.start_time}`).join(' / ')}</small>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}><span><strong>{c.enrolled}</strong>{t(' alunos')}</span><span className="dim">{t('{n} vagas', { n: c.capacity })}</span></div>
                  <Bar pct={pct} rose={pct >= 90} />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="grid g-3">
        <div className="card">
          <div className="card-head"><div><h2 style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Cake size={16} className="gold" />{t('Aniversariantes')}</h2><div className="sub">{t('Próximos 30 dias')}</div></div></div>
          {d.birthdays.length === 0 && <div className="empty">{t('Nenhum aniversário por perto.')}</div>}
          {d.birthdays.map((b) => (
            <div className="list-row" key={b.id}>
              <span className="person"><Avatar name={b.name} /><span>{b.name}<small>{t('faz {n} anos', { n: b.turning })} · {fmtDate(b.date, { day: '2-digit', month: 'short' })}</small></span></span>
              <span className={`badge ${b.in_days <= 3 ? 'warn' : 'plain'}`}>{b.in_days === 0 ? t('hoje! 🎉') : b.in_days === 1 ? t('amanhã') : t('em {n} dias', { n: b.in_days })}</span>
            </div>
          ))}
        </div>
        <div className="card">
          <div className="card-head"><div><h2>{t('Precisam de atenção')}</h2><div className="sub">{t('Presença abaixo de 70% em 30 dias')}</div></div></div>
          {d.atRisk.length === 0 && <div className="empty">{t('Todos com boa frequência 👏')}</div>}
          {d.atRisk.map((s) => (
            <div className="list-row" key={s.id + s.class_name}>
              <span>{s.name}<small className="dim" style={{ display: 'block', fontSize: 12 }}>{s.class_name}</small></span>
              <span className={`badge ${s.rate < 50 ? 'bad' : 'warn'}`}>{s.rate}%</span>
            </div>
          ))}
        </div>
        <div className="card">
          <div className="card-head"><h2 style={{ display: 'flex', gap: 8, alignItems: 'center' }}><NotebookPen size={16} className="gold" />{t('Diário recente')}</h2><Link to="/professor/diario" className="btn btn-sm">{t('Abrir')}</Link></div>
          {d.logs.length === 0 && <div className="empty">{t('Nenhum registro ainda.')}</div>}
          {d.logs.map((l) => (
            <div key={l.id} className="notice" style={{ marginBottom: 8, borderLeft: `3px solid ${l.color}` }}>
              <h4 style={{ fontSize: 14 }}>{l.title || l.class_name}</h4>
              <p style={{ fontSize: 13 }}>{fmtDate(l.date, { day: '2-digit', month: 'short' })} · {l.class_name}</p>
            </div>
          ))}
        </div>
      </div>

      {d.events.length > 0 && (
        <div className="card">
          <div className="card-head"><h2>{t('Próximos eventos do estúdio')}</h2></div>
          {d.events.map((e) => (
            <div className="list-row" key={e.id}>
              <span><strong style={{ fontWeight: 600 }}>{e.title}</strong><small className="dim" style={{ display: 'block' }}>{fmtDate(e.date)} · {e.time} · {e.location}</small></span>
              <span className="badge warn plain">{e.category}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
