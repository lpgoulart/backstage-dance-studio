import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { get, run } from '../db.js';
import { signToken, requireAuth, required, HttpError } from '../auth.js';

const r = Router();

const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, phone: u.phone });

r.post('/login', (req, res) => {
  required(req.body, ['email', 'password']);
  const user = get(`SELECT * FROM users WHERE email = ?`, String(req.body.email).trim());
  if (!user || !bcrypt.compareSync(String(req.body.password), user.password_hash)) {
    throw new HttpError(401, 'E-mail ou senha incorretos');
  }
  res.json({ token: signToken(user), user: publicUser(user) });
});

r.get('/me', requireAuth, (req, res) => {
  const user = get(`SELECT * FROM users WHERE id = ?`, req.user.id);
  if (!user) throw new HttpError(404, 'Usuário não encontrado');
  res.json(publicUser(user));
});

r.put('/me/password', requireAuth, (req, res) => {
  required(req.body, ['currentPassword', 'newPassword']);
  const user = get(`SELECT * FROM users WHERE id = ?`, req.user.id);
  if (!bcrypt.compareSync(req.body.currentPassword, user.password_hash)) throw new HttpError(400, 'Senha atual incorreta');
  if (String(req.body.newPassword).length < 6) throw new HttpError(400, 'A nova senha precisa de ao menos 6 caracteres');
  run(`UPDATE users SET password_hash = ? WHERE id = ?`, bcrypt.hashSync(req.body.newPassword, 10), user.id);
  res.json({ ok: true });
});

export default r;
