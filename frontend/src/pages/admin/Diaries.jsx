import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, ChevronDown, NotebookPen, User } from 'lucide-react';
import { useFetch } from '../../lib/useFetch.js';
import { Loading } from '../../components/ui.jsx';
import { fmtDate, fmtLongDate } from '../../lib/format.js';
import { t, rich } from '../../i18n/index.jsx';

/** Management view (read-only) of the class diaries written by teachers, grouped by class */
export default function Diaries() {
  const [params, setParams] = useSearchParams();
  const teacherId = params.get('teacherId') || '';
  const classId = params.get('classId') || '';
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState({});
  useEffect(() => { const id = setTimeout(() => setQ(search), 300); return () => clearTimeout(id); }, [search]);

  const teachers = useFetch('/admin/teachers');
  const classes = useFetch('/admin/classes');
  const qs = new URLSearchParams({ ...(teacherId && { teacherId }), ...(classId && { classId }), ...(q && { search: q }) }).toString();
  const { data } = useFetch(`/admin/logs${qs ? `?${qs}` : ''}`);

  const set = (k, v) => { const p = Object.fromEntries(params); if (v) p[k] = v; else delete p[k]; setParams(p); };
  const isOpen = (id) => open[id] ?? true;
  const classOptions = (classes.data || []).filter((c) => !teacherId || c.teacher_id === Number(teacherId));

  return (
    <>
      <div className="page-head">
        <div><h1>{rich(t('Diários *de aula*'))}</h1><p>{t('O que cada professor registrou em suas aulas, separado por turma.')}</p></div>
      </div>
      <div className="toolbar">
        <div className="search"><Search /><input className="input" placeholder={t('Buscar no diário')} value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <select className="select" style={{ width: 'auto', minWidth: 200 }} value={teacherId} onChange={(e) => { const p = Object.fromEntries(params); delete p.classId; if (e.target.value) p.teacherId = e.target.value; else delete p.teacherId; setParams(p); }}>
          <option value="">{t('Todos os professores')}</option>
          {teachers.data?.map((tc) => <option key={tc.id} value={tc.id}>{tc.name}{tc.status !== 'active' ? ` (${t('desligado')})` : ''}</option>)}
        </select>
        <select className="select" style={{ width: 'auto', minWidth: 200 }} value={classId} onChange={(e) => set('classId', e.target.value)}>
          <option value="">{t('Todas as turmas')}</option>
          {classOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {!data ? <Loading /> : data.classes.length === 0 ? (
        <div className="card empty"><NotebookPen size={20} className="gold" style={{ marginBottom: 8 }} /><br />{t('Nenhum registro de diário encontrado.')}</div>
      ) : (
        <>
          <p className="dim" style={{ fontSize: 13, marginBottom: 12 }}>{t('{n} registro(s) em {c} turma(s)', { n: data.total, c: data.classes.length })}</p>
          <div style={{ display: 'grid', gap: 14 }}>
            {data.classes.map((g) => (
              <section key={g.class_id} className="card" style={{ borderLeft: `3px solid ${g.color}`, padding: 0, overflow: 'hidden' }}>
                <button type="button" onClick={() => setOpen({ ...open, [g.class_id]: !isOpen(g.class_id) })} aria-expanded={isOpen(g.class_id)}
                  style={{ all: 'unset', cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'center', padding: '16px 18px', width: '100%', boxSizing: 'border-box', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div className="serif" style={{ fontSize: 22 }}>{g.class_name}</div>
                    <small className="muted" style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                      <User size={13} />{g.teachers.join(', ') || t('Sem professor')} · {g.style}
                    </small>
                  </div>
                  <span className="badge plain">{t('{n} registro(s)', { n: g.count })}</span>
                  <span className="dim" style={{ fontSize: 12.5 }}>{t('último em {d}', { d: fmtDate(g.last_date, { day: '2-digit', month: 'short' }) })}</span>
                  <ChevronDown size={18} style={{ transform: isOpen(g.class_id) ? 'rotate(180deg)' : 'none', transition: 'transform .3s' }} />
                </button>
                {isOpen(g.class_id) && (
                  <div style={{ borderTop: '1px solid var(--line)', padding: '6px 18px 14px' }}>
                    {g.entries.map((e) => (
                      <article key={e.id} style={{ padding: '14px 0', borderBottom: '1px solid var(--line)' }}>
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'baseline' }}>
                          <strong style={{ fontSize: 15 }}>{e.title || t('Registro de aula')}</strong>
                          <span className="dim" style={{ fontSize: 12.5 }}>{fmtLongDate(e.date)}</span>
                          {e.teacher_name && <span className="dim" style={{ fontSize: 12.5, marginLeft: 'auto' }}>{t('por {name}', { name: e.teacher_name })}</span>}
                        </div>
                        <p className="muted" style={{ marginTop: 6, fontSize: 14.5, whiteSpace: 'pre-wrap' }}>{e.content}</p>
                      </article>
                    ))}
                    <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                      <Link to={`/gestao/turmas?id=${g.class_id}`} className="btn btn-sm">{t('Abrir turma')}</Link>
                      {!classId && <button className="btn btn-sm btn-ghost" onClick={() => set('classId', String(g.class_id))}>{t('Ver só esta turma')}</button>}
                    </div>
                  </div>
                )}
              </section>
            ))}
          </div>
        </>
      )}
    </>
  );
}
