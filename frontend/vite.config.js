import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Backend origin allowed in the Content Security Policy (production build only)
const apiOrigin = (() => {
  try { return new URL(process.env.VITE_API_URL).origin; } catch { return ''; }
})();

/**
 * Content Security Policy for the published site (GitHub Pages can't send headers, so it goes in a <meta> tag).
 * Scripts only from this site: blocks injected inline code and javascript: links even if bad content gets saved.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: https:",
  `connect-src 'self'${apiOrigin ? ` ${apiOrigin}` : ''}`,
  'frame-src https://www.google.com',
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const cspPlugin = {
  name: 'backstage-csp',
  apply: 'build',
  transformIndexHtml: (html) =>
    html.replace('<head>', `<head>\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />\n    <meta name="referrer" content="strict-origin-when-cross-origin" />`),
};

export default defineConfig({
  // GitHub Pages serves the site under /<repository>/ — set VITE_BASE at build time
  base: process.env.VITE_BASE || '/',
  plugins: [react(), cspPlugin],
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:4000' },
  },
});
