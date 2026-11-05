import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFetch } from '../../lib/useFetch.js';
import { Loading, Bar } from '../../components/ui.jsx';
import { WEEKDAYS } from '../../lib/format.js';
import { t, locale, rich } from '../../i18n/index.jsx';

const DAYS = [1, 2, 3, 4, 5, 6];

export default function WeekSchedule() {
  const { data } = useFetch('/admin/schedule/week');
  const nav = useNavigate();
  const [teacher, setTeacher] = useState('');
  const [room, setRoom] = useState('');
  const today = new Date().getDay();

  const teachers = useMemo(() => [...new Set((data || []).map((s) => s.teacher).filter(Boolean))].sort(), [data]);
  const rooms = useMemo(() => [...new Set((data || []).map((s) => s.room).filter(Boolean))].sort(), [data]);
  if (!data) return <Loading />;
  const filtered = data.filter((s) => (!teacher || s.teacher === teacher) && (!room || s.room === room));
  const hasSunday = filtered.some((s) => s.weekday === 0);
  const days = hasSunday ? [...DAYS, 0] : DAYS;
  const hours = filtered.reduce((acc, s) => {
    const [h1, m1] = s.start_time.split(':').map(Number); const [h2, m2] = s.end_time.split(':').map(Number);
    return acc + (h2 * 60 + m2 - h1 * 60 - m1) / 60;
  }, 0);

  return (
    <>
      <div className="page-head">
        <div><h1>{rich(t('Grade *semanal*'))}</h1><p>{t('{n} aulas · {h} horas de aula por semana', { n: filtered.length, h: hours.toLocaleString(locale(), { maximumFractionDigits: 1 }) })}</p></div>
        <div className="actions">
          <select className="select" style={{ width: 'auto' }} value={teacher} onChange={(e) => setTeacher(e.target.value)}>
            <option value="">{t('Todos os professores')}</option>{teachers.map((t) => <option key={t}>{t}</option>)}
          </select>
          <select className="select" style={{ width: 'auto' }} value={room} onChange={(e) => setRoom(e.target.value)}>
            <option value="">{t('Todas as salas')}</option>{rooms.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div className="week" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(180px, 1fr))` }}>
        {days.map((d) => {
          const items = filtered.filter((s) => s.weekday === d);
          return (
            <div className="week-col" key={d}>
              <h3 className={d === today ? 'today' : ''}>{WEEKDAYS[d]}<span className="dim">{items.length}</span></h3>
              {items.map((s) => {
                const pct = Math.round((s.enrolled / s.capacity) * 100);
                return (
                  <button className="slot" key={s.schedule_id} style={{ '--c': s.color }} onClick={() => nav(`/gestao/chamada?classId=${s.class_id}`)} title={t('Abrir chamada')}>
                    <time>{s.start_time} – {s.end_time}</time>
                    <h4>{s.name}</h4>
                    <small>{s.teacher}</small>
                    <small>{s.room} · {t('{a}/{b} alunos', { a: s.enrolled, b: s.capacity })}</small>
                    <Bar pct={pct} rose={pct >= 90} />
                  </button>
                );
              })}
              {items.length === 0 && <div className="dim" style={{ fontSize: 13, padding: 8 }}>{t('Sem aulas')}</div>}
            </div>
          );
        })}
      </div>
    </>
  );
}
