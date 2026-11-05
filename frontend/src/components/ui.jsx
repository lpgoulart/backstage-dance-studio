import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, CheckCircle2, AlertCircle } from 'lucide-react';
import { initials, PAYMENT_STATUS } from '../lib/format.js';
import { t } from '../i18n/index.jsx';

/* Toasts */
const ToastCtx = createContext(() => {});
export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((msg, type = 'ok') => {
    const id = Math.random();
    setItems((x) => [...x, { id, msg, type }]);
    setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), 3200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        <AnimatePresence>
          {items.map((t) => (
            <motion.div key={t.id} className={`toast ${t.type === 'err' ? 'err' : ''}`} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
              {t.type === 'err' ? <AlertCircle /> : <CheckCircle2 />}{t.msg}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

/* Side drawer */
export function Drawer({ open, onClose, title, children, footer }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
          <motion.aside className="drawer" role="dialog" aria-modal="true" aria-label={title}
            initial={{ x: 60, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 60, opacity: 0 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
            <div className="drawer-head">
              <h2>{title}</h2>
              <button className="icon-btn" onClick={onClose} aria-label={t('Fechar')}><X /></button>
            </div>
            <div className="drawer-body">{children}</div>
            {footer && <div className="drawer-foot">{footer}</div>}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export const Field = ({ label, children }) => <label className="field"><span>{label}</span>{children}</label>;

export const Avatar = ({ name, lg }) => <span className={`avatar ${lg ? 'lg' : ''}`}>{initials(name)}</span>;

export function PayBadge({ status }) {
  const cls = { paid: 'ok', pending: 'warn', overdue: 'bad' }[status];
  return <span className={`badge ${cls}`}>{PAYMENT_STATUS[status]}</span>;
}

export const StatusBadge = ({ status }) =>
  <span className={`badge ${status === 'active' ? 'ok' : ''}`}>{status === 'active' ? t('Ativo') : t('Inativo')}</span>;

export const ClassTag = ({ c }) => <span className="tag" style={{ '--c': c.color }}><i />{c.name}</span>;

export function Loading() {
  return <div className="app-loading" style={{ minHeight: 300 }}><span className="spinner" /></div>;
}

export function ErrorBox({ error }) {
  if (!error) return null;
  return <div className="card error-text">{t('Não foi possível carregar:')} {error.message}</div>;
}

export const Bar = ({ pct, rose }) => <div className={`bar ${rose ? 'rose' : ''}`}><i style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} /></div>;
