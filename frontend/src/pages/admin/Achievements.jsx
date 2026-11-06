import { useState } from 'react';
import { Plus, Pencil, Trash2, Power, Users } from 'lucide-react';
import { api } from '../../lib/api.js';
import { useFetch } from '../../lib/useFetch.js';
import { Drawer, Field, Loading, Bar, useToast } from '../../components/ui.jsx';
import { ACHIEVEMENT_ICONS, AchievementIcon } from '../../components/achievementIcons.jsx';
import { t, rich } from '../../i18n/index.jsx';

const EMPTY = { title: '', description: '', icon: 'star', metric: 'classes_attended', target: 10, active: true, sort_order: '' };

/** Human description of a rule, e.g. "Aulas frequentadas ≥ 50" */
const ruleText = (metrics, a) => {
  const m = metrics.find((x) => x.key === a.metric);
  return `${m ? t(m.label) : a.metric} ≥ ${a.target}`;
};

function AchievementForm({ initial, metrics, icons, onSaved, onCancel }) {
  const toast = useToast();
  const [f, setF] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const save = async () => {
    setBusy(true); setErr(null);
    const body = { ...f, target: Number(f.target), sort_order: f.sort_order === '' ? undefined : Number(f.sort_order) };
    delete body.unlocked_count; delete body.unlocked_pct; delete body.created_at; delete body.id;
    try {
      const saved = initial.id ? await api.put(`/admin/achievements/${initial.id}`, body) : await api.post('/admin/achievements', body);
      toast(initial.id ? t('Conquista atualizada') : t('Conquista criada'));
      onSaved(saved);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  return (
    <>
      <div className="ach on" style={{ maxWidth: 260 }} aria-label={t('Pré-visualização')}>
        <div className="ico"><AchievementIcon name={f.icon} /></div>
        <h4>{f.title || t('Nome da conquista')}</h4>
        <p>{f.description || t('Descrição que o aluno vê no portal.')}</p>
      </div>

      <div className="section-title">{t('Conquista')}</div>
      <Field label={t('Nome')}><input className="input" value={f.title} onChange={set('title')} placeholder={t('Ex.: Cem Aulas')} /></Field>
      <Field label={t('Descrição')}><textarea className="textarea" value={f.description || ''} onChange={set('description')} placeholder={t('Ex.: Some 100 aulas no estúdio.')} /></Field>
      <Field label={t('Ícone')}>
        <div className="icon-grid" role="radiogroup" aria-label={t('Ícone')}>
          {icons.filter((i) => ACHIEVEMENT_ICONS[i]).map((i) => (
            <button key={i} type="button" role="radio" aria-checked={f.icon === i} className={f.icon === i ? 'on' : ''} onClick={() => setF({ ...f, icon: i })} title={i}>
              <AchievementIcon name={i} size={18} />
            </button>
          ))}
        </div>
      </Field>

      <div className="section-title">{t('Regra para desbloquear')}</div>
      <Field label={t('Métrica')}>
        <select className="select" value={f.metric} onChange={set('metric')}>
          {metrics.map((m) => <option key={m.key} value={m.key}>{t(m.label)}</option>)}
        </select>
      </Field>
      <div className="form-row c2">
        <Field label={t('Meta (desbloqueia ao atingir)')}><input className="input" type="number" min="1" step="1" value={f.target} onChange={set('target')} /></Field>
        <Field label={t('Ordem de exibição')}><input className="input" type="number" min="0" value={f.sort_order ?? ''} onChange={set('sort_order')} placeholder={t('automática')} /></Field>
      </div>
      <p className="muted" style={{ fontSize: 13.5 }}>{t('O aluno desbloqueia quando')} <strong style={{ color: 'var(--text)' }}>{ruleText(metrics, f)}</strong>.</p>
      <label className="check"><input type="checkbox" checked={!!f.active} onChange={set('active')} />{t('Ativa (aparece no portal dos alunos)')}</label>
      {err && <p className="error-text">{err}</p>}
      <div className="drawer-foot" style={{ margin: '8px -24px -24px', position: 'sticky', bottom: -24, background: 'var(--bg-2)' }}>
        <button className="btn btn-sm" onClick={onCancel}>{t('Cancelar')}</button>
        <button className="btn btn-primary btn-sm" onClick={save} disabled={busy || !f.title.trim() || !(Number(f.target) >= 1)}>{busy ? t('Salvando…') : initial.id ? t('Salvar') : t('Criar conquista')}</button>
      </div>
    </>
  );
}

export default function Achievements() {
  const toast = useToast();
  const { data, reload } = useFetch('/admin/achievements');
  const opts = useFetch('/admin/achievements/options');
  const [edit, setEdit] = useState(null);
  const [filter, setFilter] = useState('');

  const metrics = opts.data?.metrics || [];
  const list = (data?.achievements || []).filter((a) => filter === '' || (filter === 'active' ? a.active : !a.active));

  const toggle = async (a) => {
    try { await api.put(`/admin/achievements/${a.id}`, { active: !a.active }); toast(a.active ? t('Conquista inativada') : t('Conquista reativada')); reload(); }
    catch (e) { toast(e.message, 'err'); }
  };
  const remove = async (a) => {
    if (!window.confirm(t('Excluir a conquista "{name}"? Se a ideia é só tirar do portal, use "Inativar".', { name: t(a.title) }))) return;
    try { await api.del(`/admin/achievements/${a.id}`); toast(t('Conquista excluída')); setEdit(null); reload(); }
    catch (e) { toast(e.message, 'err'); }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{rich(t('Conquistas *dos alunos*'))}</h1>
          <p>{t('Regras que desbloqueiam conquistas no portal. Alterações valem na hora para todos os alunos.')}</p>
        </div>
        <div className="actions"><button className="btn btn-primary btn-sm" onClick={() => setEdit({ ...EMPTY })}><Plus /> {t('Nova conquista')}</button></div>
      </div>

      <div className="toolbar">
        <div className="seg">
          {[['', 'Todas'], ['active', 'Ativas'], ['inactive', 'Inativas']].map(([k, l]) => <button key={l} className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>{t(l)}</button>)}
        </div>
        {data && <span className="dim" style={{ fontSize: 13 }}>{t('{n} alunos ativos considerados nos números abaixo', { n: data.active_students })}</span>}
      </div>

      {!data || !opts.data ? <Loading /> : (
        <div className="grid g-3">
          {list.length === 0 && <div className="card empty span-2">{t('Nenhuma conquista aqui.')}</div>}
          {list.map((a) => (
            <div key={a.id} className="card" style={{ display: 'grid', gap: 12, alignContent: 'start', opacity: a.active ? 1 : 0.6 }}>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                <div className={`ach-ico ${a.active ? 'on' : ''}`}><AchievementIcon name={a.icon} /></div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15.5 }}>{t(a.title)}</div>
                  <div className="muted" style={{ fontSize: 13 }}>{t(a.description)}</div>
                </div>
                {!a.active && <span className="badge">{t('Inativa')}</span>}
              </div>
              <div className="tag" style={{ justifySelf: 'start', whiteSpace: 'normal' }}>{ruleText(metrics, a)}</div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                  <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}><Users size={14} />{t('{n} alunos já desbloquearam', { n: a.unlocked_count })}</span>
                  <span className="dim">{a.unlocked_pct}%</span>
                </div>
                <Bar pct={a.unlocked_pct} />
              </div>
              <div style={{ display: 'flex', gap: 6, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
                <button className="icon-btn" title={t('Editar')} aria-label={t('Editar {name}', { name: t(a.title) })} onClick={() => setEdit(a)}><Pencil /></button>
                <button className="icon-btn" title={a.active ? t('Inativar') : t('Reativar')} aria-label={a.active ? t('Inativar {name}', { name: t(a.title) }) : t('Reativar {name}', { name: t(a.title) })}
                  onClick={() => toggle(a)} style={{ color: a.active ? undefined : 'var(--mint)' }}><Power /></button>
                <button className="icon-btn" title={t('Excluir')} aria-label={t('Excluir {name}', { name: t(a.title) })} onClick={() => remove(a)} style={{ marginLeft: 'auto', color: 'var(--danger)' }}><Trash2 /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Drawer open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? t('Editar conquista') : t('Nova conquista')}>
        {edit && opts.data && (
          <AchievementForm key={edit.id || 'new'} initial={{ ...EMPTY, ...edit }} metrics={metrics} icons={opts.data.icons}
            onCancel={() => setEdit(null)} onSaved={() => { setEdit(null); reload(); }} />
        )}
      </Drawer>
    </>
  );
}
