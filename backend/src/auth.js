import jwt from 'jsonwebtoken';

export const JWT_SECRET = process.env.JWT_SECRET || 'backstage-dev-secret-change-me';

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const signToken = (user) =>
  jwt.sign({ sub: user.id, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '7d' });

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Não autenticado' });
  try {
    const p = jwt.verify(token, JWT_SECRET);
    req.user = { id: p.sub, role: p.role, name: p.name };
    next();
  } catch {
    res.status(401).json({ error: 'Sessão expirada. Faça login novamente.' });
  }
}

export const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user?.role) ? next() : res.status(403).json({ error: 'Acesso negado' });

/** Throws 400 when any of the listed fields is empty */
export function required(body, fields) {
  const missing = fields.filter((f) => body?.[f] === undefined || body?.[f] === null || body?.[f] === '');
  if (missing.length) throw new HttpError(400, `Campos obrigatórios: ${missing.join(', ')}`);
}
