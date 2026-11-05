import { useEffect, useMemo, useState } from 'react';
import { Home, CalendarDays, Sparkles, Wallet, Ticket, Megaphone } from 'lucide-react';
import AppShell from '../../components/AppShell.jsx';
import { Loading, ErrorBox } from '../../components/ui.jsx';
import { useFetch } from '../../lib/useFetch.js';
import { t } from '../../i18n/index.jsx';

const KEY = 'bs.portal.student';

export default function PortalLayout() {
  const { data: students, error } = useFetch('/portal/students');
  const [sel, setSel] = useState(() => { try { return Number(localStorage.getItem(KEY)) || null; } catch { return null; } });

  useEffect(() => {
    if (students?.length && !students.some((s) => s.id === sel)) setSel(students[0].id);
  }, [students, sel]);
  useEffect(() => { try { if (sel) localStorage.setItem(KEY, String(sel)); } catch { /* ignore */ } }, [sel]);

  const student = students?.find((s) => s.id === sel) || null;
  const overview = useFetch(student ? `/portal/students/${student.id}/overview` : null);

  const groups = useMemo(() => [{
    label: 'Portal',
    items: [
      { to: '/portal', end: true, label: 'Início', icon: Home },
      { to: '/portal/agenda', label: 'Agenda', icon: CalendarDays },
      { to: '/portal/jornada', label: 'Jornada & frequência', icon: Sparkles },
      { to: '/portal/eventos', label: 'Eventos', icon: Ticket },
      { to: '/portal/financeiro', label: 'Mensalidades', icon: Wallet, count: overview.data?.payments.open.length || 0 },
      { to: '/portal/avisos', label: 'Mural de avisos', icon: Megaphone },
    ],
  }], [overview.data]);

  const switcher = students?.length > 1 && (
    <div className="kid-switch" role="tablist" aria-label={t('Escolher aluno')}>
      {students.map((s) => (
        <button key={s.id} className={s.id === sel ? 'on' : ''} onClick={() => setSel(s.id)} role="tab" aria-selected={s.id === sel}>
          <span className="avatar">{s.name[0]}</span>{s.name.split(' ')[0]}
        </button>
      ))}
    </div>
  );

  if (error) return <div className="content"><ErrorBox error={error} /></div>;
  if (!students) return <Loading />;

  return (
    <AppShell
      groups={groups}
      topRight={switcher}
      context={{ students, student, overview: overview.data, reloadOverview: overview.reload, loading: overview.loading }}
    />
  );
}

export function usePortalReady(ctx) {
  if (!ctx.student) return <div className="card empty">{t('Nenhum aluno vinculado a esta conta. Fale com a recepção.')}</div>;
  if (!ctx.overview) return <Loading />;
  return null;
}
