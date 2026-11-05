import { Router } from 'express';
import { all, run, today } from '../db.js';
import { required, HttpError } from '../auth.js';
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

r.post('/contact', (req, res) => {
  required(req.body, ['name', 'message']);
  const { name, email, phone, interest, message } = req.body;
  if (!email && !phone) throw new HttpError(400, 'Informe e-mail ou telefone para retornarmos o contato');
  if (String(message).length > 3000) throw new HttpError(400, 'Mensagem muito longa');
  const { lastInsertRowid } = run(
    `INSERT INTO contact_messages (name, email, phone, interest, message) VALUES (?,?,?,?,?)`,
    String(name).trim(), email, phone, interest, String(message).trim());
  res.status(201).json({ id: Number(lastInsertRowid), ok: true });
});

export default r;
