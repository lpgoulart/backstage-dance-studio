import { useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Reveal, SplitHeading, Stagger, itemVariants, Counter } from '../../components/motion.jsx';
import { initials } from '../../lib/format.js';
import { CtaBand } from './Home.jsx';
import { t, rich } from '../../i18n/index.jsx';

export default function About() {
  const { content } = useOutletContext();
  const about = content?.about || {};
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <Reveal><span className="eyebrow">{t('Sobre a escola')}</span></Reveal>
          <SplitHeading text={t('18 anos de *bastidores*.')} delay={0.1} />
          <Reveal delay={0.4}><p>{about.title}</p></Reveal>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 20 }}>
        <div className="container about-grid">
          <Reveal>
            <p className="big-quote">{about.mission}</p>
          </Reveal>
          <div className="about-copy">
            <Reveal delay={0.1}><p>{about.text}</p></Reveal>
            <Reveal delay={0.2}>
              <div className="stats">
                {(content?.stats || []).map((s) => (
                  <div className="stat" key={s.label}>
                    <strong><Counter value={Number(s.value) || 0} />{s.suffix && <sup>{s.suffix}</sup>}</strong>
                    <span>{s.label}</span>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {about.values?.length > 0 && (
        <section className="section" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="section-head">
              <div>
                <Reveal><span className="eyebrow">{t('Valores')}</span></Reveal>
                <Reveal delay={0.1}><h2>{rich(t('O que nos *move*.'))}</h2></Reveal>
              </div>
            </div>
            <Stagger className="values">
              {about.values.map((v, i) => (
                <motion.div className="value-item" key={v} variants={itemVariants}>
                  <span>{String(i + 1).padStart(2, '0')}</span>
                  <h3>{v}</h3>
                </motion.div>
              ))}
            </Stagger>
          </div>
        </section>
      )}

      {content?.timeline?.length > 0 && (
        <section className="section" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="section-head">
              <div>
                <Reveal><span className="eyebrow">{t('Linha do tempo')}</span></Reveal>
                <Reveal delay={0.1}><h2>{rich(t('Nossa *história*.'))}</h2></Reveal>
              </div>
            </div>
            <Stagger className="timeline" gap={0.12}>
              {content.timeline.map((t) => (
                <motion.div className="tl-item" key={t.year + t.text} variants={itemVariants}>
                  <strong>{t.year}</strong>
                  <p>{t.text}</p>
                </motion.div>
              ))}
            </Stagger>
          </div>
        </section>
      )}

      {content?.team?.length > 0 && (
        <section className="section" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="section-head">
              <div>
                <Reveal><span className="eyebrow">{t('Equipe')}</span></Reveal>
                <Reveal delay={0.1}><h2>{rich(t('Quem faz *acontecer*.'))}</h2></Reveal>
              </div>
              <Reveal delay={0.2}><p>{t('Professores com formação sólida e anos de palco, que acompanham cada aluno de perto.')}</p></Reveal>
            </div>
            <Stagger className="team-grid">
              {content.team.map((m) => (
                <motion.div className="team-card" key={m.name} variants={itemVariants}>
                  <div className="team-avatar">{initials(m.name)}</div>
                  <h3>{m.name}</h3>
                  <p>{m.role}</p>
                </motion.div>
              ))}
            </Stagger>
          </div>
        </section>
      )}

      <CtaBand contact={content?.contact} />
    </>
  );
}
