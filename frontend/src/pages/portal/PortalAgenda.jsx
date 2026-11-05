import { useOutletContext } from 'react-router-dom';
import { CalendarPlus } from 'lucide-react';
import { usePortalReady } from './PortalLayout.jsx';
import { SessionItem } from './PortalHome.jsx';
import { WEEKDAYS } from '../../lib/format.js';
import { downloadFile } from '../../lib/api.js';
import { useToast } from '../../components/ui.jsx';
import { t, rich } from '../../i18n/index.jsx';

export default function PortalAgenda() {
  const ctx = useOutletContext();
  const toast = useToast();
  const gate = usePortalReady(ctx);
  if (gate) return gate;
  const { overview: o } = ctx;
  const today = new Date().getDay();
  const days = [1, 2, 3, 4, 5, 6, 0].map((d) => ({
    d,
    items: o.classes.flatMap((c) => c.schedules.filter((s) => s.weekday === d).map((s) => ({ ...s, c }))).sort((a, b) => a.start_time.localeCompare(b.start_time)),
  })).filter((x) => x.items.length || x.d !== 0);

  const exportIcs = async () => {
    try {
      await downloadFile(`/portal/students/${o.student.id}/calendar.ics`, `agenda-backstage-${o.student.name.split(' ')[0].toLowerCase()}.ics`);
      toast(t('Agenda exportada! Abra o arquivo para adicionar ao seu calendário.'));
    } catch (e) { toast(e.message, 'err'); }
  };

  return (
    <>
      <div className="page-head">
        <div><h1>{rich(t('Agenda *semanal*'))}</h1><p>{t('As turmas de {name} e os próximos encontros.', { name: o.student.name.split(' ')[0] })}</p></div>
        <div className="actions"><button className="btn btn-primary btn-sm" onClick={exportIcs}><CalendarPlus />{t(' Adicionar ao meu calendário')}</button></div>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="week" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(150px, 1fr))` }}>
          {days.map(({ d, items }) => (
            <div className="week-col" key={d}>
              <h3 className={d === today ? 'today' : ''}>{WEEKDAYS[d]}{d === today && <span>{t('hoje')}</span>}</h3>
              {items.length === 0 && <div className="dim" style={{ fontSize: 13, padding: 8 }}>{t('Livre')}</div>}
              {items.map(({ c, ...s }) => (
                <div className="slot" key={s.id} style={{ '--c': c.color, cursor: 'default' }}>
                  <time>{s.start_time} – {s.end_time}</time>
                  <h4>{c.name}</h4>
                  <small>{c.room} · {c.teacher}</small>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="grid g-2">
        <div className="card">
          <div className="card-head"><h2>{t('Próximos encontros')}</h2></div>
          <div className="session-list">{o.upcoming.map((s) => <SessionItem key={s.class_id + s.date + s.start_time} s={s} />)}</div>
        </div>
        <div className="card">
          <div className="card-head"><h2>{t('Minhas turmas')}</h2></div>
          {o.classes.map((c) => (
            <div className="list-row" key={c.id} style={{ alignItems: 'start' }}>
              <div>
                <div style={{ fontWeight: 600, display: 'flex', gap: 8, alignItems: 'center' }}><span style={{ width: 10, height: 10, borderRadius: 3, background: c.color }} />{c.name}</div>
                <small className="muted">{c.style} · {c.level} · {c.teacher}</small>
                <p className="dim" style={{ fontSize: 13, marginTop: 6 }}>{c.description}</p>
              </div>
              <div className="dim nowrap" style={{ fontSize: 13, textAlign: 'right' }}>
                {c.schedules.map((s) => <div key={s.id}>{WEEKDAYS[s.weekday].slice(0, 3)} {s.start_time}</div>)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
