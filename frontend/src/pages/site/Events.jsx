import { useOutletContext } from 'react-router-dom';
import { Reveal, SplitHeading } from '../../components/motion.jsx';
import { useFetch } from '../../lib/useFetch.js';
import { EventRow, CtaBand } from './Home.jsx';
import { t, rich } from '../../i18n/index.jsx';

export default function Events() {
  const { content } = useOutletContext();
  const upcoming = useFetch('/public/events?when=upcoming');
  const past = useFetch('/public/events?when=past');
  const notices = useFetch('/public/announcements');
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <Reveal><span className="eyebrow">{t('Eventos')}</span></Reveal>
          <SplitHeading text={t('A cortina *sobe* em breve.')} delay={0.1} />
          <Reveal delay={0.4}><p>{t('Espetáculos, aulões, workshops e tudo o que acontece no Backstage — atualizado direto pela nossa equipe.')}</p></Reveal>
        </div>
      </section>

      {notices.data?.length > 0 && (
        <section className="section" style={{ paddingTop: 0, paddingBottom: 60 }}>
          <div className="container" style={{ display: 'grid', gap: 12 }}>
            {notices.data.map((n) => (
              <Reveal key={n.id} className="form-card" style={{ padding: '22px 26px', display: 'flex', gap: 18, alignItems: 'baseline', flexWrap: 'wrap' }}>
                <span className="chip gold">{n.pinned ? t('Destaque') : t('Aviso')}</span>
                <strong className="serif" style={{ fontSize: 22, fontWeight: 400 }}>{n.title}</strong>
                <span className="muted" style={{ fontSize: 15 }}>{n.body}</span>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="section-head"><div><Reveal><span className="eyebrow">{t('Próximos')}</span></Reveal></div></div>
          {upcoming.data?.length
            ? <div className="event-list">{upcoming.data.map((ev) => <EventRow key={ev.id} ev={ev} />)}</div>
            : !upcoming.loading && <p className="empty-note">{t('Novos eventos serão anunciados em breve.')}</p>}
        </div>
      </section>

      {past.data?.length > 0 && (
        <section className="section" style={{ paddingTop: 0 }}>
          <div className="container" style={{ opacity: 0.75 }}>
            <div className="section-head">
              <div>
                <Reveal><span className="eyebrow">{t('Já aconteceu')}</span></Reveal>
                <Reveal delay={0.1}><h2>{rich(t('Nos *bastidores* da memória.'))}</h2></Reveal>
              </div>
            </div>
            <div className="event-list">{past.data.map((ev) => <EventRow key={ev.id} ev={ev} />)}</div>
          </div>
        </section>
      )}
      <CtaBand contact={content?.contact} />
    </>
  );
}
