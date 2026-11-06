import { useMemo } from 'react';
import { LayoutDashboard, Users, Layers, GraduationCap, NotebookPen, Trophy, CalendarRange, ClipboardCheck, Wallet, Globe, Inbox, FileCode2 } from 'lucide-react';
import AppShell from '../../components/AppShell.jsx';
import { useFetch } from '../../lib/useFetch.js';
import { API_DOCS_URL } from '../../lib/api.js';
import { t } from '../../i18n/index.jsx';

export default function AdminLayout() {
  const msgs = useFetch('/admin/messages?status=new');
  const groups = useMemo(() => [
    {
      label: 'Visão geral',
      items: [{ to: '/gestao', end: true, label: 'Dashboard', icon: LayoutDashboard }],
    },
    {
      label: 'Escola',
      items: [
        { to: '/gestao/alunos', label: 'Alunos', icon: Users },
        { to: '/gestao/turmas', label: 'Turmas', icon: Layers },
        { to: '/gestao/professores', label: 'Professores', icon: GraduationCap },
        { to: '/gestao/diarios', label: 'Diários de aula', icon: NotebookPen },
        { to: '/gestao/grade', label: 'Grade semanal', icon: CalendarRange },
        { to: '/gestao/chamada', label: 'Chamada', icon: ClipboardCheck },
        { to: '/gestao/financeiro', label: 'Financeiro', icon: Wallet },
        { to: '/gestao/conquistas', label: 'Conquistas', icon: Trophy },
      ],
    },
    {
      label: 'Site',
      items: [
        { to: '/gestao/site', label: 'Conteúdo do site', icon: Globe },
        { to: '/gestao/mensagens', label: 'Mensagens', icon: Inbox, count: msgs.data?.length || 0 },
      ],
    },
  ], [msgs.data]);

  return (
    <AppShell
      groups={groups}
      context={{ refreshInbox: msgs.reload }}
      topRight={<a href={API_DOCS_URL} target="_blank" rel="noreferrer" className="btn btn-sm btn-ghost"><FileCode2 size={15} />{t(' API docs')}</a>}
    />
  );
}
