/**
 * Small security helpers: link validation, rate limiting and HTTP security headers.
 * No external dependencies; limits are kept in memory (single instance is enough for this app).
 */

/** Internal site path ("/contato") or an absolute http(s) URL. Rejects javascript:, data:, protocol-relative and backslash tricks. */
export function isSafeLink(v) {
  if (v === undefined || v === null || v === '') return true;
  const s = String(v).trim();
  if (/[\s\\]/.test(s) || s.length > 500) return false;
  return /^\/(?!\/)/.test(s) || /^https?:\/\/[^/]/i.test(s);
}

/** Absolute http(s) URL (for images) */
export function isSafeUrl(v) {
  if (v === undefined || v === null || v === '') return true;
  const s = String(v).trim();
  return s.length <= 1000 && !/[\s\\"'()]/.test(s) && /^https?:\/\/[^/]/i.test(s);
}

/** Every property whose name ends in "link"/"Link" must be a safe link (works for objects and arrays of objects) */
export function findUnsafeLink(value) {
  const walk = (v) => {
    if (Array.isArray(v)) return v.map(walk).find(Boolean);
    if (v && typeof v === 'object') {
      for (const [k, x] of Object.entries(v)) {
        if (/link$/i.test(k) && typeof x === 'string' && !isSafeLink(x)) return k;
        const inner = walk(x);
        if (inner) return inner;
      }
    }
    return null;
  };
  return walk(value);
}

/* ───────── Rate limiting ───────── */

/**
 * Real client IP. In production the API sits behind Cloudflare (Render's edge), which always overwrites
 * CF-Connecting-IP with the visitor's address, so it can't be spoofed there. Locally we fall back to req.ip.
 */
export const clientIp = (req) => String(req.headers['cf-connecting-ip'] || req.ip || 'unknown');

const buckets = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [k, b] of buckets) if (b.reset < now) buckets.delete(k);
}, 60_000).unref();

/** Returns { limited, retryAfter } and counts a hit for `key` */
export function hit(key, max, windowMs) {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || b.reset < now) { b = { count: 0, reset: now + windowMs }; buckets.set(key, b); }
  b.count++;
  return { limited: b.count > max, retryAfter: Math.ceil((b.reset - now) / 1000) };
}

export function isLimited(key, max) {
  const b = buckets.get(key);
  return !!b && b.reset >= Date.now() && b.count >= max ? Math.ceil((b.reset - Date.now()) / 1000) : 0;
}

export const clearHits = (key) => buckets.delete(key);

/** Express middleware: at most `max` requests per `windowMs` per client IP for this route */
export const rateLimit = ({ name, max, windowMs, message }) => (req, res, next) => {
  const r = hit(`${name}:${clientIp(req)}`, max, windowMs);
  if (r.limited) {
    res.setHeader('Retry-After', r.retryAfter);
    return res.status(429).json({ error: message });
  }
  next();
};

/* ───────── Security headers ───────── */

export function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  if (req.secure) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  // JSON responses never need to load anything; Swagger UI (/api/docs) and the bundled site keep their own needs
  if (req.path.startsWith('/api/') && !req.path.startsWith('/api/docs')) {
    res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
  }
  next();
}
