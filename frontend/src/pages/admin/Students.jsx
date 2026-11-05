import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Plus, Trash2 } from 'lucide-react';
import { api } from '../../lib/api.js';
import { useFetch } from '../../lib/useFetch.js';
import { Drawer, Field, Avatar, StatusBadge, ClassTag, PayBadge, Loading, useToast } from '../../components/ui.jsx';
import { ageFrom, fmtDate, fmtMonth, money, todayStr, ATT_STATUS } from '../../lib/format.js';
import { t } from '../../i18n/index.jsx';

const LEVELS = ['Iniciante', 'Intermediário', 'Avançado'];
const EMPTY = { name: '', birth_date: '', phone: '', email: '', level: 'Iniciante', status: 'active', monthly_fee: 180, joined_at: '', notes: '', classIds: [], guardian_id: '' };

function StudentForm({ initial, classes, guardians, onSaved, onDeleted, onClose }) {
  const toast = useToast();
  const [f, setF] = useState(initial);
  const [gMode, setGMode] = useState(initial.guardian_id ? 'existing' : 'none');
  const [newG, setNewG] = useState({ name: '', email: '', phone: '', password: '' });
  const [login, setLogin] = useState({ email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const toggleClass = (id) => setF({ ...f, classIds: f.classIds.includes(id) ? f.classIds.filter((x) => x !== id) : [...f.classIds, id] });

  const save = async () => {
    setBusy(true); setErr(null);
    const body = { ...f, monthly_fee: Number(f.monthly_fee) || 0, birth_date: f.birth_date || null, joined_at: f.joined_at || todayStr() };
    if (gMode === 'existing') body.guardian_id = Number(f.guardian_id) || null;
    else if (gMode === 'new') { body.guardian = newG; delete body.guardian_id; }
    else body.guardian_id = null;
    if (login.email) body.login = login;
    try {
      const saved = initial.id ? await api.put(`/admin/students/${initial.id}`, body) : await api.post('/admin/students', body);
      toast(initial.id ? t('Aluno atualizado') : t('Aluno cadastrado'));
      onSaved(saved);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  const remove = async () => {
    if (!window.confirm(t('Excluir {name}? Frequência e mensalidades também serão removidas.', { name: initial.name }))) return;
    try { await api.del(`/admin/students/${initial.id}`); toast(t('Aluno excluído')); onDeleted(); } catch (e) { toast(e.message, 'err'); }
  };

  return (
    <>
      <div className="section-title">{t('Dados pessoais')}</div>
      <Field label={t('Nome completo')}><input className="input" value={f.name} onChange={set('name')} required /></Field>
      <div className="form-row c2">
        <Field label={t('Nascimento')}><input className="input" type="date" value={f.birth_date || ''} onChange={set('birth_date')} /></Field>
        <Field label={t('Telefone')}><input className="input" value={f.phone || ''} onChange={set('phone')} /></Field>
      </div>
      <Field label={t('E-mail')}><input className="input" type="email" value={f.email || ''} onChange={set('email')} /></Field>

      <div className="section-title">{t('Matrícula')}</div>
      <div className="form-row c3">
        <Field label={t('Nível')}><select className="select" value={f.level} onChange={set('level')}>{LEVELS.map((l) => <option key={l} value={l}>{t(l)}</option>)}</select></Field>
        <Field label={t('Status')}><select className="select" value={f.status} onChange={set('status')}><option value="active">{t('Ativo')}</option><option value="inactive">{t('Inativo')}</option></select></Field>
        <Field label={t('Mensalidade (R$)')}><input className="input" type="number" min="0" step="10" value={f.monthly_fee} onChange={set('monthly_fee')} /></Field>
      </div>
      <Field label={t('Data de entrada')}><input className="input" type="date" value={f.joined_at || ''} onChange={set('joined_at')} /></Field>
      <Field label={t('Turmas')}>
        <div className="tags" style={{ gap: 8 }}>
          {classes.map((c) => (
            <label key={c.id} className="check tag" style={{ '--c': c.color, padding: '6px 10px', borderColor: f.classIds.includes(c.id) ? c.color : undefined }}>
              <input type="checkbox" checked={f.classIds.includes(c.id)} onChange={() => toggleClass(c.id)} style={{ width: 15, height: 15 }} />{c.name}
            </label>
          ))}
        </div>
      </Field>

      <div className="section-title">{t('Responsável & acesso')}</div>
      <div className="seg" style={{ justifySelf: 'start' }}>
        {[['none', 'Sem responsável'], ['existing', 'Existente'], ['new', 'Novo responsável']].map(([k, l]) => (
          <button type="button" key={k} className={gMode === k ? 'on' : ''} onClick={() => setGMode(k)}>{t(l)}</button>
        ))}
      </div>
      {gMode === 'existing' && (
        <Field label={t('Responsável')}>
          <select className="select" value={f.guardian_id || ''} onChange={set('guardian_id')}>
            <option value="">{t('Selecione…')}</option>
            {guardians.map((g) => <option key={g.id} value={g.id}>{g.name} · {g.email}</option>)}
          </select>
        </Field>
      )}
      {gMode === 'new' && (
        <div className="form-row c2">
          <Field label={t('Nome')}><input className="input" value={newG.name} onChange={(e) => setNewG({ ...newG, name: e.target.value })} /></Field>
          <Field label={t('Telefone')}><input className="input" value={newG.phone} onChange={(e) => setNewG({ ...newG, phone: e.target.value })} /></Field>
          <Field label={t('E-mail (login)')}><input className="input" type="email" value={newG.email} onChange={(e) => setNewG({ ...newG, email: e.target.value })} /></Field>
          <Field label={t('Senha inicial')}><input className="input" type="text" value={newG.password} onChange={(e) => setNewG({ ...newG, password: e.target.value })} placeholder={t('mín. 6 caracteres')} /></Field>
        </div>
      )}
      {initial.login_email ? (
        <p className="muted" style={{ fontSize: 13.5 }}>{t('Login próprio do aluno: ')}<strong>{initial.login_email}</strong></p>
      ) : (
        <details>
          <summary className="muted" style={{ cursor: 'pointer', fontSize: 14 }}>{t('Criar login próprio para o aluno (adultos)')}</summary>
          <div className="form-row c2" style={{ marginTop: 12 }}>
            <Field label={t('E-mail')}><input className="input" type="email" value={login.email} onChange={(e) => setLogin({ ...login, email: e.target.value })} /></Field>
            <Field label={t('Senha inicial')}><input className="input" value={login.password} onChange={(e) => setLogin({ ...login, password: e.target.value })} /></Field>
          </div>
        </details>
      )}
      <Field label={t('Observações')}><textarea className="textarea" value={f.notes || ''} onChange={set('notes')} placeholder={t('Restrições, alergias, figurino…')} /></Field>
      {err && <p className="error-text">{err}</p>}
      <div className="drawer-foot" style={{ margin: '8px -24px -24px', position: 'sticky', bottom: -24, background: 'var(--bg-2)' }}>
        {initial.id && <button className="btn btn-sm btn-danger left" onClick={remove}><Trash2 size={15} />{t(' Excluir')}</button>}
        <button className="btn btn-sm" onClick={onClose}>{t('Cancelar')}</button>
        <button className="btn btn-primary btn-sm" onClick={save} disabled={busy || !f.name}>{busy ? t('Salvando…') : t('Salvar')}</button>
      </div>
    </>
  );
}

function StudentDetail({ s, onEdit }) {
  const age = ageFrom(s.birth_date);
  return (
    <>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <Avatar name={s.name} lg />
        <div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{s.name}</div>
          <div className="muted" style={{ fontSize: 14 }}>{age !== null ? t('{n} anos · ', { n: age }) : ''}{t(s.level)} · {t('desde {d}', { d: fmtDate(s.joined_at) })}</div>
          <div style={{ marginTop: 6 }}><StatusBadge status={s.status} /></div>
        </div>
        <button className="btn btn-sm" style={{ marginLeft: 'auto' }} onClick={onEdit}>{t('Editar')}</button>
      </div>
      <div className="grid g-3">
        <div className="card kpi" style={{ padding: 16 }}><div className="label">{t('Presença 30d')}</div><div className="value" style={{ fontSize: 28 }}>{s.stats.rate30 ?? '—'}%</div></div>
        <div className="card kpi" style={{ padding: 16 }}><div className="label">{t('Aulas')}</div><div className="value" style={{ fontSize: 28 }}>{s.stats.present + s.stats.late}</div></div>
        <div className="card kpi" style={{ padding: 16 }}><div className="label">{t('Sequência')}</div><div className="value" style={{ fontSize: 28 }}>{t('{n} sem', { n: s.stats.streakWeeks })}</div></div>
      </div>
      <div className="section-title">{t('Contato')}</div>
      <div className="muted" style={{ fontSize: 14, display: 'grid', gap: 4 }}>
        {s.phone && <span>📱 {s.phone}</span>}
        {s.email && <span>✉️ {s.email}</span>}
        {s.guardian_name && <span>{t('👤 Responsável: ')}<strong style={{ color: 'var(--text)' }}>{s.guardian_name}</strong> · {s.guardian_phone} · {s.guardian_email}</span>}
        {s.notes && <span>📝 {s.notes}</span>}
      </div>
      <div className="section-title">{t('Turmas · {v}/mês', { v: money(s.monthly_fee) })}</div>
      <div className="tags">{s.classes.map((c) => <ClassTag key={c.id} c={c} />)}{!s.classes.length && <span className="dim">{t('Sem turmas')}</span>}</div>
      <div className="section-title">{t('Mensalidades')}</div>
      <div>{s.payments.slice(0, 6).map((p) => (
        <div className="list-row" key={p.id}><span style={{ textTransform: 'capitalize', fontSize: 14 }}>{fmtMonth(p.reference_month)} · {money(p.amount)}</span><PayBadge status={p.status} /></div>
      ))}</div>
      <div className="section-title">{t('Frequência recente')}</div>
      <div>{s.recentAttendance.slice(0, 8).map((a) => (
        <div className="list-row" key={a.date + a.class_name}><span style={{ fontSize: 14 }}>{fmtDate(a.date)} · {a.class_name}</span>
          <span className={`badge ${a.status === 'present' ? 'ok' : a.status === 'late' ? 'warn' : 'bad'}`}>{ATT_STATUS[a.status]}</span></div>
      ))}</div>
    </>
  );
}

export default function Students() {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('active');
  const [classId, setClassId] = useState('');
  const [q, setQ] = useState('');
  useEffect(() => { const t = setTimeout(() => setQ(search), 250); return () => clearTimeout(t); }, [search]);

  const qs = new URLSearchParams({ ...(q && { search: q }), ...(status && { status }), ...(classId && { classId }) }).toString();
  const list = useFetch(`/admin/students?${qs}`);
  const classes = useFetch('/admin/classes');
  const guardians = useFetch('/admin/users?role=guardian');

  const openId = Number(params.get('id')) || null;
  const creating = params.get('novo') === '1';
  const [editing, setEditing] = useState(false);
  const detail = useFetch(openId ? `/admin/students/${openId}` : null);
  useEffect(() => setEditing(false), [openId]);

  const close = () => { setParams({}); setEditing(false); };
  const afterSave = (saved) => { list.reload(); guardians.reload(); setParams({ id: String(saved.id) }); detail.reload(); setEditing(false); };

  const formInitial = useMemo(() => {
    if (creating) return EMPTY;
    const s = detail.data;
    if (!s) return null;
    return { ...EMPTY, ...s, guardian_id: s.guardian_id || '', classIds: s.classes.map((c) => c.id) };
  }, [creating, detail.data]);

  const showForm = creating || editing;
  return (
    <>
      <div className="page-head">
        <div><h1>{t('Alunos')}</h1><p>{list.data ? t('{n} aluno(s) encontrados', { n: list.data.length }) : t('Carregando…')}</p></div>
        <div className="actions"><button className="btn btn-primary btn-sm" onClick={() => setParams({ novo: '1' })}><Plus />{t(' Novo aluno')}</button></div>
      </div>
      <div className="toolbar">
        <div className="search"><Search /><input className="input" placeholder={t('Buscar por aluno, e-mail ou responsável')} value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <div className="seg">
          {[['active', 'Ativos'], ['inactive', 'Inativos'], ['', 'Todos']].map(([k, l]) => <button key={l} className={status === k ? 'on' : ''} onClick={() => setStatus(k)}>{t(l)}</button>)}
        </div>
        <select className="select" style={{ width: 'auto', minWidth: 200 }} value={classId} onChange={(e) => setClassId(e.target.value)}>
          <option value="">{t('Todas as turmas')}</option>
          {classes.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {!list.data ? <Loading /> : (
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>{t('Aluno')}</th><th>{t('Idade')}</th><th>{t('Turmas')}</th><th>{t('Responsável')}</th><th>{t('Mensalidade')}</th><th>{t('Status')}</th></tr></thead>
            <tbody>
              {list.data.map((s) => (
                <tr key={s.id} className="click" onClick={() => setParams({ id: String(s.id) })}>
                  <td><div className="person"><Avatar name={s.name} /><div>{s.name}<small>{t(s.level)} · {t('desde {d}', { d: fmtDate(s.joined_at, { month: 'short', year: 'numeric' }) })}</small></div></div></td>
                  <td className="muted">{ageFrom(s.birth_date) ?? '—'}</td>
                  <td><div className="tags">{s.classes.map((c) => <ClassTag key={c.id} c={c} />)}</div></td>
                  <td className="muted">{s.guardian_name || (s.login_email ? t('Próprio aluno') : '—')}</td>
                  <td>{money(s.monthly_fee)}</td>
                  <td><StatusBadge status={s.status} /></td>
                </tr>
              ))}
              {list.data.length === 0 && <tr><td colSpan={6} className="empty">{t('Nenhum aluno encontrado.')}</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      <Drawer open={creating || !!openId} onClose={close} title={creating ? t('Novo aluno') : editing ? t('Editar aluno') : t('Ficha do aluno')}>
        {showForm
          ? (formInitial && classes.data && guardians.data
            ? <StudentForm key={formInitial.id || 'new'} initial={formInitial} classes={classes.data} guardians={guardians.data}
                onSaved={afterSave} onDeleted={() => { close(); list.reload(); }} onClose={() => (creating ? close() : setEditing(false))} />
            : <Loading />)
          : detail.data ? <StudentDetail s={detail.data} onEdit={() => setEditing(true)} /> : <Loading />}
      </Drawer>
    </>
  );
}
