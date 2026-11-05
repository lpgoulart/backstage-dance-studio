import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { MapPin, Clock, Users } from 'lucide-react';
import { api } from '../../lib/api.js';
import { useFetch } from '../../lib/useFetch.js';
import { fmtLongDate, daysUntil, RSVP } from '../../lib/format.js';
import { Loading, useToast } from '../../components/ui.jsx';
import { t, rich } from '../../i18n/index.jsx';

export function RsvpButtons({ event, studentId, onDone, compact }) {
  const [status, setStatus] = useState(event.rsvp || null);
  useEffect(() => setStatus(event.rsvp || null), [event.rsvp, studentId]);
  const toast = useToast();
  const choose = async (s) => {
    const prev = status;
    setStatus(s);
    try {
      await api.put(`/portal/events/${event.id}/rsvp`, { studentId, status: s });
      toast(s === 'going' ? t('Presença confirmada! Nos vemos lá ✨') : t('Resposta registrada'));
      onDone?.();
    } catch (e) {
      setStatus(prev);
      toast(e.message, 'err');
    }
  };
  const opts = compact ? ['going', 'maybe'] : ['going', 'maybe', 'not_going'];
  return (
    <div className="rsvp">
      {opts.map((o) => <button key={o} className={`${o} ${status === o ? 'on' : ''}`} onClick={() => choose(o)}>{RSVP[o]}</button>)}
    </div>
  );
}

export default function PortalEvents() {
  const { student, reloadOverview } = useOutletContext();
  const { data, reload } = useFetch(student ? `/portal/events?studentId=${student.id}` : null);
  if (!data) return <Loading />;
  return (
    <>
      <div className="page-head">
        <div><h1>{rich(t('Eventos *& espetáculos*'))}</h1><p>{t('Confirme a presença de {name} para ajudar a equipe a organizar figurinos e ensaios.', { name: student.name.split(' ')[0] })}</p></div>
      </div>
      <div className="grid g-2">
        {data.length === 0 && <div className="card empty">{t('Nenhum evento agendado.')}</div>}
        {data.map((e) => {
          const n = daysUntil(e.date);
          return (
            <div className="card" key={e.id} style={{ display: 'grid', gap: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'start' }}>
                <span className="badge warn plain">{e.category}</span>
                <span className="dim" style={{ fontSize: 13 }}>{n === 0 ? t('hoje') : n === 1 ? t('amanhã') : t('em {n} dias', { n })}</span>
              </div>
              <h3 className="serif" style={{ fontSize: 28, fontWeight: 400 }}>{e.title}</h3>
              <p className="muted" style={{ fontSize: 14.5 }}>{e.description}</p>
              <div className="muted" style={{ display: 'grid', gap: 6, fontSize: 14 }}>
                <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Clock size={15} className="gold" />{fmtLongDate(e.date)}{e.time ? `, ${e.time}` : ''}</span>
                {e.location && <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}><MapPin size={15} className="gold" />{e.location}</span>}
                <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Users size={15} className="gold" />{t('{n} alunos confirmados', { n: e.going_count })}</span>
              </div>
              <RsvpButtons event={e} studentId={student.id} onDone={() => { reload(); reloadOverview(); }} />
            </div>
          );
        })}
      </div>
    </>
  );
}
