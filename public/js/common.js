/* Utilidades compartidas entre el sitio público y el panel */
(function () {
  const NS = 'http://www.w3.org/2000/svg';

  const esc = (s) =>
    String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const STATUS_LABEL = { available: 'Disponible', reserved: 'Reservada', sold: 'Vendida' };

  function money(n, cur) {
    if (!n) return 'Consultar';
    return (cur === 'ARS' ? '$ ' : 'USD ') + Math.round(n).toLocaleString('es-AR');
  }

  function fmtDate(iso) {
    try {
      const [y, m, d] = iso.split('-').map(Number);
      return new Date(y, m - 1, d).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch (e) {
      return iso;
    }
  }

  function applyTheme(t) {
    const r = document.documentElement.style;
    r.setProperty('--primary', t.primary);
    r.setProperty('--dark', t.dark);
    r.setProperty('--accent', t.accent);
    r.setProperty('--st-available', t.available);
    r.setProperty('--st-reserved', t.reserved);
    r.setProperty('--st-sold', t.sold);
  }

  /* Siluetas (viewBox 0 0 220 340, suelo en y=310) */
  const SHAPES = {
    slab: { d: 'M60 70H160V310H60Z', top: 70, crane: [110, 70] },
    stepped: { d: 'M30 310V210H60V150H85V95H135V150H160V210H190V310Z', top: 95, crane: [110, 95] },
    twin: { d: 'M45 310V120H95V220H125V70H175V310Z', top: 70, crane: [150, 70] },
    point: { d: 'M80 310V110L110 60L140 110V310Z', top: 60, crane: [110, 60] }
  };
  const SHAPE_NAMES = { slab: 'Lámina', stepped: 'Escalonada', twin: 'Doble cuerpo', point: 'Punta' };

  /* Torre que se "pinta" desde la base según el % de avance */
  function towerSVG(t, uid) {
    const sh = SHAPES[t.shape] || SHAPES.slab;
    const H = 310 - sh.top;
    const floors = Math.max(1, t.floors || 10);
    const rowH = H / floors;
    const painted = (H * Math.min(100, Math.max(0, t.progress))) / 100;
    const y = 310 - painted;
    const id = 'tw' + uid;
    const winH = Math.max(3, rowH * 0.5);
    const building = t.progress < 100;
    const crane = building
      ? `<g class="tw-crane" stroke="currentColor" stroke-width="1.6" fill="none" opacity=".75">
           <path d="M${sh.crane[0]} ${sh.top} V${sh.top - 38} M${sh.crane[0] - 30} ${sh.top - 38} H${sh.crane[0] + 34} M${sh.crane[0] + 26} ${sh.top - 38} V${sh.top - 22} M${sh.crane[0] - 30} ${sh.top - 38} L${sh.crane[0]} ${sh.top - 52} L${sh.crane[0] + 34} ${sh.top - 38}"/>
         </g>`
      : '';
    return `<svg class="tower-svg" viewBox="0 0 220 340" role="img" aria-label="${esc(t.name)}: ${t.progress}% construido" focusable="false">
      <defs>
        <clipPath id="${id}-c"><path d="${sh.d}"/></clipPath>
        <pattern id="${id}-w" width="12" height="${rowH}" patternUnits="userSpaceOnUse" y="${sh.top}">
          <rect x="3" y="${(rowH - winH) / 2}" width="6" height="${winH}" fill="#fff" opacity=".9"/>
        </pattern>
      </defs>
      <line x1="10" y1="310" x2="210" y2="310" stroke="currentColor" stroke-width="2" opacity=".35"/>
      <g clip-path="url(#${id}-c)">
        <rect x="0" y="0" width="220" height="310" class="tw-empty"/>
        <rect x="0" y="${y}" width="220" height="${painted}" class="tw-fill" style="transform-origin:0 310px"/>
        <rect x="0" y="0" width="220" height="310" fill="url(#${id}-w)"/>
      </g>
      <path d="${sh.d}" fill="none" stroke="currentColor" stroke-width="2"/>
      ${painted > 0 && painted < H ? `<line x1="0" x2="220" y1="${y}" y2="${y}" class="tw-edge" clip-path="url(#${id}-c)"/>` : ''}
      ${crane}
    </svg>`;
  }

  function stat(units) {
    const o = { available: 0, reserved: 0, sold: 0, total: units.length };
    units.forEach((u) => (o[u.status] = (o[u.status] || 0) + 1));
    return o;
  }

  async function api(path, opts) {
    const res = await fetch(path, opts);
    let body = null;
    try {
      body = await res.json();
    } catch (e) {}
    if (!res.ok) {
      const err = new Error((body && body.error) || 'Error de conexión');
      err.status = res.status;
      throw err;
    }
    return body;
  }

  window.C = { NS, esc, STATUS_LABEL, money, fmtDate, applyTheme, SHAPES, SHAPE_NAMES, towerSVG, stat, api };
})();
