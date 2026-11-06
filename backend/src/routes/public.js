import { Router } from 'express';
import { all, run, today } from '../db.js';
import { required, HttpError } from '../auth.js';
import { rateLimit } from '../security.js';
import { attachSchedules, parseJson } from '../services.js';

const r = Router();

/** Site content blocks, exactly as entered by the manager */
export function readContent() {
  const out = {};
  for (const row of all(`SELECT key, value FROM site_content`)) out[row.key] = parseJson(row.value, row.value);
  // The "Equipe" section is driven by the teachers module (active + visible on site)
  const team = all(`SELECT name, specialties FROM teachers WHERE status = 'active' AND show_on_site = 1 ORDER BY hired_at, name`);
  if (team.length) out.team = team.map((t) => ({ name: t.name, role: t.specialties || '' }));
  return out;
}

r.get('/content', (req, res) => res.json(readContent()));

r.get('/events', (req, res) => {
  const { when } = req.query; // upcoming | past | all
  const t = today();
  let where = 'published = 1';
  if (when === 'upcoming') where += ` AND date >= '${t}'`;
  if (when === 'past') where += ` AND date < '${t}'`;
  const order = when === 'past' ? 'date DESC' : 'date ASC';
  res.json(all(`SELECT id, title, description, date, time, location, category, image_url FROM events WHERE ${where} ORDER BY ${order}`));
});

r.get('/projects', (req, res) => {
  res.json(all(`SELECT * FROM projects ORDER BY sort_order, year DESC`).map((p) => ({ ...p, highlight: !!p.highlight })));
});

r.get('/announcements', (req, res) => {
  res.json(all(`SELECT id, title, body, pinned, created_at FROM announcements
    WHERE published = 1 AND audience = 'public' ORDER BY pinned DESC, created_at DESC`).map((a) => ({ ...a, pinned: !!a.pinned })));
});

r.get('/schedule', (req, res) => {
  const classes = attachSchedules(all(
    `SELECT id, name, style, level, teacher, room, color, description FROM classes WHERE active = 1 ORDER BY style, name`));
  res.json(classes);
});

const LIMITS = { name: 120, email: 160, phone: 40, interest: 60, message: 3000 };

r.post('/contact',
  rateLimit({ name: 'contact', max: 5, windowMs: 60 * 60_000, message: 'Você já enviou várias mensagens. Tente novamente mais tarde.' }),
  (req, res) => {
  required(req.body, ['name', 'message']);
  const f = {};
  for (const [k, max] of Object.entries(LIMITS)) {
    const v = req.body[k] === undefined || req.body[k] === null ? '' : String(req.body[k]).trim();
    if (v.length > max) throw new HttpError(400, k === 'message' ? 'Mensagem muito longa' : 'Campo muito longo');
    f[k] = v || null;
  }
  if (!f.name || !f.message) throw new HttpError(400, 'Campos obrigatórios: name, message');
  if (!f.email && !f.phone) throw new HttpError(400, 'Informe e-mail ou telefone para retornarmos o contato');
  if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) throw new HttpError(400, 'E-mail inválido');
  const { lastInsertRowid } = run(
    `INSERT INTO contact_messages (name, email, phone, interest, message) VALUES (?,?,?,?,?)`,
    f.name, f.email, f.phone, f.interest, f.message);
  res.status(201).json({ id: Number(lastInsertRowid), ok: true });
});

export default r;
