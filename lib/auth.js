const crypto = require('crypto');

const TTL = 12 * 60 * 60 * 1000;

function secret() {
  return process.env.ADMIN_SECRET || 'k:' + (process.env.ADMIN_PASSWORD || '');
}

function hmac(payload) {
  return crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
}

function sha(s) {
  return crypto.createHash('sha256').update(String(s)).digest();
}

function checkPassword(pw) {
  const real = process.env.ADMIN_PASSWORD;
  if (!real || typeof pw !== 'string') return false;
  return crypto.timingSafeEqual(sha(pw), sha(real));
}

function issue() {
  const exp = String(Date.now() + TTL);
  return exp + '.' + hmac(exp);
}

function verify(token) {
  if (!process.env.ADMIN_PASSWORD || typeof token !== 'string') return false;
  const [exp, sig] = token.split('.');
  if (!exp || !sig) return false;
  const good = hmac(exp);
  const a = Buffer.from(sig);
  const b = Buffer.from(good);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  return Number(exp) > Date.now();
}

function requireAdmin(req, res) {
  const h = req.headers['authorization'] || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (verify(token)) return true;
  res.status(401).json({ error: 'Sesión vencida. Volvé a ingresar.' });
  return false;
}

module.exports = { checkPassword, issue, verify, requireAdmin };
