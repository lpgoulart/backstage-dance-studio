import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Menu, LogOut, ExternalLink } from 'lucide-react';
import { useAuth } from '../lib/auth.jsx';
import { Brand } from './SiteLayout.jsx';
import { Avatar } from './ui.jsx';
import { t, LangSwitch } from '../i18n/index.jsx';

const ROLE_LABEL = { manager: 'Gestão', guardian: 'Responsável', student: 'Aluno(a)', teacher: 'Professor(a)' };

/**
 * groups: [{ label, items: [{ to, label, icon: Icon, end?, count? }] }]
 */
export default function AppShell({ groups, context, topRight }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => { setOpen(false); window.scrollTo(0, 0); }, [pathname]);

  const all = groups.flatMap((g) => g.items);
  const current = [...all].sort((a, b) => b.to.length - a.to.length).find((i) => pathname.startsWith(i.to));

  return (
    <div className="app">
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <Brand />
        {groups.map((g) => (
          <div key={g.label}>
            <div className="side-label">{t(g.label)}</div>
            <nav className="side-nav">
              {g.items.map(({ to, label, icon: Icon, end, count }) => (
                <NavLink key={to} to={to} end={end}><Icon />{t(label)}{count ? <span className="count">{count}</span> : null}</NavLink>
              ))}
            </nav>
          </div>
        ))}
        <div className="side-foot">
          <div className="me">
            <Avatar name={user?.name} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</div>
              <small>{t(ROLE_LABEL[user?.role])}</small>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link to="/" className="btn btn-sm" style={{ flex: 1 }}><ExternalLink size={15} />{t(' Site')}</Link>
            <button className="btn btn-sm" onClick={logout} style={{ flex: 1 }}><LogOut size={15} />{t(' Sair')}</button>
          </div>
        </div>
      </aside>
      <div className="main">
        <header className="topnav">
          <button className="icon-btn menu-btn" onClick={() => setOpen(true)} aria-label={t('Abrir menu')}><Menu /></button>
          <span className="crumb">{t(ROLE_LABEL[user?.role])} <span className="dim">/</span> <span style={{ color: 'var(--text)' }}>{t(current?.label)}</span></span>
          <div className="right">{topRight}<LangSwitch /></div>
        </header>
        <div className="content">
          <Outlet context={context} />
        </div>
      </div>
    </div>
  );
}
