import { useEffect, useRef, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { AnimatePresence, motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, ArrowUpRight, Clock, MapPin, MessageCircle } from 'lucide-react';
import { Reveal, SplitHeading, Counter, Stagger, itemVariants, useSpotlight } from '../../components/motion.jsx';
import { useFetch } from '../../lib/useFetch.js';
import { MONTHS_SHORT, parseDate } from '../../lib/format.js';
import { ProjectPoster } from './Projects.jsx';
import SafeLink from '../../components/SafeLink.jsx';
import { t, rich } from '../../i18n/index.jsx';

export const emphasize = (title = '') => (title.includes('*') ? title : title.replace(/(\S+)$/, '*$1*'));

function Hero({ hero }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const fade = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
    e.currentTarget.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`);
  };
  return (
    <section className="hero grain" ref={ref} onMouseMove={onMove}>
      <div className="hero-spot" />
      <div className="beam b1" />
      <div className="beam b2" />
      <div className="hero-floor" />
      <motion.div className="container" style={{ y, opacity: fade, position: 'relative' }}>
        <div className="hero-content">
          <motion.span className="eyebrow" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 1 }}>
            {hero?.eyebrow || 'Manaus · AM'}
          </motion.span>
          {hero && <SplitHeading text={emphasize(hero.title)} delay={0.35} />}
          <motion.p className="lead" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.0, duration: 0.9 }}>
            {hero?.subtitle}
          </motion.p>
          <motion.div className="hero-actions" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.15, duration: 0.9 }}>
            <SafeLink to={hero?.ctaLink} className="btn btn-primary">{hero?.ctaLabel || t('Agende uma aula')} <ArrowRight className="arrow" /></SafeLink>
            <Link to="/horarios" className="btn">{t('Ver horários')}</Link>
          </motion.div>
        </div>
        <div className="hero-side"><span>{t('São parte')}</span><span className="gold">{t('dos bastidores')}</span></div>
      </motion.div>
      <div className="scroll-cue" aria-hidden="true" />
    </section>
  );
}

function Marquee({ styles }) {
  const names = (styles?.length ? styles.map((s) => s.name) : ['Ballet', 'Jazz', 'Contemporâneo', 'Hip Hop', 'K-Pop', 'Heels']);
  const row = [...names, ...names];
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee-track">
        {row.map((n, i) => <div className="marquee-item" key={i}>{n}<span className="star">✦</span></div>)}
      </div>
    </div>
  );
}

function About({ about, stats }) {
  return (
    <section className="section">
      <div className="container about-grid">
        <div>
          <Reveal><span className="eyebrow">{t('Nossa essência')}</span></Reveal>
          <Reveal delay={0.1}>
            <p className="big-quote" style={{ marginTop: 22 }}>
              {t('O palco é consequência.')} <em>{t('O que transforma')}</em> {t('acontece nos bastidores.')}
            </p>
          </Reveal>
        </div>
        <div className="about-copy">
          <Reveal delay={0.15}><p>{about?.text}</p></Reveal>
          <Reveal delay={0.25}>
            <p style={{ marginTop: 26 }}><Link to="/sobre" className="link-arrow">{t('Conheça nossa história ')}<ArrowRight /></Link></p>
          </Reveal>
          <Reveal delay={0.3}>
            <div className="stats">
              {(stats || []).map((s) => (
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
  );
}

function Styles({ styles }) {
  const spot = useSpotlight();
  return (
    <section className="section" style={{ paddingTop: 0 }}>
      <div className="container">
        <div className="section-head">
          <div>
            <Reveal><span className="eyebrow">{t('Modalidades')}</span></Reveal>
            <Reveal delay={0.1}><h2>{rich(t('Um estilo para cada *corpo*.'))}</h2></Reveal>
          </div>
          <Reveal delay={0.2}><p>{t('Do Baby Class aos adultos, turmas por idade e nível com professores apaixonados pelo que fazem.')}</p></Reveal>
        </div>
        <Stagger className="styles-grid">
          {(styles || []).map((s, i) => (
            <motion.div key={s.name} variants={itemVariants} className="spot-card" onMouseMove={spot}>
              <span className="num">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <h3>{s.name}</h3>
                <p>{s.description}</p>
              </div>
            </motion.div>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

export function EventRow({ ev }) {
  const d = parseDate(ev.date);
  return (
    <Reveal className="event-row">
      <div className="event-date">
        <strong>{String(d.getDate()).padStart(2, '0')}</strong>
        <span>{MONTHS_SHORT[d.getMonth()]} {d.getFullYear()}</span>
      </div>
      <div>
        {ev.category && <span className="chip gold" style={{ marginBottom: 10 }}>{ev.category}</span>}
        <h3>{ev.title}</h3>
        {ev.description && <p>{ev.description}</p>}
      </div>
      <div className="event-meta">
        {ev.time && <div><Clock />{ev.time.replace(':', 'h')}</div>}
        {ev.location && <div><MapPin />{ev.location}</div>}
      </div>
      <Link to="/contato" className="event-arrow" aria-label={t('Saber mais sobre {name}', { name: ev.title })}><ArrowUpRight size={18} /></Link>
    </Reveal>
  );
}

function Events() {
  const { data } = useFetch('/public/events?when=upcoming');
  if (!data?.length) return null;
  return (
    <section className="section" style={{ paddingTop: 0 }}>
      <div className="container">
        <div className="section-head">
          <div>
            <Reveal><span className="eyebrow">{t('Agenda')}</span></Reveal>
            <Reveal delay={0.1}><h2>{rich(t('Próximos *atos*.'))}</h2></Reveal>
          </div>
          <Reveal delay={0.2}><Link to="/eventos" className="link-arrow">{t('Todos os eventos ')}<ArrowRight /></Link></Reveal>
        </div>
        <div className="event-list">{data.slice(0, 4).map((ev) => <EventRow key={ev.id} ev={ev} />)}</div>
      </div>
    </section>
  );
}

function Projects() {
  const { data } = useFetch('/public/projects');
  const items = (data || []).filter((p) => p.highlight).slice(0, 3);
  if (!items.length) return null;
  return (
    <section className="section" style={{ paddingTop: 0 }}>
      <div className="container">
        <div className="section-head">
          <div>
            <Reveal><span className="eyebrow">{t('Trabalhos')}</span></Reveal>
            <Reveal delay={0.1}><h2>{rich(t('Espetáculos que *ficaram*.'))}</h2></Reveal>
          </div>
          <Reveal delay={0.2}><Link to="/projetos" className="link-arrow">{t('Ver todos os projetos ')}<ArrowRight /></Link></Reveal>
        </div>
        <Stagger className="projects-grid three">
          {items.map((p) => <motion.div key={p.id} variants={itemVariants}><ProjectPoster p={p} /></motion.div>)}
        </Stagger>
      </div>
    </section>
  );
}

function Testimonials({ items }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!items?.length) return;
    const t = setInterval(() => setI((x) => (x + 1) % items.length), 6500);
    return () => clearInterval(t);
  }, [items]);
  if (!items?.length) return null;
  const cur = items[i];
  return (
    <section className="section" style={{ paddingTop: 0 }}>
      <div className="container">
        <Reveal style={{ textAlign: 'center', marginBottom: 36 }}><span className="eyebrow">{t('Quem vive o Backstage')}</span></Reveal>
        <div className="testimonial">
          <AnimatePresence mode="wait">
            <motion.div key={i} initial={{ opacity: 0, y: 16, filter: 'blur(6px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -10, filter: 'blur(6px)' }} transition={{ duration: 0.7 }}>
              <blockquote>“{cur.quote}”</blockquote>
              <cite>{cur.author}</cite>
            </motion.div>
          </AnimatePresence>
          <div className="dots">
            {items.map((_, k) => <button key={k} className={k === i ? 'on' : ''} onClick={() => setI(k)} aria-label={t('Depoimento {n}', { n: k + 1 })} />)}
          </div>
        </div>
      </div>
    </section>
  );
}

export function CtaBand({ contact }) {
  return (
    <section className="section" style={{ paddingTop: 0 }}>
      <div className="container">
        <Reveal className="cta-band grain">
          <div>
            <span className="eyebrow">{t('Aula experimental')}</span>
            <h2 style={{ marginTop: 18 }}>{rich(t('Sua primeira aula é *por nossa conta*.'))}</h2>
          </div>
          <div className="cta-actions">
            <Link to="/contato" className="btn btn-primary">{t('Agendar agora ')}<ArrowRight className="arrow" /></Link>
            {contact?.whatsapp && (
              <a className="btn" href={`https://wa.me/${contact.whatsapp}`} target="_blank" rel="noreferrer"><MessageCircle />{t(' WhatsApp')}</a>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export default function Home() {
  const { content } = useOutletContext();
  return (
    <>
      <Hero hero={content?.hero} />
      <Marquee styles={content?.styles} />
      <About about={content?.about} stats={content?.stats} />
      <Styles styles={content?.styles} />
      <Events />
      <Projects />
      <Testimonials items={content?.testimonials} />
      <CtaBand contact={content?.contact} />
    </>
  );
}
