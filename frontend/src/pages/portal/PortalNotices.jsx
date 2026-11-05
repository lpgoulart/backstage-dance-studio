import { Pin } from 'lucide-react';
import { useFetch } from '../../lib/useFetch.js';
import { Loading } from '../../components/ui.jsx';
import { fmtDate } from '../../lib/format.js';
import { t, rich } from '../../i18n/index.jsx';

export default function PortalNotices() {
  const { data } = useFetch('/portal/announcements');
  if (!data) return <Loading />;
  return (
    <>
      <div className="page-head"><div><h1>{rich(t('Mural *de avisos*'))}</h1><p>{t('Comunicados da equipe Backstage.')}</p></div></div>
      <div style={{ display: 'grid', gap: 12, maxWidth: 820 }}>
        {data.length === 0 && <div className="card empty">{t('Nenhum aviso no momento.')}</div>}
        {data.map((a) => (
          <div key={a.id} className={`notice ${a.pinned ? 'pin' : ''}`} style={{ padding: 22 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
              {a.pinned && <span className="badge warn"><Pin size={12} />{t('Fixado')}</span>}
              <span className="badge plain">{a.audience === 'students' ? t('Exclusivo alunos') : t('Geral')}</span>
              <span className="dim" style={{ fontSize: 12.5, marginLeft: 'auto' }}>{fmtDate(a.created_at)}</span>
            </div>
            <h4 style={{ fontSize: 18 }}>{a.title}</h4>
            <p style={{ fontSize: 15 }}>{a.body}</p>
          </div>
        ))}
      </div>
    </>
  );
}
