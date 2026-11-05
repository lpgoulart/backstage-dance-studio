import { useOutletContext } from 'react-router-dom';
import { useFetch } from '../../lib/useFetch.js';
import { Loading, PayBadge } from '../../components/ui.jsx';
import { fmtDate, fmtMonth, money } from '../../lib/format.js';
import { t } from '../../i18n/index.jsx';

export default function PortalFinance() {
  const { student, overview } = useOutletContext();
  const { data } = useFetch(student ? `/portal/students/${student.id}/payments` : null);
  if (!data) return <Loading />;
  const open = data.filter((p) => p.status !== 'paid');
  const paidYear = data.filter((p) => p.status === 'paid' && p.reference_month.startsWith(String(new Date().getFullYear()))).reduce((x, p) => x + p.amount, 0);
  return (
    <>
      <div className="page-head">
        <div><h1>{t('Mensalidades')}</h1><p>{t('Histórico financeiro de {name}. Pagamentos são confirmados pela recepção.', { name: student.name.split(' ')[0] })}</p></div>
      </div>
      <div className="grid g-3" style={{ marginBottom: 16 }}>
        <div className="card kpi"><div className="label">{t('Em aberto')}</div><div className="value" style={{ color: open.length ? 'var(--gold)' : 'var(--mint)' }}>{money(open.reduce((x, p) => x + p.amount, 0))}</div><div className="hint">{open.length ? t('{n} cobrança(s)', { n: open.length }) : t('Tudo em dia ✨')}</div></div>
        <div className="card kpi"><div className="label">{t('Mensalidade atual')}</div><div className="value">{money(overview?.student.monthly_fee)}</div><div className="hint">{t('{n} turma(s)', { n: overview?.classes.length })}</div></div>
        <div className="card kpi"><div className="label">{t('Pago em {y}', { y: new Date().getFullYear() })}</div><div className="value">{money(paidYear)}</div></div>
      </div>
      <div className="table-wrap">
        <table className="tbl">
          <thead><tr><th>{t('Referência')}</th><th>{t('Vencimento')}</th><th>{t('Valor')}</th><th>{t('Status')}</th><th>{t('Pago em')}</th></tr></thead>
          <tbody>
            {data.map((p) => (
              <tr key={p.id}>
                <td style={{ textTransform: 'capitalize' }}>{fmtMonth(p.reference_month)}</td>
                <td>{fmtDate(p.due_date)}</td>
                <td>{money(p.amount)}</td>
                <td><PayBadge status={p.status} /></td>
                <td className="muted">{p.paid_at ? fmtDate(p.paid_at) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
