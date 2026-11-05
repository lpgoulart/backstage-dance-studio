import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, LogIn } from 'lucide-react';
import { useAuth, homeFor } from '../lib/auth.jsx';
import { Brand } from '../components/SiteLayout.jsx';
import { SplitHeading } from '../components/motion.jsx';
import { t, LangSwitch } from '../i18n/index.jsx';

// Demo accounts created by the backend seed (development only)
const DEMOS = [
  { label: 'Gestão do estúdio', email: 'admin@backstage.com' },
  { label: 'Professora (Carolina Reis)', email: 'professora@backstage.com' },
  { label: 'Responsável (2 filhos)', email: 'responsavel@backstage.com' },
  { label: 'Aluna adulta', email: 'aluna@backstage.com' },
];

export default function Login() {
  const { user, login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={homeFor(user.role)} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const u = await login(email, password);
      const from = loc.state?.from;
      const allowed = from && from.startsWith(homeFor(u.role));
      nav(allowed ? from : homeFor(u.role), { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login">
      <div className="login-art grain">
        <Brand />
        <div>
          <SplitHeading as="h2" text={t('Bem-vindo aos *bastidores*.')} delay={0.1} />
          <p className="muted" style={{ marginTop: 22, maxWidth: 420 }}>
            {t('Alunos e responsáveis acompanham agenda, frequência e conquistas. Professores fazem a chamada e o diário de aula. A gestão cuida de tudo.')}
          </p>
        </div>
        <span className="dim" style={{ fontSize: 13 }}>{t('Backstage Studio de Dança · Manaus')}</span>
      </div>
      <div className="login-form">
        <motion.form className="login-box" onSubmit={submit} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}><Link to="/" className="muted" style={{ display: 'inline-flex', gap: 6, alignItems: 'center', fontSize: 14 }}><ArrowLeft size={16} />{t(' Voltar ao site')}</Link><LangSwitch /></div>
          <div>
            <span className="eyebrow">{t('Área restrita')}</span>
            <h1 style={{ marginTop: 14 }}>{t('Entrar')}</h1>
          </div>
          <label className="field"><span>{t('E-mail')}</span>
            <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
          </label>
          <label className="field"><span>{t('Senha')}</span>
            <input className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </label>
          {error && <p className="error-text">{error}</p>}
          <button className="btn btn-primary" disabled={busy}>{busy ? t('Entrando…') : t('Entrar')} <LogIn /></button>

          <div style={{ marginTop: 14 }}>
            <span className="dim" style={{ fontSize: 12, letterSpacing: '.14em', textTransform: 'uppercase' }}>{t('Contas de demonstração · senha backstage123')}</span>
            <div className="demo-list">
              {DEMOS.map((d) => (
                <button type="button" key={d.email} className="demo-btn" onClick={() => { setEmail(d.email); setPassword('backstage123'); }}>
                  <span>{t(d.label)}<small>{d.email}</small></span><span className="gold">{t('usar →')}</span>
                </button>
              ))}
            </div>
          </div>
        </motion.form>
      </div>
    </div>
  );
}
