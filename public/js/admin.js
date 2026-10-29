(function () {
  const { opts, esc, STATUS_LABEL, applyTheme, towerSVG, SHAPE_NAMES, stat, api, money } = window.C;
  opts.showPrices = true; // en el panel siempre se ve el precio cargado
  const $ = (s, r = document) => r.querySelector(s);

  let D = null;
  let version = 0;
  let meta = {};
  let dirty = false;
  let section = 'dash';
  let selTower = 0;
  let unitFilter = 'all';
  let selLoteo = 0;
  let lotFilter = 'all';
  let token = sessionStorage.getItem('adm_token') || '';

  const SECTIONS = [
    ['dash', 'Resumen'],
    ['towers', 'Edificio'],
    ['units', 'Unidades'],
    ['loteos', 'Loteos'],
    ['lots', 'Lotes'],
    ['nearby', 'Cercanías'],
    ['notices', 'Avisos'],
    ['company', 'Empresa y ubicación'],
    ['theme', 'Colores']
  ];
  const PRESETS = [
    ['Quinzo (arena y carbón)', { primary: '#7a6a5b', dark: '#2b2724', accent: '#b9a590' }],
    ['Beige cálido', { primary: '#8c7863', dark: '#33291f', accent: '#cdb89d' }],
    ['Grafito', { primary: '#55504b', dark: '#1c1a19', accent: '#a8a29a' }],
    ['Azul clásico', { primary: '#1f4fbf', dark: '#0a2540', accent: '#5b8def' }]
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
  function getPath(obj, path) {
    return path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
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
    D.nearby = D.nearby || [];
    D.loteos = D.loteos || [];
    version = r.updatedAt || 0;
    dirty = false;
    $('#savebar').hidden = true;
    if (selTower >= D.towers.length) selTower = 0;
    if (selLoteo >= D.loteos.length) selLoteo = 0;
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
    } else if (meta.r2Error) {
      b.className = 'banner bad';
      b.innerHTML = '<b>No se pudo leer el bucket de R2 (' + esc(meta.r2Error) + ').</b> Revisá en Vercel R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY y R2_BUCKET, y que el token tenga permiso de lectura y escritura sobre ese bucket. Mientras tanto se muestran datos de ejemplo.';
      b.hidden = false;
    } else if (!meta.stored) {
      b.className = 'banner';
      b.innerHTML = 'Estás viendo <b>datos de ejemplo</b>. Al publicar por primera vez se guardan en tu bucket de R2.';
      b.hidden = false;
    } else b.hidden = true;
    const fn = { dash: vDash, towers: vTowers, units: vUnits, loteos: vLoteos, lots: vLots, nearby: vNearby, notices: vNotices, company: vCompany, theme: vTheme }[section];
    view.innerHTML = fn();
  }

  /* ---------- Campos ---------- */
  const fld = (label, path, val, o = {}) => {
    const type = o.type || 'text';
    const extra = o.num ? ' data-num' : '';
    const fmt = o.fmt ? ` data-fmt="${o.fmt}"` : '';
    const attrs = `${o.min != null ? ` min="${o.min}"` : ''}${o.max != null ? ` max="${o.max}"` : ''}${o.step ? ` step="${o.step}"` : ''}${o.ph ? ` placeholder="${esc(o.ph)}"` : ''}`;
    const hint = o.hint ? `<small>${o.hint}</small>` : '';
    if (type === 'textarea') return `<label class="fld ${o.cls || ''}">${label}<textarea data-path="${path}"${fmt} maxlength="${o.max || 1500}">${esc(val)}</textarea>${hint}</label>`;
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
      <div class="panel"><h3>Por edificio</h3>
        ${D.towers.length ? D.towers
          .map((t) => {
            const x = stat(t.units);
            const tot = x.total || 1;
            return `<div class="sumrow"><div><b>${esc(t.name)}</b><br><span class="muted" style="font-size:.88rem">${t.progress ? 'Obra al ' + t.progress + '%' : 'Sin avance cargado'}</span></div>
              <div class="split"><i style="width:${(x.sold / tot) * 100}%;background:var(--st-sold)"></i><i style="width:${(x.reserved / tot) * 100}%;background:var(--st-reserved)"></i><i style="width:${(x.available / tot) * 100}%;background:var(--st-available)"></i></div>
              <div class="nums">${x.available} disp. · ${x.reserved} res. · ${x.sold} vend.</div></div>`;
          })
          .join('') : '<p class="muted">Todavía no hay edificios. Creá el primero desde la sección Edificio.</p>'}
      </div>
      <div class="panel"><h3>Cómo se usa</h3>
        <p class="muted">Editá lo que necesites y presioná <b>Publicar cambios</b>. Nada se ve en el sitio hasta que publiques. Cada publicación guarda una copia de la versión anterior en tu bucket de R2.</p></div>`;
  }

  /* ---------- Torres ---------- */
  function vTowers() {
    return `<header><div><h1>Edificio</h1><p>Datos, textos, fotos, terminaciones y tipologías del edificio.</p></div>
      <button class="btn sm" data-act="add-tower">Agregar edificio</button></header>
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
            ${fld('Datos destacados (uno por línea: Título | texto)', `towers.${i}.highlights`, (t.highlights || []).map((h) => h.title + ' | ' + h.text).join('\n'), { type: 'textarea', cls: 'full', max: 2400, fmt: 'pairs:title,text' })}
            ${fld('Tipología / bloques (uno por línea: Nombre | texto | niveles)', `towers.${i}.blocks`, (t.blocks || []).map((b) => [b.name, b.text, b.levels].join(' | ')).join('\n'), { type: 'textarea', cls: 'full', max: 2400, fmt: 'pairs:name,text,levels', hint: 'Las fotos de cada bloque no se cambian desde acá.' })}
            ${fld('Terminaciones de unidades (uno por línea: Título | texto)', `towers.${i}.finishUnits`, (t.finishUnits || []).map((h) => h.title + ' | ' + h.text).join('\n'), { type: 'textarea', cls: 'full', max: 6000, fmt: 'pairs:title,text' })}
            ${fld('Terminaciones generales del complejo (una por línea)', `towers.${i}.finishComplex`, (t.finishComplex || []).join('\n'), { type: 'textarea', cls: 'full', max: 3000, fmt: 'lines' })}
          </div>
          <div style="margin-top:1rem"><h3 style="margin-bottom:.7rem">Galería</h3>
            <div class="photos">${(t.gallery || []).map((ph, k) => `<div class="pitem"><img src="${esc(ph)}" alt=""><div>
              <button class="btn ghost" data-act="g-left" data-i="${i}" data-k="${k}" aria-label="Mover a la izquierda">‹</button>
              <button class="btn ghost" data-act="g-right" data-i="${i}" data-k="${k}" aria-label="Mover a la derecha">›</button>
              <button class="btn danger" data-act="g-del" data-i="${i}" data-k="${k}" aria-label="Quitar foto">×</button></div></div>`).join('')}
              <label class="dz">Subir fotos<input type="file" accept="image/*" multiple data-upload="gallery" data-i="${i}"></label></div></div>
          <div class="coverbox" style="margin-top:1rem">
            ${t.image ? `<img src="${esc(t.image)}" alt="">` : ''}
            <label class="dz">${t.image ? 'Cambiar foto principal' : 'Subir foto principal'}<input type="file" accept="image/*" data-upload="cover" data-i="${i}"></label>
            ${t.image ? `<button class="btn ghost tiny" data-act="rm-cover" data-i="${i}">Quitar foto</button>` : ''}
            <span style="flex:1"></span>
            <button class="btn danger tiny" data-act="del-tower" data-i="${i}">Eliminar edificio</button>
          </div>
        </div></div>`
        )
        .join('')}
      ${D.towers.length ? '' : '<div class="panel"><p class="muted">No hay edificios cargados.</p></div>'}`;
  }

  /* ---------- Unidades ---------- */
  function vUnits() {
    if (!D.towers.length) return '<header><h1>Unidades</h1></header><div class="panel"><p class="muted">Primero creá un edificio en la sección Edificio.</p></div>';
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
        <label class="fld">Edificio<select id="selTower">${D.towers.map((x, i) => `<option value="${i}" ${i === selTower ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label>
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
        ${fld('Piso', p + '.floor', u.floor, { type: 'number', num: 1, min: 0, max: 99, hint: '0 = planta baja' })}
        ${fld('Bloque', p + '.block', u.block, { ph: 'Bloque delantero' })}
        ${sel('Estado', p + '.status', u.status, Object.entries(STATUS_LABEL))}
        ${fld('Tipo', p + '.type', u.type, { ph: '2 dormitorios' })}
        ${fld('Dormitorios', p + '.bedrooms', u.bedrooms, { type: 'number', num: 1, min: 0, max: 10, hint: '0 = monoambiente' })}
        ${fld('Baños', p + '.bathrooms', u.bathrooms, { type: 'number', num: 1, min: 0, max: 10 })}
        ${fld('Superficie total (m²)', p + '.area', u.area, { type: 'number', num: 1, min: 0, step: '0.5' })}
        ${fld('Cubierta (m²)', p + '.coveredArea', u.coveredArea, { type: 'number', num: 1, min: 0, step: '0.5' })}
        ${fld('Balcón (m²)', p + '.balcony', u.balcony, { type: 'number', num: 1, min: 0, step: '0.5' })}
        ${fld('Orientación', p + '.orientation', u.orientation, { ph: 'Norte' })}
        ${fld('Precio', p + '.price', u.price, { type: 'number', num: 1, min: 0, step: '1000', hint: 'Hoy el sitio muestra “Consultar” (ver Empresa → Mostrar precios)' })}
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
            price: Math.round((area * Number(f.ppm)) / 1000) * 1000, currency: 'USD', block: '', status: f.status, description: '', photos: [], plan: ''
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

  /* ---------- Cercanías ---------- */
  function vNearby() {
    return `<header><div><h1>Cercanías</h1><p>Lugares de la zona que se muestran en “Ubicación”, con distancia y tiempo desde el edificio.</p></div>
      <button class="btn sm" data-act="add-near">Agregar lugar</button></header>
      <div class="panel">${D.nearby.length ? D.nearby
        .map((p, i) => `<div class="nbox">
          ${fld('Lugar', `nearby.${i}.name`, p.name)}
          ${fld('Distancia', `nearby.${i}.distance`, p.distance, { ph: '500 m' })}
          ${fld('Tiempo', `nearby.${i}.time`, p.time, { ph: '6 min' })}
          ${sel('Cómo', `nearby.${i}.mode`, p.mode, [['walk', 'A pie'], ['car', 'En auto']])}
          <button class="btn danger tiny" data-act="del-near" data-i="${i}">Quitar</button>
          ${fld('Categoría', `nearby.${i}.category`, p.category, { ph: 'Salud, Deportes…' })}
        </div>`).join('') : '<p class="muted">Todavía no cargaste lugares.</p>'}</div>`;
  }

  /* ---------- Loteos ---------- */
  const LO_STATUS = [['hidden', 'Oculto (no se ve en el sitio)'], ['soon', 'Próximamente (sin lotes)'], ['active', 'Publicado con lotes']];
  function vLoteos() {
    return `<header><div><h1>Loteos</h1><p>Cada loteo es como un edificio y cada lote como una unidad. Mientras esté en “Próximamente” se muestra una tarjeta sin lotes.</p></div>
      <button class="btn sm" data-act="add-loteo">Nuevo loteo</button></header>
      ${D.loteos.length ? D.loteos.map((o, i) => `<div class="panel"><div class="grid2">
        ${fld('Nombre', `loteos.${i}.name`, o.name)}
        ${fld('Subtítulo', `loteos.${i}.subtitle`, o.subtitle, { ph: 'Barrio boutique · ex Arroyo Dulce 2' })}
        ${fld('Ubicación', `loteos.${i}.location`, o.location)}
        ${sel('Estado en el sitio', `loteos.${i}.status`, o.status, LO_STATUS)}
        ${fld('Entrega / posesión', `loteos.${i}.delivery`, o.delivery, { ph: 'Ej.: Diciembre 2027' })}
        ${fld('Descripción', `loteos.${i}.description`, o.description, { type: 'textarea', cls: 'full', max: 900 })}
        </div>
        <div class="coverbox" style="margin-top:1rem">${o.image ? `<img src="${esc(o.image)}" alt="">` : ''}
          <label class="dz">${o.image ? 'Cambiar foto' : 'Subir foto del loteo'}<input type="file" accept="image/*" data-upload="loteo" data-i="${i}"></label>
          ${o.image ? `<button class="btn ghost tiny" data-act="rm-loteo-img" data-i="${i}">Quitar foto</button>` : ''}
          <span class="muted">${o.lots.length} lotes cargados</span><span style="flex:1"></span>
          <button class="btn ghost tiny" data-act="go-lots" data-i="${i}">Cargar lotes</button>
          <button class="btn danger tiny" data-act="del-loteo" data-i="${i}">Eliminar</button></div></div>`).join('') : '<div class="panel"><p class="muted">No hay loteos.</p></div>'}`;
  }

  /* ---------- Lotes ---------- */
  function vLots() {
    if (!D.loteos.length) return '<header><h1>Lotes</h1></header><div class="panel"><p class="muted">Primero creá un loteo en la sección Loteos.</p></div>';
    const o = D.loteos[selLoteo];
    const s = stat(o.lots);
    const list = o.lots.map((l, j) => ({ l, j })).filter(({ l }) => lotFilter === 'all' || l.status === lotFilter)
      .sort((a, b) => (a.l.block || '').localeCompare(b.l.block || '', 'es', { numeric: true }) || String(a.l.code).localeCompare(String(b.l.code), 'es', { numeric: true }));
    return `<header><div><h1>Lotes</h1><p id="usum">${s.total} lotes · ${s.available} disponibles · ${s.reserved} reservados · ${s.sold} vendidos${o.status !== 'active' ? ' · <b>El loteo está en “' + (o.status === 'hidden' ? 'Oculto' : 'Próximamente') + '”: cambialo a “Publicado con lotes” para que se vean.</b>' : ''}</p></div>
      <div class="row-actions"><button class="btn ghost sm" data-act="gen-lots">Generar lotes</button><button class="btn sm" data-act="add-lot">Nuevo lote</button></div></header>
      <div class="toolbar">
        <label class="fld">Loteo<select id="selLoteo">${D.loteos.map((x, i) => `<option value="${i}" ${i === selLoteo ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label>
        <label class="fld">Ver<select id="selLotFilter">${[['all', 'Todos'], ['available', 'Disponibles'], ['reserved', 'Reservados'], ['sold', 'Vendidos']].map(([k, l]) => `<option value="${k}" ${k === lotFilter ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      </div>
      <div class="tablewrap"><table class="t"><thead><tr><th>Lote</th><th>Manzana</th><th>m²</th><th>Frente x fondo</th><th>Precio</th><th>Estado</th><th></th></tr></thead><tbody>
      ${list.length ? list.map(({ l, j }) => `<tr><td><b>${esc(l.code)}</b></td><td>${esc(l.block)}</td><td>${l.area}</td><td>${l.front || '—'} x ${l.depth || '—'}</td><td>${money(l.price, l.currency)}</td>
        <td><select class="stsel" style="--c:var(--st-${l.status})" data-path="loteos.${selLoteo}.lots.${j}.status" aria-label="Estado del lote ${esc(l.code)}">${Object.entries(STATUS_LABEL).map(([k, v]) => `<option value="${k}" ${l.status === k ? 'selected' : ''}>${v}</option>`).join('')}</select></td>
        <td><div class="row-actions"><button class="btn ghost tiny" data-act="edit-lot" data-j="${j}">Editar</button><button class="btn danger tiny" data-act="del-lot" data-j="${j}">Eliminar</button></div></td></tr>`).join('') : '<tr><td colspan="7" style="padding:1.4rem" class="muted">Todavía no hay lotes. Usá “Generar lotes” para crear varios de una vez, o “Nuevo lote”.</td></tr>'}
      </tbody></table></div>`;
  }

  function lotDialog(j) {
    const i = selLoteo;
    const l = D.loteos[i].lots[j];
    const p = `loteos.${i}.lots.${j}`;
    dlg.className = 'modal adm-dlg';
    dlg.innerHTML = `<div class="dlg-body" data-lj="${j}">
      <div class="dlg-head"><h2>Lote ${esc(l.code)}</h2><button class="m-close" style="position:static" data-act="close-dlg" aria-label="Cerrar">×</button></div>
      <div class="grid4">
        ${fld('Número / código', p + '.code', l.code, { ph: '12' })}
        ${fld('Manzana', p + '.block', l.block, { ph: 'Manzana A' })}
        ${sel('Estado', p + '.status', l.status, Object.entries(STATUS_LABEL))}
        ${fld('Orientación', p + '.orientation', l.orientation, { ph: 'Norte' })}
        ${fld('Superficie (m²)', p + '.area', l.area, { type: 'number', num: 1, min: 0, step: '0.5' })}
        ${fld('Frente (m)', p + '.front', l.front, { type: 'number', num: 1, min: 0, step: '0.1' })}
        ${fld('Fondo (m)', p + '.depth', l.depth, { type: 'number', num: 1, min: 0, step: '0.1' })}
        ${fld('Precio', p + '.price', l.price, { type: 'number', num: 1, min: 0, step: '1000', hint: 'Se muestra solo si activás “Mostrar precios”' })}
        ${sel('Moneda', p + '.currency', l.currency, [['USD', 'Dólares (USD)'], ['ARS', 'Pesos (ARS)']])}
        ${fld('Descripción', p + '.description', l.description, { type: 'textarea', cls: 'full', max: 600 })}
      </div>
      <div><h3 style="margin-bottom:.7rem">Fotos</h3><div class="photos">${l.photos.map((ph, k) => `<div class="pitem"><img src="${esc(ph)}" alt=""><div>
          <button class="btn danger" data-act="lph-del" data-k="${k}" aria-label="Quitar foto">×</button></div></div>`).join('')}
          <label class="dz">Subir fotos<input type="file" accept="image/*" multiple data-upload="lphoto"></label></div></div>
      <div><h3 style="margin-bottom:.7rem">Plano / mensura</h3>
        <div class="coverbox">${l.plan && !/\.pdf/i.test(l.plan) ? `<img src="${esc(l.plan)}" alt="">` : l.plan ? '<span class="muted">PDF cargado</span>' : ''}
          <label class="dz">${l.plan ? 'Cambiar' : 'Subir'} (imagen o PDF)<input type="file" accept="image/*,application/pdf" data-upload="lplan"></label>
          ${l.plan ? '<button class="btn ghost tiny" data-act="rm-lplan">Quitar</button>' : ''}</div></div>
      <div class="dlg-foot"><button class="btn" data-act="close-dlg">Listo</button></div></div>`;
    if (!dlg.open) dlg.showModal();
  }

  function genLotsDialog() {
    dlg.className = 'modal adm-dlg';
    dlg.innerHTML = `<form class="dlg-body" id="genLots">
      <div class="dlg-head"><h2>Generar lotes</h2><button type="button" class="m-close" style="position:static" data-act="close-dlg" aria-label="Cerrar">×</button></div>
      <p class="muted">Crea manzanas con lotes numerados. Después podés editar cada lote. Los códigos que ya existan en la misma manzana no se tocan.</p>
      <div class="grid4">
        <label class="fld">Cantidad de manzanas<input name="mz" type="number" value="3" min="1" max="26" required></label>
        <label class="fld">Lotes por manzana<input name="per" type="number" value="12" min="1" max="60" required></label>
        <label class="fld">Superficie (m²)<input name="area" type="number" value="600" min="1" step="0.5"></label>
        <label class="fld">Estado inicial<select name="status">${Object.entries(STATUS_LABEL).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label>
        <label class="fld">Frente (m)<input name="front" type="number" value="20" min="0" step="0.1"></label>
        <label class="fld">Fondo (m)<input name="depth" type="number" value="30" min="0" step="0.1"></label>
      </div>
      <div class="dlg-foot"><button type="button" class="btn ghost" data-act="close-dlg">Cancelar</button><button class="btn" type="submit">Generar</button></div></form>`;
    dlg.showModal();
    $('#genLots').addEventListener('submit', (e) => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(e.target));
      const o = D.loteos[selLoteo];
      const have = new Set(o.lots.map((l) => l.block + '|' + l.code));
      let n = 0;
      for (let m = 0; m < Number(f.mz); m++) {
        const block = 'Manzana ' + String.fromCharCode(65 + m);
        for (let k = 1; k <= Number(f.per); k++) {
          if (have.has(block + '|' + k) || o.lots.length >= 800) continue;
          o.lots.push({ id: uid('l'), code: String(k), block, area: Number(f.area), front: Number(f.front), depth: Number(f.depth), orientation: '', price: 0, currency: 'USD', status: f.status, description: '', photos: [], plan: '' });
          n++;
        }
      }
      markDirty(); dlg.close(); render();
      toast(n ? `Se crearon ${n} lotes.` : 'No se creó ninguno: esos códigos ya existen.');
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
        ${fld('Quiénes somos', 'company.about', c.about, { type: 'textarea', cls: 'full', max: 1800, hint: 'Una línea en blanco separa párrafos.' })}
        <div class="fld full coverbox">${c.heroImage ? `<img src="${esc(c.heroImage)}" alt="">` : ''}<label class="dz">${c.heroImage ? 'Cambiar foto de portada' : 'Subir foto de portada'}<input type="file" accept="image/*" data-upload="hero"></label></div>
        <label class="check full"><input type="checkbox" data-path="company.showPrices" ${c.showPrices ? 'checked' : ''}> Mostrar precios en el sitio (si está apagado, todas las unidades dicen “Consultar”)</label>
      </div></div>
      <div class="panel"><h3>Números destacados</h3><div class="grid3">
        ${c.stats.slice(0, 3).map((s, k) => `<div class="grid2" style="grid-template-columns:90px 1fr">${fld('Número', `company.stats.${k}.value`, s.value)}${fld('Descripción', `company.stats.${k}.label`, s.label)}</div>`).join('')}
      </div></div>
      <div class="panel"><h3>Contacto y ubicación</h3><div class="grid2">
        ${fld('Dirección de la obra', 'company.address', c.address)}
        ${fld('Dirección de oficinas', 'company.office', c.office)}
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
      ['primary', 'Color principal', 'Botones y detalles'],
      ['dark', 'Color oscuro', 'Textos, encabezados, pie'],
      ['accent', 'Color claro', 'Detalles y acentos'],
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
    else if (el.dataset.fmt === 'lines') v = el.value.split('\n').map((x) => x.trim()).filter(Boolean);
    else if (el.dataset.fmt && el.dataset.fmt.startsWith('pairs:')) {
      const keys = el.dataset.fmt.slice(6).split(',');
      v = el.value.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
        const parts = l.split('|').map((x) => x.trim());
        const o = {};
        keys.forEach((k, n) => (o[k] = n === keys.length - 1 ? parts.slice(n).join(' | ') : parts[n] || ''));
        return o;
      });
      if (el.dataset.path.endsWith('.blocks')) {
        const old = getPath(D, el.dataset.path) || [];
        v.forEach((b, n) => { b.image = (old[n] && old[n].image) || ''; });
      }
    } else v = el.value;
    setPath(D, el.dataset.path, v);
    markDirty();
    const m = el.dataset.path.match(/^towers\.(\d+)\.(progress|floors|shape)$/);
    if (m) {
      const i = Number(m[1]);
      $('#prev-' + i).innerHTML = towerSVG(D.towers[i], 'p' + i);
      if (m[2] === 'progress') $('#pv-' + i).textContent = v + '%';
    }
    if (el.dataset.path.startsWith('theme.')) applyTheme(D.theme);
    if (/\.status$/.test(el.dataset.path) && /^loteos\.\d+\.lots/.test(el.dataset.path)) {
      el.style.setProperty('--c', `var(--st-${v})`);
    } else if (/\.status$/.test(el.dataset.path) && /^towers/.test(el.dataset.path)) {
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
    } else if (e.target.id === 'selLoteo') {
      selLoteo = Number(e.target.value);
      render();
    } else if (e.target.id === 'selLotFilter') {
      lotFilter = e.target.value;
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
      } else if (kind === 'hero') {
        D.company.heroImage = await upload(files[0]);
        markDirty();
        render();
      } else if (kind === 'gallery') {
        const t = D.towers[Number(inp.dataset.i)];
        t.gallery = t.gallery || [];
        for (const f of files) if (t.gallery.length < 16) t.gallery.push(await upload(f));
        markDirty();
        render();
      } else if (kind === 'loteo') {
        D.loteos[Number(inp.dataset.i)].image = await upload(files[0]);
        markDirty();
        render();
      } else if (kind === 'lphoto' || kind === 'lplan') {
        const lj = Number($('[data-lj]', dlg).dataset.lj);
        const l = D.loteos[selLoteo].lots[lj];
        if (kind === 'lplan') l.plan = await upload(files[0]);
        else for (const f of files) if (l.photos.length < 12) l.photos.push(await upload(f));
        markDirty();
        lotDialog(lj);
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
    const t = D.towers[selTower] || {};

    switch (act) {
      case 'add-tower':
        D.towers.push({ id: uid('t'), name: 'Nuevo edificio', shape: 'slab', address: '', description: '', floors: 10, progress: 0, delivery: '', image: '', gallery: [], highlights: [], blocks: [], finishUnits: [], finishComplex: [], floorPlans: [], units: [] });
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
        t.units.push({ id: uid('u'), code: '', floor: f, type: '2 dormitorios', bedrooms: 2, bathrooms: 1, area: 60, coveredArea: 52, balcony: 0, orientation: '', block: '', price: 0, currency: 'USD', status: 'available', description: '', photos: [], plan: '' });
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
      case 'g-del': D.towers[i].gallery.splice(k, 1); markDirty(); render(); break;
      case 'g-left':
      case 'g-right': {
        const g = D.towers[i].gallery;
        const to = act === 'g-left' ? k - 1 : k + 1;
        if (to >= 0 && to < g.length) { [g[k], g[to]] = [g[to], g[k]]; markDirty(); render(); }
        break;
      }
      case 'add-near': D.nearby.push({ id: uid('np'), name: '', category: '', distance: '', time: '', mode: 'walk' }); markDirty(); render(); break;
      case 'del-near': D.nearby.splice(i, 1); markDirty(); render(); break;
      case 'add-loteo': D.loteos.push({ id: uid('lo'), name: 'Nuevo loteo', subtitle: '', location: '', description: '', status: 'soon', image: '', delivery: '', lots: [] }); markDirty(); render(); break;
      case 'rm-loteo-img': D.loteos[i].image = ''; markDirty(); render(); break;
      case 'del-loteo':
        if (confirm(`¿Eliminar el loteo ${D.loteos[i].name} y todos sus lotes? Se aplica al publicar.`)) { D.loteos.splice(i, 1); selLoteo = 0; markDirty(); render(); }
        break;
      case 'go-lots': selLoteo = i; section = 'lots'; renderNav(); render(); window.scrollTo(0, 0); break;
      case 'add-lot': {
        const o = D.loteos[selLoteo];
        const last = o.lots[o.lots.length - 1];
        o.lots.push({ id: uid('l'), code: '', block: last ? last.block : 'Manzana A', area: last ? last.area : 0, front: last ? last.front : 0, depth: last ? last.depth : 0, orientation: '', price: 0, currency: 'USD', status: 'available', description: '', photos: [], plan: '' });
        markDirty(); lotDialog(o.lots.length - 1); break;
      }
      case 'edit-lot': lotDialog(j); break;
      case 'del-lot': {
        const o = D.loteos[selLoteo];
        if (confirm(`¿Eliminar el lote ${o.lots[j].code || ''}?`)) { o.lots.splice(j, 1); markDirty(); render(); }
        break;
      }
      case 'gen-lots': genLotsDialog(); break;
      case 'lph-del': { const lj = Number($('[data-lj]', dlg).dataset.lj); D.loteos[selLoteo].lots[lj].photos.splice(k, 1); markDirty(); lotDialog(lj); break; }
      case 'rm-lplan': { const lj = Number($('[data-lj]', dlg).dataset.lj); D.loteos[selLoteo].lots[lj].plan = ''; markDirty(); lotDialog(lj); break; }
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
