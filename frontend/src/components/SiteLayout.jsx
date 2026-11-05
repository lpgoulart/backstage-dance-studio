import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X, ArrowUpRight, Instagram, MessageCircle, Mail, MapPin } from 'lucide-react';
import { useFetch } from '../lib/useFetch.js';
import { useAuth, homeFor } from '../lib/auth.jsx';
import { API_DOCS_URL } from '../lib/api.js';
import { t, LangSwitch } from '../i18n/index.jsx';

const LINKS = [
  ['/', 'Início'],
  ['/sobre', 'Sobre'],
  ['/projetos', 'Projetos'],
  ['/eventos', 'Eventos'],
  ['/horarios', 'Horários'],
  ['/contato', 'Contato'],
];

export function Brand() {
  return (
    <Link to="/" className="brand" aria-label={t('Backstage Studio de Dança — início')}>
      <span className="brand-mark">B</span>
      <span>
        <span className="brand-name">Backstage</span>
        <span className="brand-sub">{t('Studio de Dança')}</span>
      </span>
    </Link>
  );
}

// Decided once per page load so StrictMode double-renders don't hide it
let curtainPlayed = false;
const SHOW_CURTAIN = (() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  try {
    if (sessionStorage.getItem('bs.curtain')) return false;
    sessionStorage.setItem('bs.curtain', '1');
  } catch { /* storage unavailable: still play once */ }
  return window.location.pathname.replace(/\/$/, '') === import.meta.env.BASE_URL.replace(/\/$/, '');
})();

function Curtain() {
  const [show, setShow] = useState(SHOW_CURTAIN && !curtainPlayed);
  curtainPlayed = true;
  useEffect(() => {
    if (!show) return;
    const t = setTimeout(() => setShow(false), 2000);
    return () => clearTimeout(t);
  }, [show]);
  if (!show) return null;
  const ease = [0.76, 0, 0.24, 1];
  return (
    <div className="curtain" aria-hidden="true">
      <motion.div className="curtain-panel" initial={{ x: 0 }} animate={{ x: '-101%' }} transition={{ duration: 1.1, ease, delay: 0.75 }} />
      <motion.div className="curtain-panel" initial={{ x: 0 }} animate={{ x: '101%' }} transition={{ duration: 1.1, ease, delay: 0.75 }} />
      <motion.div className="curtain-title" initial={{ opacity: 0, y: 12 }} animate={{ opacity: [0, 1, 1, 0], y: 0 }}
        transition={{ duration: 1.3, times: [0, 0.35, 0.7, 1] }}>
        Backstage
      </motion.div>
    </div>
  );
}

export default function SiteLayout() {
  const { pathname } = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { data: content } = useFetch('/public/content');
  const { user } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); setOpen(false); }, [pathname]);

  const banner = content?.banner;
  const contact = content?.contact || {};
  const portalLink = user ? homeFor(user.role) : '/entrar';

  return (
    <>
      <Curtain />
      {banner?.enabled && banner.text && (
        <Link to={banner.link || '/contato'} className="topbar">{banner.text}<span>→</span></Link>
      )}
      <header className={`nav ${scrolled ? 'scrolled' : ''}`}>
        <div className="container nav-inner">
          <Brand />
          <nav className="nav-links" aria-label={t('Principal')}>
            {LINKS.map(([to, label]) => <NavLink key={to} to={to} end={to === '/'}>{t(label)}</NavLink>)}
          </nav>
          <div className="nav-cta" style={{ gap: 8, alignItems: 'center' }}>
            <LangSwitch />
            <Link to={portalLink} className="btn btn-ghost btn-sm">{user ? t('Minha área') : t('Área do aluno')}</Link>
            <Link to="/contato" className="btn btn-light btn-sm">{t('Aula experimental')}</Link>
          </div>
          <LangSwitch className="nav-lang-m" />
          <button className="icon-btn nav-toggle" onClick={() => setOpen(true)} aria-label={t('Abrir menu')}><Menu /></button>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div className="mobile-menu" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
            <div className="top"><Brand /><button className="icon-btn" onClick={() => setOpen(false)} aria-label={t('Fechar menu')}><X /></button></div>
            <nav>
              {LINKS.map(([to, label], i) => (
                <motion.div key={to} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i + 0.1 }}>
                  <NavLink to={to} end={to === '/'}>{t(label)}</NavLink>
                </motion.div>
              ))}
            </nav>
            <div className="bottom">
              <LangSwitch className="lg" />
              <Link to={portalLink} className="btn">{user ? t('Minha área') : t('Área do aluno')}</Link>
              <Link to="/contato" className="btn btn-primary">{t('Agendar aula experimental')}</Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.main key={pathname} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
        <Outlet context={{ content }} />
      </motion.main>

      <footer className="footer">
        <div className="container">
          <div className="footer-grid">
            <div>
              <Brand />
              <p className="muted" style={{ marginTop: 20, maxWidth: 340, fontSize: 14.5 }}>
                {t('Há 18 anos impactando vidas, realizando sonhos e construindo amizades através da dança. Manaus · AM.')}
              </p>
            </div>
            <div>
              <h4>{t('Navegue')}</h4>
              <ul>{LINKS.map(([to, label]) => <li key={to}><Link to={to}>{t(label)}</Link></li>)}</ul>
            </div>
            <div>
              <h4>{t('Contato')}</h4>
              <ul>
                {contact.whatsapp && <li><a href={`https://wa.me/${contact.whatsapp}`} target="_blank" rel="noreferrer"><MessageCircle size={14} style={{ display: 'inline', marginRight: 6 }} />{t('WhatsApp')}</a></li>}
                {contact.instagram && <li><a href={`https://www.instagram.com/${contact.instagram}/`} target="_blank" rel="noreferrer"><Instagram size={14} style={{ display: 'inline', marginRight: 6 }} />@{contact.instagram}</a></li>}
                {contact.email && <li><a href={`mailto:${contact.email}`}><Mail size={14} style={{ display: 'inline', marginRight: 6 }} />{t('E-mail')}</a></li>}
                {contact.address && <li><MapPin size={14} style={{ display: 'inline', marginRight: 6 }} />{contact.address}</li>}
              </ul>
            </div>
            <div>
              <h4>{t('Sistema')}</h4>
              <ul>
                <li><Link to="/entrar">{t('Portal do aluno')}</Link></li>
                <li><Link to="/entrar">{t('Área da gestão')}</Link></li>
                <li><a href={API_DOCS_URL} target="_blank" rel="noreferrer">{t('API ')}<ArrowUpRight size={13} style={{ display: 'inline' }} /></a></li>
              </ul>
            </div>
          </div>
          <div className="footer-word" aria-hidden="true">Backstage</div>
          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} Backstage Studio de Dança · Manaus/AM</span>
            <span>{contact.hours}</span>
          </div>
        </div>
      </footer>
    </>
  );
}
