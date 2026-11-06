import { Router } from 'express';
import { all, get, run } from '../db.js';
import { required, HttpError } from '../auth.js';
import { readContent } from './public.js';
import { findUnsafeLink, isSafeUrl } from '../security.js';

const r = Router();

/* ───────────── Site content blocks (hero, about, contact, stats, banner…) ───────────── */

export const CONTENT_KEYS = ['hero', 'banner', 'about', 'stats', 'styles', 'contact', 'team', 'timeline', 'testimonials'];

r.get('/content', (req, res) => res.json(readContent()));

r.put('/content/:key', (req, res) => {
  const { key } = req.params;
  if (!CONTENT_KEYS.includes(key)) throw new HttpError(400, `Chave inválida. Use: ${CONTENT_KEYS.join(', ')}`);
  if (req.body?.value === undefined) throw new HttpError(400, 'Envie { "value": ... }');
  const bad = findUnsafeLink(req.body.value);
  if (bad) throw new HttpError(400, `Link inválido em "${bad}": use um caminho do site (ex.: /contato) ou um endereço https://`);
  if (JSON.stringify(req.body.value).length > 50_000) throw new HttpError(400, 'Conteúdo muito longo');
  run(`INSERT INTO site_content (key, value, updated_at) VALUES (?, ?, datetime('now','localtime'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`, key, JSON.stringify(req.body.value));
  res.json({ key, value: req.body.value });
});

/* ───────────── Generic CRUD for simple CMS tables ───────────── */

function crud(path, table, fields, { requiredFields, orderBy, bools = [], extraSelect = '' }) {
  const label = { events: 'Evento', projects: 'Projeto', announcements: 'Aviso' }[table];
  const shape = (row) => {
    if (!row) return row;
    const o = { ...row };
    for (const b of bools) o[b] = !!o[b];
    return o;
  };
  const vals = (b) => fields.map((f) => (bools.includes(f) ? (b[f] ? 1 : 0) : b[f]));

  r.get(path, (req, res) => res.json(all(`SELECT t.* ${extraSelect} FROM ${table} t ORDER BY ${orderBy}`).map(shape)));

  r.get(`${path}/:id`, (req, res) => {
    const row = get(`SELECT t.* ${extraSelect} FROM ${table} t WHERE t.id = ?`, Number(req.params.id));
    if (!row) throw new HttpError(404, `${label} não encontrado`);
    res.json(shape(row));
  });

  const checkUrls = (b) => {
    if (b.image_url !== undefined && !isSafeUrl(b.image_url)) throw new HttpError(400, 'URL de imagem inválida: use um endereço https://');
  };

  r.post(path, (req, res) => {
    required(req.body, requiredFields);
    checkUrls(req.body);
    const b = { published: true, ...req.body };
    const { lastInsertRowid } = run(`INSERT INTO ${table} (${fields.join(',')}) VALUES (${fields.map(() => '?').join(',')})`, ...vals(b));
    res.status(201).json(shape(get(`SELECT * FROM ${table} WHERE id = ?`, Number(lastInsertRowid))));
  });

  r.put(`${path}/:id`, (req, res) => {
    const id = Number(req.params.id);
    const cur = get(`SELECT * FROM ${table} WHERE id = ?`, id);
    if (!cur) throw new HttpError(404, `${label} não encontrado`);
    checkUrls(req.body || {});
    const b = { ...shape(cur), ...req.body };
    run(`UPDATE ${table} SET ${fields.map((f) => `${f} = ?`).join(', ')} WHERE id = ?`, ...vals(b), id);
    res.json(shape(get(`SELECT * FROM ${table} WHERE id = ?`, id)));
  });

  r.delete(`${path}/:id`, (req, res) => {
    const { changes } = run(`DELETE FROM ${table} WHERE id = ?`, Number(req.params.id));
    if (!changes) throw new HttpError(404, `${label} não encontrado`);
    res.status(204).end();
  });
}

crud('/events', 'events', ['title', 'description', 'date', 'time', 'location', 'category', 'image_url', 'published'], {
  requiredFields: ['title', 'date'],
  orderBy: 't.date DESC',
  bools: ['published'],
  extraSelect: `, (SELECT COUNT(*) FROM event_rsvps x WHERE x.event_id = t.id AND x.status='going') going_count,
                 (SELECT COUNT(*) FROM event_rsvps x WHERE x.event_id = t.id AND x.status='maybe') maybe_count`,
});

r.get('/events/:id/rsvps', (req, res) => {
  res.json(all(`SELECT r.status, r.updated_at, s.id student_id, s.name FROM event_rsvps r JOIN students s ON s.id = r.student_id
    WHERE r.event_id = ? ORDER BY r.status, s.name`, Number(req.params.id)));
});

crud('/projects', 'projects', ['title', 'year', 'category', 'description', 'image_url', 'color', 'highlight', 'sort_order'], {
  requiredFields: ['title'],
  orderBy: 't.sort_order, t.year DESC',
  bools: ['highlight'],
});

crud('/announcements', 'announcements', ['title', 'body', 'audience', 'pinned', 'published'], {
  requiredFields: ['title'],
  orderBy: 't.pinned DESC, t.created_at DESC',
  bools: ['pinned', 'published'],
});

/* ───────────── Contact inbox ───────────── */

r.get('/messages', (req, res) => {
  const { status } = req.query;
  res.json(status
    ? all(`SELECT * FROM contact_messages WHERE status = ? ORDER BY created_at DESC`, status)
    : all(`SELECT * FROM contact_messages ORDER BY created_at DESC`));
});

r.patch('/messages/:id', (req, res) => {
  const { status } = req.body || {};
  if (!['new', 'read', 'answered'].includes(status)) throw new HttpError(400, 'Status inválido');
  const { changes } = run(`UPDATE contact_messages SET status = ? WHERE id = ?`, status, Number(req.params.id));
  if (!changes) throw new HttpError(404, 'Mensagem não encontrada');
  res.json(get(`SELECT * FROM contact_messages WHERE id = ?`, Number(req.params.id)));
});

r.delete('/messages/:id', (req, res) => {
  const { changes } = run(`DELETE FROM contact_messages WHERE id = ?`, Number(req.params.id));
  if (!changes) throw new HttpError(404, 'Mensagem não encontrada');
  res.status(204).end();
});

export default r;
