(function () {
  const { esc, STATUS_LABEL, applyTheme, towerSVG, SHAPE_NAMES, stat, api, money } = window.C;
  const $ = (s, r = document) => r.querySelector(s);

  let D = null;
  let version = 0;
  let meta = {};
  let dirty = false;
  let section = 'dash';
  let selTower = 0;
  let unitFilter = 'all';
  let token = sessionStorage.getItem('adm_token') || '';

  const SECTIONS = [
    ['dash', 'Resumen'],
    ['towers', 'Torres'],
    ['units', 'Unidades'],
    ['notices', 'Avisos'],
    ['company', 'Empresa y ubicación'],
    ['theme', 'Colores']
  ];
  const PRESETS = [
    ['Azul clásico', { primary: '#1f4fbf', dark: '#0a2540', accent: '#5b8def' }],
    ['Marino profundo', { primary: '#173f7a', dark: '#07182e', accent: '#4a7fd1' }],
    ['Celeste', { primary: '#2478c9', dark: '#0f3557', accent: '#7bb4ec' }],
    ['Índigo', { primary: '#2f3fa8', dark: '#121a45', accent: '#7385e6' }]
  ];

  const uid = (p) => p + Math.random().toString(36).slice(2, 9);
  const view = $('#view');
  const dlg = $('#dlg');

  /* ---------- Utilidades ---------- */
  function toast(msg, bad) {
    const t = $('#toast');
    t.textContent = msg;
    t.className = 'toast show' + (bad ? ' bad' : '');
    clearTimeout(toast.t);
    toast.t = setTimeout(() => (t.className = 'toast'), 3200);
  }
  function setPath(obj, path, val) {
    const p = path.split('.');
    let o = obj;
    for (let i = 0; i < p.length - 1; i++) o = o[p[i]];
    o[p[p.length - 1]] = val;
  }
  function markDirty() {
    dirty = true;
    $('#savebar').hidden = false;
  }
  function auth(extra) {
    return { Authorization: 'Bearer ' + token, ...(extra || {}) };
  }
  async function authApi(path, opts) {
    try {
      return await api(path, opts);
    } catch (e) {
      if (e.status === 401) {
        logout(true);
      }
      throw e;
    }
  }
  function logout(expired) {
    sessionStorage.removeItem('adm_token');
    token = '';
    $('#app').hidden = true;
    $('#login').hidden = false;
    if (expired) $('#loginErr').textContent = 'Tu sesión venció. Ingresá de nuevo.';
  }

  /* ---------- Login ---------- */
  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('#loginErr').textContent = '';
    try {
      const r = await api('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: $('#pw').value })
      });
      token = r.token;
      sessionStorage.setItem('adm_token', token);
      $('#pw').value = '';
      start();
    } catch (err) {
      $('#loginErr').textContent = err.message;
    }
  });
  $('#logout').addEventListener('click', () => logout(false));

  async function start() {
    $('#login').hidden = true;
    try {
      await load();
      $('#app').hidden = false;
    } catch (e) {
      logout(false);
      $('#loginErr').textContent = e.message;
    }
  }
  async function load() {
    const r = await api('/api/data?fresh=' + Date.now());
    meta = r._meta || {};
    delete r._meta;
    D = r;
    version = r.updatedAt || 0;
    dirty = false;
    $('#savebar').hidden = true;
    if (selTower >= D.towers.length) selTower = 0;
    applyTheme(D.theme);
    $('#sideName').textContent = D.company.name;
    renderNav();
    render();
  }

  /* ---------- Guardado ---------- */
  $('#save').addEventListener('click', async () => {
    const btn = $('#save');
    btn.disabled = true;
    btn.textContent = 'Publicando…';
    try {
      const r = await authApi('/api/data', {
        method: 'PUT',
        headers: auth({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ data: D, baseVersion: version })
      });
      D = r.data;
      version = r.updatedAt;
      meta.stored = true;
      dirty = false;
      $('#savebar').hidden = true;
      applyTheme(D.theme);
      toast('Cambios publicados. El sitio se actualiza en unos segundos.');
      render();
    } catch (e) {
      toast(e.message, true);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Publicar cambios';
    }
  });
  $('#discard').addEventListener('click', async () => {
    if (!confirm('¿Descartar los cambios sin publicar?')) return;
    await load();
    toast('Cambios descartados.');
  });
  window.addEventListener('beforeunload', (e) => {
    if (dirty) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  /* ---------- Navegación ---------- */
  function renderNav() {
    $('#sideNav').innerHTML = SECTIONS.map(
      ([k, l]) => `<button data-sec="${k}" ${k === section ? 'aria-current="page"' : ''}>${l}</button>`
    ).join('');
  }
  $('#sideNav').addEventListener('click', (e) => {
    const b = e.target.closest('[data-sec]');
    if (!b) return;
    section = b.dataset.sec;
    renderNav();
    render();
    window.scrollTo(0, 0);
  });

  function render() {
    const b = $('#banner');
    if (!meta.r2) {
      b.className = 'banner bad';
      b.innerHTML = '<b>R2 no está configurado.</b> Podés recorrer el panel, pero no se puede publicar hasta cargar las variables de entorno en Vercel (ver README).';
      b.hidden = false;
    } else if (!meta.stored) {
      b.className = 'banner';
      b.innerHTML = 'Estás viendo <b>datos de ejemplo</b>. Al publicar por primera vez se guardan en tu bucket de R2.';
      b.hidden = false;
    } else b.hidden = true;
    const fn = { dash: vDash, towers: vTowers, units: vUnits, notices: vNotices, company: vCompany, theme: vTheme }[section];
    view.innerHTML = fn();
  }

  /* ---------- Campos ---------- */
  const fld = (label, path, val, o = {}) => {
    const type = o.type || 'text';
    const extra = o.num ? ' data-num' : '';
    const attrs = `${o.min != null ? ` min="${o.min}"` : ''}${o.max != null ? ` max="${o.max}"` : ''}${o.step ? ` step="${o.step}"` : ''}${o.ph ? ` placeholder="${esc(o.ph)}"` : ''}`;
    const hint = o.hint ? `<small>${o.hint}</small>` : '';
    if (type === 'textarea') return `<label class="fld ${o.cls || ''}">${label}<textarea data-path="${path}" maxlength="${o.max || 1500}">${esc(val)}</textarea>${hint}</label>`;
    return `<label class="fld ${o.cls || ''}">${label}<input type="${type}" data-path="${path}"${extra} value="${esc(val)}"${attrs}>${hint}</label>`;
  };
  const sel = (label, path, val, opts, cls) =>
    `<label class="fld ${cls || ''}">${label}<select data-path="${path}">${opts
      .map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(val) ? 'selected' : ''}>${esc(l)}</option>`)
      .join('')}</select></label>`;

  /* ---------- Resumen ---------- */
  function vDash() {
    const all = D.towers.flatMap((t) => t.units);
    const s = stat(all);
    return `<header><div><h1>Resumen</h1><p>Estado actual del inventario y de las obras.</p></div>
      <a class="btn ghost sm" href="/" target="_blank" rel="noopener">Ver el sitio</a></header>
      <div class="panel grid4">
        ${[['Unidades', s.total, ''], ['Disponibles', s.available, 'available'], ['Reservadas', s.reserved, 'reserved'], ['Vendidas', s.sold, 'sold']]
          .map(([l, n, k]) => `<div><div class="muted" style="font-size:.9rem">${l}</div><b style="font-family:var(--font-display);font-stretch:112%;font-size:2.2rem;${k ? `color:var(--st-${k})` : ''}">${n}</b></div>`)
          .join('')}
      </div>
      <div class="panel"><h3>Por torre</h3>
        ${D.towers.length ? D.towers
          .map((t) => {
            const x = stat(t.units);
            const tot = x.total || 1;
            return `<div class="sumrow"><div><b>${esc(t.name)}</b><br><span class="muted" style="font-size:.88rem">Obra al ${t.progress}%</span></div>
              <div class="split"><i style="width:${(x.sold / tot) * 100}%;background:var(--st-sold)"></i><i style="width:${(x.reserved / tot) * 100}%;background:var(--st-reserved)"></i><i style="width:${(x.available / tot) * 100}%;background:var(--st-available)"></i></div>
              <div class="nums">${x.available} disp. · ${x.reserved} res. · ${x.sold} vend.</div></div>`;
          })
          .join('') : '<p class="muted">Todavía no hay torres. Creá la primera desde la sección Torres.</p>'}
      </div>
      <div class="panel"><h3>Cómo se usa</h3>
        <p class="muted">Editá lo que necesites y presioná <b>Publicar cambios</b>. Nada se ve en el sitio hasta que publiques. Cada publicación guarda una copia de la versión anterior en tu bucket de R2.</p></div>`;
  }

  /* ---------- Torres ---------- */
  function vTowers() {
    return `<header><div><h1>Torres</h1><p>Nombre, avance de obra y forma del edificio. La silueta se pinta según el porcentaje.</p></div>
      <button class="btn sm" data-act="add-tower">Agregar torre</button></header>
      ${D.towers
        .map(
          (t, i) => `<div class="panel tcard" data-ti="${i}">
        <div class="prev" id="prev-${i}">${towerSVG(t, 'p' + i)}</div>
        <div>
          <div class="grid2">
            ${fld('Nombre', `towers.${i}.name`, t.name)}
            ${fld('Dirección', `towers.${i}.address`, t.address)}
            ${sel('Forma del edificio', `towers.${i}.shape`, t.shape, Object.entries(SHAPE_NAMES))}
            ${fld('Pisos', `towers.${i}.floors`, t.floors, { type: 'number', num: 1, min: 1, max: 60 })}
            ${fld('Entrega estimada', `towers.${i}.delivery`, t.delivery, { ph: 'Ej.: Diciembre 2027' })}
            <label class="fld">Avance de obra: <b id="pv-${i}">${t.progress}%</b>
              <input type="range" min="0" max="100" step="1" value="${t.progress}" data-path="towers.${i}.progress" data-num></label>
            ${fld('Descripción', `towers.${i}.description`, t.description, { type: 'textarea', cls: 'full', max: 700 })}
          </div>
          <div class="coverbox" style="margin-top:1rem">
            ${t.image ? `<img src="${esc(t.image)}" alt="">` : ''}
            <label class="dz">${t.image ? 'Cambiar foto de la obra' : 'Subir foto de la obra'}<input type="file" accept="image/*" data-upload="cover" data-i="${i}"></label>
            ${t.image ? `<button class="btn ghost tiny" data-act="rm-cover" data-i="${i}">Quitar foto</button>` : ''}
            <span style="flex:1"></span>
            <button class="btn danger tiny" data-act="del-tower" data-i="${i}">Eliminar torre</button>
          </div>
        </div></div>`
        )
        .join('')}
      ${D.towers.length ? '' : '<div class="panel"><p class="muted">No hay torres cargadas.</p></div>'}`;
  }

  /* ---------- Unidades ---------- */
  function vUnits() {
    if (!D.towers.length) return '<header><h1>Unidades</h1></header><div class="panel"><p class="muted">Primero creá una torre en la sección Torres.</p></div>';
    const t = D.towers[selTower];
    const s = stat(t.units);
    const floors = [...new Set(t.units.map((u) => u.floor))].sort((a, b) => b - a);
    const list = t.units
      .map((u, j) => ({ u, j }))
      .filter(({ u }) => unitFilter === 'all' || u.status === unitFilter)
      .sort((a, b) => b.u.floor - a.u.floor || (a.u.code > b.u.code ? 1 : -1));
    return `<header><div><h1>Unidades</h1><p id="usum">${s.total} unidades · ${s.available} disponibles · ${s.reserved} reservadas · ${s.sold} vendidas</p></div>
      <div class="row-actions"><button class="btn ghost sm" data-act="gen-units">Generar unidades</button><button class="btn sm" data-act="add-unit">Nueva unidad</button></div></header>
      <div class="toolbar">
        <label class="fld">Torre<select id="selTower">${D.towers.map((x, i) => `<option value="${i}" ${i === selTower ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label>
        <label class="fld">Ver<select id="selFilter">${[['all', 'Todas'], ['available', 'Disponibles'], ['reserved', 'Reservadas'], ['sold', 'Vendidas']].map(([k, l]) => `<option value="${k}" ${k === unitFilter ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        <span class="grow"></span>
        ${floors.length ? `<div class="row-actions" style="align-items:end">
          <label class="fld">Marcar un piso entero<select id="bulkFloor">${floors.map((f) => `<option value="${f}">Piso ${f}</option>`).join('')}</select></label>
          <label class="fld"><span class="sr">Estado</span><select id="bulkStatus">${Object.entries(STATUS_LABEL).map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></label>
          <button class="btn ghost sm" data-act="bulk-floor">Aplicar</button></div>` : ''}
      </div>
      <div class="tablewrap"><table class="t"><thead><tr><th></th><th>Unidad</th><th>Piso</th><th>Tipo</th><th>m²</th><th>Precio</th><th>Estado</th><th></th></tr></thead><tbody>
      ${list.length ? list
        .map(
          ({ u, j }) => `<tr>
          <td>${u.photos[0] ? `<img class="thumb" src="${esc(u.photos[0])}" alt="">` : ''}</td>
          <td><b>${esc(u.code)}</b></td><td>${u.floor}°</td><td>${esc(u.type)}</td><td>${u.area}</td><td>${money(u.price, u.currency)}</td>
          <td><select class="stsel" style="--c:var(--st-${u.status})" data-path="towers.${selTower}.units.${j}.status" aria-label="Estado de la unidad ${esc(u.code)}">${Object.entries(STATUS_LABEL).map(([k, l]) => `<option value="${k}" ${u.status === k ? 'selected' : ''}>${l}</option>`).join('')}</select></td>
          <td><div class="row-actions"><button class="btn ghost tiny" data-act="edit-unit" data-j="${j}">Editar</button><button class="btn danger tiny" data-act="del-unit" data-j="${j}">Eliminar</button></div></td></tr>`
        )
        .join('') : '<tr><td colspan="8" style="padding:1.4rem" class="muted">No hay unidades para mostrar. Usá “Generar unidades” para crear varias de una vez.</td></tr>'}
      </tbody></table></div>`;
  }

  function unitDialog(j) {
    const i = selTower;
    const u = D.towers[i].units[j];
    const p = `towers.${i}.units.${j}`;
    dlg.className = 'modal adm-dlg';
    dlg.innerHTML = `<div class="dlg-body" data-uj="${j}">
      <div class="dlg-head"><h2>Unidad ${esc(u.code)}</h2><button class="m-close" style="position:static" data-act="close-dlg" aria-label="Cerrar">×</button></div>
      <div class="grid4">
        ${fld('Código', p + '.code', u.code, { ph: 'Ej.: 4B' })}
        ${fld('Piso', p + '.floor', u.floor, { type: 'number', num: 1, min: 0, max: 99 })}
        ${sel('Estado', p + '.status', u.status, Object.entries(STATUS_LABEL))}
        ${fld('Tipo', p + '.type', u.type, { ph: '2 dormitorios' })}
        ${fld('Dormitorios', p + '.bedrooms', u.bedrooms, { type: 'number', num: 1, min: 0, max: 10, hint: '0 = monoambiente' })}
        ${fld('Baños', p + '.bathrooms', u.bathrooms, { type: 'number', num: 1, min: 0, max: 10 })}
        ${fld('Superficie total (m²)', p + '.area', u.area, { type: 'number', num: 1, min: 0, step: '0.5' })}
        ${fld('Cubierta (m²)', p + '.coveredArea', u.coveredArea, { type: 'number', num: 1, min: 0, step: '0.5' })}
        ${fld('Balcón (m²)', p + '.balcony', u.balcony, { type: 'number', num: 1, min: 0, step: '0.5' })}
        ${fld('Orientación', p + '.orientation', u.orientation, { ph: 'Norte' })}
        ${fld('Precio', p + '.price', u.price, { type: 'number', num: 1, min: 0, step: '1000', hint: '0 muestra “Consultar”' })}
        ${sel('Moneda', p + '.currency', u.currency, [['USD', 'Dólares (USD)'], ['ARS', 'Pesos (ARS)']])}
        ${fld('Descripción', p + '.description', u.description, { type: 'textarea', cls: 'full', max: 600 })}
      </div>
      <div><h3 style="margin-bottom:.7rem">Fotos</h3>
        <div class="photos">${u.photos
          .map(
            (ph, k) => `<div class="pitem"><img src="${esc(ph)}" alt=""><div>
              <button class="btn ghost" data-act="ph-left" data-k="${k}" aria-label="Mover a la izquierda">‹</button>
              <button class="btn ghost" data-act="ph-right" data-k="${k}" aria-label="Mover a la derecha">›</button>
              <button class="btn danger" data-act="ph-del" data-k="${k}" aria-label="Quitar foto">×</button></div></div>`
          )
          .join('')}
          <label class="dz">Subir fotos<input type="file" accept="image/*" multiple data-upload="photo"></label></div></div>
      <div><h3 style="margin-bottom:.7rem">Plano</h3>
        <div class="coverbox">${u.plan && !/\.pdf/i.test(u.plan) ? `<img src="${esc(u.plan)}" alt="">` : u.plan ? '<span class="muted">PDF cargado</span>' : ''}
          <label class="dz">${u.plan ? 'Cambiar plano' : 'Subir plano'} (imagen o PDF)<input type="file" accept="image/*,application/pdf" data-upload="plan"></label>
          ${u.plan ? '<button class="btn ghost tiny" data-act="rm-plan">Quitar plano</button>' : ''}</div></div>
      <div class="dlg-foot"><button class="btn" data-act="close-dlg">Listo</button></div></div>`;
    if (!dlg.open) dlg.showModal();
  }

  function genDialog() {
    dlg.className = 'modal adm-dlg';
    dlg.innerHTML = `<form class="dlg-body" id="genForm">
      <div class="dlg-head"><h2>Generar unidades</h2><button type="button" class="m-close" style="position:static" data-act="close-dlg" aria-label="Cerrar">×</button></div>
      <p class="muted">Crea varias unidades de una vez. Después podés editar cada una. Las que ya existan con el mismo código no se tocan.</p>
      <div class="grid4">
        <label class="fld">Desde el piso<input name="from" type="number" value="1" min="0" max="99" required></label>
        <label class="fld">Hasta el piso<input name="to" type="number" value="10" min="0" max="99" required></label>
        <label class="fld">Unidades por piso<input name="per" type="number" value="3" min="1" max="8" required></label>
        <label class="fld">Estado inicial<select name="status">${Object.entries(STATUS_LABEL).map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></label>
        <label class="fld">Tipo<input name="type" value="2 dormitorios"></label>
        <label class="fld">Dormitorios<input name="beds" type="number" value="2" min="0" max="10"></label>
        <label class="fld">Superficie (m²)<input name="area" type="number" value="70" min="10" step="0.5"></label>
        <label class="fld">Precio por m² (USD)<input name="ppm" type="number" value="2400" min="0" step="10"></label>
      </div>
      <div class="dlg-foot"><button type="button" class="btn ghost" data-act="close-dlg">Cancelar</button><button class="btn" type="submit">Generar</button></div></form>`;
    dlg.showModal();
    $('#genForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(e.target));
      const t = D.towers[selTower];
      const have = new Set(t.units.map((u) => u.code));
      let n = 0;
      for (let fl = Number(f.from); fl <= Number(f.to); fl++) {
        for (let k = 0; k < Number(f.per); k++) {
          const code = `${fl}${String.fromCharCode(65 + k)}`;
          if (have.has(code) || t.units.length >= 500) continue;
          const area = Number(f.area);
          t.units.push({
            id: uid('u'), code, floor: fl, type: f.type, bedrooms: Number(f.beds), bathrooms: Math.max(1, Math.ceil(Number(f.beds) / 2)),
            area, coveredArea: Math.round(area * 0.88), balcony: 0, orientation: '',
            price: Math.round((area * Number(f.ppm)) / 1000) * 1000, currency: 'USD', status: f.status, description: '', photos: [], plan: ''
          });
          n++;
        }
      }
      markDirty();
      dlg.close();
      render();
      toast(n ? `Se crearon ${n} unidades.` : 'No se creó ninguna: esos códigos ya existen.');
    });
  }

  /* ---------- Avisos ---------- */
  function vNotices() {
    const list = D.notices.map((n, i) => ({ n, i })).sort((a, b) => (a.n.date < b.n.date ? 1 : -1));
    return `<header><div><h1>Avisos</h1><p>Se muestran en la sección Avisos. Un aviso destacado también aparece en la barra superior del sitio.</p></div>
      <button class="btn sm" data-act="add-notice">Nuevo aviso</button></header>
      ${list.length ? list
        .map(
          ({ n, i }) => `<div class="panel ncard"><div class="grid2">
          ${fld('Título', `notices.${i}.title`, n.title)}
          ${fld('Fecha', `notices.${i}.date`, n.date, { type: 'date' })}
          ${fld('Texto', `notices.${i}.body`, n.body, { type: 'textarea', cls: 'full', max: 1200 })}</div>
          <div class="row-actions">
            <label class="check"><input type="checkbox" data-path="notices.${i}.active" ${n.active ? 'checked' : ''}> Visible en el sitio</label>
            <label class="check"><input type="checkbox" data-path="notices.${i}.pinned" ${n.pinned ? 'checked' : ''}> Destacado (barra superior)</label>
            <span style="flex:1"></span><button class="btn danger tiny" data-act="del-notice" data-i="${i}">Eliminar</button></div></div>`
        )
        .join('') : '<div class="panel"><p class="muted">Todavía no hay avisos.</p></div>'}`;
  }

  /* ---------- Empresa ---------- */
  function vCompany() {
    const c = D.company;
    while (c.stats.length < 3) c.stats.push({ value: '', label: '' });
    return `<header><div><h1>Empresa y ubicación</h1><p>Datos de contacto, textos de portada y mapa.</p></div></header>
      <div class="panel"><h3>Portada</h3><div class="grid2">
        ${fld('Nombre de la empresa', 'company.name', c.name)}
        ${fld('Frase corta', 'company.tagline', c.tagline)}
        ${fld('Título principal', 'company.heroTitle', c.heroTitle, { type: 'textarea', cls: 'full', max: 140 })}
        ${fld('Texto de apoyo', 'company.heroText', c.heroText, { type: 'textarea', cls: 'full', max: 400 })}
        ${fld('Quiénes somos', 'company.about', c.about, { type: 'textarea', cls: 'full', max: 1500 })}
      </div></div>
      <div class="panel"><h3>Números destacados</h3><div class="grid3">
        ${c.stats.slice(0, 3).map((s, k) => `<div class="grid2" style="grid-template-columns:90px 1fr">${fld('Número', `company.stats.${k}.value`, s.value)}${fld('Descripción', `company.stats.${k}.label`, s.label)}</div>`).join('')}
      </div></div>
      <div class="panel"><h3>Contacto y ubicación</h3><div class="grid2">
        ${fld('Dirección', 'company.address', c.address)}
        ${fld('Ciudad / zona', 'company.city', c.city)}
        ${fld('Teléfono', 'company.phone', c.phone)}
        ${fld('WhatsApp', 'company.whatsapp', c.whatsapp, { hint: 'Solo números con código de país. Ej.: 5491155550142' })}
        ${fld('Email', 'company.email', c.email, { type: 'email' })}
        ${fld('Horarios', 'company.hours', c.hours)}
        ${fld('Latitud', 'company.lat', c.lat, { type: 'number', num: 1, step: 'any', hint: 'En Google Maps: clic derecho sobre el lugar y copiá las coordenadas.' })}
        ${fld('Longitud', 'company.lng', c.lng, { type: 'number', num: 1, step: 'any' })}
      </div></div>`;
  }

  /* ---------- Colores ---------- */
  function vTheme() {
    const t = D.theme;
    const sw = [
      ['primary', 'Azul principal', 'Botones, avance de obra'],
      ['dark', 'Azul oscuro', 'Textos, encabezados, pie'],
      ['accent', 'Azul claro', 'Detalles y enlaces'],
      ['available', 'Disponible', 'Unidades a la venta'],
      ['reserved', 'Reservada', 'Unidades con seña'],
      ['sold', 'Vendida', 'Unidades vendidas']
    ];
    return `<header><div><h1>Colores</h1><p>Los cambios se ven acá al instante y en el sitio cuando publiques.</p></div></header>
      <div class="panel"><h3>Combinaciones</h3><div class="presets">
        ${PRESETS.map(([n, c], k) => `<button class="preset" data-act="preset" data-k="${k}" title="${n}" aria-label="${n}"><i style="background:${c.primary}"></i><i style="background:${c.dark}"></i><i style="background:${c.accent}"></i></button>`).join('')}
      </div></div>
      <div class="panel"><h3>Colores</h3><div class="swatches">
        ${sw.map(([k, l, d]) => `<label class="sw"><input type="color" data-path="theme.${k}" value="${t[k]}"><span><b>${l}</b><span>${d}</span></span></label>`).join('')}
      </div></div>
      <div class="panel"><h3>Vista previa</h3><div style="display:flex;gap:2rem;flex-wrap:wrap;align-items:end">
        <div style="width:150px;background:var(--wash);padding:.8rem .8rem 0;border-radius:4px" class="tcard"><div class="prev" style="padding:0;background:none;width:100%">${towerSVG({ ...D.towers[0], progress: 64, name: 'Vista previa' }, 'th')}</div></div>
        <div style="display:grid;gap:.7rem"><span class="chip s-available">Disponible</span><span class="chip s-reserved">Reservada</span><span class="chip s-sold">Vendida</span>
        <a class="btn sm" href="javascript:void(0)">Botón principal</a></div></div></div>`;
  }

  /* ---------- Eventos: edición de campos ---------- */
  function onInput(e) {
    const el = e.target.closest('[data-path]');
    if (!el) return;
    let v;
    if (el.type === 'checkbox') v = el.checked;
    else if (el.hasAttribute('data-num')) v = Number(el.value) || 0;
    else v = el.value;
    setPath(D, el.dataset.path, v);
    markDirty();
    const m = el.dataset.path.match(/^towers\.(\d+)\.(progress|floors|shape)$/);
    if (m) {
      const i = Number(m[1]);
      $('#prev-' + i).innerHTML = towerSVG(D.towers[i], 'p' + i);
      if (m[2] === 'progress') $('#pv-' + i).textContent = v + '%';
    }
    if (el.dataset.path.startsWith('theme.')) applyTheme(D.theme);
    if (/\.status$/.test(el.dataset.path)) {
      el.style.setProperty('--c', `var(--st-${v})`);
      const s = stat(D.towers[selTower].units);
      const u = $('#usum');
      if (u) u.textContent = `${s.total} unidades · ${s.available} disponibles · ${s.reserved} reservadas · ${s.sold} vendidas`;
    }
  }
  view.addEventListener('input', onInput);
  view.addEventListener('change', onInput);
  dlg.addEventListener('input', onInput);
  dlg.addEventListener('change', onInput);

  view.addEventListener('change', (e) => {
    if (e.target.id === 'selTower') {
      selTower = Number(e.target.value);
      render();
    } else if (e.target.id === 'selFilter') {
      unitFilter = e.target.value;
      render();
    }
  });

  /* ---------- Subidas ---------- */
  async function prep(file) {
    if (file.type === 'application/pdf' || !/^image\/(jpeg|png|webp)$/.test(file.type) || !window.createImageBitmap) return file;
    const bmp = await createImageBitmap(file);
    const sc = Math.min(1, 1800 / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * sc);
    c.height = Math.round(bmp.height * sc);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(bmp, 0, 0, c.width, c.height);
    return await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.85));
  }
  async function upload(file) {
    const blob = await prep(file);
    if (blob.size > 4 * 1024 * 1024) throw new Error('El archivo pesa más de 4 MB. Probá con uno más liviano.');
    const r = await authApi('/api/upload', { method: 'POST', headers: auth({ 'Content-Type': 'application/octet-stream' }), body: blob });
    return r.url;
  }
  async function onUpload(e) {
    const inp = e.target.closest('[data-upload]');
    if (!inp || !inp.files.length) return;
    const kind = inp.dataset.upload;
    const files = [...inp.files];
    toast('Subiendo…');
    try {
      if (kind === 'cover') {
        D.towers[Number(inp.dataset.i)].image = await upload(files[0]);
        markDirty();
        render();
      } else {
        const j = Number($('[data-uj]', dlg).dataset.uj);
        const u = D.towers[selTower].units[j];
        if (kind === 'plan') u.plan = await upload(files[0]);
        else for (const f of files) if (u.photos.length < 12) u.photos.push(await upload(f));
        markDirty();
        unitDialog(j);
      }
      toast('Archivo subido.');
    } catch (err) {
      toast(err.message, true);
    }
    inp.value = '';
  }
  view.addEventListener('change', onUpload);
  dlg.addEventListener('change', onUpload);

  /* ---------- Eventos: acciones ---------- */
  function onClick(e) {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act;
    const i = Number(b.dataset.i);
    const j = Number(b.dataset.j);
    const k = Number(b.dataset.k);
    const t = D.towers[selTower];

    switch (act) {
      case 'add-tower':
        D.towers.push({ id: uid('t'), name: 'Nueva torre', shape: 'slab', address: '', description: '', floors: 10, progress: 0, delivery: '', image: '', units: [] });
        markDirty(); render(); break;
      case 'del-tower':
        if (confirm(`¿Eliminar ${D.towers[i].name} y todas sus unidades? Se aplica al publicar.`)) {
          D.towers.splice(i, 1);
          selTower = 0;
          markDirty(); render();
        }
        break;
      case 'rm-cover': D.towers[i].image = ''; markDirty(); render(); break;
      case 'add-unit': {
        const f = t.units.length ? Math.max(...t.units.map((u) => u.floor)) : 1;
        t.units.push({ id: uid('u'), code: '', floor: f, type: '2 dormitorios', bedrooms: 2, bathrooms: 1, area: 60, coveredArea: 52, balcony: 0, orientation: '', price: 0, currency: 'USD', status: 'available', description: '', photos: [], plan: '' });
        markDirty(); unitDialog(t.units.length - 1); break;
      }
      case 'edit-unit': unitDialog(j); break;
      case 'del-unit':
        if (confirm(`¿Eliminar la unidad ${t.units[j].code || ''}?`)) { t.units.splice(j, 1); markDirty(); render(); }
        break;
      case 'gen-units': genDialog(); break;
      case 'bulk-floor': {
        const fl = Number($('#bulkFloor').value);
        const st = $('#bulkStatus').value;
        let n = 0;
        t.units.forEach((u) => { if (u.floor === fl) { u.status = st; n++; } });
        markDirty(); render(); toast(`Piso ${fl}: ${n} unidades marcadas como ${STATUS_LABEL[st].toLowerCase()}.`); break;
      }
      case 'close-dlg': dlg.close(); break;
      case 'ph-del': { const u = t.units[Number($('[data-uj]', dlg).dataset.uj)]; u.photos.splice(k, 1); markDirty(); unitDialog(Number($('[data-uj]', dlg).dataset.uj)); break; }
      case 'ph-left':
      case 'ph-right': {
        const uj = Number($('[data-uj]', dlg).dataset.uj);
        const u = t.units[uj];
        const to = act === 'ph-left' ? k - 1 : k + 1;
        if (to >= 0 && to < u.photos.length) { [u.photos[k], u.photos[to]] = [u.photos[to], u.photos[k]]; markDirty(); unitDialog(uj); }
        break;
      }
      case 'rm-plan': { const uj = Number($('[data-uj]', dlg).dataset.uj); t.units[uj].plan = ''; markDirty(); unitDialog(uj); break; }
      case 'add-notice':
        D.notices.unshift({ id: uid('n'), title: '', body: '', date: new Date().toISOString().slice(0, 10), pinned: false, active: true });
        markDirty(); render(); break;
      case 'del-notice':
        if (confirm('¿Eliminar este aviso?')) { D.notices.splice(i, 1); markDirty(); render(); }
        break;
      case 'preset': Object.assign(D.theme, PRESETS[k][1]); applyTheme(D.theme); markDirty(); render(); break;
    }
  }
  view.addEventListener('click', onClick);
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg) dlg.close();
    else onClick(e);
  });
  dlg.addEventListener('close', () => render());

  /* ---------- Inicio ---------- */
  if (token) start();
  else $('#login').hidden = false;
})();
