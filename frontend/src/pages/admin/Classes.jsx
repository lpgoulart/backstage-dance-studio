import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Trash2, Clock, User, DoorOpen, Copy, Pencil, Power, Search, X, UserPlus, AlertTriangle } from 'lucide-react';
import { api } from '../../lib/api.js';
import { useFetch } from '../../lib/useFetch.js';
import { Drawer, Field, Loading, Bar, Avatar, useToast } from '../../components/ui.jsx';
import { WEEKDAYS, WEEKDAYS_SHORT } from '../../lib/format.js';
import { t } from '../../i18n/index.jsx';

const COLORS = ['#e8b04b', '#f0c36d', '#ec8fb3', '#d9688f', '#9db4ff', '#c79bff', '#7fd6b0', '#4fbf8f', '#ff8a7a', '#ffb36b', '#d9c4a0'];
const EMPTY = { name: '', style: '', level: '', teacher_id: '', room: '', capacity: 20, color: COLORS[0], description: '', active: true, schedules: [{ weekday: 1, start_time: '18:00', end_time: '19:00' }] };
const cleanSchedules = (list) => list.map(({ weekday, start_time, end_time }) => ({ weekday, start_time, end_time }));

/** Builds the API body from a class object */
const toBody = (f) => ({
  name: f.name, style: f.style, level: f.level, room: f.room, color: f.color, description: f.description, active: !!f.active,
  capacity: Number(f.capacity) || 0, teacher_id: f.teacher_id ? Number(f.teacher_id) : null, schedules: cleanSchedules(f.schedules),
});

function ClassForm({ initial, teachers, styles, rooms, onSaved, onCancel }) {
  const toast = useToast();
  const [f, setF] = useState(initial);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const setSched = (i, k, v) => setF({ ...f, schedules: f.schedules.map((s, j) => (j === i ? { ...s, [k]: k === 'weekday' ? Number(v) : v } : s)) });

  const save = async () => {
    setBusy(true); setErr(null);
    try {
      const saved = initial.id ? await api.put(`/admin/classes/${initial.id}`, toBody(f)) : await api.post('/admin/classes', toBody(f));
      toast(initial.id ? t('Turma atualizada') : t('Turma criada'));
      onSaved(saved);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  return (
    <>
      <datalist id="styles-list">{styles.map((s) => <option key={s} value={s} />)}</datalist>
      <datalist id="rooms-list">{rooms.map((s) => <option key={s} value={s} />)}</datalist>
      <div className="form-row c2">
        <Field label={t('Nome da turma')}><input className="input" value={f.name} onChange={set('name')} /></Field>
        <Field label={t('Modalidade')}><input className="input" list="styles-list" value={f.style} onChange={set('style')} placeholder={t('Ballet, Jazz, Hip Hop…')} /></Field>
        <Field label={t('Nível / faixa etária')}><input className="input" value={f.level || ''} onChange={set('level')} /></Field>
        <Field label={t('Professor(a)')}>
          <select className="select" value={f.teacher_id || ''} onChange={set('teacher_id')}>
            <option value="">{t('— Sem professor —')}</option>
            {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}{t.specialties ? ` · ${t.specialties}` : ''}</option>)}
          </select>
        </Field>
        <Field label={t('Sala')}><input className="input" list="rooms-list" value={f.room || ''} onChange={set('room')} /></Field>
        <Field label={t('Vagas')}><input className="input" type="number" min="1" value={f.capacity} onChange={set('capacity')} /></Field>
      </div>
      <p className="dim" style={{ fontSize: 12.5, marginTop: -6 }}>{t('Não encontrou o professor? Cadastre em')} <Link to="/gestao/professores?novo=1" className="gold">{t('Professores → Contratar')}</Link>.</p>
      <Field label={t('Descrição (aparece no portal do aluno)')}><textarea className="textarea" value={f.description || ''} onChange={set('description')} /></Field>
      <Field label={t('Cor na grade')}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {COLORS.map((c) => (
            <button type="button" key={c} onClick={() => setF({ ...f, color: c })} aria-label={c}
              style={{ width: 28, height: 28, borderRadius: 8, background: c, border: f.color === c ? '2px solid var(--text)' : '2px solid transparent' }} />
          ))}
        </div>
      </Field>
      <label className="check"><input type="checkbox" checked={!!f.active} onChange={set('active')} />{t('Turma ativa (aparece no site, na grade e no portal)')}</label>

      <div className="section-title">{t('Dias e horários')}</div>
      {f.schedules.map((s, i) => (
        <div key={i} className="sched-row">
          <Field label={t('Dia')}><select className="select" value={s.weekday} onChange={(e) => setSched(i, 'weekday', e.target.value)}>{WEEKDAYS.map((d, k) => <option key={k} value={k}>{d}</option>)}</select></Field>
          <Field label={t('Início')}><input className="input" type="time" value={s.start_time} onChange={(e) => setSched(i, 'start_time', e.target.value)} /></Field>
          <Field label={t('Fim')}><input className="input" type="time" value={s.end_time} onChange={(e) => setSched(i, 'end_time', e.target.value)} /></Field>
          <button type="button" className="icon-btn" aria-label={t('Remover horário')} onClick={() => setF({ ...f, schedules: f.schedules.filter((_, j) => j !== i) })}><Trash2 /></button>
        </div>
      ))}
      <button type="button" className="btn btn-sm" style={{ justifySelf: 'start' }} onClick={() => setF({ ...f, schedules: [...f.schedules, { weekday: 1, start_time: '18:00', end_time: '19:00' }] })}><Plus size={15} />{t(' Adicionar horário')}</button>
      {err && <p className="error-text">{err}</p>}
      <div className="drawer-foot" style={{ margin: '8px -24px -24px', position: 'sticky', bottom: -24, background: 'var(--bg-2)' }}>
        <button className="btn btn-sm" onClick={onCancel}>{t('Cancelar')}</button>
        <button className="btn btn-primary btn-sm" onClick={save} disabled={busy || !f.name || !f.style}>{busy ? t('Salvando…') : initial.id ? t('Salvar') : t('Criar turma')}</button>
      </div>
    </>
  );
}

function Roster({ cls, onChange }) {
  const toast = useToast();
  const students = useFetch('/admin/students?status=active');
  const [pick, setPick] = useState('');
  const enrolled = new Set(cls.students.map((s) => s.id));
  const available = (students.data || []).filter((s) => !enrolled.has(s.id));
  const full = cls.enrolled >= cls.capacity;

  const add = async () => {
    if (!pick) return;
    try { const c = await api.post(`/admin/classes/${cls.id}/students`, { studentId: Number(pick) }); setPick(''); toast(t('Aluno matriculado')); onChange(c); } catch (e) { toast(e.message, 'err'); }
  };
  const remove = async (s) => {
    if (!window.confirm(t('Remover {name} da turma {cls}?', { name: s.name, cls: cls.name }))) return;
    try { const c = await api.del(`/admin/classes/${cls.id}/students/${s.id}`); toast(t('Aluno removido da turma')); onChange(c); } catch (e) { toast(e.message, 'err'); }
  };

  return (
    <>
      <div className="section-title">Alunos matriculados ({cls.enrolled}/{cls.capacity})</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <select className="select" value={pick} onChange={(e) => setPick(e.target.value)} style={{ flex: 1 }}>
          <option value="">{t('Adicionar aluno à turma…')}</option>
          {available.map((s) => <option key={s.id} value={s.id}>{s.name} · {t(s.level)}</option>)}
        </select>
        <button className="btn btn-sm btn-primary" onClick={add} disabled={!pick}><UserPlus size={15} />{t(' Matricular')}</button>
      </div>
      {full && <p style={{ color: 'var(--gold)', fontSize: 13 }}><AlertTriangle size={13} style={{ verticalAlign: -2 }} />{t(' Turma lotada — novas matrículas ultrapassam as vagas.')}</p>}
      <div>
        {cls.students.map((s) => (
          <div className="list-row" key={s.id}>
            <Link to={`/gestao/alunos?id=${s.id}`} className="person"><Avatar name={s.name} /><span>{s.name}<small>{t(s.level)}{s.status !== 'active' ? t(' · inativo') : ''}</small></span></Link>
            <button className="icon-btn" onClick={() => remove(s)} aria-label={t('Remover {name}', { name: s.name })} title={t('Remover da turma')}><X /></button>
          </div>
        ))}
        {!cls.students.length && <div className="empty">{t('Nenhum aluno matriculado.')}</div>}
      </div>
    </>
  );
}

export default function Classes() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const { data, reload } = useFetch('/admin/classes');
  const teachers = useFetch('/admin/teachers?status=active');
  const [search, setSearch] = useState('');
  const [style, setStyle] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [status, setStatus] = useState('active');
  const [draft, setDraft] = useState(null); // used for "Nova" and "Duplicar"

  const openId = Number(params.get('id')) || null;
  const mode = params.get('modo') || 'view';
  const detail = useFetch(openId ? `/admin/classes/${openId}` : null);
  const close = () => { setParams({}); setDraft(null); };

  const styles = useMemo(() => [...new Set((data || []).map((c) => c.style))].sort(), [data]);
  const rooms = useMemo(() => [...new Set((data || []).map((c) => c.room).filter(Boolean))].sort(), [data]);
  const rows = (data || []).filter((c) =>
    (status === '' || (status === 'active' ? c.active : !c.active)) &&
    (!style || c.style === style) &&
    (!teacherId || (teacherId === 'none' ? !c.teacher_id : c.teacher_id === Number(teacherId))) &&
    (!search || `${c.name} ${c.style} ${c.teacher || ''} ${c.room || ''}`.toLowerCase().includes(search.toLowerCase())));

  const duplicate = (c) => { setParams({}); setDraft({ ...EMPTY, ...c, id: undefined, name: `${c.name} ${t('(cópia)')}`, teacher_id: c.teacher_id || '', schedules: cleanSchedules(c.schedules) }); };
  const toggleActive = async (c) => {
    try { await api.put(`/admin/classes/${c.id}`, { active: !c.active }); toast(c.active ? t('{name} desativada', { name: c.name }) : t('{name} reativada', { name: c.name })); reload(); detail.reload(); }
    catch (e) { toast(e.message, 'err'); }
  };
  const remove = async (c) => {
    const msg = c.enrolled
      ? t('Excluir a turma "{name}"?\n\n{n} aluno(s) serão desmatriculados e todo o histórico de chamada da turma será apagado. Se a ideia é só pausar, use "Desativar".', { name: c.name, n: c.enrolled })
      : t('Excluir a turma "{name}"?', { name: c.name });
    if (!window.confirm(msg)) return;
    try { await api.del(`/admin/classes/${c.id}`); toast(t('Turma excluída')); close(); reload(); } catch (e) { toast(e.message, 'err'); }
  };

  const drawerOpen = !!draft || !!openId;
  const title = draft ? (draft.name.endsWith(t('(cópia)')) ? t('Duplicar turma') : t('Nova turma')) : mode === 'edit' ? t('Editar turma') : detail.data?.name || t('Turma');
  const orphan = (data || []).filter((c) => c.active && !c.teacher_id).length;

  return (
    <>
      <div className="page-head">
        <div><h1>{t('Turmas')}</h1><p>{data ? t('{a} ativas · {n} aulas por semana', { a: data.filter((c) => c.active).length, n: data.filter((c) => c.active).reduce((x, c) => x + c.schedules.length, 0) }) : ''}</p></div>
        <div className="actions">
          <Link to="/gestao/grade" className="btn btn-sm">{t('Ver grade semanal')}</Link>
          <button className="btn btn-primary btn-sm" onClick={() => { setParams({}); setDraft({ ...EMPTY }); }}><Plus />{t(' Nova turma')}</button>
        </div>
      </div>

      {orphan > 0 && (
        <button className="card" onClick={() => setTeacherId('none')} style={{ width: '100%', textAlign: 'left', marginBottom: 16, borderColor: 'rgba(232,176,75,.4)', display: 'flex', gap: 10, alignItems: 'center', fontSize: 14 }}>
          <AlertTriangle size={18} className="gold" /> {t('{n} turma(s) ativa(s) sem professor.', { n: orphan })} <span className="gold">{t('Ver turmas')}</span>
        </button>
      )}

      <div className="toolbar">
        <div className="search"><Search /><input className="input" placeholder={t('Buscar turma, professor ou sala')} value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <select className="select" style={{ width: 'auto' }} value={style} onChange={(e) => setStyle(e.target.value)}>
          <option value="">{t('Todas as modalidades')}</option>{styles.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select className="select" style={{ width: 'auto' }} value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
          <option value="">{t('Todos os professores')}</option><option value="none">{t('Sem professor')}</option>
          {teachers.data?.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <div className="seg">
          {[['active', 'Ativas'], ['inactive', 'Inativas'], ['', 'Todas']].map(([k, l]) => <button key={l} className={status === k ? 'on' : ''} onClick={() => setStatus(k)}>{t(l)}</button>)}
        </div>
      </div>

      {!data ? <Loading /> : (
        <div className="grid g-3">
          {rows.length === 0 && <div className="card empty span-2">{t('Nenhuma turma encontrada com esses filtros.')}</div>}
          {rows.map((c) => {
            const pct = c.capacity ? Math.round((c.enrolled / c.capacity) * 100) : 0;
            return (
              <div key={c.id} className="card" style={{ borderTop: `3px solid ${c.color}`, opacity: c.active ? 1 : 0.6, display: 'grid', gap: 12, alignContent: 'start' }}>
                <button onClick={() => setParams({ id: String(c.id) })} style={{ all: 'unset', cursor: 'pointer', display: 'grid', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <span className="badge plain">{c.style}</span>
                    {!c.active && <span className="badge">{t('Inativa')}</span>}
                  </div>
                  <div>
                    <div className="serif" style={{ fontSize: 24 }}>{c.name}</div>
                    <div className="muted" style={{ fontSize: 13.5 }}>{c.level}</div>
                  </div>
                  <div className="muted" style={{ fontSize: 13.5, display: 'grid', gap: 4 }}>
                    <span style={{ display: 'flex', gap: 8, alignItems: 'center', color: c.teacher ? undefined : 'var(--gold)' }}><User size={14} />{c.teacher || t('Sem professor')}</span>
                    <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}><DoorOpen size={14} />{c.room || '—'}</span>
                    <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Clock size={14} />{c.schedules.map((s) => `${WEEKDAYS_SHORT[s.weekday]} ${s.start_time}–${s.end_time}`).join(' · ') || t('Sem horário')}</span>
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}><span>{t('Ocupação')}</span><span className="dim">{c.enrolled}/{c.capacity}</span></div>
                    <Bar pct={pct} rose={pct >= 90} />
                  </div>
                </button>
                <div style={{ display: 'flex', gap: 6, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
                  <button className="icon-btn" title={t('Editar')} aria-label={t('Editar {name}', { name: c.name })} onClick={() => setParams({ id: String(c.id), modo: 'edit' })}><Pencil /></button>
                  <button className="icon-btn" title={t('Duplicar')} aria-label={t('Duplicar {name}', { name: c.name })} onClick={() => duplicate(c)}><Copy /></button>
                  <button className="icon-btn" title={c.active ? t('Desativar') : t('Reativar')} aria-label={c.active ? t('Desativar {name}', { name: c.name }) : t('Reativar {name}', { name: c.name })} onClick={() => toggleActive(c)} style={{ color: c.active ? undefined : 'var(--mint)' }}><Power /></button>
                  <button className="icon-btn" title={t('Excluir')} aria-label={t('Excluir {name}', { name: c.name })} onClick={() => remove(c)} style={{ marginLeft: 'auto', color: 'var(--danger)' }}><Trash2 /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Drawer open={drawerOpen} onClose={close} title={title}>
        {draft && (teachers.data
          ? <ClassForm key={draft.name} initial={draft} teachers={teachers.data} styles={styles} rooms={rooms} onCancel={close}
              onSaved={(s) => { setDraft(null); reload(); teachers.reload(); setParams({ id: String(s.id) }); }} />
          : <Loading />)}
        {!draft && openId && (!detail.data || !teachers.data ? <Loading /> : mode === 'edit' ? (
          <ClassForm key={detail.data.id} initial={{ ...EMPTY, ...detail.data, teacher_id: detail.data.teacher_id || '' }} teachers={teachers.data} styles={styles} rooms={rooms}
            onCancel={() => setParams({ id: String(openId) })} onSaved={() => { reload(); detail.reload(); teachers.reload(); setParams({ id: String(openId) }); }} />
        ) : (
          <>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <span className="badge plain">{detail.data.style}</span>
              {!detail.data.active && <span className="badge">{t('Inativa')}</span>}
              <span className="muted" style={{ fontSize: 14 }}>{detail.data.level} · {detail.data.room}</span>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn btn-sm" onClick={() => setParams({ id: String(openId), modo: 'edit' })}><Pencil size={15} />{t(' Editar')}</button>
              <button className="btn btn-sm" onClick={() => duplicate(detail.data)}><Copy size={15} />{t(' Duplicar')}</button>
              <button className="btn btn-sm" onClick={() => toggleActive(detail.data)}><Power size={15} /> {detail.data.active ? t('Desativar') : t('Reativar')}</button>
              <button className="btn btn-sm btn-danger" onClick={() => remove(detail.data)}><Trash2 size={15} />{t(' Excluir')}</button>
            </div>
            <p className="muted" style={{ fontSize: 14 }}>{detail.data.description}</p>
            <div className="section-title">{t('Professor')}</div>
            {detail.data.teacher_id
              ? <Link to={`/gestao/professores?id=${detail.data.teacher_id}`} className="list-row"><span className="person"><Avatar name={detail.data.teacher} /><span>{detail.data.teacher}<small>{t('ver ficha do professor')}</small></span></span></Link>
              : <p style={{ color: 'var(--gold)', fontSize: 14 }}>{t('Sem professor — ')}<button className="link-arrow" style={{ background: 'none', border: 0, padding: 0, color: 'inherit' }} onClick={() => setParams({ id: String(openId), modo: 'edit' })}>{t('atribuir agora')}</button></p>}
            <div className="section-title">{t('Horários')}</div>
            <div className="tags">{detail.data.schedules.map((s) => <span key={s.id} className="tag" style={{ '--c': detail.data.color }}><i />{WEEKDAYS[s.weekday]} · {s.start_time}–{s.end_time}</span>)}</div>
            <Roster cls={detail.data} onChange={(c) => { detail.setData(c); reload(); }} />
            <Link to={`/gestao/diarios?classId=${openId}`} className="btn btn-sm" style={{ justifySelf: 'start' }}>{t('Ver diário da turma')}</Link>
            <Link to={`/gestao/chamada?classId=${openId}`} className="btn btn-primary btn-sm" style={{ justifySelf: 'start' }}>{t('Fazer chamada desta turma')}</Link>
          </>
        ))}
      </Drawer>
    </>
  );
}
