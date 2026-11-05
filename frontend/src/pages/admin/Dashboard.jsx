import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar as RBar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';
import { Users, Layers, CalendarCheck, Wallet, AlertTriangle, Inbox, TrendingUp, Sparkles } from 'lucide-react';
import { useFetch } from '../../lib/useFetch.js';
import { Loading, ErrorBox, Bar } from '../../components/ui.jsx';
import { money, fmtDate, daysUntil, fmtMonthShort, fmtDayMonth, WEEKDAYS, WEEKDAYS_SHORT } from '../../lib/format.js';
import { t, rich } from '../../i18n/index.jsx';

const C = { gold: '#e8b04b', rose: '#e0607e', lilac: '#a7b6ff', mint: '#6fcfa5', peach: '#ffb36b', sand: '#d9c4a0', violet: '#c79bff', coral: '#ff8a7a' };
const PALETTE = [C.gold, C.rose, C.lilac, C.mint, C.violet, C.peach, C.coral, C.sand];
const axis = { stroke: '#6f6670', fontSize: 12, tickLine: false, axisLine: false };

function Tip({ active, payload, label, fmt = (v) => v, fmtLabel }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tip">
      <strong>{label !== undefined && fmtLabel ? fmtLabel(label) : label ?? payload[0].payload.name}</strong>
      {payload.map((p) => <div key={p.dataKey}><i style={{ background: p.color || p.payload.fill }} />{p.name}: <span style={{ color: 'var(--text)' }}>{fmt(p.value)}</span></div>)}
    </div>
  );
}

function Kpi({ icon: Icon, label, value, hint, i }) {
  return (
    <motion.div className="card kpi" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
      <div className="label"><Icon />{label}</div>
      <div className="value">{value}</div>
      {hint && <div className="hint">{hint}</div>}
    </motion.div>
  );
}

export default function Dashboard() {
  const { data, error } = useFetch('/admin/analytics');
  if (error) return <ErrorBox error={error} />;
  if (!data) return <Loading />;
  const k = data.kpis;
  const attDelta = k.attendanceRate - k.attendanceRatePrev;
  const byStyle = data.byStyle;
  const collected = k.expectedMonth ? Math.round((k.revenueMonth / k.expectedMonth) * 100) : 0;

  return (
    <>
      <div className="page-head">
        <div><h1>{rich(t('Bastidores *em números*'))}</h1><p>{t('Visão geral do estúdio · atualizado agora')}</p></div>
        <div className="actions">
          <Link to="/gestao/alunos?novo=1" className="btn btn-primary btn-sm">{t('Novo aluno')}</Link>
          <Link to="/gestao/chamada" className="btn btn-sm">{t('Fazer chamada')}</Link>
        </div>
      </div>

      <div className="grid g-4" style={{ marginBottom: 16 }}>
        <Kpi i={0} icon={Users} label={t('Alunos ativos')} value={k.activeStudents} hint={<>{k.newThisMonth > 0 && <span className="delta up">+{k.newThisMonth} </span>}{t('novos este mês · {n} inativos', { n: k.inactiveStudents })}</>} />
        <Kpi i={1} icon={CalendarCheck} label={t('Frequência (30 dias)')} value={`${k.attendanceRate}%`} hint={<><span className={`delta ${attDelta >= 0 ? 'up' : 'down'}`}>{attDelta >= 0 ? '▲' : '▼'} {Math.abs(attDelta)} p.p.</span>{t(' vs. 30 dias anteriores')}</>} />
        <Kpi i={2} icon={Wallet} label={t('Recebido no mês')} value={money(k.revenueMonth)} hint={t('{pct}% de {total} previstos', { pct: collected, total: money(k.expectedMonth) })} />
        <Kpi i={3} icon={Layers} label={t('Ocupação das turmas')} value={`${k.occupancy}%`} hint={<>{t('{c} turmas · {p} professores', { c: k.classes, p: k.activeTeachers })}{k.classesWithoutTeacher > 0 && <> · <Link to="/gestao/turmas" className="gold">{t('{n} sem professor', { n: k.classesWithoutTeacher })}</Link></>}</>} />
      </div>

      <div className="grid g-3" style={{ marginBottom: 16 }}>
        <div className="card span-2">
          <div className="card-head"><div><h2>{t('Crescimento de alunos')}</h2><div className="sub">{t('Matrículas novas e base total · 12 meses')}</div></div><TrendingUp size={18} className="gold" /></div>
          <div style={{ height: 260 }}>
            <ResponsiveContainer>
              <AreaChart data={data.newByMonth} margin={{ left: -18, right: 6, top: 6 }}>
                <defs>
                  <linearGradient id="gTotal" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={C.gold} stopOpacity={0.35} /><stop offset="1" stopColor={C.gold} stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(244,236,228,.06)" vertical={false} />
                <XAxis dataKey="key" tickFormatter={fmtMonthShort} {...axis} />
                <YAxis {...axis} allowDecimals={false} />
                <Tooltip content={<Tip fmtLabel={fmtMonthShort} />} cursor={{ stroke: 'rgba(244,236,228,.15)' }} />
                <Area type="monotone" dataKey="total" name={t('Base total')} stroke={C.gold} strokeWidth={2} fill="url(#gTotal)" />
                <Area type="monotone" dataKey="novos" name={t('Novos')} stroke={C.rose} strokeWidth={2} fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card">
          <div className="card-head"><div><h2>{t('Matrículas por modalidade')}</h2><div className="sub">{t('Alunos ativos')}</div></div></div>
          <div style={{ height: 180 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={byStyle} dataKey="value" nameKey="name" innerRadius={52} outerRadius={80} paddingAngle={2} stroke="none">
                  {byStyle.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                </Pie>
                <Tooltip content={<Tip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="legend" style={{ marginTop: 10 }}>
            {byStyle.map((s, i) => <span key={s.name}><i style={{ background: PALETTE[i % PALETTE.length] }} />{s.name} <span className="dim">{s.value}</span></span>)}
          </div>
        </div>
      </div>

      <div className="grid g-3" style={{ marginBottom: 16 }}>
        <div className="card span-2">
          <div className="card-head"><div><h2>{t('Receita')}</h2><div className="sub">{t('Mensalidades · 6 meses')}</div></div></div>
          <div style={{ height: 250 }}>
            <ResponsiveContainer>
              <BarChart data={data.revenue} margin={{ left: 6, right: 6, top: 6 }}>
                <CartesianGrid stroke="rgba(244,236,228,.06)" vertical={false} />
                <XAxis dataKey="key" tickFormatter={fmtMonthShort} {...axis} />
                <YAxis {...axis} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <Tooltip content={<Tip fmt={money} fmtLabel={fmtMonthShort} />} cursor={{ fill: 'rgba(244,236,228,.04)' }} />
                <RBar dataKey="recebido" name={t('Recebido')} stackId="a" fill={C.gold} radius={[0, 0, 0, 0]} />
                <RBar dataKey="pendente" name={t('Em aberto')} stackId="a" fill={C.lilac} />
                <RBar dataKey="atrasado" name={t('Atrasado')} stackId="a" fill={C.rose} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card">
          <div className="card-head"><div><h2>{t('Inadimplência')}</h2><div className="sub">{t('Cobranças vencidas')}</div></div><AlertTriangle size={18} style={{ color: 'var(--rose)' }} /></div>
          <div className="serif" style={{ fontSize: 42, lineHeight: 1 }}>{money(k.overdueTotal)}</div>
          <p className="muted" style={{ fontSize: 14, marginTop: 8 }}>{t('{n} mensalidade(s) atrasada(s)', { n: k.overdueCount })}</p>
          <Link to="/gestao/financeiro?status=overdue" className="btn btn-sm" style={{ marginTop: 18 }}>{t('Ver cobranças')}</Link>
          <div style={{ borderTop: '1px solid var(--line)', marginTop: 22, paddingTop: 18 }}>
            <div className="card-head" style={{ marginBottom: 10 }}><h3>{t('Mensagens novas')}</h3><Inbox size={16} className="gold" /></div>
            <div className="serif" style={{ fontSize: 34 }}>{k.newMessages}</div>
            <Link to="/gestao/mensagens" className="dim" style={{ fontSize: 13 }}>{t('Abrir caixa de entrada →')}</Link>
          </div>
        </div>
      </div>

      <div className="grid g-3" style={{ marginBottom: 16 }}>
        <div className="card">
          <div className="card-head"><div><h2>{t('Frequência semanal')}</h2><div className="sub">{t('% de presença · 12 semanas')}</div></div></div>
          <div style={{ height: 200 }}>
            <ResponsiveContainer>
              <LineChart data={data.attendanceWeekly} margin={{ left: -22, right: 8, top: 6 }}>
                <CartesianGrid stroke="rgba(244,236,228,.06)" vertical={false} />
                <XAxis dataKey="start" tickFormatter={fmtDayMonth} {...axis} interval={2} />
                <YAxis {...axis} domain={[50, 100]} />
                <Tooltip content={<Tip fmt={(v) => `${v}%`} fmtLabel={fmtDayMonth} />} />
                <Line type="monotone" dataKey="taxa" name={t('Presença')} stroke={C.mint} strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card">
          <div className="card-head"><div><h2>{t('Movimento por dia')}</h2><div className="sub">{t('Aulas e alunos esperados')}</div></div></div>
          <div style={{ height: 200 }}>
            <ResponsiveContainer>
              <BarChart data={data.weekdayLoad} margin={{ left: -22, right: 6, top: 6 }}>
                <CartesianGrid stroke="rgba(244,236,228,.06)" vertical={false} />
                <XAxis dataKey="weekday" tickFormatter={(d) => WEEKDAYS_SHORT[d]} {...axis} />
                <YAxis {...axis} />
                <Tooltip content={<Tip fmtLabel={(d) => WEEKDAYS[d]} />} cursor={{ fill: 'rgba(244,236,228,.04)' }} />
                <RBar dataKey="alunos" name={t('Alunos')} fill={C.violet} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card">
          <div className="card-head"><div><h2>{t('Faixa etária')}</h2><div className="sub">{t('Alunos ativos')}</div></div></div>
          <div style={{ height: 200 }}>
            <ResponsiveContainer>
              <BarChart data={data.ageGroups} layout="vertical" margin={{ left: -6, right: 16 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" {...axis} width={48} />
                <Tooltip content={<Tip />} cursor={{ fill: 'rgba(244,236,228,.04)' }} />
                <RBar dataKey="value" name={t('Alunos')} fill={C.rose} radius={[0, 6, 6, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid g-3">
        <div className="card">
          <div className="card-head"><div><h2>{t('Ocupação por turma')}</h2><div className="sub">{t('Matriculados / vagas')}</div></div></div>
          <div style={{ display: 'grid', gap: 12 }}>
            {data.occupancy.slice(0, 8).map((c) => (
              <div key={c.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                  <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}><i style={{ width: 8, height: 8, borderRadius: 2, background: c.color }} />{c.name}</span>
                  <span className="dim">{c.enrolled}/{c.capacity}</span>
                </div>
                <Bar pct={c.pct} rose={c.pct >= 90} />
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="card-head"><div><h2>{t('Atenção: risco de evasão')}</h2><div className="sub">{t('Menor presença nos últimos 30 dias')}</div></div></div>
          {data.atRisk.length === 0 && <div className="empty">{t('Ninguém em risco 🎉')}</div>}
          {data.atRisk.map((s) => (
            <Link to={`/gestao/alunos?id=${s.id}`} className="list-row" key={s.id}>
              <span>{s.name}<small className="dim" style={{ display: 'block', fontSize: 12 }}>{t('{n} aulas no período', { n: s.classes })}</small></span>
              <span className={`badge ${s.rate < 60 ? 'bad' : 'warn'}`}>{s.rate}%</span>
            </Link>
          ))}
        </div>
        <div className="card">
          <div className="card-head"><div><h2>{t('Próximos eventos')}</h2><div className="sub">{t('Confirmações de presença')}</div></div><Sparkles size={16} className="gold" /></div>
          {data.upcomingEvents.map((e) => (
            <div className="list-row" key={e.id}>
              <span style={{ minWidth: 0 }}><span style={{ display: 'block', fontWeight: 600, fontSize: 14 }}>{e.title}</span><small className="dim">{fmtDate(e.date)} · {t('em {n} dias', { n: daysUntil(e.date) })}</small></span>
              <span className="badge ok">{e.going}</span>
            </div>
          ))}
          <Link to="/gestao/site?tab=events" className="btn btn-sm" style={{ marginTop: 14 }}>{t('Gerenciar eventos')}</Link>
        </div>
      </div>
    </>
  );
}
