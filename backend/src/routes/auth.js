import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { get, run } from '../db.js';
import { signToken, requireAuth, required, HttpError } from '../auth.js';
import { hit, isLimited, clearHits, rateLimit, clientIp } from '../security.js';

const r = Router();

const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, phone: u.phone });

// Compared when the email doesn't exist, so both cases take the same time (no account enumeration by timing)
const DUMMY_HASH = bcrypt.hashSync('timing-equalizer-not-a-password', 10);

const FAIL_MAX = 5;                 // wrong passwords per account+IP
const FAIL_WINDOW = 15 * 60_000;    // 15 minutes
const TOO_MANY = 'Muitas tentativas. Tente novamente em alguns minutos.';

r.post('/login',
  rateLimit({ name: 'login-ip', max: 30, windowMs: FAIL_WINDOW, message: TOO_MANY }),
  (req, res) => {
    required(req.body, ['email', 'password']);
    const email = String(req.body.email).trim().toLowerCase().slice(0, 200);
    const key = `login-fail:${clientIp(req)}:${email}`;
    const wait = isLimited(key, FAIL_MAX);
    if (wait) {
      res.setHeader('Retry-After', wait);
      throw new HttpError(429, TOO_MANY);
    }
    const user = get(`SELECT * FROM users WHERE email = ?`, email);
    const ok = bcrypt.compareSync(String(req.body.password).slice(0, 200), user ? user.password_hash : DUMMY_HASH);
    if (!user || !ok) {
      hit(key, FAIL_MAX, FAIL_WINDOW);
      throw new HttpError(401, 'E-mail ou senha incorretos');
    }
    clearHits(key);
    res.json({ token: signToken(user), user: publicUser(user) });
  });

r.get('/me', requireAuth, (req, res) => {
  const user = get(`SELECT * FROM users WHERE id = ?`, req.user.id);
  if (!user) throw new HttpError(404, 'Usuário não encontrado');
  res.json(publicUser(user));
});

r.put('/me/password', requireAuth,
  rateLimit({ name: 'password-change', max: 10, windowMs: FAIL_WINDOW, message: TOO_MANY }),
  (req, res) => {
    required(req.body, ['currentPassword', 'newPassword']);
    const user = get(`SELECT * FROM users WHERE id = ?`, req.user.id);
    if (!bcrypt.compareSync(String(req.body.currentPassword), user.password_hash)) throw new HttpError(400, 'Senha atual incorreta');
    const next = String(req.body.newPassword);
    if (next.length < 6) throw new HttpError(400, 'A nova senha precisa de ao menos 6 caracteres');
    if (next.length > 200) throw new HttpError(400, 'Senha muito longa');
    run(`UPDATE users SET password_hash = ? WHERE id = ?`, bcrypt.hashSync(next, 10), user.id);
    res.json({ ok: true });
  });

export default r;
