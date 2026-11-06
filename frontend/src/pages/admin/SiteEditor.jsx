import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Trash2, ArrowUp, ArrowDown, ExternalLink, Pencil } from 'lucide-react';
import { api } from '../../lib/api.js';
import { useFetch } from '../../lib/useFetch.js';
import { Drawer, Field, Loading, useToast } from '../../components/ui.jsx';
import { fmtDate, todayStr } from '../../lib/format.js';
import { t, rich } from '../../i18n/index.jsx';

/* ───── generic inputs from a field spec ───── */
function Input({ spec, value, onChange }) {
  const v = value ?? '';
  if (spec.type === 'textarea') return <textarea className="textarea" value={v} onChange={(e) => onChange(e.target.value)} placeholder={t(spec.placeholder)} />;
  if (spec.type === 'checkbox') return <label className="check"><input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />{t(spec.hint || 'Ativo')}</label>;
  if (spec.type === 'select') return <select className="select" value={v} onChange={(e) => onChange(e.target.value)}>{spec.options.map(([k, l]) => <option key={k} value={k}>{t(l)}</option>)}</select>;
  return <input className="input" type={spec.type || 'text'} value={v} placeholder={t(spec.placeholder)}
    onChange={(e) => onChange(spec.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)} />;
}

function Fields({ specs, value, onChange }) {
  return (
    <div className="form-row c2">
      {specs.map((s) => (
        <div key={s.key} style={s.wide || s.type === 'textarea' ? { gridColumn: '1 / -1' } : undefined}>
          {s.type === 'checkbox'
            ? <Input spec={s} value={value[s.key]} onChange={(v) => onChange({ ...value, [s.key]: v })} />
            : <Field label={t(s.label)}><Input spec={s} value={value[s.key]} onChange={(v) => onChange({ ...value, [s.key]: v })} /></Field>}
        </div>
      ))}
    </div>
  );
}

/* ───── content block editors ───── */
function useSaver(reload) {
  const toast = useToast();
  return async (key, value) => {
    try { await api.put(`/admin/content/${key}`, { value }); toast(t('Publicado no site ✨')); reload?.(); }
    catch (e) { toast(e.message, 'err'); }
  };
}

function ObjectBlock({ title, sub, k, specs, content, reload }) {
  const save = useSaver(reload);
  const [v, setV] = useState(content[k] || {});
  useEffect(() => setV(content[k] || {}), [content, k]);
  return (
    <div className="card">
      <div className="card-head"><div><h2>{title}</h2>{sub && <div className="sub">{sub}</div>}</div><button className="btn btn-primary btn-sm" onClick={() => save(k, v)}>{t('Salvar')}</button></div>
      <Fields specs={specs} value={v} onChange={setV} />
    </div>
  );
}

function ArrayBlock({ title, sub, k, specs, content, simple, reload, onSave }) {
  const saver = useSaver(reload);
  const save = onSave ? (_k, items) => onSave(items, saver) : saver;
  const [items, setItems] = useState(content[k] || []);
  useEffect(() => setItems(content[k] || []), [content, k]);
  const blank = simple ? '' : Object.fromEntries(specs.map((s) => [s.key, '']));
  const move = (i, d) => { const x = [...items]; [x[i], x[i + d]] = [x[i + d], x[i]]; setItems(x); };
  return (
    <div className="card">
      <div className="card-head"><div><h2>{title}</h2>{sub && <div className="sub">{sub}</div>}</div><button className="btn btn-primary btn-sm" onClick={() => save(k, items)}>{t('Salvar')}</button></div>
      <div style={{ display: 'grid', gap: 10 }}>
        {items.map((it, i) => (
          <div className="cms-item" key={i}>
            {simple
              ? <input className="input" value={it} onChange={(e) => setItems(items.map((x, j) => (j === i ? e.target.value : x)))} />
              : <Fields specs={specs} value={it} onChange={(nv) => setItems(items.map((x, j) => (j === i ? nv : x)))} />}
            <div className="row-actions">
              <button className="icon-btn" disabled={i === 0} onClick={() => move(i, -1)} aria-label={t('Subir')}><ArrowUp /></button>
              <button className="icon-btn" disabled={i === items.length - 1} onClick={() => move(i, 1)} aria-label={t('Descer')}><ArrowDown /></button>
              <button className="icon-btn" onClick={() => setItems(items.filter((_, j) => j !== i))} aria-label={t('Remover')}><Trash2 /></button>
            </div>
          </div>
        ))}
        <button className="btn btn-sm" style={{ justifySelf: 'start', alignSelf: 'flex-start' }} onClick={() => setItems([...items, blank])}><Plus size={15} />{t(' Adicionar')}</button>
      </div>
    </div>
  );
}

/* ───── CRUD panels (events, projects, announcements) ───── */
function CrudPanel({ path, title, specs, blank, render, label }) {
  const toast = useToast();
  const { data, reload } = useFetch(path);
  const [edit, setEdit] = useState(null);
  const save = async () => {
    try {
      if (edit.id) await api.put(`${path}/${edit.id}`, edit); else await api.post(path, edit);
      toast(t('{label} salvo e publicado', { label })); setEdit(null); reload();
    } catch (e) { toast(e.message, 'err'); }
  };
  const remove = async () => {
    if (!window.confirm(t('Excluir "{name}"?', { name: edit.title }))) return;
    try { await api.del(`${path}/${edit.id}`); toast(t('{label} excluído', { label })); setEdit(null); reload(); } catch (e) { toast(e.message, 'err'); }
  };
  return (
    <>
      <div className="card-head" style={{ marginBottom: 14 }}>
        <div><h2 style={{ fontSize: 18 }}>{title}</h2><div className="sub">{t('{n} itens', { n: data?.length ?? 0 })}</div></div>
        <button className="btn btn-primary btn-sm" onClick={() => setEdit(blank())}><Plus size={15} />{t(' Novo')}</button>
      </div>
      {!data ? <Loading /> : (
        <div className="table-wrap">
          <table className="tbl"><tbody>
            {data.map((row) => (
              <tr key={row.id} className="click" onClick={() => setEdit(row)}>
                {render(row)}
                <td style={{ textAlign: 'right', width: 50 }}><Pencil size={15} className="dim" /></td>
              </tr>
            ))}
            {data.length === 0 && <tr><td className="empty">{t('Nada por aqui ainda.')}</td></tr>}
          </tbody></table>
        </div>
      )}
      <Drawer open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? t('Editar {x}', { x: label.toLowerCase() }) : t('Novo {x}', { x: label.toLowerCase() })}
        footer={<>
          {edit?.id && <button className="btn btn-sm btn-danger left" onClick={remove}><Trash2 size={15} />{t(' Excluir')}</button>}
          <button className="btn btn-sm" onClick={() => setEdit(null)}>{t('Cancelar')}</button>
          <button className="btn btn-primary btn-sm" onClick={save} disabled={!edit?.title}>{t('Salvar')}</button>
        </>}>
        {edit && <Fields specs={specs} value={edit} onChange={setEdit} />}
      </Drawer>
    </>
  );
}

const EVENT_SPECS = [
  { key: 'title', label: 'Título', wide: true }, { key: 'date', label: 'Data', type: 'date' }, { key: 'time', label: 'Horário', type: 'time' },
  { key: 'location', label: 'Local' }, { key: 'category', label: 'Categoria', placeholder: 'Espetáculo, Workshop…' },
  { key: 'description', label: 'Descrição', type: 'textarea' }, { key: 'image_url', label: 'URL de imagem (opcional)', wide: true },
  { key: 'published', type: 'checkbox', hint: 'Publicado no site e no portal' },
];
const PROJECT_SPECS = [
  { key: 'title', label: 'Título', wide: true }, { key: 'year', label: 'Ano', type: 'number' }, { key: 'category', label: 'Categoria' },
  { key: 'description', label: 'Descrição', type: 'textarea' }, { key: 'image_url', label: 'URL de imagem (opcional)', wide: true },
  { key: 'color', label: 'Cor do pôster', type: 'color' }, { key: 'sort_order', label: 'Ordem', type: 'number' },
  { key: 'highlight', type: 'checkbox', hint: 'Destacar na página inicial' },
];
const ANN_SPECS = [
  { key: 'title', label: 'Título', wide: true }, { key: 'body', label: 'Texto', type: 'textarea' },
  { key: 'audience', label: 'Público', type: 'select', options: [['public', 'Site + portal'], ['students', 'Somente portal (alunos)']] },
  { key: 'pinned', type: 'checkbox', hint: 'Fixar no topo' }, { key: 'published', type: 'checkbox', hint: 'Publicado' },
];

const TABS = [
  ['home', 'Página inicial'], ['events', 'Eventos'], ['projects', 'Projetos'], ['notices', 'Avisos'], ['about', 'Sobre & equipe'], ['contact', 'Contato'],
];

export default function SiteEditor() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'home';
  const { data: content, reload } = useFetch('/admin/content');

  return (
    <>
      <div className="page-head">
        <div><h1>{rich(t('Conteúdo *do site*'))}</h1><p>{t('Tudo que você salvar aqui aparece imediatamente no site público.')}</p></div>
        <div className="actions"><a href={import.meta.env.BASE_URL} target="_blank" rel="noreferrer" className="btn btn-sm"><ExternalLink size={15} />{t(' Ver site')}</a></div>
      </div>
      <div className="pill-tabs" role="tablist">
        {TABS.map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} role="tab" aria-selected={tab === k} onClick={() => setParams({ tab: k })}>{t(l)}</button>)}
      </div>

      {['home', 'about', 'contact'].includes(tab) && !content && <Loading />}

      {tab === 'home' && content && (
        <div className="grid" style={{ gap: 16 }}>
          <ObjectBlock title={t('Faixa de aviso')} sub={t('Barra dourada no topo de todas as páginas')} k="banner" content={content} reload={reload} specs={[
            { key: 'text', label: 'Texto', wide: true }, { key: 'link', label: 'Link (ex.: /contato)' }, { key: 'enabled', type: 'checkbox', hint: 'Exibir faixa' },
          ]} />
          <ObjectBlock title={t('Destaque principal (hero)')} sub={t('Use *asteriscos* para destacar uma palavra em itálico dourado')} k="hero" content={content} reload={reload} specs={[
            { key: 'eyebrow', label: 'Chamada superior' }, { key: 'title', label: 'Título' }, { key: 'subtitle', label: 'Subtítulo', type: 'textarea' },
            { key: 'ctaLabel', label: 'Texto do botão' }, { key: 'ctaLink', label: 'Link do botão' },
          ]} />
          <ArrayBlock title={t('Números')} sub={t('Contadores animados')} k="stats" content={content} reload={reload} specs={[
            { key: 'value', label: 'Valor', type: 'number' }, { key: 'suffix', label: 'Sufixo (ex.: +)' }, { key: 'label', label: 'Legenda', wide: true },
          ]} />
          <ArrayBlock title={t('Modalidades')} k="styles" content={content} reload={reload} specs={[{ key: 'name', label: 'Nome' }, { key: 'description', label: 'Descrição' }]} />
          <ArrayBlock title={t('Depoimentos')} k="testimonials" content={content} reload={reload} specs={[{ key: 'quote', label: 'Depoimento', type: 'textarea' }, { key: 'author', label: 'Autor', wide: true }]} />
        </div>
      )}

      {tab === 'about' && content && (
        <div className="grid" style={{ gap: 16 }}>
          <ObjectBlock title={t('Sobre a escola')} k="about" content={content} reload={reload} specs={[
            { key: 'title', label: 'Frase de abertura', wide: true }, { key: 'text', label: 'Texto principal', type: 'textarea' }, { key: 'mission', label: 'Missão', type: 'textarea' },
          ]} />
          <ArrayBlock title={t('Valores')} k="values" simple content={{ values: content.about?.values || [] }} specs={[]} reload={reload}
            onSave={(values, saver) => saver('about', { ...content.about, values })} />
          <ArrayBlock title={t('Linha do tempo')} k="timeline" content={content} reload={reload} specs={[{ key: 'year', label: 'Ano' }, { key: 'text', label: 'Marco' }]} />
          <div className="card muted" style={{ fontSize: 14 }}>{t('A seção ')}<strong style={{ color: 'var(--text)' }}>{t('Equipe')}</strong>{t(' do site mostra automaticamente os professores ativos marcados como “Exibir no site” em ')}<Link className="gold" to="/gestao/professores">{t('Gestão → Professores')}</Link>.</div>
        </div>
      )}

      {tab === 'contact' && content && (
        <ObjectBlock title={t('Informações de contato')} k="contact" content={content} reload={reload} specs={[
          { key: 'address', label: 'Endereço', wide: true }, { key: 'mapQuery', label: 'Busca do mapa (endereço completo)', wide: true },
          { key: 'phone', label: 'Telefone' }, { key: 'whatsapp', label: 'WhatsApp (só números, com DDI)' },
          { key: 'email', label: 'E-mail' }, { key: 'instagram', label: 'Instagram (usuário)' },
          { key: 'linktree', label: 'Linktree' }, { key: 'hours', label: 'Horário de funcionamento' },
        ]} />
      )}

      {tab === 'events' && (
        <CrudPanel path="/admin/events" title={t('Eventos')} label={t('Evento')} specs={EVENT_SPECS}
          blank={() => ({ title: '', date: todayStr(), time: '19:00', location: '', category: 'Evento', description: '', image_url: '', published: true })}
          render={(e) => (<>
            <td style={{ width: 120 }} className="muted">{fmtDate(e.date)}</td>
            <td><strong style={{ fontWeight: 600 }}>{e.title}</strong><small className="dim" style={{ display: 'block' }}>{e.category} · {e.location}</small></td>
            <td><span className="badge ok">{t('{n} vão', { n: e.going_count })}</span></td>
            <td>{e.published ? <span className="badge info">{t('Publicado')}</span> : <span className="badge">{t('Rascunho')}</span>}</td>
          </>)} />
      )}
      {tab === 'projects' && (
        <CrudPanel path="/admin/projects" title={t('Projetos & trabalhos')} label={t('Projeto')} specs={PROJECT_SPECS}
          blank={() => ({ title: '', year: new Date().getFullYear(), category: 'Espetáculo', description: '', image_url: '', color: '#e8b04b', highlight: false, sort_order: 0 })}
          render={(p) => (<>
            <td style={{ width: 60 }}><span style={{ display: 'block', width: 34, height: 42, borderRadius: 8, background: `radial-gradient(circle at 30% 20%, ${p.color}, #1a161e)` }} /></td>
            <td><strong style={{ fontWeight: 600 }}>{p.title}</strong><small className="dim" style={{ display: 'block' }}>{p.category} · {p.year}</small></td>
            <td>{p.highlight && <span className="badge warn">{t('Destaque')}</span>}</td>
          </>)} />
      )}
      {tab === 'notices' && (
        <CrudPanel path="/admin/announcements" title={t('Avisos')} label={t('Aviso')} specs={ANN_SPECS}
          blank={() => ({ title: '', body: '', audience: 'public', pinned: false, published: true })}
          render={(a) => (<>
            <td><strong style={{ fontWeight: 600 }}>{a.title}</strong><small className="dim" style={{ display: 'block', maxWidth: 560 }}>{a.body}</small></td>
            <td>{a.audience === 'public' ? <span className="badge info">{t('Site + portal')}</span> : <span className="badge plain">{t('Só portal')}</span>}</td>
            <td>{a.pinned && <span className="badge warn">{t('Fixado')}</span>} {!a.published && <span className="badge">{t('Oculto')}</span>}</td>
          </>)} />
      )}
    </>
  );
}
