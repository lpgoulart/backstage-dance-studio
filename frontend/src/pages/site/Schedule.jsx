import { useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Reveal, SplitHeading } from '../../components/motion.jsx';
import { useFetch } from '../../lib/useFetch.js';
import { WEEKDAYS } from '../../lib/format.js';
import { CtaBand } from './Home.jsx';
import { t } from '../../i18n/index.jsx';

const ORDER = [1, 2, 3, 4, 5, 6];

export default function Schedule() {
  const { content } = useOutletContext();
  const { data } = useFetch('/public/schedule');
  const todayIdx = new Date().getDay();
  const [day, setDay] = useState(ORDER.includes(todayIdx) ? todayIdx : 1);
  const [style, setStyle] = useState('Todas');

  const styles = useMemo(() => ['Todas', ...new Set((data || []).map((c) => c.style))], [data]);
  const sessions = useMemo(() => (data || [])
    .filter((c) => style === 'Todas' || c.style === style)
    .flatMap((c) => c.schedules.filter((s) => s.weekday === day).map((s) => ({ ...s, c })))
    .sort((a, b) => a.start_time.localeCompare(b.start_time)), [data, day, style]);

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <Reveal><span className="eyebrow">{t('Horários')}</span></Reveal>
          <SplitHeading text={t('Encontre o seu *tempo*.')} delay={0.1} />
          <Reveal delay={0.4}><p>{t('Grade atualizada de todas as turmas. Escolha o dia e a modalidade — e venha fazer uma aula experimental.')}</p></Reveal>
        </div>
      </section>
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="sched-tabs" role="tablist">
            {ORDER.map((d) => (
              <button key={d} className={`filter ${d === day ? 'on' : ''}`} onClick={() => setDay(d)} role="tab" aria-selected={d === day}>
                {WEEKDAYS[d]}{d === todayIdx ? t(' · hoje') : ''}
              </button>
            ))}
          </div>
          <div className="filters" style={{ marginBottom: 28 }}>
            {styles.map((s) => <button key={s} className={`filter ${s === style ? 'on' : ''}`} style={{ fontSize: 13, padding: '7px 14px' }} onClick={() => setStyle(s)}>{s === 'Todas' ? t(s) : s}</button>)}
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={`${day}-${style}`} className="sched-day" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
              {sessions.length === 0 && <p className="empty-note">{style !== 'Todas' ? t('Nenhuma aula de {s} neste dia.', { s: style }) : t('Nenhuma aula neste dia.')}</p>}
              {sessions.map(({ c, ...s }) => (
                <div className="sched-item" key={s.id} style={{ '--c': c.color }}>
                  <time>{s.start_time}<small>{t('até {h}', { h: s.end_time })}</small></time>
                  <div>
                    <h3>{c.name}</h3>
                    <div className="s-meta">{c.style} · {c.level}</div>
                  </div>
                  <div className="s-meta s-hide">{c.teacher}</div>
                  <div className="s-meta s-hide">{c.room}</div>
                </div>
              ))}
            </motion.div>
          </AnimatePresence>
          <p className="muted" style={{ marginTop: 28, fontSize: 14 }}>
            Já é aluno? Veja sua agenda personalizada no <Link to="/entrar" className="gold">{t('portal do aluno')}</Link>.
          </p>
        </div>
      </section>
      <CtaBand contact={content?.contact} />
    </>
  );
}
