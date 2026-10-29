const STATUS = ['available', 'reserved', 'sold'];
const SHAPES = ['slab', 'stepped', 'twin', 'point'];

const str = (v, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const num = (v, min, max, def = 0) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return def;
  return Math.min(max, Math.max(min, n));
};
const color = (v, def) => (typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v) ? v.toLowerCase() : def);
const bool = (v) => v === true;

// Solo rutas propias (/img, /api/img) o https. Nunca javascript: ni data:.
function url(v) {
  const s = str(v, 600);
  if (!s) return '';
  if (/^\/(img|api\/img)\b/.test(s)) return s;
  if (/^https:\/\/[^\s"'<>]+$/i.test(s)) return s;
  return '';
}

function id(v, prefix) {
  const s = str(v, 40).replace(/[^a-zA-Z0-9_-]/g, '');
  return s || prefix + Math.random().toString(36).slice(2, 9);
}

function date(v) {
  const s = str(v, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : new Date().toISOString().slice(0, 10);
}

function unit(u) {
  u = u || {};
  return {
    id: id(u.id, 'u'),
    code: str(u.code, 20),
    floor: num(u.floor, 0, 99, 1),
    type: str(u.type, 40),
    bedrooms: num(u.bedrooms, 0, 10, 1),
    bathrooms: num(u.bathrooms, 0, 10, 1),
    area: num(u.area, 0, 5000, 0),
    coveredArea: num(u.coveredArea, 0, 5000, 0),
    balcony: num(u.balcony, 0, 500, 0),
    orientation: str(u.orientation, 30),
    price: num(u.price, 0, 1e9, 0),
    currency: u.currency === 'ARS' ? 'ARS' : 'USD',
    status: STATUS.includes(u.status) ? u.status : 'available',
    description: str(u.description, 600),
    photos: (Array.isArray(u.photos) ? u.photos : []).slice(0, 12).map(url).filter(Boolean),
    plan: url(u.plan)
  };
}

function tower(t) {
  t = t || {};
  return {
    id: id(t.id, 't'),
    name: str(t.name, 60) || 'Torre',
    shape: SHAPES.includes(t.shape) ? t.shape : 'slab',
    address: str(t.address, 120),
    description: str(t.description, 700),
    floors: num(t.floors, 1, 60, 10),
    progress: Math.round(num(t.progress, 0, 100, 0)),
    delivery: str(t.delivery, 40),
    image: url(t.image),
    units: (Array.isArray(t.units) ? t.units : []).slice(0, 500).map(unit)
  };
}

function notice(n) {
  n = n || {};
  return {
    id: id(n.id, 'n'),
    title: str(n.title, 120),
    body: str(n.body, 1200),
    date: date(n.date),
    pinned: bool(n.pinned),
    active: n.active !== false
  };
}

function sanitize(d) {
  if (!d || typeof d !== 'object') throw new Error('Datos inválidos');
  const c = d.company || {};
  const th = d.theme || {};
  return {
    company: {
      name: str(c.name, 80) || 'Constructora',
      tagline: str(c.tagline, 160),
      heroTitle: str(c.heroTitle, 140),
      heroText: str(c.heroText, 400),
      about: str(c.about, 1500),
      address: str(c.address, 160),
      city: str(c.city, 80),
      lat: num(c.lat, -90, 90, -34.6037),
      lng: num(c.lng, -180, 180, -58.3816),
      phone: str(c.phone, 40),
      whatsapp: str(c.whatsapp, 20).replace(/[^\d]/g, ''),
      email: str(c.email, 120),
      hours: str(c.hours, 120),
      instagram: str(c.instagram, 120),
      stats: (Array.isArray(c.stats) ? c.stats : []).slice(0, 4).map((s) => ({
        value: str(s && s.value, 20),
        label: str(s && s.label, 50)
      }))
    },
    theme: {
      primary: color(th.primary, '#1f4fbf'),
      dark: color(th.dark, '#0a2540'),
      accent: color(th.accent, '#5b8def'),
      available: color(th.available, '#1f9d6b'),
      reserved: color(th.reserved, '#e0a22b'),
      sold: color(th.sold, '#b8c2d1')
    },
    towers: (Array.isArray(d.towers) ? d.towers : []).slice(0, 12).map(tower),
    notices: (Array.isArray(d.notices) ? d.notices : []).slice(0, 60).map(notice)
  };
}

module.exports = { sanitize, STATUS, SHAPES };
