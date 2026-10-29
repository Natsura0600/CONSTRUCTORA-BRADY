const r2 = require('../lib/r2');
const { requireAdmin } = require('../lib/auth');
const { sanitize } = require('../lib/validate');
const { seed } = require('../lib/seed');

const KEY = 'site/data.json';

async function load() {
  if (!r2.configured()) return { data: seed(), stored: false };
  const stored = await r2.getJson(KEY);
  return stored ? { data: stored, stored: true } : { data: seed(), stored: false };
}

module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') {
      const { data, stored } = await load();
      res.setHeader('Cache-Control', req.query && req.query.fresh ? 'no-store' : 'public, s-maxage=10, stale-while-revalidate=60');
      res.status(200).json({ ...data, _meta: { r2: r2.configured(), stored } });
      return;
    }

    if (req.method === 'PUT') {
      if (!requireAdmin(req, res)) return;
      if (!r2.configured()) {
        res.status(503).json({ error: 'R2 no está configurado. Cargá las variables de entorno en Vercel.' });
        return;
      }
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (!body || !body.data) {
        res.status(400).json({ error: 'Faltan datos.' });
        return;
      }
      const current = await r2.getJson(KEY);
      const currentVersion = current ? current.updatedAt || 0 : 0;
      if (Number(body.baseVersion || 0) !== currentVersion) {
        res.status(409).json({
          error: 'Otra persona publicó cambios mientras editabas. Recargá el panel para ver la última versión.'
        });
        return;
      }
      const clean = sanitize(body.data);
      clean.updatedAt = Date.now();
      const text = JSON.stringify(clean);
      if (text.length > 900000) {
        res.status(413).json({ error: 'El contenido es demasiado grande.' });
        return;
      }
      if (current) {
        // Copia de seguridad de la versión anterior, también en R2.
        try {
          await r2.putJson(`site/backups/${currentVersion || Date.now()}.json`, current);
        } catch (e) {
          console.error('backup', e);
        }
      }
      await r2.putJson(KEY, clean);
      res.status(200).json({ ok: true, updatedAt: clean.updatedAt, data: clean });
      return;
    }

    res.setHeader('Allow', 'GET, PUT');
    res.status(405).json({ error: 'Método no permitido' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error del servidor. Revisá los logs en Vercel.' });
  }
};
