(function () {
  const { opts, esc, STATUS_LABEL, applyTheme, towerSVG, SHAPE_NAMES, stat, api } = window.C;
  opts.showPrices = true;
  const $ = (s, r = document) => r.querySelector(s);

  let D = null;
  let version = 0;
  let meta = {};
  let dirty = false;
  let section = 'home'; // home | towers | tower | loteos | loteo | notices | company | theme
  let selTower = 0;
  let bTab = 'datos';
  let selLoteo = 0;
  let lTab = 'datos';
  let unitFilter = 'all';
  let lotFilter = 'all';
  let token = '';
  try { token = sessionStorage.getItem('adm_token') || ''; } catch (e) {}

  const NAV = [
    ['home', 'Inicio'],
    ['towers', 'Edificios'],
    ['loteos', 'Loteos'],
    ['notices', 'Avisos'],
    ['company', 'Mi empresa'],
    ['theme', 'Colores']
  ];
  const TOWER_TABS = [
    ['datos', '1. Datos básicos'],
    ['fotos', '2. Fotos y planos'],
    ['detalle', '3. Características'],
    ['terminaciones', '4. Terminaciones'],
    ['unidades', '5. Unidades'],
    ['ubicacion', '6. Ubicación y lugares cercanos']
  ];
  const LOTEO_TABS = [
    ['datos', '1. Datos del loteo'],
    ['lotes', '2. Lotes']
  ];
  const PRESETS = [
    ['Arena y carbón', { primary: '#7a6a5b', dark: '#2b2724', accent: '#b9a590' }],
    ['Beige cálido', { primary: '#8c7863', dark: '#33291f', accent: '#cdb89d' }],
    ['Grafito', { primary: '#55504b', dark: '#1c1a19', accent: '#a8a29a' }],
    ['Azul clásico', { primary: '#1f4fbf', dark: '#0a2540', accent: '#5b8def' }],
    ['Verde bosque', { primary: '#2f6b4f', dark: '#14261d', accent: '#8fbf9f' }],
    ['Bordó', { primary: '#8a2f3d', dark: '#2a1015', accent: '#d39aa4' }]
  ];
  const CATEGORIES = ['Servicios', 'Salud', 'Educación', 'Compras', 'Deportes', 'Espacios verdes', 'Transporte', 'Cultura', 'Turismo', 'Gastronomía', 'Otro'];
  const TEMPLATES = {
    hl: () => ({ title: '', text: '' }),
    blk: () => ({ name: '', text: '', levels: '', image: '' }),
    fu: () => ({ title: '', text: '' }),
    fc: () => ''
  };

  const uid = (p) => p + Math.random().toString(36).slice(2, 9);
  const view = $('#view');
  const dlg = $('#dlg');
  const towerOf = () => D.towers[selTower];
  const loteoOf = () => D.loteos[selLoteo];

  /* ---------- Utilidades ---------- */
  function toast(msg, bad) {
    const t = $('#toast');
    t.textContent = msg;
    t.className = 'toast show' + (bad ? ' bad' : '');
    clearTimeout(toast.t);
    toast.t = setTimeout(() => (t.className = 'toast'), 4200);
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
  async function authApi(path, o) {
    try {
      return await api(path, o);
    } catch (e) {
      if (e.status === 401) logout(true);
      throw e;
    }
  }
  function logout(expired) {
    try { sessionStorage.removeItem('adm_token'); } catch (e) {}
    token = '';
    $('#app').hidden = true;
    $('#login').hidden = false;
    $('#loginErr').textContent = expired ? 'Tu sesión venció. Ingresá de nuevo.' : '';
  }
  function keepScroll(fn) {
    const y = window.scrollY;
    fn();
    window.scrollTo(0, y);
  }
  const fmtNum = (n) => String(n).replace('.', ',');
  const unitsWord = (n) => (n === 1 ? '1 unidad' : n + ' unidades');
  const priceTxt = (n, cur) => (n ? (cur === 'ARS' ? '$ ' : 'USD ') + Math.round(n).toLocaleString('es-AR') : '—');

  /* ---------- Ingreso ---------- */
  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('#loginErr').textContent = '';
    const btn = $('#loginForm button[type=submit]');
    btn.disabled = true;
    try {
      const r = await api('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: $('#pw').value })
      });
      token = r.token;
      try { sessionStorage.setItem('adm_token', token); } catch (er) {}
      $('#pw').value = '';
      start();
    } catch (err) {
      $('#loginErr').textContent = err.message;
    } finally {
      btn.disabled = false;
    }
  });
  $('#logout').addEventListener('click', () => {
    if (dirty && !confirm('Tenés cambios sin publicar. Si salís ahora se pierden. ¿Salir igual?')) return;
    dirty = false;
    logout(false);
  });

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
    D.notices = D.notices || [];
    // Lugares sin edificio asignado (datos viejos): se asignan al primero.
    if (D.towers[0]) D.nearby.forEach((p) => { if (!p.towerId) p.towerId = D.towers[0].id; });
    version = r.updatedAt || 0;
    dirty = false;
    $('#savebar').hidden = true;
    if (selTower >= D.towers.length) selTower = 0;
    if (selLoteo >= D.loteos.length) selLoteo = 0;
    if ((section === 'tower' && !D.towers.length) || (section === 'loteo' && !D.loteos.length)) section = section + 's';
    applyTheme(D.theme);
    $('#sideName').textContent = D.company.name;
    renderNav();
    render();
  }

  /* ---------- Publicar ---------- */
  function problems() {
    for (const t of D.towers) {
      if (!String(t.name || '').trim()) return 'Hay un edificio sin nombre. Completalo en “Datos básicos”.';
      const seen = new Set();
      for (const u of t.units) {
        if (!String(u.code || '').trim()) return `En ${t.name} hay una unidad sin nombre (por ejemplo “2B”). Completala o eliminala en “Unidades”.`;
        const k = u.code.trim().toLowerCase();
        if (seen.has(k)) return `En ${t.name} hay dos unidades llamadas “${u.code}”. Cada unidad necesita un nombre distinto.`;
        seen.add(k);
      }
    }
    for (const o of D.loteos) {
      if (!String(o.name || '').trim()) return 'Hay un loteo sin nombre.';
      for (const l of o.lots) if (!String(l.code || '').trim()) return `En el loteo ${o.name} hay un lote sin número. Completalo o eliminalo.`;
    }
    return '';
  }
  $('#save').addEventListener('click', async () => {
    const pr = problems();
    if (pr) { toast(pr, true); return; }
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
      D.nearby = D.nearby || [];
      D.loteos = D.loteos || [];
      D.notices = D.notices || [];
      version = r.updatedAt;
      meta.stored = true;
      meta.r2Error = null;
      dirty = false;
      $('#savebar').hidden = true;
      applyTheme(D.theme);
      renderNav();
      render();
      doneDialog();
    } catch (e) {
      toast(e.message, true);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Publicar cambios';
    }
  });
  function doneDialog() {
    dlg.className = 'modal adm-dlg small';
    dlg.innerHTML = `<div class="dlg-body center">
      <div class="big-ok" aria-hidden="true">✓</div>
      <h2>¡Listo! Los cambios ya están publicados</h2>
      <p class="muted">Puede tardar unos segundos en verse en la página. Si no lo ves, recargá con Ctrl + F5.</p>
      <div class="dlg-foot center"><a class="btn ghost" href="/" target="_blank" rel="noopener">Ver mi sitio</a><button class="btn" data-act="close-dlg">Seguir editando</button></div></div>`;
    dlg.showModal();
  }
  $('#discard').addEventListener('click', async () => {
    if (!confirm('¿Descartar todo lo que cambiaste y no publicaste? No se puede deshacer.')) return;
    await load();
    toast('Listo, volvió a la última versión publicada.');
  });
  window.addEventListener('beforeunload', (e) => {
    if (dirty) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  /* ---------- Navegación ---------- */
  function navKey() {
    return section === 'tower' ? 'towers' : section === 'loteo' ? 'loteos' : section;
  }
  function renderNav() {
    $('#sideNav').innerHTML = NAV.map(
      ([k, l]) => `<button data-sec="${k}" ${k === navKey() ? 'aria-current="page"' : ''}>${l}</button>`
    ).join('');
  }
  function go(sec) {
    section = sec;
    renderNav();
    render();
    window.scrollTo(0, 0);
  }
  $('#sideNav').addEventListener('click', (e) => {
    const b = e.target.closest('[data-sec]');
    if (b) go(b.dataset.sec);
  });

  function banner() {
    const b = $('#banner');
    if (!meta.r2) {
      b.className = 'banner bad';
      b.innerHTML = '<b>Todavía no se puede publicar.</b> Falta conectar el almacenamiento (R2) en Vercel. Podés recorrer el panel, pero los cambios no se van a poder guardar hasta entonces.';
      b.hidden = false;
    } else if (meta.r2Error) {
      b.className = 'banner bad';
      b.innerHTML = '<b>No se pudo leer el almacenamiento (' + esc(meta.r2Error) + ').</b> Revisá en Vercel las variables R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY y R2_BUCKET. Mientras tanto se muestran datos de ejemplo.';
      b.hidden = false;
    } else if (!meta.stored) {
      b.className = 'banner';
      b.innerHTML = 'Estás viendo <b>datos de ejemplo</b>. La primera vez que toques “Publicar cambios” se guardan y la página pasa a usar lo que vos cargues.';
      b.hidden = false;
    } else b.hidden = true;
  }

  function render() {
    banner();
    const fn = { home: vHome, towers: vTowers, tower: vTower, loteos: vLoteos, loteo: vLoteo, notices: vNotices, company: vCompany, theme: vTheme }[section];
    view.innerHTML = fn();
    if (render.focus) {
      const el = view.querySelector(`[data-path^="${render.focus}"]`);
      if (el) el.focus();
      render.focus = null;
    }
  }

  /* ---------- Campos ---------- */
  const fld = (label, path, val, o = {}) => {
    const type = o.type || 'text';
    const hint = o.hint ? `<small>${o.hint}</small>` : '';
    const cls = `fld ${o.cls || ''}`;
    if (type === 'textarea') {
      return `<label class="${cls}"><span class="lbl">${label}</span><textarea data-path="${path}" rows="${o.rows || 4}" maxlength="${o.maxlen || 1500}" ${o.ph ? `placeholder="${esc(o.ph)}"` : ''}>${esc(val)}</textarea>${hint}</label>`;
    }
    const attrs = `${o.num ? ' data-num' : ''}${o.min != null ? ` min="${o.min}"` : ''}${o.max != null ? ` max="${o.max}"` : ''}${o.step ? ` step="${o.step}"` : ''}${o.ph ? ` placeholder="${esc(o.ph)}"` : ''}${o.list ? ` list="${o.list}"` : ''}${o.maxlen ? ` maxlength="${o.maxlen}"` : ''}${o.inputmode ? ` inputmode="${o.inputmode}"` : ''}`;
    return `<label class="${cls}"><span class="lbl">${label}</span><input type="${type}" data-path="${path}" value="${esc(val)}"${attrs}>${hint}</label>`;
  };
  const sel = (label, path, val, options, o = {}) =>
    `<label class="fld ${o.cls || ''}"><span class="lbl">${label}</span><select data-path="${path}">${options
      .map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(val) ? 'selected' : ''}>${esc(l)}</option>`)
      .join('')}</select>${o.hint ? `<small>${o.hint}</small>` : ''}</label>`;
  const help = (txt) => `<p class="help">${txt}</p>`;
  const tabsBar = (list, active, attr) =>
    `<div class="subtabs" role="tablist">${list.map(([k, l]) => `<button role="tab" ${attr}="${k}" aria-selected="${k === active}">${l}</button>`).join('')}</div>`;
  const statusOpts = (v) => Object.entries(STATUS_LABEL).map(([k, l]) => `<option value="${k}" ${v === k ? 'selected' : ''}>${l}</option>`).join('');
  const upBtn = (label, kind, extra = '', multiple = false, accept = 'image/*') =>
    `<label class="btn ghost up">${label}<input type="file" accept="${accept}" ${multiple ? 'multiple' : ''} data-upload="${kind}" ${extra}></label>`;
  const emptyNote = (t) => `<p class="empty-note">${t}</p>`;

  /* ---------- Inicio ---------- */
  function vHome() {
    const all = D.towers.flatMap((t) => t.units);
    const s = stat(all);
    return `<header><div><h1>Bienvenido al panel</h1><p>Desde acá cambiás todo lo que se ve en la página de ${esc(D.company.name)}.</p></div>
      <a class="btn ghost" href="/" target="_blank" rel="noopener">Ver mi sitio</a></header>
      <div class="actions-grid">
        <button class="bigact" data-act="go-units"><b>Cambiar el estado de una unidad</b><span>Marcar disponible, reservada o vendida</span></button>
        <button class="bigact" data-act="add-tower"><b>Agregar un edificio nuevo</b><span>Con sus fotos, unidades y lugares cercanos</span></button>
        <button class="bigact" data-act="go" data-to="loteos"><b>Loteos y lotes</b><span>Cargar o cambiar un loteo</span></button>
        <button class="bigact" data-act="add-notice"><b>Publicar un aviso</b><span>Novedades, promociones, fechas de visita</span></button>
      </div>
      <div class="panel"><h2>Cómo se guardan los cambios</h2>
        <ol class="steps">
          <li><b>Cambiá lo que necesites.</b> Escribí, subí fotos o tocá los botones.</li>
          <li><b>Tocá “Publicar cambios”.</b> Es el botón grande que aparece abajo cuando cambiás algo.</li>
          <li><b>Listo.</b> En unos segundos se ve en la página. Hasta que no publiques, nadie ve los cambios.</li>
        </ol></div>
      <div class="panel"><h2>Resumen</h2>
        <div class="grid4 nums-row">
          ${[['Unidades', s.total, ''], ['Disponibles', s.available, 'available'], ['Reservadas', s.reserved, 'reserved'], ['Vendidas', s.sold, 'sold']]
            .map(([l, n, k]) => `<div><span class="muted">${l}</span><b ${k ? `style="color:var(--st-${k})"` : ''}>${n}</b></div>`)
            .join('')}
        </div>
        ${D.towers.length ? D.towers.map((t, i) => {
          const x = stat(t.units);
          const tot = x.total || 1;
          return `<div class="sumrow"><div><b>${esc(t.name)}</b><br><span class="muted">${t.progress ? 'Obra al ' + t.progress + '%' : 'Sin avance cargado'}</span></div>
            <div class="split"><i style="width:${(x.sold / tot) * 100}%;background:var(--st-sold)"></i><i style="width:${(x.reserved / tot) * 100}%;background:var(--st-reserved)"></i><i style="width:${(x.available / tot) * 100}%;background:var(--st-available)"></i></div>
            <div class="nums">${x.available} disponibles · ${x.reserved} reservadas · ${x.sold} vendidas</div>
            <button class="btn ghost sm" data-act="open-tower" data-i="${i}">Editar</button></div>`;
        }).join('') : emptyNote('Todavía no cargaste ningún edificio. Tocá “Agregar un edificio nuevo”.')}
      </div>`;
  }

  /* ---------- Lista de edificios ---------- */
  function vTowers() {
    return `<header><div><h1>Edificios</h1><p>Cada edificio tiene sus propias fotos, unidades y lugares cercanos. Tocá “Editar” para entrar a uno.</p></div>
      <button class="btn" data-act="add-tower">+ Agregar un edificio</button></header>
      ${D.towers.length ? D.towers.map((t, i) => {
        const s = stat(t.units);
        return `<div class="panel rowcard">
          <div class="rc-img">${t.image ? `<img src="${esc(t.image)}" alt="">` : towerSVG(t, 'l' + i)}</div>
          <div class="rc-body"><h2>${esc(t.name || 'Sin nombre')}</h2>
            <p class="muted">${esc(t.address || 'Sin dirección cargada')}</p>
            <p>${unitsWord(s.total)} · ${s.available} disponibles · ${s.reserved} reservadas · ${s.sold} vendidas</p></div>
          <div class="rc-act"><button class="btn" data-act="open-tower" data-i="${i}">Editar</button>
            <button class="btn danger" data-act="del-tower" data-i="${i}">Eliminar</button></div></div>`;
      }).join('') : `<div class="panel">${emptyNote('Todavía no hay edificios. Tocá “+ Agregar un edificio” para empezar.')}</div>`}`;
  }

  /* ---------- Editor de un edificio ---------- */
  function vTower() {
    const t = towerOf();
    if (!t) return vTowers();
    const body = { datos: tDatos, fotos: tFotos, detalle: tDetalle, terminaciones: tTerminaciones, unidades: tUnidades, ubicacion: tUbicacion }[bTab](t, selTower);
    return `<button class="back-link" data-act="go" data-to="towers">← Volver a todos los edificios</button>
      <header><div><h1>${esc(t.name || 'Edificio sin nombre')}</h1><p>Completá cada paso. Podés ir de uno a otro cuando quieras: no se pierde nada.</p></div></header>
      ${tabsBar(TOWER_TABS, bTab, 'data-btab')}
      ${body}
      <div class="step-nav">${stepNav(TOWER_TABS, bTab, 'data-btab')}</div>`;
  }
  function stepNav(list, active, attr) {
    const i = list.findIndex(([k]) => k === active);
    const prev = list[i - 1], next = list[i + 1];
    return `${prev ? `<button class="btn ghost" ${attr}="${prev[0]}">← ${prev[1].replace(/^\d+\.\s*/, '')}</button>` : '<span></span>'}
      ${next ? `<button class="btn" ${attr}="${next[0]}">${next[1].replace(/^\d+\.\s*/, '')} →</button>` : ''}`;
  }

  function tDatos(t, i) {
    const p = `towers.${i}`;
    return `<div class="panel"><h2>Datos principales</h2>
      <div class="grid2">
        ${fld('Nombre del edificio', p + '.name', t.name, { ph: 'Ej.: Quinzo 1', hint: 'Es el título que ven los clientes.' })}
        ${fld('Dirección', p + '.address', t.address, { ph: 'Ej.: Mariano Moreno 872' })}
        ${fld('Pisos (sin contar la planta baja)', p + '.floors', t.floors, { type: 'number', num: 1, min: 1, max: 60, inputmode: 'numeric' })}
        ${fld('Fecha de entrega', p + '.delivery', t.delivery, { ph: 'Ej.: Diciembre 2027', hint: 'Si todavía no se sabe, dejá “A confirmar”.' })}
        ${fld('Cartelito sobre el nombre (opcional)', p + '.tag', t.tag, { ph: 'Ej.: En construcción', maxlen: 40, hint: 'Aparece arriba del nombre en la página. Podés dejarlo vacío.' })}
        <label class="fld"><span class="lbl">Avance de la obra: <b id="pv-${i}">${t.progress}%</b></span>
          <input type="range" min="0" max="100" step="5" value="${t.progress}" data-path="${p}.progress" data-num>
          <small>Mové la barra. En 0% no se muestra nada de avance en la página.</small></label>
        ${fld('Descripción del edificio', p + '.description', t.description, { type: 'textarea', cls: 'full', rows: 5, maxlen: 700, hint: 'Un párrafo corto. Es el texto que acompaña a la foto principal.' })}
      </div></div>
    <div class="panel"><h2>Foto principal</h2>
      ${help('Es la foto grande que se ve junto a la descripción. Si no subís ninguna, la página muestra un dibujo del edificio (a la derecha) hasta que la cargues.')}
      <div class="main-photo">
        <div class="mp-now">${t.image ? `<img src="${esc(t.image)}" alt="Foto principal">` : `<div class="prev" id="prev-${i}">${towerSVG(t, 'p' + i)}</div>`}</div>
        <div class="mp-act">${upBtn(t.image ? 'Cambiar foto principal' : 'Subir foto principal', 'cover', `data-i="${i}"`)}
          ${t.image ? `<button class="btn ghost" data-act="rm-cover" data-i="${i}">Quitar foto</button>` : ''}
          ${sel('Forma del dibujo (cuando no hay foto)', p + '.shape', t.shape, Object.entries(SHAPE_NAMES))}</div>
      </div></div>
    <div class="panel danger-zone"><h2>Eliminar este edificio</h2>
      <p class="muted">Se borra el edificio con todas sus unidades y lugares cercanos. Recién desaparece de la página cuando publiques.</p>
      <button class="btn danger" data-act="del-tower" data-i="${i}">Eliminar edificio</button></div>`;
  }

  function photoGrid(list, delAct, kind, extra, label) {
    return `<div class="photos">${(list || []).map((ph, k) => `<div class="pitem"><img src="${esc(ph)}" alt=""><div class="pbtns">
      <button class="btn ghost" data-act="${delAct}-left" ${extra} data-k="${k}" aria-label="Mover a la izquierda" ${k === 0 ? 'disabled' : ''}>←</button>
      <button class="btn ghost" data-act="${delAct}-right" ${extra} data-k="${k}" aria-label="Mover a la derecha" ${k === list.length - 1 ? 'disabled' : ''}>→</button>
      <button class="btn danger" data-act="${delAct}-del" ${extra} data-k="${k}" aria-label="Quitar foto">Quitar</button></div></div>`).join('')}
      <label class="dz">+ ${label}<input type="file" accept="image/*" multiple data-upload="${kind}" ${extra}></label></div>`;
  }

  function tFotos(t, i) {
    const p = `towers.${i}`;
    return `<div class="panel"><h2>Galería de fotos</h2>
      ${help('Fotos del edificio que se ven en la página, una al lado de otra. Podés subir varias juntas (hasta 16). Con las flechas cambiás el orden.')}
      ${photoGrid(t.gallery, 'g', 'gallery', `data-i="${i}"`, 'Subir fotos')}</div>
    <div class="panel"><h2>Plantas del edificio</h2>
      ${help('Los planos de cada piso. Subí la imagen y escribí cómo se llama (por ejemplo “Piso 1”).')}
      ${(t.floorPlans || []).length ? (t.floorPlans || []).map((fp, k) => `<div class="itemcard row">
        <img class="thumb-lg" src="${esc(fp.src)}" alt="">
        ${fld('Nombre del plano', `${p}.floorPlans.${k}.label`, fp.label, { ph: 'Ej.: Piso 1', cls: 'grow' })}
        <div class="item-btns">
          <button class="btn ghost" data-act="l-up" data-path="${p}.floorPlans" data-k="${k}" ${k === 0 ? 'disabled' : ''} aria-label="Subir">↑</button>
          <button class="btn ghost" data-act="l-down" data-path="${p}.floorPlans" data-k="${k}" ${k === t.floorPlans.length - 1 ? 'disabled' : ''} aria-label="Bajar">↓</button>
          <button class="btn danger" data-act="l-del" data-path="${p}.floorPlans" data-k="${k}">Quitar</button></div></div>`).join('') : emptyNote('Todavía no subiste plantas.')}
      <div>${upBtn('+ Subir plantas', 'fplan', `data-i="${i}"`, true)}</div></div>`;
  }

  function tDetalle(t, i) {
    const p = `towers.${i}`;
    return `<div class="panel"><h2>Características destacadas</h2>
      ${help('Son los recuadros con los datos más importantes del edificio (por ejemplo “14 departamentos” o “Cocheras”). Hasta 6. Cada uno tiene un título corto y una explicación.')}
      ${(t.highlights || []).map((h, k) => `<div class="itemcard">
        <div class="grid2">${fld('Título', `${p}.highlights.${k}.title`, h.title, { ph: 'Ej.: 14 departamentos', maxlen: 60 })}
        ${fld('Explicación', `${p}.highlights.${k}.text`, h.text, { type: 'textarea', rows: 3, maxlen: 400 })}</div>
        <div class="item-btns">${moveBtns(`${p}.highlights`, k, t.highlights.length)}</div></div>`).join('')}
      ${(t.highlights || []).length >= 6 ? '' : `<button class="btn ghost" data-act="l-add" data-path="${p}.highlights" data-tpl="hl">+ Agregar una característica</button>`}</div>
    <div class="panel"><h2>Bloques o cuerpos del edificio</h2>
      ${help('Si el edificio tiene partes distintas (por ejemplo “Bloque delantero” y “Bloque trasero”), describilas acá, cada una con su foto. Si no, dejá esta parte vacía. Hasta 4.')}
      ${(t.blocks || []).map((b, k) => `<div class="itemcard">
        <div class="blk-ed"><div class="blk-img">${b.image ? `<img src="${esc(b.image)}" alt="">` : '<span class="muted">Sin foto</span>'}
          ${upBtn(b.image ? 'Cambiar foto' : 'Subir foto', 'bphoto', `data-i="${i}" data-k="${k}"`)}
          ${b.image ? `<button class="btn ghost" data-act="rm-bphoto" data-i="${i}" data-k="${k}">Quitar foto</button>` : ''}</div>
        <div class="grid1">${fld('Nombre', `${p}.blocks.${k}.name`, b.name, { ph: 'Ej.: Bloque delantero', maxlen: 60 })}
        ${fld('Descripción', `${p}.blocks.${k}.text`, b.text, { type: 'textarea', rows: 3, maxlen: 500 })}
        ${fld('Qué hay en cada piso (opcional)', `${p}.blocks.${k}.levels`, b.levels, { ph: 'Ej.: PB: local · 1°: 2 departamentos · 2°: 2 departamentos', maxlen: 200 })}</div></div>
        <div class="item-btns">${moveBtns(`${p}.blocks`, k, t.blocks.length)}</div></div>`).join('')}
      ${(t.blocks || []).length >= 4 ? '' : `<button class="btn ghost" data-act="l-add" data-path="${p}.blocks" data-tpl="blk">+ Agregar un bloque</button>`}</div>`;
  }
  function moveBtns(path, k, n) {
    return `<button class="btn ghost" data-act="l-up" data-path="${path}" data-k="${k}" ${k === 0 ? 'disabled' : ''} aria-label="Subir">↑ Subir</button>
      <button class="btn ghost" data-act="l-down" data-path="${path}" data-k="${k}" ${k === n - 1 ? 'disabled' : ''} aria-label="Bajar">↓ Bajar</button>
      <button class="btn danger" data-act="l-del" data-path="${path}" data-k="${k}">Quitar</button>`;
  }

  function tTerminaciones(t, i) {
    const p = `towers.${i}`;
    return `<div class="panel"><h2>Terminaciones de cada unidad</h2>
      ${help('Qué incluye cada departamento: pisos, cocina, baños, aberturas, etc. Cada renglón tiene un rubro (por ejemplo “Cocina”) y qué incluye.')}
      ${(t.finishUnits || []).map((f, k) => `<div class="itemcard">
        <div class="grid2">${fld('Rubro', `${p}.finishUnits.${k}.title`, f.title, { ph: 'Ej.: Cocina', maxlen: 60 })}
        ${fld('Qué incluye', `${p}.finishUnits.${k}.text`, f.text, { type: 'textarea', rows: 3, maxlen: 500 })}</div>
        <div class="item-btns">${moveBtns(`${p}.finishUnits`, k, t.finishUnits.length)}</div></div>`).join('')}
      ${(t.finishUnits || []).length >= 20 ? '' : `<button class="btn ghost" data-act="l-add" data-path="${p}.finishUnits" data-tpl="fu">+ Agregar un rubro</button>`}</div>
    <div class="panel"><h2>Lo que tiene el edificio en general</h2>
      ${help('Una lista corta de lo que ofrece todo el complejo: ascensores, portón automático, espacios verdes, etc. Un renglón por cosa.')}
      ${(t.finishComplex || []).map((x, k) => `<div class="itemcard row">
        ${fld('', `${p}.finishComplex.${k}`, x, { ph: 'Ej.: Ascensores de primera categoría', cls: 'grow', maxlen: 160 })}
        <div class="item-btns">${moveBtns(`${p}.finishComplex`, k, t.finishComplex.length)}</div></div>`).join('')}
      ${(t.finishComplex || []).length >= 20 ? '' : `<button class="btn ghost" data-act="l-add" data-path="${p}.finishComplex" data-tpl="fc">+ Agregar un renglón</button>`}</div>`;
  }

  /* ---------- Unidades (dentro del edificio) ---------- */
  function tUnidades(t, i) {
    const s = stat(t.units);
    const floors = [...new Set(t.units.map((u) => u.floor))].sort((a, b) => b - a);
    const list = t.units
      .map((u, j) => ({ u, j }))
      .filter(({ u }) => unitFilter === 'all' || u.status === unitFilter)
      .sort((a, b) => b.u.floor - a.u.floor || String(a.u.code).localeCompare(String(b.u.code), 'es', { numeric: true }));
    return `<div class="panel"><div class="panel-head"><div><h2>Unidades de ${esc(t.name)}</h2>
        <p id="usum" class="muted">${unitsWord(s.total)} · ${s.available} disponibles · ${s.reserved} reservadas · ${s.sold} vendidas</p></div>
        <div class="row-actions"><button class="btn ghost" data-act="gen-units">Crear varias de una vez</button><button class="btn" data-act="add-unit">+ Nueva unidad</button></div></div>
      ${help('Para cambiar si una unidad está disponible, reservada o vendida, usá el menú de colores de la columna “Estado”. Para cambiar sus datos o fotos, tocá “Editar”.')}
      <div class="toolbar">
        <label class="fld"><span class="lbl">Mostrar</span><select id="selFilter">${[['all', 'Todas'], ['available', 'Solo disponibles'], ['reserved', 'Solo reservadas'], ['sold', 'Solo vendidas']].map(([k, l]) => `<option value="${k}" ${k === unitFilter ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        ${floors.length ? `<span class="grow"></span><div class="row-actions bulk">
          <label class="fld"><span class="lbl">Cambiar un piso entero</span><select id="bulkFloor">${floors.map((f) => `<option value="${f}">${f === 0 ? 'Planta baja' : 'Piso ' + f}</option>`).join('')}</select></label>
          <label class="fld"><span class="lbl">a</span><select id="bulkStatus">${statusOpts('available')}</select></label>
          <button class="btn ghost" data-act="bulk-floor">Aplicar</button></div>` : ''}
      </div>
      ${list.length ? `<div class="tablewrap"><table class="t"><thead><tr><th></th><th>Unidad</th><th>Piso</th><th>Tipo</th><th>m²</th><th>Precio</th><th>Estado</th><th></th></tr></thead><tbody>
      ${list.map(({ u, j }) => `<tr>
          <td>${u.photos[0] ? `<img class="thumb" src="${esc(u.photos[0])}" alt="">` : '<span class="thumb ph"></span>'}</td>
          <td><b>${esc(u.code) || '<i class="muted">sin nombre</i>'}</b></td><td>${u.floor === 0 ? 'PB' : u.floor + '°'}</td><td>${esc(u.type)}</td><td>${u.area ? fmtNum(u.area) : '—'}</td><td>${priceTxt(u.price, u.currency)}</td>
          <td><select class="stsel" style="--c:var(--st-${u.status})" data-path="towers.${i}.units.${j}.status" aria-label="Estado de la unidad ${esc(u.code)}">${statusOpts(u.status)}</select></td>
          <td><div class="row-actions"><button class="btn ghost" data-act="edit-unit" data-j="${j}">Editar</button><button class="btn danger" data-act="del-unit" data-j="${j}">Eliminar</button></div></td></tr>`).join('')}
      </tbody></table></div>` : emptyNote(t.units.length ? 'No hay unidades con ese filtro.' : 'Este edificio todavía no tiene unidades. Tocá “+ Nueva unidad”, o “Crear varias de una vez” si son muchas.')}
    </div>`;
  }

  function unitDialog(j) {
    const i = selTower;
    const u = D.towers[i].units[j];
    const p = `towers.${i}.units.${j}`;
    dlg.className = 'modal adm-dlg';
    dlg.innerHTML = `<div class="dlg-body" data-uj="${j}">
      <div class="dlg-head"><h2>${u.code ? 'Unidad ' + esc(u.code) : 'Nueva unidad'}</h2><button class="m-close inline" data-act="close-dlg" aria-label="Cerrar">×</button></div>
      <datalist id="dl-types"><option>Monoambiente</option><option>1 dormitorio</option><option>2 dormitorios</option><option>3 dormitorios</option><option>Loft 1 dormitorio</option><option>Local comercial</option><option>Cochera</option></datalist>
      <h3>Datos principales</h3>
      <div class="grid2">
        ${fld('Nombre de la unidad', p + '.code', u.code, { ph: 'Ej.: 2B', maxlen: 20, hint: 'Es lo que se ve en el cuadradito del edificio.' })}
        ${fld('Piso', p + '.floor', u.floor, { type: 'number', num: 1, min: 0, max: 99, inputmode: 'numeric', hint: 'Poné 0 si es planta baja.' })}
        ${sel('Estado', p + '.status', u.status, Object.entries(STATUS_LABEL))}
        ${fld('Zona o bloque (opcional)', p + '.block', u.block, { ph: 'Ej.: Bloque delantero', maxlen: 40, hint: 'Sirve si el edificio tiene partes separadas.' })}
      </div>
      <h3>Cómo es</h3>
      <div class="grid2">
        ${fld('Tipo', p + '.type', u.type, { ph: 'Ej.: 2 dormitorios', list: 'dl-types', maxlen: 40, hint: 'Podés elegir de la lista o escribir.' })}
        ${fld('Dormitorios', p + '.bedrooms', u.bedrooms, { type: 'number', num: 1, min: 0, max: 10, inputmode: 'numeric', hint: '0 si es monoambiente o local.' })}
        ${fld('Baños', p + '.bathrooms', u.bathrooms, { type: 'number', num: 1, min: 0, max: 10, inputmode: 'numeric' })}
        ${fld('Superficie total (m²)', p + '.area', u.area, { type: 'number', num: 1, min: 0, step: '0.01', inputmode: 'decimal' })}
        ${fld('Superficie cubierta (m²) — opcional', p + '.coveredArea', u.coveredArea, { type: 'number', num: 1, min: 0, step: '0.01', inputmode: 'decimal' })}
        ${fld('Balcón (m²) — opcional', p + '.balcony', u.balcony, { type: 'number', num: 1, min: 0, step: '0.01', inputmode: 'decimal' })}
        ${fld('Orientación — opcional', p + '.orientation', u.orientation, { ph: 'Ej.: Norte', maxlen: 30 })}
        ${fld('Descripción', p + '.description', u.description, { type: 'textarea', rows: 4, maxlen: 600, cls: 'full', hint: 'Por ejemplo las medidas de cada ambiente.' })}
      </div>
      <h3>Precio (opcional)</h3>
      <div class="grid2">
        ${fld('Precio', p + '.price', u.price, { type: 'number', num: 1, min: 0, step: '1000', inputmode: 'numeric', hint: 'Solo se ve en la página si activás “Mostrar precios” en Mi empresa. Si no, dice “Consultar”.' })}
        ${sel('Moneda', p + '.currency', u.currency, [['USD', 'Dólares (USD)'], ['ARS', 'Pesos (ARS)']])}
      </div>
      <h3>Fotos de la unidad</h3>
      ${photoGrid(u.photos, 'ph', 'photo', '', 'Subir fotos')}
      <h3>Plano</h3>
      <div class="coverbox">${u.plan && !/\.pdf/i.test(u.plan) ? `<img src="${esc(u.plan)}" alt="">` : u.plan ? '<span class="muted">Hay un PDF cargado</span>' : '<span class="muted">Sin plano</span>'}
        ${upBtn(u.plan ? 'Cambiar plano' : 'Subir plano', 'plan', '', false, 'image/*,application/pdf')}
        ${u.plan ? '<button class="btn ghost" data-act="rm-plan">Quitar plano</button>' : ''}</div>
      <div class="dlg-foot"><button class="btn" data-act="close-dlg">Listo</button></div></div>`;
    if (!dlg.open) dlg.showModal();
  }

  function genDialog() {
    dlg.className = 'modal adm-dlg';
    dlg.innerHTML = `<form class="dlg-body" id="genForm">
      <div class="dlg-head"><h2>Crear varias unidades de una vez</h2><button type="button" class="m-close inline" data-act="close-dlg" aria-label="Cerrar">×</button></div>
      ${help('Sirve para no cargar una por una. Se crean con los mismos datos y después editás cada una. Se llaman con el número de piso y una letra (1A, 1B, 2A…). Las que ya existan no se tocan.')}
      <div class="grid2">
        <label class="fld"><span class="lbl">Desde el piso</span><input name="from" type="number" value="1" min="0" max="99" required></label>
        <label class="fld"><span class="lbl">Hasta el piso</span><input name="to" type="number" value="3" min="0" max="99" required></label>
        <label class="fld"><span class="lbl">Unidades por piso</span><input name="per" type="number" value="2" min="1" max="8" required></label>
        <label class="fld"><span class="lbl">Estado de todas</span><select name="status">${statusOpts('available')}</select></label>
        <label class="fld"><span class="lbl">Tipo</span><input name="type" value="2 dormitorios"></label>
        <label class="fld"><span class="lbl">Dormitorios</span><input name="beds" type="number" value="2" min="0" max="10"></label>
        <label class="fld"><span class="lbl">Superficie total (m²)</span><input name="area" type="number" value="70" min="10" step="0.5"></label>
      </div>
      <div class="dlg-foot"><button type="button" class="btn ghost" data-act="close-dlg">Cancelar</button><button class="btn" type="submit">Crear unidades</button></div></form>`;
    dlg.showModal();
    $('#genForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(e.target));
      const t = towerOf();
      const have = new Set(t.units.map((u) => String(u.code).toLowerCase()));
      let n = 0;
      for (let fl = Number(f.from); fl <= Number(f.to); fl++) {
        for (let k = 0; k < Number(f.per); k++) {
          const code = `${fl}${String.fromCharCode(65 + k)}`;
          if (have.has(code.toLowerCase()) || t.units.length >= 500) continue;
          const area = Number(f.area);
          t.units.push({
            id: uid('u'), code, floor: fl, type: f.type, bedrooms: Number(f.beds), bathrooms: Math.max(1, Math.ceil(Number(f.beds) / 2)),
            area, coveredArea: 0, balcony: 0, orientation: '', price: 0, currency: 'USD', block: '', status: f.status, description: '', photos: [], plan: ''
          });
          n++;
        }
      }
      if (n) markDirty();
      dlg.close();
      toast(n ? `Listo: se crearon ${n} unidades.` : 'No se creó ninguna porque esos nombres ya existen.');
    });
  }

  /* ---------- Ubicación y cercanías (dentro del edificio) ---------- */
  function tUbicacion(t, i) {
    const p = `towers.${i}`;
    const hasMap = Number(t.lat) && Number(t.lng);
    const mine = D.nearby.map((x, idx) => ({ x, idx })).filter(({ x }) => x.towerId === t.id);
    const others = D.towers.filter((o) => o.id !== t.id && D.nearby.some((x) => x.towerId === o.id));
    return `<div class="panel"><h2>Ubicación en el mapa</h2>
      ${help(`La dirección que figura es <b>${esc(t.address || 'ninguna todavía')}</b> (se cambia en el paso 1). Tocá el botón y la página ubica el edificio en el mapa sola.`)}
      <div class="row-actions"><button class="btn" data-act="locate" data-i="${i}">Ubicar en el mapa por la dirección</button>
        <a class="btn ghost" target="_blank" rel="noopener" href="https://www.google.com/maps/search/${encodeURIComponent([t.address, D.company.city].filter(Boolean).join(', '))}">Ver en Google Maps</a></div>
      <div class="grid2" style="margin-top:1rem">
        ${fld('Latitud', p + '.lat', t.lat || '', { inputmode: 'decimal', ph: '-34.5646', hint: 'Se completa sola. Si no la encuentra, en Google Maps hacé clic derecho sobre el lugar y copiá los números.' })}
        ${fld('Longitud', p + '.lng', t.lng || '', { inputmode: 'decimal', ph: '-59.1127' })}
      </div>
      ${hasMap ? `<p class="ok-note">✓ Ubicación cargada.</p>` : emptyNote('Todavía no hay ubicación: la página no mostrará el mapa de este edificio.')}
      ${fld('Texto sobre la ubicación (opcional)', p + '.locationText', t.locationText, { type: 'textarea', rows: 3, maxlen: 300, hint: 'Aparece arriba del mapa. Por ejemplo: “A pasos de la plaza y del centro comercial”.' })}
    </div>
    <div class="panel"><div class="panel-head"><div><h2>Lugares cercanos a ${esc(t.name)}</h2>
      <p class="muted">Los lugares de este edificio, con distancia y tiempo desde la puerta.</p></div>
      <button class="btn" data-act="add-near">+ Agregar un lugar</button></div>
      ${help('Escribí el nombre del lugar, qué tipo es, a qué distancia queda y cuánto se tarda. Cada edificio tiene su propia lista.')}
      ${mine.length ? mine.map(({ x, idx }) => `<div class="itemcard"><div class="near-grid">
          ${fld('Lugar', `nearby.${idx}.name`, x.name, { ph: 'Ej.: Plaza Colón', maxlen: 80 })}
          <label class="fld"><span class="lbl">Tipo de lugar</span><select data-path="nearby.${idx}.category">${[...new Set([...CATEGORIES, x.category].filter(Boolean))].map((c) => `<option ${c === x.category ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></label>
          ${fld('Distancia', `nearby.${idx}.distance`, x.distance, { ph: '450 m  o  1,6 km', maxlen: 20 })}
          ${fld('Tiempo', `nearby.${idx}.time`, x.time, { ph: '6 min', maxlen: 20 })}
          ${sel('Cómo se llega', `nearby.${idx}.mode`, x.mode, [['walk', 'A pie'], ['car', 'En auto']])}</div>
          <div class="item-btns"><button class="btn danger" data-act="del-near" data-idx="${idx}">Quitar este lugar</button></div></div>`).join('') : emptyNote('Este edificio todavía no tiene lugares cercanos.')}
      ${others.length ? `<div class="copybox"><label class="fld"><span class="lbl">¿Tiene los mismos lugares que otro edificio?</span>
        <select id="copyFrom"><option value="">Elegí un edificio…</option>${others.map((o) => `<option value="${esc(o.id)}">${esc(o.name)}</option>`).join('')}</select></label>
        <button class="btn ghost" data-act="copy-near">Copiar sus lugares acá</button></div>` : ''}
    </div>`;
  }

  async function locate(i) {
    const t = D.towers[i];
    if (!String(t.address || '').trim()) { toast('Primero cargá la dirección en el paso 1.', true); return; }
    toast('Buscando la dirección…');
    const q = [t.address, D.company.city || ''].filter(Boolean).join(', ');
    try {
      const r = await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' + encodeURIComponent(q));
      const j = await r.json();
      if (!j.length) throw new Error('nf');
      t.lat = Math.round(Number(j[0].lat) * 1e7) / 1e7;
      t.lng = Math.round(Number(j[0].lon) * 1e7) / 1e7;
      markDirty();
      keepScroll(render);
      toast('Listo, ubicamos el edificio en el mapa. Revisá que sea el lugar correcto.');
    } catch (e) {
      toast('No pudimos encontrar esa dirección. Podés pegar la latitud y la longitud a mano (se copian desde Google Maps).', true);
    }
  }

  /* ---------- Loteos ---------- */
  const LO_STATUS = [
    ['hidden', 'Oculto', 'No se ve en la página.'],
    ['soon', 'Próximamente', 'Se ve una tarjeta con “Próximamente”, sin lotes.'],
    ['active', 'A la venta', 'Se ven los lotes con su estado.']
  ];
  function vLoteos() {
    return `<header><div><h1>Loteos</h1><p>Un loteo es un terreno dividido en lotes. Funciona igual que un edificio con sus unidades.</p></div>
      <button class="btn" data-act="add-loteo">+ Agregar un loteo</button></header>
      ${D.loteos.length ? D.loteos.map((o, i) => {
        const s = stat(o.lots);
        const st = LO_STATUS.find(([k]) => k === o.status) || LO_STATUS[1];
        return `<div class="panel rowcard">
          <div class="rc-img">${o.image ? `<img src="${esc(o.image)}" alt="">` : '<span class="muted">Sin foto</span>'}</div>
          <div class="rc-body"><h2>${esc(o.name)}</h2><p class="muted">${esc(o.subtitle || o.location || '')}</p>
            <p><span class="pill pill-${o.status}">${st[1]}</span> · ${s.total} lotes · ${s.available} disponibles</p></div>
          <div class="rc-act"><button class="btn" data-act="open-loteo" data-i="${i}">Editar</button><button class="btn danger" data-act="del-loteo" data-i="${i}">Eliminar</button></div></div>`;
      }).join('') : `<div class="panel">${emptyNote('Todavía no hay loteos. Tocá “+ Agregar un loteo”.')}</div>`}`;
  }
  function vLoteo() {
    const o = loteoOf();
    if (!o) return vLoteos();
    const body = lTab === 'datos' ? lDatos(o, selLoteo) : lLotes(o, selLoteo);
    return `<button class="back-link" data-act="go" data-to="loteos">← Volver a todos los loteos</button>
      <header><div><h1>${esc(o.name)}</h1><p>Completá los datos y, cuando estén listos los lotes, cambialo a “A la venta”.</p></div></header>
      ${tabsBar(LOTEO_TABS, lTab, 'data-ltab')}${body}<div class="step-nav">${stepNav(LOTEO_TABS, lTab, 'data-ltab')}</div>`;
  }
  function lDatos(o, i) {
    const p = `loteos.${i}`;
    return `<div class="panel"><h2>Cómo se muestra en la página</h2>
      <div class="radio-cards" role="radiogroup">${LO_STATUS.map(([k, l, d]) => `<label class="rcard ${o.status === k ? 'on' : ''}"><input type="radio" name="lo-status-${i}" data-path="${p}.status" value="${k}" ${o.status === k ? 'checked' : ''}><b>${l}</b><span>${d}</span></label>`).join('')}</div></div>
    <div class="panel"><h2>Datos del loteo</h2><div class="grid2">
      ${fld('Nombre', p + '.name', o.name, { ph: 'Ej.: La Esperada', maxlen: 80 })}
      ${fld('Frase corta (opcional)', p + '.subtitle', o.subtitle, { ph: 'Ej.: Barrio boutique', maxlen: 100 })}
      ${fld('Ubicación', p + '.location', o.location, { ph: 'Ej.: Luján, Buenos Aires', maxlen: 120 })}
      ${fld('Entrega o posesión', p + '.delivery', o.delivery, { ph: 'Ej.: Diciembre 2027', maxlen: 60 })}
      ${fld('Descripción', p + '.description', o.description, { type: 'textarea', cls: 'full', rows: 5, maxlen: 900 })}
    </div></div>
    <div class="panel"><h2>Foto del loteo</h2><div class="main-photo"><div class="mp-now">${o.image ? `<img src="${esc(o.image)}" alt="">` : '<span class="muted">Sin foto</span>'}</div>
      <div class="mp-act">${upBtn(o.image ? 'Cambiar foto' : 'Subir foto', 'loteo', `data-i="${i}"`)}${o.image ? `<button class="btn ghost" data-act="rm-loteo-img" data-i="${i}">Quitar foto</button>` : ''}</div></div></div>`;
  }
  function lLotes(o, i) {
    const s = stat(o.lots);
    const list = o.lots.map((l, j) => ({ l, j })).filter(({ l }) => lotFilter === 'all' || l.status === lotFilter)
      .sort((a, b) => (a.l.block || '').localeCompare(b.l.block || '', 'es', { numeric: true }) || String(a.l.code).localeCompare(String(b.l.code), 'es', { numeric: true }));
    return `<div class="panel"><div class="panel-head"><div><h2>Lotes de ${esc(o.name)}</h2>
      <p id="usum" class="muted">${s.total} lotes · ${s.available} disponibles · ${s.reserved} reservados · ${s.sold} vendidos</p></div>
      <div class="row-actions"><button class="btn ghost" data-act="gen-lots">Crear varios de una vez</button><button class="btn" data-act="add-lot">+ Nuevo lote</button></div></div>
      ${o.status !== 'active' ? `<p class="banner">Ojo: este loteo está en “${o.status === 'hidden' ? 'Oculto' : 'Próximamente'}”, por eso los lotes todavía no se ven en la página. Cuando quieras mostrarlos, andá al paso 1 y elegí “A la venta”.</p>` : ''}
      <div class="toolbar"><label class="fld"><span class="lbl">Mostrar</span><select id="selLotFilter">${[['all', 'Todos'], ['available', 'Solo disponibles'], ['reserved', 'Solo reservados'], ['sold', 'Solo vendidos']].map(([k, l]) => `<option value="${k}" ${k === lotFilter ? 'selected' : ''}>${l}</option>`).join('')}</select></label></div>
      ${list.length ? `<div class="tablewrap"><table class="t"><thead><tr><th>Lote</th><th>Manzana</th><th>m²</th><th>Frente x fondo</th><th>Precio</th><th>Estado</th><th></th></tr></thead><tbody>
      ${list.map(({ l, j }) => `<tr><td><b>${esc(l.code) || '<i class="muted">sin número</i>'}</b></td><td>${esc(l.block)}</td><td>${l.area ? fmtNum(l.area) : '—'}</td><td>${l.front ? fmtNum(l.front) : '—'} x ${l.depth ? fmtNum(l.depth) : '—'}</td><td>${priceTxt(l.price, l.currency)}</td>
        <td><select class="stsel" style="--c:var(--st-${l.status})" data-path="loteos.${i}.lots.${j}.status" aria-label="Estado del lote ${esc(l.code)}">${statusOpts(l.status)}</select></td>
        <td><div class="row-actions"><button class="btn ghost" data-act="edit-lot" data-j="${j}">Editar</button><button class="btn danger" data-act="del-lot" data-j="${j}">Eliminar</button></div></td></tr>`).join('')}
      </tbody></table></div>` : emptyNote(o.lots.length ? 'No hay lotes con ese filtro.' : 'Todavía no hay lotes. Tocá “Crear varios de una vez” para armar las manzanas, o “+ Nuevo lote”.')}</div>`;
  }
  function lotDialog(j) {
    const i = selLoteo;
    const l = D.loteos[i].lots[j];
    const p = `loteos.${i}.lots.${j}`;
    dlg.className = 'modal adm-dlg';
    dlg.innerHTML = `<div class="dlg-body" data-lj="${j}">
      <div class="dlg-head"><h2>${l.code ? 'Lote ' + esc(l.code) : 'Nuevo lote'}</h2><button class="m-close inline" data-act="close-dlg" aria-label="Cerrar">×</button></div>
      <div class="grid2">
        ${fld('Número del lote', p + '.code', l.code, { ph: 'Ej.: 12', maxlen: 20 })}
        ${fld('Manzana', p + '.block', l.block, { ph: 'Ej.: Manzana A', maxlen: 40 })}
        ${sel('Estado', p + '.status', l.status, Object.entries(STATUS_LABEL))}
        ${fld('Orientación — opcional', p + '.orientation', l.orientation, { ph: 'Ej.: Norte', maxlen: 30 })}
        ${fld('Superficie (m²)', p + '.area', l.area, { type: 'number', num: 1, min: 0, step: '0.01', inputmode: 'decimal' })}
        ${fld('Frente (m)', p + '.front', l.front, { type: 'number', num: 1, min: 0, step: '0.01', inputmode: 'decimal' })}
        ${fld('Fondo (m)', p + '.depth', l.depth, { type: 'number', num: 1, min: 0, step: '0.01', inputmode: 'decimal' })}
        ${fld('Precio — opcional', p + '.price', l.price, { type: 'number', num: 1, min: 0, step: '1000', inputmode: 'numeric', hint: 'Solo se ve si activás “Mostrar precios” en Mi empresa.' })}
        ${sel('Moneda', p + '.currency', l.currency, [['USD', 'Dólares (USD)'], ['ARS', 'Pesos (ARS)']])}
        ${fld('Descripción', p + '.description', l.description, { type: 'textarea', rows: 3, maxlen: 600, cls: 'full' })}
      </div>
      <h3>Fotos</h3>${photoGrid(l.photos, 'lph', 'lphoto', '', 'Subir fotos')}
      <h3>Plano o mensura</h3>
      <div class="coverbox">${l.plan && !/\.pdf/i.test(l.plan) ? `<img src="${esc(l.plan)}" alt="">` : l.plan ? '<span class="muted">Hay un PDF cargado</span>' : '<span class="muted">Sin plano</span>'}
        ${upBtn(l.plan ? 'Cambiar' : 'Subir', 'lplan', '', false, 'image/*,application/pdf')}${l.plan ? '<button class="btn ghost" data-act="rm-lplan">Quitar</button>' : ''}</div>
      <div class="dlg-foot"><button class="btn" data-act="close-dlg">Listo</button></div></div>`;
    if (!dlg.open) dlg.showModal();
  }
  function genLotsDialog() {
    dlg.className = 'modal adm-dlg';
    dlg.innerHTML = `<form class="dlg-body" id="genLots">
      <div class="dlg-head"><h2>Crear varios lotes de una vez</h2><button type="button" class="m-close inline" data-act="close-dlg" aria-label="Cerrar">×</button></div>
      ${help('Arma manzanas (A, B, C…) con lotes numerados, todos iguales. Después editás los que sean distintos.')}
      <div class="grid2">
        <label class="fld"><span class="lbl">Cantidad de manzanas</span><input name="mz" type="number" value="3" min="1" max="26" required></label>
        <label class="fld"><span class="lbl">Lotes por manzana</span><input name="per" type="number" value="12" min="1" max="60" required></label>
        <label class="fld"><span class="lbl">Superficie de cada lote (m²)</span><input name="area" type="number" value="600" min="1" step="0.5"></label>
        <label class="fld"><span class="lbl">Estado de todos</span><select name="status">${statusOpts('available')}</select></label>
        <label class="fld"><span class="lbl">Frente (m)</span><input name="front" type="number" value="20" min="0" step="0.1"></label>
        <label class="fld"><span class="lbl">Fondo (m)</span><input name="depth" type="number" value="30" min="0" step="0.1"></label>
      </div>
      <div class="dlg-foot"><button type="button" class="btn ghost" data-act="close-dlg">Cancelar</button><button class="btn" type="submit">Crear lotes</button></div></form>`;
    dlg.showModal();
    $('#genLots').addEventListener('submit', (e) => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(e.target));
      const o = loteoOf();
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
      if (n) markDirty();
      dlg.close();
      toast(n ? `Listo: se crearon ${n} lotes.` : 'No se creó ninguno porque esos números ya existen.');
    });
  }

  /* ---------- Avisos ---------- */
  function vNotices() {
    const list = D.notices.map((n, i) => ({ n, i })).sort((a, b) => (a.n.date < b.n.date ? 1 : -1));
    return `<header><div><h1>Avisos</h1><p>Mensajes para tus clientes: novedades, promociones, fechas de visita. Aparecen en una sección “Avisos” de la página.</p></div>
      <button class="btn" data-act="add-notice">+ Nuevo aviso</button></header>
      ${list.length ? list.map(({ n, i }) => `<div class="panel"><div class="grid2">
          ${fld('Título', `notices.${i}.title`, n.title, { ph: 'Ej.: Visita a la obra el sábado', maxlen: 120 })}
          ${fld('Fecha', `notices.${i}.date`, n.date, { type: 'date' })}
          ${fld('Texto', `notices.${i}.body`, n.body, { type: 'textarea', cls: 'full', rows: 3, maxlen: 1200 })}</div>
          <div class="checks">
            <label class="check"><input type="checkbox" data-path="notices.${i}.active" ${n.active ? 'checked' : ''}> <span>Mostrar en la página</span></label>
            <label class="check"><input type="checkbox" data-path="notices.${i}.pinned" ${n.pinned ? 'checked' : ''}> <span>Destacar arriba de todo (barra superior)</span></label></div>
          <div class="row-actions end"><button class="btn danger" data-act="del-notice" data-i="${i}">Eliminar aviso</button></div></div>`).join('')
        : `<div class="panel">${emptyNote('Todavía no hay avisos. Tocá “+ Nuevo aviso”.')}</div>`}`;
  }

  /* ---------- Mi empresa ---------- */
  function vCompany() {
    const c = D.company;
    while (c.stats.length < 3) c.stats.push({ value: '', label: '' });
    return `<header><div><h1>Mi empresa</h1><p>Los datos generales que se ven en toda la página.</p></div></header>
      <div class="panel"><h2>Portada (lo primero que se ve)</h2><div class="grid2">
        ${fld('Nombre de la empresa', 'company.name', c.name, { maxlen: 80 })}
        ${fld('Frase corta', 'company.tagline', c.tagline, { ph: 'Ej.: Viví la mejor vista de Luján', maxlen: 160 })}
        ${fld('Título grande de la portada', 'company.heroTitle', c.heroTitle, { type: 'textarea', cls: 'full', rows: 2, maxlen: 140 })}
        ${fld('Texto debajo del título', 'company.heroText', c.heroText, { type: 'textarea', cls: 'full', rows: 3, maxlen: 400 })}
      </div>
      <h3 style="margin-top:1.4rem">Foto de portada</h3>
      <div class="main-photo"><div class="mp-now">${c.heroImage ? `<img src="${esc(c.heroImage)}" alt="">` : '<span class="muted">Sin foto: se usa la del primer edificio</span>'}</div>
        <div class="mp-act">${upBtn(c.heroImage ? 'Cambiar foto de portada' : 'Subir foto de portada', 'hero')}${c.heroImage ? '<button class="btn ghost" data-act="rm-hero">Quitar foto</button>' : ''}</div></div></div>
      <div class="panel"><h2>Números destacados</h2>${help('Tres datos cortos que se ven debajo de la portada. Por ejemplo “14” y “departamentos”.')}
        ${c.stats.slice(0, 3).map((s, k) => `<div class="grid2 stat-row">${fld('Número', `company.stats.${k}.value`, s.value, { ph: '14', maxlen: 20 })}${fld('Qué es', `company.stats.${k}.label`, s.label, { ph: 'departamentos', maxlen: 50 })}</div>`).join('')}</div>
      <div class="panel"><h2>Quiénes somos</h2>
        ${fld('Texto', 'company.about', c.about, { type: 'textarea', rows: 7, maxlen: 1800, hint: 'Dejá una línea en blanco para separar párrafos.' })}</div>
      <div class="panel"><h2>Contacto</h2><div class="grid2">
        ${fld('Teléfono', 'company.phone', c.phone, { ph: '+54 9 11 5555-5555', maxlen: 40 })}
        ${fld('WhatsApp', 'company.whatsapp', c.whatsapp, { inputmode: 'numeric', maxlen: 20, ph: '5491155555555', hint: 'Solo números, con el 54 del país y el 9. Sin espacios ni signos. Es el número que usan los botones de “Consultar”.' })}
        ${fld('Dirección de las oficinas', 'company.office', c.office, { ph: 'Ej.: Lavalle 316, Luján', maxlen: 160 })}
        ${fld('Ciudad o zona', 'company.city', c.city, { ph: 'Ej.: Luján, Buenos Aires', maxlen: 80 })}
        ${fld('Email', 'company.email', c.email, { type: 'email', maxlen: 120 })}
        ${fld('Horarios de atención', 'company.hours', c.hours, { ph: 'Ej.: Lunes a viernes de 9 a 18', maxlen: 120 })}
        ${fld('Título de la sección “Ubicación”', 'company.locationTitle', c.locationTitle, { ph: 'Ej.: En el corazón de Luján', maxlen: 80, hint: 'La dirección y el mapa de cada edificio se cargan dentro de cada edificio.' })}
      </div></div>
      <div class="panel"><h2>Precios</h2>
        <label class="switch"><input type="checkbox" data-path="company.showPrices" ${c.showPrices ? 'checked' : ''}><span class="knob"></span>
          <span><b>Mostrar los precios en la página</b><br><span class="muted">Apagado: todas las unidades y lotes dicen “Consultar”. Es lo recomendable si no querés publicar precios.</span></span></label></div>`;
  }

  /* ---------- Colores ---------- */
  function vTheme() {
    const t = D.theme;
    const sw = [
      ['primary', 'Color principal', 'Botones y detalles'],
      ['dark', 'Color oscuro', 'Títulos y pie de página'],
      ['accent', 'Color claro', 'Detalles'],
      ['available', 'Disponible', 'Unidades a la venta'],
      ['reserved', 'Reservada', 'Unidades con seña'],
      ['sold', 'Vendida', 'Unidades vendidas']
    ];
    return `<header><div><h1>Colores</h1><p>Elegí una combinación y se prueba al instante en este panel. En la página se ve cuando publiques.</p></div></header>
      <div class="panel"><h2>Combinaciones listas</h2><div class="presets">
        ${PRESETS.map(([n, c], k) => `<button class="preset" data-act="preset" data-k="${k}"><span class="pr-sw"><i style="background:${c.primary}"></i><i style="background:${c.dark}"></i><i style="background:${c.accent}"></i></span><b>${n}</b></button>`).join('')}
      </div></div>
      <div class="panel"><details><summary>Elegir los colores uno por uno (opcional)</summary><div class="swatches" style="margin-top:1rem">
        ${sw.map(([k, l, d]) => `<label class="sw"><input type="color" data-path="theme.${k}" value="${t[k]}"><span><b>${l}</b><span>${d}</span></span></label>`).join('')}
      </div></details></div>
      <div class="panel"><h2>Así quedan</h2><div class="row-actions" style="gap:1rem"><span class="chip s-available">Disponible</span><span class="chip s-reserved">Reservada</span><span class="chip s-sold">Vendida</span><a class="btn" href="javascript:void(0)">Botón principal</a></div></div>`;
  }

  /* ---------- Edición de campos ---------- */
  function onInput(e) {
    const el = e.target.closest('[data-path]');
    if (!el) return;
    let v;
    if (el.type === 'checkbox') v = el.checked;
    else if (el.type === 'radio') { if (!el.checked) return; v = el.value; }
    else if (el.hasAttribute('data-num')) v = el.value === '' ? 0 : Number(String(el.value).replace(',', '.')) || 0;
    else v = el.value;
    const path = el.dataset.path;
    // Latitud / longitud: acepta coma decimal y también pegar “lat, lng” juntos en el primer campo.
    if (/\.(lat|lng)$/.test(path)) {
      const nums = String(v).match(/-?\d+(?:[.,]\d+)?/g) || [];
      const toN = (s) => Number(String(s).replace(',', '.'));
      if (/\.lat$/.test(path) && nums.length >= 2 && /[\s;]|,\s/.test(String(v).trim())) {
        const parts = String(v).split(/[;\s]+|,\s+/).filter(Boolean);
        if (parts.length >= 2 && Number.isFinite(toN(parts[0])) && Number.isFinite(toN(parts[1]))) {
          setPath(D, path, toN(parts[0])); setPath(D, path.replace(/\.lat$/, '.lng'), toN(parts[1]));
          markDirty(); keepScroll(render); return;
        }
      }
      v = nums.length ? toN(nums[0]) : 0;
    }
    if (/^company\.whatsapp$/.test(path)) v = String(v).replace(/[^\d]/g, '');
    setPath(D, path, v);
    markDirty();
    const m = path.match(/^towers\.(\d+)\.(progress|floors|shape)$/);
    if (m) {
      const i = Number(m[1]);
      const pv = $('#pv-' + i);
      if (m[2] === 'progress' && pv) pv.textContent = v + '%';
      const pr = $('#prev-' + i);
      if (pr) pr.innerHTML = towerSVG(D.towers[i], 'p' + i);
    }
    if (path.startsWith('theme.')) applyTheme(D.theme);
    if (/\.status$/.test(path) && /\.(units|lots)\.\d+\.status$/.test(path)) {
      el.style.setProperty('--c', `var(--st-${v})`);
      const u = $('#usum');
      if (u) {
        if (/^towers/.test(path)) { const s = stat(towerOf().units); u.textContent = `${unitsWord(s.total)} · ${s.available} disponibles · ${s.reserved} reservadas · ${s.sold} vendidas`; }
        else { const s = stat(loteoOf().lots); u.textContent = `${s.total} lotes · ${s.available} disponibles · ${s.reserved} reservados · ${s.sold} vendidos`; }
      }
    }
    if (/^loteos\.\d+\.status$/.test(path)) {
      view.querySelectorAll('.rcard').forEach((c) => c.classList.toggle('on', c.querySelector('input').checked));
    }
    if (/\.(name|code)$/.test(path)) {
      const h = view.querySelector('header h1');
      if (h && /^(towers|loteos)\.\d+\.name$/.test(path)) h.textContent = v || 'Sin nombre';
    }
  }
  view.addEventListener('input', onInput);
  view.addEventListener('change', onInput);
  dlg.addEventListener('input', onInput);
  dlg.addEventListener('change', onInput);

  view.addEventListener('change', (e) => {
    if (e.target.id === 'selFilter') { unitFilter = e.target.value; keepScroll(render); }
    else if (e.target.id === 'selLotFilter') { lotFilter = e.target.value; keepScroll(render); }
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
    if (blob.size > 4 * 1024 * 1024) throw new Error(`“${file.name}” pesa más de 4 MB. Probá con una foto más liviana.`);
    const r = await authApi('/api/upload', { method: 'POST', headers: auth({ 'Content-Type': 'application/octet-stream' }), body: blob });
    return r.url;
  }
  async function onUpload(e) {
    const inp = e.target.closest('[data-upload]');
    if (!inp || !inp.files.length) return;
    const kind = inp.dataset.upload;
    const files = [...inp.files];
    const i = Number(inp.dataset.i);
    const k = Number(inp.dataset.k);
    toast(files.length > 1 ? `Subiendo ${files.length} archivos…` : 'Subiendo…');
    try {
      if (kind === 'cover') D.towers[i].image = await upload(files[0]);
      else if (kind === 'hero') D.company.heroImage = await upload(files[0]);
      else if (kind === 'gallery') {
        const t = D.towers[i];
        t.gallery = t.gallery || [];
        for (const f of files) if (t.gallery.length < 16) t.gallery.push(await upload(f));
      } else if (kind === 'fplan') {
        const t = D.towers[i];
        t.floorPlans = t.floorPlans || [];
        for (const f of files) if (t.floorPlans.length < 12) t.floorPlans.push({ label: f.name.replace(/\.[^.]+$/, '').slice(0, 40), src: await upload(f) });
      } else if (kind === 'bphoto') D.towers[i].blocks[k].image = await upload(files[0]);
      else if (kind === 'loteo') D.loteos[i].image = await upload(files[0]);
      else if (kind === 'lphoto' || kind === 'lplan') {
        const lj = Number($('[data-lj]', dlg).dataset.lj);
        const l = loteoOf().lots[lj];
        if (kind === 'lplan') l.plan = await upload(files[0]);
        else for (const f of files) if (l.photos.length < 12) l.photos.push(await upload(f));
        markDirty();
        lotDialog(lj);
        toast('Listo, se subió.');
        inp.value = '';
        return;
      } else {
        const j = Number($('[data-uj]', dlg).dataset.uj);
        const u = towerOf().units[j];
        if (kind === 'plan') u.plan = await upload(files[0]);
        else for (const f of files) if (u.photos.length < 12) u.photos.push(await upload(f));
        markDirty();
        unitDialog(j);
        toast('Listo, se subió.');
        inp.value = '';
        return;
      }
      markDirty();
      keepScroll(render);
      toast('Listo, se subió.');
    } catch (err) {
      toast(err.message || 'No se pudo subir. Probá de nuevo.', true);
    }
    inp.value = '';
  }
  view.addEventListener('change', onUpload);
  dlg.addEventListener('change', onUpload);

  /* ---------- Acciones ---------- */
  function newTower() {
    return { id: uid('t'), name: 'Edificio nuevo', shape: 'slab', address: '', description: '', floors: 5, progress: 0, delivery: 'A confirmar', tag: '', locationText: '', lat: 0, lng: 0, image: '', gallery: [], highlights: [], blocks: [], finishUnits: [], finishComplex: [], floorPlans: [], units: [] };
  }
  function onClick(e) {
    const tabB = e.target.closest('[data-btab]');
    if (tabB) { bTab = tabB.dataset.btab; render(); window.scrollTo(0, 0); return; }
    const tabL = e.target.closest('[data-ltab]');
    if (tabL) { lTab = tabL.dataset.ltab; render(); window.scrollTo(0, 0); return; }
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act;
    const i = Number(b.dataset.i);
    const j = Number(b.dataset.j);
    const k = Number(b.dataset.k);
    const t = towerOf() || {};
    const udlg = () => Number($('[data-uj]', dlg).dataset.uj);
    const ldlg = () => Number($('[data-lj]', dlg).dataset.lj);
    const swap = (arr, a, bb) => { if (bb >= 0 && bb < arr.length) { [arr[a], arr[bb]] = [arr[bb], arr[a]]; markDirty(); return true; } return false; };

    switch (act) {
      case 'close-dlg': dlg.close(); break;
      case 'go': go(b.dataset.to); break;
      case 'go-units': if (!D.towers.length) { toast('Primero agregá un edificio.'); go('towers'); break; } selTower = Math.min(selTower, D.towers.length - 1); bTab = 'unidades'; go('tower'); break;
      case 'open-tower': selTower = i; bTab = 'datos'; go('tower'); break;
      case 'add-tower': {
        D.towers.push(newTower());
        selTower = D.towers.length - 1; bTab = 'datos';
        markDirty(); go('tower');
        toast('Edificio creado. Completá sus datos.');
        break;
      }
      case 'del-tower':
        if (confirm(`¿Eliminar el edificio “${D.towers[i].name}” con todas sus unidades y lugares cercanos?\n\nRecién desaparece de la página cuando publiques.`)) {
          const id = D.towers[i].id;
          D.towers.splice(i, 1);
          D.nearby = D.nearby.filter((p) => p.towerId !== id);
          selTower = 0;
          markDirty();
          go('towers');
        }
        break;
      case 'rm-cover': D.towers[i].image = ''; markDirty(); keepScroll(render); break;
      case 'rm-bphoto': D.towers[i].blocks[k].image = ''; markDirty(); keepScroll(render); break;
      case 'rm-hero': D.company.heroImage = ''; markDirty(); keepScroll(render); break;
      case 'rm-loteo-img': D.loteos[i].image = ''; markDirty(); keepScroll(render); break;

      // Listas genéricas
      case 'l-add': {
        const arr = getPath(D, b.dataset.path);
        arr.push(TEMPLATES[b.dataset.tpl]());
        markDirty();
        render.focus = b.dataset.path + '.' + (arr.length - 1);
        keepScroll(render);
        break;
      }
      case 'l-del': { getPath(D, b.dataset.path).splice(k, 1); markDirty(); keepScroll(render); break; }
      case 'l-up': if (swap(getPath(D, b.dataset.path), k, k - 1)) keepScroll(render); break;
      case 'l-down': if (swap(getPath(D, b.dataset.path), k, k + 1)) keepScroll(render); break;

      // Galería del edificio
      case 'g-del': t.gallery.splice(k, 1); markDirty(); keepScroll(render); break;
      case 'g-left': if (swap(t.gallery, k, k - 1)) keepScroll(render); break;
      case 'g-right': if (swap(t.gallery, k, k + 1)) keepScroll(render); break;

      // Unidades
      case 'add-unit': {
        const f = t.units.length ? Math.max(...t.units.map((u) => u.floor)) : 1;
        t.units.push({ id: uid('u'), code: '', floor: f, type: '2 dormitorios', bedrooms: 2, bathrooms: 1, area: 0, coveredArea: 0, balcony: 0, orientation: '', block: '', price: 0, currency: 'USD', status: 'available', description: '', photos: [], plan: '' });
        markDirty(); unitDialog(t.units.length - 1); break;
      }
      case 'edit-unit': unitDialog(j); break;
      case 'del-unit':
        if (confirm(`¿Eliminar la unidad ${t.units[j].code || 'sin nombre'}?`)) { t.units.splice(j, 1); markDirty(); keepScroll(render); }
        break;
      case 'gen-units': genDialog(); break;
      case 'bulk-floor': {
        const fl = Number($('#bulkFloor').value);
        const st = $('#bulkStatus').value;
        let n = 0;
        t.units.forEach((u) => { if (u.floor === fl) { u.status = st; n++; } });
        markDirty(); keepScroll(render); toast(`${fl === 0 ? 'Planta baja' : 'Piso ' + fl}: ${unitsWord(n)} marcada${n === 1 ? '' : 's'} como ${STATUS_LABEL[st].toLowerCase()}.`); break;
      }
      case 'ph-del': { t.units[udlg()].photos.splice(k, 1); markDirty(); unitDialog(udlg()); break; }
      case 'ph-left':
      case 'ph-right': { const u = udlg(); if (swap(t.units[u].photos, k, act === 'ph-left' ? k - 1 : k + 1)) unitDialog(u); break; }
      case 'rm-plan': { const u = udlg(); t.units[u].plan = ''; markDirty(); unitDialog(u); break; }

      // Ubicación y lugares cercanos
      case 'locate': locate(i); break;
      case 'add-near':
        D.nearby.push({ id: uid('np'), towerId: t.id, name: '', category: 'Servicios', distance: '', time: '', mode: 'walk' });
        markDirty(); render.focus = 'nearby.' + (D.nearby.length - 1) + '.name'; keepScroll(render); break;
      case 'del-near': D.nearby.splice(Number(b.dataset.idx), 1); markDirty(); keepScroll(render); break;
      case 'copy-near': {
        const from = $('#copyFrom').value;
        if (!from) { toast('Elegí de qué edificio querés copiar.', true); break; }
        const src = D.nearby.filter((p) => p.towerId === from);
        const have = new Set(D.nearby.filter((p) => p.towerId === t.id).map((p) => p.name.toLowerCase()));
        let n = 0;
        src.forEach((p) => { if (!have.has(p.name.toLowerCase())) { D.nearby.push({ ...p, id: uid('np'), towerId: t.id }); n++; } });
        markDirty(); keepScroll(render);
        toast(n ? `Se copiaron ${n} lugares. Revisá las distancias: pueden ser distintas.` : 'Ese edificio no tiene lugares nuevos para copiar.');
        break;
      }

      // Avisos
      case 'add-notice':
        D.notices.unshift({ id: uid('n'), title: '', body: '', date: new Date().toISOString().slice(0, 10), pinned: false, active: true });
        markDirty(); go('notices'); render.focus = 'notices.0.title'; render(); break;
      case 'del-notice':
        if (confirm('¿Eliminar este aviso?')) { D.notices.splice(i, 1); markDirty(); keepScroll(render); }
        break;

      // Loteos y lotes
      case 'add-loteo':
        D.loteos.push({ id: uid('lo'), name: 'Loteo nuevo', subtitle: '', location: '', description: '', status: 'soon', image: '', delivery: '', lots: [] });
        selLoteo = D.loteos.length - 1; lTab = 'datos'; markDirty(); go('loteo'); toast('Loteo creado. Completá sus datos.'); break;
      case 'open-loteo': selLoteo = i; lTab = 'datos'; go('loteo'); break;
      case 'del-loteo':
        if (confirm(`¿Eliminar el loteo “${D.loteos[i].name}” con todos sus lotes?\n\nRecién desaparece de la página cuando publiques.`)) { D.loteos.splice(i, 1); selLoteo = 0; markDirty(); go('loteos'); }
        break;
      case 'add-lot': {
        const o = loteoOf();
        const last = o.lots[o.lots.length - 1];
        o.lots.push({ id: uid('l'), code: '', block: last ? last.block : 'Manzana A', area: last ? last.area : 0, front: last ? last.front : 0, depth: last ? last.depth : 0, orientation: '', price: 0, currency: 'USD', status: 'available', description: '', photos: [], plan: '' });
        markDirty(); lotDialog(o.lots.length - 1); break;
      }
      case 'edit-lot': lotDialog(j); break;
      case 'del-lot': {
        const o = loteoOf();
        if (confirm(`¿Eliminar el lote ${o.lots[j].code || 'sin número'}?`)) { o.lots.splice(j, 1); markDirty(); keepScroll(render); }
        break;
      }
      case 'gen-lots': genLotsDialog(); break;
      case 'lph-del': { const l = ldlg(); loteoOf().lots[l].photos.splice(k, 1); markDirty(); lotDialog(l); break; }
      case 'lph-left':
      case 'lph-right': { const l = ldlg(); if (swap(loteoOf().lots[l].photos, k, act === 'lph-left' ? k - 1 : k + 1)) lotDialog(l); break; }
      case 'rm-lplan': { const l = ldlg(); loteoOf().lots[l].plan = ''; markDirty(); lotDialog(l); break; }

      case 'preset': Object.assign(D.theme, PRESETS[k][1]); applyTheme(D.theme); markDirty(); keepScroll(render); toast('Combinación elegida. Publicá para verla en la página.'); break;
    }
  }
  view.addEventListener('click', onClick);
  $('.main').addEventListener('click', (e) => { if (!view.contains(e.target) && e.target.closest('[data-act]')) onClick(e); });
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg) dlg.close();
    else onClick(e);
  });
  dlg.addEventListener('close', () => keepScroll(render));

  /* ---------- Inicio ---------- */
  if (token) start();
  else $('#login').hidden = false;
})();
