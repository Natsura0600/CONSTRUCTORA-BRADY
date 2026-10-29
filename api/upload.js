const crypto = require('crypto');
const r2 = require('../lib/r2');
const { requireAdmin } = require('../lib/auth');

const MAX = 4 * 1024 * 1024;

function sniff(buf) {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: 'jpg', type: 'image/jpeg' };
  if (buf.slice(0, 8).toString('hex') === '89504e470d0a1a0a') return { ext: 'png', type: 'image/png' };
  if (buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP') return { ext: 'webp', type: 'image/webp' };
  if (buf.slice(4, 12).toString() === 'ftypavif') return { ext: 'avif', type: 'image/avif' };
  if (buf.slice(0, 5).toString() === '%PDF-') return { ext: 'pdf', type: 'application/pdf' };
  return null;
}

function readBody(req) {
  if (Buffer.isBuffer(req.body)) return Promise.resolve(req.body);
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX) {
        reject(Object.assign(new Error('big'), { code: 'BIG' }));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }
  if (!requireAdmin(req, res)) return;
  if (!r2.configured()) {
    res.status(503).json({ error: 'R2 no está configurado.' });
    return;
  }
  try {
    const buf = await readBody(req);
    if (buf.length > MAX) {
      res.status(413).json({ error: 'El archivo pesa más de 4 MB.' });
      return;
    }
    const kind = sniff(buf);
    if (!kind) {
      res.status(415).json({ error: 'Formato no admitido. Subí JPG, PNG, WebP, AVIF o PDF.' });
      return;
    }
    const key = `uploads/${new Date().getFullYear()}/${crypto.randomBytes(9).toString('hex')}.${kind.ext}`;
    await r2.putObject(key, buf, kind.type);
    const pub = (process.env.R2_PUBLIC_URL || '').replace(/\/+$/, '');
    const url = pub ? `${pub}/${key}` : `/api/img?k=${encodeURIComponent(key)}`;
    res.status(200).json({ url, key, type: kind.type });
  } catch (e) {
    if (e && e.code === 'BIG') {
      res.status(413).json({ error: 'El archivo pesa más de 4 MB.' });
      return;
    }
    console.error(e);
    res.status(500).json({ error: 'No se pudo subir el archivo.' });
  }
};
