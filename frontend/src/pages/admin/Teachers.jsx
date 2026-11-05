import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { UserPlus, UserMinus, UserCheck, Trash2, Clock, Users, Wallet, AlertTriangle, Mail, Phone, Search, KeyRound } from 'lucide-react';
import { api } from '../../lib/api.js';
import { useFetch } from '../../lib/useFetch.js';
import { Drawer, Field, Avatar, ClassTag, Loading, useToast } from '../../components/ui.jsx';
import { fmtDate, money, todayStr, WEEKDAYS_SHORT, fmtHours } from '../../lib/format.js';
import { t } from '../../i18n/index.jsx';

const EMPTY = { name: '', email: '', phone: '', specialties: '', bio: '', hourly_rate: 60, hired_at: todayStr(), show_on_site: true, notes: '', classIds: [] };
const hours = fmtHours;

function TeacherForm({ initial, classes, onSaved, onCancel }) {
  const toast = useToast();
  const [f, setF] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const toggle = (id) => setF({ ...f, classIds: f.classIds.includes(id) ? f.classIds.filter((x) => x !== id) : [...f.classIds, id] });
  const mine = new Set((initial.classes || []).map((c) => c.id));

  const save = async () => {
    setBusy(true); setErr(null);
    const body = { ...f, hourly_rate: Number(f.hourly_rate) || 0, classIds: f.classIds.filter((id) => !mine.has(id)) };
    delete body.classes;
    try {
      const saved = initial.id ? await api.put(`/admin/teachers/${initial.id}`, body) : await api.post('/admin/teachers', body);
      toast(initial.id ? t('Cadastro atualizado') : t('{name} contratado(a)! 🎉', { name: saved.name }));
      onSaved(saved);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  return (
    <>
      <div className="section-title">{t('Dados')}</div>
      <Field label={t('Nome')}><input className="input" value={f.name} onChange={set('name')} /></Field>
      <div className="form-row c2">
        <Field label={t('E-mail')}><input className="input" type="email" value={f.email || ''} onChange={set('email')} /></Field>
        <Field label={t('Telefone')}><input className="input" value={f.phone || ''} onChange={set('phone')} /></Field>
      </div>
      <Field label={t('Modalidades / especialidades')}><input className="input" value={f.specialties || ''} onChange={set('specialties')} placeholder={t('Ex.: Jazz, Contemporâneo')} /></Field>
      <Field label={t('Mini bio')}><textarea className="textarea" value={f.bio || ''} onChange={set('bio')} /></Field>

      <div className="section-title">{t('Contrato')}</div>
      <div className="form-row c2">
        <Field label={t('Data de contratação')}><input className="input" type="date" value={f.hired_at || ''} onChange={set('hired_at')} /></Field>
        <Field label={t('Hora-aula (R$)')}><input className="input" type="number" min="0" step="5" value={f.hourly_rate} onChange={set('hourly_rate')} /></Field>
      </div>
      <label className="check"><input type="checkbox" checked={!!f.show_on_site} onChange={set('show_on_site')} />{t('Exibir na seção “Equipe” do site')}</label>

      <div className="section-title">{t('Turmas')}</div>
      <p className="dim" style={{ fontSize: 13 }}>{t('Marque as turmas que passam a ser deste professor. Turmas de outro professor serão transferidas.')}</p>
      <div style={{ display: 'grid', gap: 6 }}>
        {classes.map((c) => {
          const owned = mine.has(c.id);
          const other = !owned && c.teacher_id && c.teacher_id !== initial.id;
          return (
            <label key={c.id} className="check" style={{ padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 10, opacity: owned ? 0.6 : 1 }}>
              <input type="checkbox" checked={owned || f.classIds.includes(c.id)} disabled={owned} onChange={() => toggle(c.id)} />
              <span style={{ width: 8, height: 8, borderRadius: 2, background: c.color }} />
              <span style={{ flex: 1 }}>{c.name}</span>
              <small className="dim">{owned ? t('já é deste professor') : other ? t('atual: {name}', { name: c.teacher }) : c.teacher_id ? '' : t('sem professor')}</small>
            </label>
          );
        })}
      </div>
      <Field label={t('Observações internas')}><textarea className="textarea" value={f.notes || ''} onChange={set('notes')} /></Field>
      {err && <p className="error-text">{err}</p>}
      <div className="drawer-foot" style={{ margin: '8px -24px -24px', position: 'sticky', bottom: -24, background: 'var(--bg-2)' }}>
        <button className="btn btn-sm" onClick={onCancel}>{t('Cancelar')}</button>
        <button className="btn btn-primary btn-sm" onClick={save} disabled={busy || !f.name.trim()}>{busy ? t('Salvando…') : initial.id ? t('Salvar') : t('Contratar')}</button>
      </div>
    </>
  );
}

function DismissPanel({ teacher, others, onDone, onCancel }) {
  const toast = useToast();
  const [date, setDate] = useState(todayStr());
  const [reason, setReason] = useState('');
  const [map, setMap] = useState(() => Object.fromEntries(teacher.classes.map((c) => [c.id, ''])));
  const [busy, setBusy] = useState(false);
  const unassigned = Object.values(map).filter((v) => !v).length;

  const confirm = async () => {
    setBusy(true);
    try {
      const reassign = Object.fromEntries(Object.entries(map).filter(([, v]) => v).map(([k, v]) => [k, Number(v)]));
      await api.post(`/admin/teachers/${teacher.id}/dismiss`, { date, reason, reassign });
      toast(t('{name} foi desligado(a)', { name: teacher.name }));
      onDone();
    } catch (e) { toast(e.message, 'err'); } finally { setBusy(false); }
  };

  return (
    <>
      <div className="card" style={{ borderColor: 'rgba(255,122,122,.35)', background: 'var(--danger-soft)' }}>
        <strong>{t('Desligar {name}', { name: teacher.name })}</strong>
        <p className="muted" style={{ fontSize: 14, marginTop: 6 }}>{t('O cadastro e o histórico são mantidos, o professor sai do site e as turmas abaixo precisam de um novo responsável.')}</p>
      </div>
      <div className="form-row c2">
        <Field label={t('Data do desligamento')}><input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label={t('Motivo (interno)')}><input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('Fim de contrato, mudança…')} /></Field>
      </div>
      <div className="section-title">{t('Quem assume cada turma?')}</div>
      {teacher.classes.length === 0 && <p className="muted" style={{ fontSize: 14 }}>{t('Nenhuma turma vinculada.')}</p>}
      {teacher.classes.map((c) => (
        <div key={c.id} className="two-col">
          <div><ClassTag c={c} /><small className="dim" style={{ display: 'block', marginTop: 4 }}>{c.schedules.map((s) => `${WEEKDAYS_SHORT[s.weekday]} ${s.start_time}`).join(' · ')} · {t('{n} alunos', { n: c.enrolled })}</small></div>
          <select className="select" value={map[c.id]} onChange={(e) => setMap({ ...map, [c.id]: e.target.value })}>
            <option value="">{t('— Sem professor por enquanto —')}</option>
            {others.map((o) => <option key={o.id} value={o.id}>{o.name} ({t('{h}/sem', { h: hours(o.weekly_hours) })})</option>)}
          </select>
        </div>
      ))}
      {unassigned > 0 && teacher.classes.length > 0 && <p style={{ color: 'var(--gold)', fontSize: 13.5 }}><AlertTriangle size={14} style={{ verticalAlign: -2 }} /> {t('{n} turma(s) ficarão sem professor e aparecerão em alerta.', { n: unassigned })}</p>}
      <div className="drawer-foot" style={{ margin: '8px -24px -24px', position: 'sticky', bottom: -24, background: 'var(--bg-2)' }}>
        <button className="btn btn-sm" onClick={onCancel}>{t('Cancelar')}</button>
        <button className="btn btn-sm btn-danger" onClick={confirm} disabled={busy}><UserMinus size={15} /> {busy ? t('Desligando…') : t('Confirmar desligamento')}</button>
      </div>
    </>
  );
}

function TeacherAccess({ teacher: tc, onChanged }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(tc.login_email || tc.email || '');
  const [password, setPassword] = useState('');
  const save = async () => {
    try {
      await api.put(`/admin/teachers/${tc.id}/login`, { email, ...(password && { password }) });
      toast(tc.login_email ? t('Acesso atualizado') : t('Acesso criado para {name}', { name: tc.name }));
      setOpen(false); setPassword(''); onChanged();
    } catch (e) { toast(e.message, 'err'); }
  };
  const revoke = async () => {
    if (!window.confirm(t('Revogar o acesso de {name} à Área do professor?', { name: tc.name }))) return;
    try { await api.del(`/admin/teachers/${tc.id}/login`); toast(t('Acesso revogado')); onChanged(); } catch (e) { toast(e.message, 'err'); }
  };
  return (
    <>
      <div className="section-title">{t('Acesso à Área do professor')}</div>
      {tc.login_email
        ? <p style={{ fontSize: 14 }}><KeyRound size={14} className="gold" style={{ verticalAlign: -2, marginRight: 6 }} />{t('Entra com ')}<strong>{tc.login_email}</strong>{tc.status !== 'active' && <span className="dim">{t(' · bloqueado enquanto desligado')}</span>}</p>
        : <p className="muted" style={{ fontSize: 14 }}>{t('Ainda sem acesso. Crie um login para que {name} faça chamadas e o diário de aula.', { name: tc.name.split(' ')[0] })}</p>}
      {open ? (
        <div className="form-row c2">
          <Field label={t('E-mail de login')}><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <Field label={tc.login_email ? t('Nova senha (opcional)') : t('Senha inicial')}><input className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t('mín. 6 caracteres')} /></Field>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-sm" onClick={() => setOpen(false)}>{t('Cancelar')}</button>
            <button className="btn btn-sm btn-primary" onClick={save} disabled={!email || (!tc.login_email && password.length < 6)}>{t('Salvar acesso')}</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-sm" onClick={() => setOpen(true)}><KeyRound size={15} /> {tc.login_email ? t('Alterar e-mail / redefinir senha') : t('Criar acesso')}</button>
          {tc.login_email && <button className="btn btn-sm btn-ghost" onClick={revoke}>{t('Revogar acesso')}</button>}
        </div>
      )}
    </>
  );
}

function TeacherDetail({ teacher: tc, onEdit, onDismiss, onRehire, onDelete, onChanged }) {
  return (
    <>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <Avatar name={tc.name} lg />
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{tc.name}</div>
          <div className="muted" style={{ fontSize: 14 }}>{tc.specialties}</div>
          <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {tc.status === 'active' ? <span className="badge ok">{t('Ativo desde {d}', { d: fmtDate(tc.hired_at, { month: 'short', year: 'numeric' }) })}</span>
              : <span className="badge bad">{t('Desligado em {d}', { d: fmtDate(tc.dismissed_at) })}</span>}
            {tc.show_on_site && <span className="badge info">{t('No site')}</span>}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn btn-sm" onClick={onEdit}>{t('Editar')}</button>
        {tc.status === 'active'
          ? <button className="btn btn-sm btn-danger" onClick={onDismiss}><UserMinus size={15} />{t(' Desligar')}</button>
          : <>
            <button className="btn btn-sm btn-primary" onClick={onRehire}><UserCheck size={15} />{t(' Recontratar')}</button>
            <button className="btn btn-sm btn-danger" onClick={onDelete}><Trash2 size={15} />{t(' Excluir cadastro')}</button>
          </>}
      </div>
      {tc.dismissal_reason && <p className="muted" style={{ fontSize: 14 }}>{t('Motivo do desligamento:')} {tc.dismissal_reason}</p>}
      <div className="grid g-2">
        <div className="card kpi" style={{ padding: 16 }}><div className="label"><Clock />{t('Carga semanal')}</div><div className="value" style={{ fontSize: 28 }}>{hours(tc.weekly_hours)}</div><div className="hint">{t('{n} aulas', { n: tc.weekly_sessions })}</div></div>
        <div className="card kpi" style={{ padding: 16 }}><div className="label"><Wallet />{t('Custo estimado')}</div><div className="value" style={{ fontSize: 28 }}>{money(tc.monthly_cost)}</div><div className="hint">{t('{v}/hora-aula', { v: money(tc.hourly_rate) })}</div></div>
        <div className="card kpi" style={{ padding: 16 }}><div className="label"><Users />{t('Alunos')}</div><div className="value" style={{ fontSize: 28 }}>{tc.student_count}</div></div>
        <div className="card kpi" style={{ padding: 16 }}><div className="label">{t('Presença nas turmas')}</div><div className="value" style={{ fontSize: 28 }}>{tc.attendance_rate ?? '—'}{tc.attendance_rate !== null && '%'}</div><div className="hint">{t('últimos 30 dias')}</div></div>
      </div>
      <div className="section-title">{t('Contato')}</div>
      <div className="muted" style={{ fontSize: 14, display: 'grid', gap: 6 }}>
        {tc.email && <a href={`mailto:${tc.email}`} style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Mail size={14} />{tc.email}</a>}
        {tc.phone && <a href={`tel:${tc.phone.replace(/\D/g, '')}`} style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Phone size={14} />{tc.phone}</a>}
        {tc.bio && <p>{tc.bio}</p>}
        {tc.notes && <p className="dim">📝 {tc.notes}</p>}
      </div>
      <Link to={`/gestao/diarios?teacherId=${tc.id}`} className="btn btn-sm" style={{ justifySelf: 'start' }}>{t('Ver diário de aula')}</Link>
      <TeacherAccess key={tc.id + (tc.login_email || '')} teacher={tc} onChanged={onChanged} />
      <div className="section-title">Turmas ({tc.classes.length})</div>
      {tc.classes.length === 0 && <p className="dim" style={{ fontSize: 14 }}>{t('Nenhuma turma no momento.')}</p>}
      {tc.classes.map((c) => (
        <Link to={`/gestao/turmas?id=${c.id}`} className="list-row" key={c.id}>
          <span><ClassTag c={c} /><small className="dim" style={{ display: 'block', marginTop: 4 }}>{c.schedules.map((s) => `${WEEKDAYS_SHORT[s.weekday]} ${s.start_time}–${s.end_time}`).join(' · ')}</small></span>
          <span className="dim nowrap" style={{ fontSize: 13 }}>{c.enrolled}/{c.capacity}</span>
        </Link>
      ))}
    </>
  );
}

export default function Teachers() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState('active');
  const [search, setSearch] = useState('');
  const list = useFetch('/admin/teachers');
  const classes = useFetch('/admin/classes');
  const openId = Number(params.get('id')) || null;
  const mode = params.get('novo') ? 'new' : params.get('modo') || 'view';
  const detail = useFetch(openId ? `/admin/teachers/${openId}` : null);

  const go = (p) => setParams(p);
  const close = () => go({});
  const refresh = () => { list.reload(); classes.reload(); detail.reload(); };

  const rows = useMemo(() => (list.data || []).filter((tc) => tc.status === tab && (!search || `${tc.name} ${tc.specialties}`.toLowerCase().includes(search.toLowerCase()))), [list.data, tab, search]);
  const active = (list.data || []).filter((tc) => tc.status === 'active');
  const orphanClasses = (classes.data || []).filter((c) => c.active && !c.teacher_id);
  const classesByTeacher = useMemo(() => {
    const m = {};
    for (const c of classes.data || []) if (c.teacher_id) (m[c.teacher_id] ||= []).push(c);
    return m;
  }, [classes.data]);

  const rehire = async () => {
    try { await api.post(`/admin/teachers/${openId}/rehire`, {}); toast(t('Professor recontratado')); setTab('active'); refresh(); } catch (e) { toast(e.message, 'err'); }
  };
  const remove = async () => {
    if (!window.confirm(t('Excluir definitivamente o cadastro de {name}? Esta ação não pode ser desfeita.', { name: detail.data.name }))) return;
    try { await api.del(`/admin/teachers/${openId}`); toast(t('Cadastro excluído')); close(); list.reload(); classes.reload(); } catch (e) { toast(e.message, 'err'); }
  };

  const title = mode === 'new' ? t('Contratar professor') : mode === 'edit' ? t('Editar professor') : mode === 'dismiss' ? t('Desligamento') : detail.data?.name || t('Professor');

  return (
    <>
      <div className="page-head">
        <div><h1>{t('Professores')}</h1><p>{t('Equipe, carga horária, turmas e contratações.')}</p></div>
        <div className="actions"><button className="btn btn-primary btn-sm" onClick={() => go({ novo: '1' })}><UserPlus size={16} />{t(' Contratar professor')}</button></div>
      </div>

      {list.data && (
        <div className="grid g-4" style={{ marginBottom: 16 }}>
          <div className="card kpi"><div className="label"><Users />{t('Professores ativos')}</div><div className="value">{active.length}</div><div className="hint">{t('{n} desligado(s)', { n: list.data.length - active.length })}</div></div>
          <div className="card kpi"><div className="label"><Clock />{t('Horas de aula / semana')}</div><div className="value">{hours(Math.round(active.reduce((t, x) => t + x.weekly_hours, 0) * 10) / 10)}</div></div>
          <div className="card kpi"><div className="label"><Wallet />{t('Folha estimada / mês')}</div><div className="value">{money(active.reduce((t, x) => t + x.monthly_cost, 0))}</div><div className="hint">{t('horas × 4,33 semanas × hora-aula')}</div></div>
          <div className="card kpi" style={orphanClasses.length ? { borderColor: 'rgba(232,176,75,.4)' } : undefined}>
            <div className="label"><AlertTriangle />{t('Turmas sem professor')}</div>
            <div className="value" style={{ color: orphanClasses.length ? 'var(--gold)' : 'var(--mint)' }}>{orphanClasses.length}</div>
            <div className="hint">{orphanClasses.length ? orphanClasses.map((c) => c.name).join(', ') : t('Todas cobertas')}</div>
          </div>
        </div>
      )}

      <div className="toolbar">
        <div className="search"><Search /><input className="input" placeholder={t('Buscar professor ou modalidade')} value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <div className="seg">
          <button className={tab === 'active' ? 'on' : ''} onClick={() => setTab('active')}>{t('Ativos')}</button>
          <button className={tab === 'inactive' ? 'on' : ''} onClick={() => setTab('inactive')}>{t('Desligados')}</button>
        </div>
      </div>

      {!list.data ? <Loading /> : (
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>{t('Professor')}</th><th>{t('Turmas')}</th><th>{t('Carga')}</th><th>{t('Alunos')}</th><th>{t('Custo/mês')}</th><th>{tab === 'active' ? t('Desde') : t('Desligado em')}</th></tr></thead>
            <tbody>
              {rows.map((tc) => (
                <tr key={tc.id} className="click" onClick={() => go({ id: String(tc.id) })}>
                  <td><div className="person"><Avatar name={tc.name} /><div>{tc.name}<small>{tc.specialties}</small></div></div></td>
                  <td><div className="tags">{(classesByTeacher[tc.id] || []).map((c) => <ClassTag key={c.id} c={c} />)}{!classesByTeacher[tc.id] && <span className="dim">—</span>}</div></td>
                  <td className="nowrap">{hours(tc.weekly_hours)}<small className="dim" style={{ display: 'block', fontSize: 12 }}>{t('{n} aulas', { n: tc.weekly_sessions })}</small></td>
                  <td>{tc.student_count}</td>
                  <td className="nowrap">{money(tc.monthly_cost)}</td>
                  <td className="muted nowrap">{fmtDate(tab === 'active' ? tc.hired_at : tc.dismissed_at)}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={6} className="empty">{tab === 'active' ? t('Nenhum professor ativo.') : t('Nenhum professor desligado.')}</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      <Drawer open={mode === 'new' || !!openId} onClose={close} title={title}>
        {mode === 'new' && (classes.data
          ? <TeacherForm initial={EMPTY} classes={classes.data} onCancel={close} onSaved={(s) => { refresh(); setTab('active'); go({ id: String(s.id) }); }} />
          : <Loading />)}
        {openId && mode !== 'new' && (!detail.data || !classes.data || !list.data ? <Loading /> : (
          mode === 'edit'
            ? <TeacherForm key={detail.data.id} initial={{ ...EMPTY, ...detail.data, classIds: [] }} classes={classes.data} onCancel={() => go({ id: String(openId) })} onSaved={() => { refresh(); go({ id: String(openId) }); }} />
            : mode === 'dismiss'
              ? <DismissPanel teacher={detail.data} others={active.filter((o) => o.id !== openId)} onCancel={() => go({ id: String(openId) })} onDone={() => { refresh(); setTab('inactive'); go({ id: String(openId) }); }} />
              : <TeacherDetail teacher={detail.data} onEdit={() => go({ id: String(openId), modo: 'edit' })} onDismiss={() => go({ id: String(openId), modo: 'dismiss' })} onRehire={rehire} onDelete={remove} onChanged={refresh} />
        ))}
      </Drawer>
    </>
  );
}
