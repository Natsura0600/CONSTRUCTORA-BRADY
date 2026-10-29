const r2 = require('../lib/r2');

const KEY_RE = /^uploads\/\d{4}\/[a-f0-9]{18}\.(jpg|png|webp|avif|pdf)$/;

module.exports = async (req, res) => {
  const key = req.query && req.query.k;
  if (typeof key !== 'string' || !KEY_RE.test(key)) {
    res.status(400).send('Solicitud inválida');
    return;
  }
  if (!r2.configured()) {
    res.status(503).send('R2 no configurado');
    return;
  }
  try {
    const obj = await r2.getObject(key);
    if (!obj) {
      res.status(404).send('No encontrado');
      return;
    }
    const bytes = Buffer.from(await obj.Body.transformToByteArray());
    res.setHeader('Content-Type', obj.ContentType || 'application/octet-stream');
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.status(200).send(bytes);
  } catch (e) {
    console.error(e);
    res.status(500).send('Error');
  }
};
