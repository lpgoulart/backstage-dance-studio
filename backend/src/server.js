import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import swaggerUi from 'swagger-ui-express';
import { seedIfEmpty } from './seed.js';
import { openapi } from './openapi.js';
import authRoutes from './routes/auth.js';
import publicRoutes from './routes/public.js';
import portalRoutes from './routes/portal.js';
import adminRoutes from './routes/admin.js';
import teacherRoutes from './routes/teacher.js';
import { langMiddleware } from './i18n.js';
import { securityHeaders } from './security.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 4000);

seedIfEmpty();

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1); // Render/Cloudflare proxy: use the real client IP for rate limits
app.use(securityHeaders);
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') || true }));
app.use(express.json({ limit: '1mb' }));
app.use(langMiddleware);

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));
app.use('/api/auth', authRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/portal', portalRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/teacher', teacherRoutes);

app.get('/api/openapi.json', (req, res) => res.json(openapi));
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapi, {
  customSiteTitle: 'Backstage API · Documentação',
  customCss: `
    .swagger-ui .topbar { background: #0d0b0e; border-bottom: 1px solid #2a2230; }
    .swagger-ui .topbar .download-url-wrapper { display: none; }
    .swagger-ui .info .title { font-family: Georgia, serif; }
    .swagger-ui .info .title small.version-stamp { background: #e8b04b; }
  `,
  swaggerOptions: { persistAuthorization: true, docExpansion: 'none', filter: true, tagsSorter: 'alpha' },
}));

app.use('/api', (req, res) => res.status(404).json({ error: 'Rota não encontrada' }));

// Serve the built frontend in production (npm run build in /frontend)
const dist = path.resolve(__dirname, '..', '..', 'frontend', 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^\/(?!api).*/, (req, res) => res.sendFile(path.join(dist, 'index.html')));
}

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.status || (err.type === 'entity.parse.failed' ? 400 : 500);
  if (status >= 500) console.error(err);
  const message = status >= 500 ? 'Erro interno do servidor' : err.type === 'entity.parse.failed' ? 'JSON inválido' : err.message;
  res.status(status).json({ error: message });
});

app.listen(PORT, () => {
  console.log(`🎭 Backstage API em http://localhost:${PORT}`);
  console.log(`📚 Documentação (Swagger) em http://localhost:${PORT}/api/docs`);
});
