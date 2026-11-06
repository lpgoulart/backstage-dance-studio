import jwt from 'jsonwebtoken';
import { get } from './db.js';

const IN_PRODUCTION = process.env.NODE_ENV === 'production' || !!process.env.RENDER;

// A public default secret would let anyone forge tokens, so production refuses to start without a real one
if (!process.env.JWT_SECRET && IN_PRODUCTION) {
  throw new Error('JWT_SECRET must be set in production');
}
export const JWT_SECRET = process.env.JWT_SECRET || 'backstage-dev-secret-change-me';

/** Sessions are short-lived; the account is re-checked on every request (see requireAuth) */
export const SESSION_TTL = '12h';

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const signToken = (user) =>
  jwt.sign({ sub: user.id, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: SESSION_TTL, algorithm: 'HS256' });

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Não autenticado' });
  let p;
  try {
    p = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    return res.status(401).json({ error: 'Sessão expirada. Faça login novamente.' });
  }
  // A valid signature is not enough: the account must still exist with the same role
  // (deleted users and revoked teacher logins lose access immediately)
  const user = get(`SELECT id, name, role FROM users WHERE id = ?`, Number(p.sub));
  if (!user || user.role !== p.role) return res.status(401).json({ error: 'Sessão expirada. Faça login novamente.' });
  req.user = { id: user.id, role: user.role, name: user.name };
  next();
}

export const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user?.role) ? next() : res.status(403).json({ error: 'Acesso negado' });

/** Throws 400 when any of the listed fields is empty */
export function required(body, fields) {
  const missing = fields.filter((f) => body?.[f] === undefined || body?.[f] === null || body?.[f] === '');
  if (missing.length) throw new HttpError(400, `Campos obrigatórios: ${missing.join(', ')}`);
}
