const { checkPassword, issue } = require('../lib/auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }
  if (!process.env.ADMIN_PASSWORD) {
    res.status(503).json({ error: 'Falta definir ADMIN_PASSWORD en Vercel.' });
    return;
  }
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (e) {
      body = {};
    }
  }
  const ok = checkPassword(body && body.password);
  if (!ok) {
    // Frena un poco la fuerza bruta.
    await new Promise((r) => setTimeout(r, 900));
    res.status(401).json({ error: 'Contraseña incorrecta.' });
    return;
  }
  res.status(200).json({ token: issue() });
};
