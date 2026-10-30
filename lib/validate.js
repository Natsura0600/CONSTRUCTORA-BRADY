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
    block: str(u.block, 40),
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
    tag: str(t.tag, 40),
    locationText: str(t.locationText, 300),
    lat: num(t.lat, -90, 90, 0),
    lng: num(t.lng, -180, 180, 0),
    image: url(t.image),
    gallery: (Array.isArray(t.gallery) ? t.gallery : []).slice(0, 16).map(url).filter(Boolean),
    highlights: (Array.isArray(t.highlights) ? t.highlights : []).slice(0, 6).map((h) => ({ title: str(h && h.title, 60), text: str(h && h.text, 400) })).filter((h) => h.title || h.text),
    blocks: (Array.isArray(t.blocks) ? t.blocks : []).slice(0, 4).map((b) => ({ name: str(b && b.name, 60), text: str(b && b.text, 500), levels: str(b && b.levels, 200), image: url(b && b.image) })).filter((b) => b.name),
    finishUnits: (Array.isArray(t.finishUnits) ? t.finishUnits : []).slice(0, 20).map((h) => ({ title: str(h && h.title, 60), text: str(h && h.text, 500) })).filter((h) => h.title || h.text),
    finishComplex: (Array.isArray(t.finishComplex) ? t.finishComplex : []).slice(0, 20).map((x) => str(x, 160)).filter(Boolean),
    floorPlans: (Array.isArray(t.floorPlans) ? t.floorPlans : []).slice(0, 12).map((p) => ({ label: str(p && p.label, 80), src: url(p && p.src) })).filter((p) => p.src),
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

const LOTEO_STATUS = ['hidden', 'soon', 'active'];

function place(p) {
  p = p || {};
  return {
    id: id(p.id, 'np'),
    towerId: str(p.towerId, 40).replace(/[^a-zA-Z0-9_-]/g, ''),
    name: str(p.name, 80),
    category: str(p.category, 40),
    distance: str(p.distance, 20),
    time: str(p.time, 20),
    mode: p.mode === 'car' ? 'car' : 'walk'
  };
}

function lot(l) {
  l = l || {};
  return {
    id: id(l.id, 'l'),
    code: str(l.code, 20),
    block: str(l.block, 40),
    area: num(l.area, 0, 1e6, 0),
    front: num(l.front, 0, 1000, 0),
    depth: num(l.depth, 0, 1000, 0),
    orientation: str(l.orientation, 30),
    price: num(l.price, 0, 1e10, 0),
    currency: l.currency === 'ARS' ? 'ARS' : 'USD',
    status: STATUS.includes(l.status) ? l.status : 'available',
    description: str(l.description, 600),
    photos: (Array.isArray(l.photos) ? l.photos : []).slice(0, 12).map(url).filter(Boolean),
    plan: url(l.plan)
  };
}

function loteo(o) {
  o = o || {};
  return {
    id: id(o.id, 'lo'),
    name: str(o.name, 80) || 'Loteo',
    subtitle: str(o.subtitle, 100),
    location: str(o.location, 120),
    description: str(o.description, 900),
    status: LOTEO_STATUS.includes(o.status) ? o.status : 'soon',
    image: url(o.image),
    delivery: str(o.delivery, 60),
    lots: (Array.isArray(o.lots) ? o.lots : []).slice(0, 800).map(lot)
  };
}

function sanitize(d) {
  if (!d || typeof d !== 'object') throw new Error('Datos inválidos');
  const towers = (Array.isArray(d.towers) ? d.towers : []).slice(0, 12).map(tower);
  const towerIds = new Set(towers.map((t) => t.id));
  const c = d.company || {};
  const th = d.theme || {};
  return {
    company: {
      name: str(c.name, 80) || 'Quinzo',
      tagline: str(c.tagline, 160),
      heroTitle: str(c.heroTitle, 140),
      heroText: str(c.heroText, 400),
      about: str(c.about, 1800),
      address: str(c.address, 160),
      office: str(c.office, 160),
      city: str(c.city, 80),
      locationTitle: str(c.locationTitle, 80),
      lat: num(c.lat, -90, 90, -34.5647),
      lng: num(c.lng, -180, 180, -59.1128),
      phone: str(c.phone, 40),
      whatsapp: str(c.whatsapp, 20).replace(/[^\d]/g, ''),
      email: str(c.email, 120),
      hours: str(c.hours, 120),
      instagram: str(c.instagram, 120),
      heroImage: url(c.heroImage),
      showPrices: bool(c.showPrices),
      stats: (Array.isArray(c.stats) ? c.stats : []).slice(0, 4).map((s) => ({
        value: str(s && s.value, 20),
        label: str(s && s.label, 50)
      }))
    },
    theme: {
      primary: color(th.primary, '#7a6a5b'),
      dark: color(th.dark, '#2b2724'),
      accent: color(th.accent, '#b9a590'),
      available: color(th.available, '#4f7d57'),
      reserved: color(th.reserved, '#d0a04a'),
      sold: color(th.sold, '#cfc6ba')
    },
    towers,
    nearby: (Array.isArray(d.nearby) ? d.nearby : []).slice(0, 120).map(place).filter((p) => p.name && (!p.towerId || towerIds.has(p.towerId))),
    loteos: (Array.isArray(d.loteos) ? d.loteos : []).slice(0, 10).map(loteo),
    notices: (Array.isArray(d.notices) ? d.notices : []).slice(0, 60).map(notice)
  };
}

module.exports = { sanitize, STATUS, SHAPES, LOTEO_STATUS };
