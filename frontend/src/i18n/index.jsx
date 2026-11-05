import { createContext, Fragment, useContext, useEffect, useState } from 'react';
import en from './en.js';

/**
 * Tiny i18n layer. Portuguese is the source language and the default:
 * keys ARE the Portuguese strings, so `t('Início')` renders "Início" in PT and en['Início'] in EN.
 * Values coming from the database (levels, categories, styles…) can go through t() too.
 * Variables: t('{n} alunos', { n: 3 }).
 */

const STORAGE_KEY = 'bs.lang';
export const LANGS = [
  { code: 'pt', label: 'PT', name: 'Português' },
  { code: 'en', label: 'EN', name: 'English' },
];

function initialLang() {
  try {
    const q = new URLSearchParams(window.location.search).get('lang');
    if (q === 'en' || q === 'pt') { localStorage.setItem(STORAGE_KEY, q); return q; }
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'pt') return saved;
  } catch { /* storage unavailable */ }
  return 'pt';
}

let current = initialLang();
const missing = new Set();

export const getLang = () => current;
export const locale = () => (current === 'en' ? 'en-US' : 'pt-BR');

export function t(key, vars) {
  if (key === null || key === undefined || key === '') return key;
  const s = String(key);
  const [, lead, core, trail] = s.match(/^(\s*)([\s\S]*?)(\s*)$/);
  let out = core;
  if (current === 'en') {
    if (en[core] !== undefined) out = en[core];
    else if (import.meta.env.DEV && core && !missing.has(core)) { missing.add(core); window.__i18nMissing = [...missing]; }
  }
  if (vars) out = out.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''));
  return lead + out + trail;
}

/** Renders "Texto com *destaque*" → Texto com <em>destaque</em> */
export function rich(str) {
  return String(str).split(/(\*[^*]+\*)/).map((part, i) =>
    part.startsWith('*') && part.endsWith('*') ? <em key={i}>{part.slice(1, -1)}</em> : part);
}

const Ctx = createContext({ lang: current, setLang: () => {} });

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(current);
  useEffect(() => { document.documentElement.lang = lang === 'en' ? 'en' : 'pt-BR'; }, [lang]);
  const setLang = (l) => {
    if (l === current) return;
    current = l;
    try { localStorage.setItem(STORAGE_KEY, l); } catch { /* ignore */ }
    setLangState(l);
  };
  // Re-mount the tree on language change so every t() call re-renders
  return <Ctx.Provider value={{ lang, setLang }}><Fragment key={lang}>{children}</Fragment></Ctx.Provider>;
}

export const useLang = () => useContext(Ctx);

export function LangSwitch({ className = '' }) {
  const { lang, setLang } = useLang();
  return (
    <div className={`lang-switch ${className}`} role="group" aria-label={t('Idioma')}>
      {LANGS.map((l) => (
        <button key={l.code} type="button" className={lang === l.code ? 'on' : ''} aria-pressed={lang === l.code}
          title={l.name} lang={l.code} onClick={() => setLang(l.code)}>{l.label}</button>
      ))}
    </div>
  );
}
