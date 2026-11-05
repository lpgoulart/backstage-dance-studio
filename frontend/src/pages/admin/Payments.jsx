import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Receipt } from 'lucide-react';
import { api } from '../../lib/api.js';
import { useFetch } from '../../lib/useFetch.js';
import { Loading, PayBadge, useToast } from '../../components/ui.jsx';
import { fmtDate, fmtMonth, money } from '../../lib/format.js';
import { t } from '../../i18n/index.jsx';

const thisMonth = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
const nextMonth = () => { const d = new Date(); d.setMonth(d.getMonth() + 1, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };

export default function Payments() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const status = params.get('status') || '';
  const [month, setMonth] = useState(status === 'overdue' ? '' : thisMonth());
  const [search, setSearch] = useState('');
  const qs = new URLSearchParams({ ...(month && { month }), ...(status && { status }) }).toString();
  const { data, reload } = useFetch(`/admin/payments?${qs}`);

  const setStatus = (s) => setParams(s ? { status: s } : {});
  const mark = async (p, s) => {
    try { await api.patch(`/admin/payments/${p.id}`, { status: s }); toast(s === 'paid' ? t('Pagamento de {name} confirmado', { name: p.student_name }) : t('Status atualizado')); reload(); }
    catch (e) { toast(e.message, 'err'); }
  };
  const generate = async () => {
    const m = window.prompt(t('Gerar cobranças para qual mês? (AAAA-MM)'), nextMonth());
    if (!m) return;
    try { const r = await api.post('/admin/payments/generate', { month: m }); toast(t('{n} cobrança(s) criadas para {m}', { n: r.created, m: fmtMonth(m) })); setMonth(m); }
    catch (e) { toast(e.message, 'err'); }
  };

  const rows = (data || []).filter((p) => !search || p.student_name.toLowerCase().includes(search.toLowerCase()) || (p.guardian_name || '').toLowerCase().includes(search.toLowerCase()));
  const sum = (st) => rows.filter((p) => p.status === st).reduce((t, p) => t + p.amount, 0);

  return (
    <>
      <div className="page-head">
        <div><h1>{t('Financeiro')}</h1><p>{month ? fmtMonth(month) : t('Todos os meses')}</p></div>
        <div className="actions"><button className="btn btn-primary btn-sm" onClick={generate}><Receipt size={15} />{t(' Gerar cobranças do mês')}</button></div>
      </div>
      <div className="grid g-3" style={{ marginBottom: 16 }}>
        <div className="card kpi"><div className="label">{t('Recebido')}</div><div className="value" style={{ color: 'var(--mint)' }}>{money(sum('paid'))}</div></div>
        <div className="card kpi"><div className="label">{t('Em aberto')}</div><div className="value" style={{ color: 'var(--gold)' }}>{money(sum('pending'))}</div></div>
        <div className="card kpi"><div className="label">{t('Atrasado')}</div><div className="value" style={{ color: 'var(--danger)' }}>{money(sum('overdue'))}</div></div>
      </div>
      <div className="toolbar">
        <div className="search"><Search /><input className="input" placeholder={t('Buscar aluno ou responsável')} value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <input className="input" type="month" style={{ width: 'auto' }} value={month} onChange={(e) => setMonth(e.target.value)} />
        <div className="seg">
          {[['', 'Todos'], ['paid', 'Pagos'], ['pending', 'Em aberto'], ['overdue', 'Atrasados']].map(([k, l]) => <button key={l} className={status === k ? 'on' : ''} onClick={() => setStatus(k)}>{t(l)}</button>)}
        </div>
      </div>
      {!data ? <Loading /> : (
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>{t('Aluno')}</th><th>{t('Referência')}</th><th>{t('Vencimento')}</th><th>{t('Valor')}</th><th>{t('Status')}</th><th></th></tr></thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <td>{p.student_name}<small className="dim" style={{ display: 'block', fontSize: 12.5 }}>{p.guardian_name}</small></td>
                  <td style={{ textTransform: 'capitalize' }}>{fmtMonth(p.reference_month)}</td>
                  <td className="muted">{fmtDate(p.due_date)}</td>
                  <td>{money(p.amount)}</td>
                  <td><PayBadge status={p.status} />{p.paid_at && <small className="dim" style={{ display: 'block', fontSize: 12 }}>{t('em {d}', { d: fmtDate(p.paid_at) })}</small>}</td>
                  <td style={{ textAlign: 'right' }}>
                    {p.status !== 'paid'
                      ? <button className="btn btn-sm" onClick={() => mark(p, 'paid')}>{t('Confirmar pagamento')}</button>
                      : <button className="btn btn-sm btn-ghost" onClick={() => mark(p, 'pending')}>{t('Desfazer')}</button>}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={6} className="empty">{t('Nenhuma cobrança encontrada.')}</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
