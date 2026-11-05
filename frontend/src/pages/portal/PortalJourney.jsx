import { useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Footprints, Clock, Flame, Medal, Sparkles, Star, Crown, Lock } from 'lucide-react';
import { usePortalReady } from './PortalLayout.jsx';
import { LevelRing } from './PortalHome.jsx';
import { useFetch } from '../../lib/useFetch.js';
import { Bar, Loading } from '../../components/ui.jsx';
import { fmtDate, ATT_STATUS, WEEKDAYS_SHORT } from '../../lib/format.js';
import { t, rich } from '../../i18n/index.jsx';

const ICONS = { footprints: Footprints, clock: Clock, flame: Flame, medal: Medal, sparkles: Sparkles, star: Star, crown: Crown };

function Heatmap({ records }) {
  // 12 weeks × 7 days, ending this week; worst status of the day wins
  const cols = useMemo(() => {
    const map = {};
    const rank = { absent: 3, late: 2, present: 1 };
    for (const r of records) if (!map[r.date] || rank[r.status] > rank[map[r.date]]) map[r.date] = r.status;
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7) - 7 * 11);
    return Array.from({ length: 12 }, (_, w) => Array.from({ length: 7 }, (_, d) => {
      const day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + w * 7 + d);
      const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
      return { key, status: map[key], future: day > now };
    }));
  }, [records]);
  const cls = { present: 'p', late: 'l', absent: 'a' };
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr', gap: 8 }}>
        <div className="heat-col" style={{ fontSize: 10, color: 'var(--dim)' }}>
          {[1, 2, 3, 4, 5, 6, 0].map((d) => <div key={d} style={{ aspectRatio: 1, display: 'grid', alignItems: 'center' }}>{WEEKDAYS_SHORT[d]}</div>)}
        </div>
        <div className="heat">
          {cols.map((col, i) => (
            <div className="heat-col" key={i}>
              {col.map((c) => (
                <motion.div key={c.key} className={`heat-cell ${c.future ? 'x' : cls[c.status] || ''}`} title={`${fmtDate(c.key)}${c.status ? ` · ${ATT_STATUS[c.status]}` : ''}`}
                  initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.03 }} />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="legend" style={{ marginTop: 14 }}>
        <span><i style={{ background: 'var(--mint)' }} />{t('Presente')}</span>
        <span><i style={{ background: 'var(--gold)' }} />{t('Atrasado')}</span>
        <span><i style={{ background: 'rgba(255,122,122,.55)' }} />{t('Falta')}</span>
        <span><i style={{ background: 'var(--bg-4)' }} />{t('Sem aula')}</span>
      </div>
    </div>
  );
}

export default function PortalJourney() {
  const ctx = useOutletContext();
  const att = useFetch(ctx.student ? `/portal/students/${ctx.student.id}/attendance` : null);
  const gate = usePortalReady(ctx);
  if (gate) return gate;
  const { journey: j, achievements } = ctx.overview;

  return (
    <>
      <div className="page-head">
        <div><h1>{rich(t('Jornada *de palco*'))}</h1><p>{t('Cada aula vale XP. Presenças, pontualidade e sequências desbloqueiam conquistas.')}</p></div>
      </div>

      <div className="grid g-3" style={{ marginBottom: 16 }}>
        <div className="card span-2">
          <div style={{ display: 'flex', gap: 28, alignItems: 'center', flexWrap: 'wrap' }}>
            <LevelRing journey={j} size={150} />
            <div style={{ flex: 1, minWidth: 220 }}>
              <span className="eyebrow">{t('Nível {n}', { n: j.level })}</span>
              <div className="serif" style={{ fontSize: 44, lineHeight: 1.05, marginTop: 8 }}>{j.levelName}</div>
              <p className="muted" style={{ marginTop: 6 }}>{t(j.description)}</p>
              <div style={{ marginTop: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                  <span>{j.xp} XP</span>{j.next && <span className="dim">{j.nextAt} XP · {j.next}</span>}
                </div>
                <Bar pct={j.progress} />
              </div>
            </div>
          </div>
          <div className="level-steps" style={{ marginTop: 22 }}>
            {j.levels.map((l, i) => <span key={l.name} className={i + 1 === j.level ? 'cur' : i + 1 < j.level ? 'done' : ''}>{l.name}</span>)}
          </div>
        </div>
        <div className="card">
          <div className="card-head"><h2>{t('Como ganhar XP')}</h2></div>
          <div style={{ display: 'grid', gap: 10, fontSize: 14 }}>
            <div className="list-row"><span>{t('Presença na aula')}</span><strong className="gold">+10</strong></div>
            <div className="list-row"><span>{t('Presença com atraso')}</span><strong className="gold">+6</strong></div>
            <div className="list-row"><span>{t('Cada semana da sequência')}</span><strong className="gold">+15</strong></div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-head"><div><h2>{t('Conquistas')}</h2><div className="sub">{t('{a} de {b} desbloqueadas', { a: achievements.filter((a) => a.unlocked).length, b: achievements.length })}</div></div></div>
        <div className="badges">
          {achievements.map((a, i) => {
            const Icon = ICONS[a.icon] || Star;
            return (
              <motion.div key={a.id} className={`ach ${a.unlocked ? 'on' : ''}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <div className="ico">{a.unlocked ? <Icon size={22} /> : <Lock size={18} />}</div>
                <h4>{t(a.title)}</h4>
                <p>{t(a.description)}</p>
                {!a.unlocked && <><Bar pct={(a.current / a.target) * 100} /><span className="dim" style={{ fontSize: 12 }}>{a.current}/{a.target}</span></>}
              </motion.div>
            );
          })}
        </div>
      </div>

      <div className="grid g-2">
        <div className="card">
          <div className="card-head"><div><h2>{t('Frequência')}</h2><div className="sub">{t('Últimas 12 semanas')}</div></div></div>
          {att.data ? <Heatmap records={att.data.records} /> : <Loading />}
        </div>
        <div className="card">
          <div className="card-head"><h2>{t('Histórico recente')}</h2></div>
          {att.data?.records.slice(0, 8).map((r) => (
            <div className="list-row" key={r.date + r.class_name}>
              <div><div style={{ fontWeight: 600, fontSize: 14 }}>{r.class_name}</div><small className="muted">{fmtDate(r.date, { weekday: 'short', day: '2-digit', month: 'short' })}</small></div>
              <span className={`badge ${r.status === 'present' ? 'ok' : r.status === 'late' ? 'warn' : 'bad'}`}>{ATT_STATUS[r.status]}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
