import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Reveal, SplitHeading } from '../../components/motion.jsx';
import { useFetch } from '../../lib/useFetch.js';
import { CtaBand } from './Home.jsx';
import { t } from '../../i18n/index.jsx';

export function ProjectPoster({ p }) {
  return (
    <article className="poster grain" tabIndex={0} style={{ '--c': p.color || '#e8b04b' }}>
      <div className={`poster-art ${p.image_url ? 'img' : ''}`} style={p.image_url ? { backgroundImage: `url(${p.image_url})` } : undefined} />
      <span className="poster-year" aria-hidden="true">{String(p.year || '').slice(-2) ? `’${String(p.year).slice(-2)}` : ''}</span>
      <div style={{ position: 'relative' }}>
        <span className="chip">{p.category}{p.year ? ` · ${p.year}` : ''}</span>
        <h3>{p.title}</h3>
        {p.description && <p>{p.description}</p>}
      </div>
    </article>
  );
}

export default function Projects() {
  const { content } = useOutletContext();
  const { data } = useFetch('/public/projects');
  const [cat, setCat] = useState('Todos');
  const cats = useMemo(() => ['Todos', ...new Set((data || []).map((p) => p.category).filter(Boolean))], [data]);
  const items = (data || []).filter((p) => cat === 'Todos' || p.category === cat);

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <Reveal><span className="eyebrow">{t('Trabalhos & projetos')}</span></Reveal>
          <SplitHeading text={t('Histórias contadas em *cena*.')} delay={0.1} />
          <Reveal delay={0.4}><p>{t('Mostras semestrais, espetáculos temáticos, festivais e aulas especiais — um pouco do que já levamos aos palcos de Manaus.')}</p></Reveal>
        </div>
      </section>
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="filters" role="tablist">
            {cats.map((c) => <button key={c} className={`filter ${c === cat ? 'on' : ''}`} onClick={() => setCat(c)} role="tab" aria-selected={c === cat}>{c === 'Todos' ? t(c) : c}</button>)}
          </div>
          <motion.div layout className="projects-grid three">
            <AnimatePresence mode="popLayout">
              {items.map((p) => (
                <motion.div layout key={p.id} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
                  <ProjectPoster p={p} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </div>
      </section>
      <CtaBand contact={content?.contact} />
    </>
  );
}
