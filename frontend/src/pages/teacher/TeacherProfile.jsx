import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { useFetch } from '../../lib/useFetch.js';
import { Field, Loading, Avatar, useToast } from '../../components/ui.jsx';
import { fmtDate, money, fmtHours } from '../../lib/format.js';
import { t, rich } from '../../i18n/index.jsx';

export default function TeacherProfile() {
  const toast = useToast();
  const { data, reload } = useFetch('/teacher/me');
  const [f, setF] = useState(null);
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  useEffect(() => { if (data) setF({ phone: data.phone || '', email: data.email || '', specialties: data.specialties || '', bio: data.bio || '' }); }, [data]);
  if (!data || !f) return <Loading />;
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const save = async () => {
    try { await api.put('/teacher/me', f); toast(t('Perfil atualizado')); reload(); } catch (e) { toast(e.message, 'err'); }
  };
  const changePw = async () => {
    if (pw.newPassword !== pw.confirm) { toast(t('As senhas não conferem'), 'err'); return; }
    try { await api.put('/auth/me/password', { currentPassword: pw.currentPassword, newPassword: pw.newPassword }); toast(t('Senha alterada')); setPw({ currentPassword: '', newPassword: '', confirm: '' }); }
    catch (e) { toast(e.message, 'err'); }
  };

  return (
    <>
      <div className="page-head"><div><h1>{rich(t('Meu *perfil*'))}</h1><p>{t('Seus dados aparecem para a gestão e, se autorizado, na seção Equipe do site.')}</p></div></div>
      <div className="grid g-3">
        <div className="card" style={{ display: 'grid', gap: 14, alignContent: 'start' }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <Avatar name={data.name} lg />
            <div><div style={{ fontSize: 18, fontWeight: 700 }}>{data.name}</div><div className="muted" style={{ fontSize: 13.5 }}>{data.email_login}</div></div>
          </div>
          <div className="list-row"><span className="muted">{t('No Backstage desde')}</span><strong>{fmtDate(data.hired_at)}</strong></div>
          <div className="list-row"><span className="muted">{t('Hora-aula')}</span><strong>{money(data.hourly_rate)}</strong></div>
          <div className="list-row"><span className="muted">{t('Turmas')}</span><strong>{data.class_count}</strong></div>
          <div className="list-row"><span className="muted">{t('Carga semanal')}</span><strong>{fmtHours(data.weekly_hours)} · {t('{n} aulas', { n: data.weekly_sessions })}</strong></div>
          <div className="list-row"><span className="muted">{t('Alunos')}</span><strong>{data.student_count}</strong></div>
          <div className="list-row"><span className="muted">{t('Na página Equipe')}</span><strong>{data.show_on_site ? t('Sim') : t('Não')}</strong></div>
          <p className="dim" style={{ fontSize: 12.5 }}>{t('Contrato, hora-aula e turmas são definidos pela gestão.')}</p>
        </div>
        <div className="card span-2" style={{ display: 'grid', gap: 14, alignContent: 'start' }}>
          <div className="card-head" style={{ marginBottom: 0 }}><h2>{t('Dados de contato e apresentação')}</h2></div>
          <div className="form-row c2">
            <Field label={t('Telefone')}><input className="input" value={f.phone} onChange={set('phone')} /></Field>
            <Field label={t('E-mail de contato')}><input className="input" type="email" value={f.email} onChange={set('email')} /></Field>
          </div>
          <Field label={t('Modalidades / especialidades (aparece no site)')}><input className="input" value={f.specialties} onChange={set('specialties')} /></Field>
          <Field label={t('Mini bio')}><textarea className="textarea" value={f.bio} onChange={set('bio')} /></Field>
          <div><button className="btn btn-primary btn-sm" onClick={save}>{t('Salvar perfil')}</button></div>

          <div className="section-title" style={{ marginTop: 14 }}>{t('Alterar senha')}</div>
          <div className="form-row c3">
            <Field label={t('Senha atual')}><input className="input" type="password" autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} /></Field>
            <Field label={t('Nova senha')}><input className="input" type="password" autoComplete="new-password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} /></Field>
            <Field label={t('Confirmar')}><input className="input" type="password" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} /></Field>
          </div>
          <div><button className="btn btn-sm" onClick={changePw} disabled={!pw.currentPassword || pw.newPassword.length < 6}>{t('Alterar senha')}</button></div>
        </div>
      </div>
    </>
  );
}
