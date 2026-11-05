import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ClipboardCheck, NotebookPen, AlertCircle, MessageCircle, Search } from 'lucide-react';
import { useFetch } from '../../lib/useFetch.js';
import { Loading, Avatar } from '../../components/ui.jsx';
import { WEEKDAYS, ATT_STATUS, fmtDate } from '../../lib/format.js';
import { t, rich } from '../../i18n/index.jsx';

const DOT = { present: 'var(--mint)', late: 'var(--gold)', absent: 'var(--danger)' };

export default function TeacherClasses() {
  const [params, setParams] = useSearchParams();
  const list = useFetch('/teacher/classes');
  const id = Number(params.get('id')) || list.data?.[0]?.id || null;
  const detail = useFetch(id ? `/teacher/classes/${id}` : null);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('name');
  useEffect(() => setQ(''), [id]);

  if (!list.data) return <Loading />;
  if (!list.data.length) return <div className="card empty">{t('Você ainda não tem turmas atribuídas. Fale com a gestão.')}</div>;
  const c = detail.data;
  const students = (c?.students || [])
    .filter((s) => !q || s.name.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (sort === 'rate' ? (a.rate30 ?? 101) - (b.rate30 ?? 101) : sort === 'age' ? (a.age ?? 0) - (b.age ?? 0) : a.name.localeCompare(b.name)));

  return (
    <>
      <div className="page-head">
        <div><h1>{rich(t('Minhas *turmas*'))}</h1><p>{t('Alunos, frequência individual e observações importantes.')}</p></div>
      </div>
      <div className="pill-tabs" role="tablist">
        {list.data.map((x) => (
          <button key={x.id} className={x.id === id ? 'on' : ''} role="tab" aria-selected={x.id === id} onClick={() => setParams({ id: String(x.id) })}>
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: x.color, marginRight: 8 }} />{x.name} <span className="dim">({x.enrolled})</span>
          </button>
        ))}
      </div>

      {!c ? <Loading /> : (
        <>
          <div className="grid g-4" style={{ marginBottom: 16 }}>
            <div className="card kpi"><div className="label">{t('Alunos')}</div><div className="value">{c.enrolled}<span className="dim" style={{ fontSize: '0.45em' }}> / {c.capacity}</span></div><div className="hint">{c.capacity - c.enrolled > 0 ? t('{n} vaga(s) livre(s)', { n: c.capacity - c.enrolled }) : t('Turma lotada')}</div></div>
            <div className="card kpi"><div className="label">{t('Presença (30 dias)')}</div><div className="value">{c.stats.attendance_rate ?? '—'}{c.stats.attendance_rate !== null && '%'}</div></div>
            <div className="card kpi"><div className="label">{t('Idade média')}</div><div className="value">{c.stats.avg_age ? String(c.stats.avg_age).replace('.', ',') : '—'}</div><div className="hint">{t('anos')}</div></div>
            <div className="card kpi"><div className="label">{t('Aulas registradas')}</div><div className="value">{c.stats.sessions_given}</div><div className="hint">{Object.entries(c.stats.levels).map(([k, v]) => `${v} ${t(k).toLowerCase()}`).join(' · ')}</div></div>
          </div>

          <div className="card" style={{ marginBottom: 16, display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="muted" style={{ fontSize: 14 }}>{c.style} · {c.level} · {c.room}</div>
              <div style={{ fontSize: 14, marginTop: 4 }}>{c.schedules.map((s) => `${WEEKDAYS[s.weekday]} ${s.start_time}–${s.end_time}`).join(' · ')}</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Link to={`/professor/chamada?classId=${c.id}`} className="btn btn-primary btn-sm"><ClipboardCheck size={15} />{t(' Fazer chamada')}</Link>
              <Link to={`/professor/diario?classId=${c.id}`} className="btn btn-sm"><NotebookPen size={15} />{t(' Diário')}</Link>
            </div>
          </div>

          <div className="toolbar">
            <div className="search"><Search /><input className="input" placeholder={t('Buscar aluno')} value={q} onChange={(e) => setQ(e.target.value)} /></div>
            <div className="seg">
              {[['name', 'Nome'], ['rate', 'Menor presença'], ['age', 'Idade']].map(([k, l]) => <button key={k} className={sort === k ? 'on' : ''} onClick={() => setSort(k)}>{t(l)}</button>)}
            </div>
          </div>

          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>{t('Aluno')}</th><th>{t('Idade')}</th><th>{t('Nível')}</th><th>{t('Presença 30d')}</th><th>{t('Últimas aulas')}</th><th>{t('Contato')}</th></tr></thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div className="person"><Avatar name={s.name} />
                        <div>{s.name}<small>{t('na turma desde {d} · {n} presenças', { d: fmtDate(s.enrolled_at, { month: 'short', year: 'numeric' }), n: s.total_present })}</small>
                          {s.notes && <small style={{ color: 'var(--gold)', display: 'flex', gap: 4, alignItems: 'center' }}><AlertCircle size={12} />{s.notes}</small>}
                        </div>
                      </div>
                    </td>
                    <td className="muted">{s.age ?? '—'}</td>
                    <td className="muted">{t(s.level)}</td>
                    <td>{s.rate30 === null ? <span className="dim">—</span> : <span className={`badge ${s.rate30 >= 80 ? 'ok' : s.rate30 >= 65 ? 'warn' : 'bad'}`}>{s.rate30}%</span>}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {s.last.length === 0 && <span className="dim">—</span>}
                        {[...s.last].reverse().map((st, i) => <span key={i} title={ATT_STATUS[st]} style={{ width: 10, height: 10, borderRadius: 3, background: DOT[st] }} />)}
                      </div>
                    </td>
                    <td className="muted" style={{ fontSize: 13 }}>
                      {(s.guardian_phone || s.phone) ? (
                        <a href={`https://wa.me/55${(s.guardian_phone || s.phone).replace(/\D/g, '')}`} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                          <MessageCircle size={14} className="gold" />{s.guardian_name ? t('{name} (resp.)', { name: s.guardian_name.split(' ')[0] }) : t('WhatsApp')}
                        </a>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
                {students.length === 0 && <tr><td colSpan={6} className="empty">{t('Nenhum aluno encontrado.')}</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
