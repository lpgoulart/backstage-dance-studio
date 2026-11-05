import { useMemo } from 'react';
import { LayoutDashboard, Layers, ClipboardCheck, NotebookPen, UserRound } from 'lucide-react';
import AppShell from '../../components/AppShell.jsx';
import { useFetch } from '../../lib/useFetch.js';
import { ErrorBox } from '../../components/ui.jsx';

export default function TeacherLayout() {
  const dash = useFetch('/teacher/dashboard');
  const groups = useMemo(() => [{
    label: 'Área do professor',
    items: [
      { to: '/professor', end: true, label: 'Painel', icon: LayoutDashboard },
      { to: '/professor/turmas', label: 'Minhas turmas', icon: Layers },
      { to: '/professor/chamada', label: 'Chamada', icon: ClipboardCheck, count: dash.data?.pending.length || 0 },
      { to: '/professor/diario', label: 'Diário de aula', icon: NotebookPen },
      { to: '/professor/perfil', label: 'Meu perfil', icon: UserRound },
    ],
  }], [dash.data]);

  if (dash.error) return <div className="content"><ErrorBox error={dash.error} /></div>;
  return <AppShell groups={groups} context={{ dash: dash.data, reloadDash: dash.reload }} />;
}
