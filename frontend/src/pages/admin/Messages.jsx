import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Mail, Phone, MessageCircle, Trash2 } from 'lucide-react';
import { api } from '../../lib/api.js';
import { useFetch } from '../../lib/useFetch.js';
import { Loading, useToast } from '../../components/ui.jsx';
import { t } from '../../i18n/index.jsx';
import { fmtDateTime } from '../../lib/format.js';

const LABEL = { new: 'Nova', read: 'Lida', answered: 'Respondida' };
const CLS = { new: 'warn', read: 'info', answered: 'ok' };

export default function Messages() {
  const toast = useToast();
  const { refreshInbox } = useOutletContext();
  const [filter, setFilter] = useState('');
  const { data, reload } = useFetch(`/admin/messages${filter ? `?status=${filter}` : ''}`);

  const setStatus = async (m, status) => {
    try { await api.patch(`/admin/messages/${m.id}`, { status }); reload(); refreshInbox(); } catch (e) { toast(e.message, 'err'); }
  };
  const remove = async (m) => {
    if (!window.confirm(t('Excluir a mensagem de {name}?', { name: m.name }))) return;
    try { await api.del(`/admin/messages/${m.id}`); toast(t('Mensagem excluída')); reload(); refreshInbox(); } catch (e) { toast(e.message, 'err'); }
  };
  const wa = (phone) => `https://wa.me/55${phone.replace(/\D/g, '')}`;

  return (
    <>
      <div className="page-head">
        <div><h1>{t('Mensagens')}</h1><p>{t('Contatos e pedidos de aula experimental enviados pelo site.')}</p></div>
        <div className="seg">
          {[['', 'Todas'], ['new', 'Novas'], ['read', 'Lidas'], ['answered', 'Respondidas']].map(([k, l]) => <button key={l} className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>{t(l)}</button>)}
        </div>
      </div>
      {!data ? <Loading /> : (
        <div style={{ display: 'grid', gap: 12, maxWidth: 900 }}>
          {data.length === 0 && <div className="card empty">{t('Nenhuma mensagem.')}</div>}
          {data.map((m) => (
            <div key={m.id} className="card" style={{ borderColor: m.status === 'new' ? 'rgba(232,176,75,.35)' : undefined }} onMouseEnter={() => m.status === 'new' && setStatus(m, 'read')}>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <strong style={{ fontSize: 16 }}>{m.name}</strong>
                {m.interest && <span className="badge plain">{m.interest}</span>}
                <span className={`badge ${CLS[m.status]}`}>{t(LABEL[m.status])}</span>
                <span className="dim" style={{ marginLeft: 'auto', fontSize: 12.5 }}>{fmtDateTime(m.created_at)}</span>
              </div>
              <p style={{ margin: '12px 0 14px', fontSize: 15 }}>{m.message}</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {m.phone && <a className="btn btn-sm" href={wa(m.phone)} target="_blank" rel="noreferrer"><MessageCircle size={15} />{t(' WhatsApp')}</a>}
                {m.phone && <a className="btn btn-sm btn-ghost" href={`tel:${m.phone.replace(/\D/g, '')}`}><Phone size={15} /> {m.phone}</a>}
                {m.email && <a className="btn btn-sm btn-ghost" href={`mailto:${m.email}`}><Mail size={15} /> {m.email}</a>}
                <span style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                  {m.status !== 'answered' && <button className="btn btn-sm" onClick={() => setStatus(m, 'answered')}>{t('Marcar como respondida')}</button>}
                  <button className="icon-btn" onClick={() => remove(m)} aria-label={t('Excluir')}><Trash2 /></button>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
