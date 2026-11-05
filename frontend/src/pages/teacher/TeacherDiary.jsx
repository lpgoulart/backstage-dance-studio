import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Pencil, Trash2, NotebookPen } from 'lucide-react';
import { api } from '../../lib/api.js';
import { useFetch } from '../../lib/useFetch.js';
import { Field, Loading, useToast } from '../../components/ui.jsx';
import { fmtLongDate, todayStr } from '../../lib/format.js';
import { t, rich } from '../../i18n/index.jsx';

export default function TeacherDiary() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const classId = params.get('classId') || '';
  const classes = useFetch('/teacher/classes');
  const logs = useFetch(`/teacher/logs${classId ? `?classId=${classId}` : ''}`);
  const blank = () => ({ classId: classId || classes.data?.[0]?.id || '', date: todayStr(), title: '', content: '' });
  const [form, setForm] = useState(null);
  const [editing, setEditing] = useState(null);
  const f = form || blank();
  const set = (k) => (e) => setForm({ ...f, [k]: e.target.value });

  const save = async () => {
    try {
      if (editing) await api.put(`/teacher/logs/${editing}`, { ...f, classId: Number(f.classId) });
      else await api.post('/teacher/logs', { ...f, classId: Number(f.classId) });
      toast(editing ? t('Registro atualizado') : t('Aula registrada no diário'));
      setForm(null); setEditing(null); logs.reload();
    } catch (e) { toast(e.message, 'err'); }
  };
  const remove = async (l) => {
    if (!window.confirm(t('Excluir este registro do diário?'))) return;
    try { await api.del(`/teacher/logs/${l.id}`); toast(t('Registro excluído')); logs.reload(); } catch (e) { toast(e.message, 'err'); }
  };
  const edit = (l) => { setEditing(l.id); setForm({ classId: l.class_id, date: l.date, title: l.title || '', content: l.content }); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  if (!classes.data) return <Loading />;
  return (
    <>
      <div className="page-head">
        <div><h1>{rich(t('Diário *de aula*'))}</h1><p>{t('Registre o que foi trabalhado em cada aula: conteúdo, coreografias, observações para a próxima.')}</p></div>
        <select className="select" style={{ width: 'auto' }} value={classId} onChange={(e) => setParams(e.target.value ? { classId: e.target.value } : {})}>
          <option value="">{t('Todas as turmas')}</option>
          {classes.data.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className="grid g-3">
        <div className="card" style={{ alignSelf: 'start', display: 'grid', gap: 14 }}>
          <div className="card-head" style={{ marginBottom: 0 }}><h2 style={{ display: 'flex', gap: 8, alignItems: 'center' }}><NotebookPen size={16} className="gold" />{editing ? t('Editar registro') : t('Novo registro')}</h2></div>
          <Field label={t('Turma')}>
            <select className="select" value={f.classId} onChange={set('classId')}>{classes.data.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          </Field>
          <Field label={t('Data da aula')}><input className="input" type="date" max={todayStr()} value={f.date} onChange={set('date')} /></Field>
          <Field label={t('Título (opcional)')}><input className="input" value={f.title} onChange={set('title')} placeholder={t('Ex.: Coreografia da Mostra — 2º bloco')} /></Field>
          <Field label={t('O que foi trabalhado')}><textarea className="textarea" style={{ minHeight: 140 }} value={f.content} onChange={set('content')} placeholder={t('Conteúdo, progresso da turma, o que repetir na próxima aula…')} /></Field>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            {(editing || form) && <button className="btn btn-sm" onClick={() => { setForm(null); setEditing(null); }}>{t('Cancelar')}</button>}
            <button className="btn btn-primary btn-sm" onClick={save} disabled={!f.content.trim() || !f.classId}>{editing ? t('Salvar') : t('Registrar aula')}</button>
          </div>
        </div>

        <div className="span-2" style={{ display: 'grid', gap: 12, alignContent: 'start' }}>
          {!logs.data ? <Loading /> : logs.data.length === 0 ? <div className="card empty">{t('Nenhum registro ainda. Que tal anotar a aula de hoje?')}</div> : logs.data.map((l) => (
            <div key={l.id} className="card" style={{ borderLeft: `3px solid ${l.color}` }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <span className="tag" style={{ '--c': l.color }}><i />{l.class_name}</span>
                <span className="dim" style={{ fontSize: 13 }}>{fmtLongDate(l.date)}</span>
                <span style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                  <button className="icon-btn" onClick={() => edit(l)} aria-label={t('Editar')}><Pencil /></button>
                  <button className="icon-btn" onClick={() => remove(l)} aria-label={t('Excluir')}><Trash2 /></button>
                </span>
              </div>
              {l.title && <h3 className="serif" style={{ fontSize: 24, fontWeight: 400, marginTop: 12 }}>{l.title}</h3>}
              <p style={{ marginTop: 8, whiteSpace: 'pre-wrap', fontSize: 15, color: 'var(--muted)' }}>{l.content}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
