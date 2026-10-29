(function () {
  const { opts, esc, STATUS_LABEL, money, fmtDate, applyTheme, stat, api } = window.C;
  const $ = (s, r = document) => r.querySelector(s);

  let D = null;
  const state = { towerId: null, status: 'all', beds: 'all', showAll: false, lot: {} };

  const floorName = (f) => (f === 0 ? 'PB' : f + '°');
  const floorLong = (f) => (f === 0 ? 'Planta baja' : 'Piso ' + f);
  const fmtArea = (n) => (n ? String(Number(n)).replace('.', ',') + ' m²' : '—');
  const paras = (s) => String(s || '').split(/\n{2,}/).map((p) => `<p>${esc(p)}</p>`).join('');

  /* ---------- Carga ---------- */
  api('/api/data')
    .then((d) => {
      D = d;
      D.nearby = D.nearby || [];
      D.loteos = D.loteos || [];
      boot();
    })
    .catch((err) => {
      console.error('Quinzo: error al cargar', err);
      $('#obrasList').innerHTML = '<div class="skeleton">No pudimos cargar los datos. Probá recargar la página.</div>';
    });

  function boot() {
    applyTheme(D.theme);
    opts.showPrices = !!D.company.showPrices;
    const c = D.company;
    document.title = `${c.name} · ${(D.towers[0] || {}).name || 'Departamentos'} en ${(c.city || '').split(',')[0] || 'Argentina'}`;
    $('#brand').innerHTML = `<span class="brand-mark" aria-hidden="true">Q</span><span class="brand-name">${esc(c.name)}</span>`;
    renderHero();
    renderTopbar();
    renderFacts();
    renderBuildings();
    state.towerId = (D.towers[0] || {}).id;
    renderExplorer();
    renderFinishes();
    renderLocation();
    renderNearby();
    renderLoteos();
    renderNotices();
    renderAbout();
    renderContact();
    renderFooter();
    wireNav();
    observe();
    const hash = location.hash;
    if (hash && hash.length > 1) setTimeout(() => { const el = document.getElementById(hash.slice(1)); if (el) el.scrollIntoView(); }, 60);
  }

  function waLink(text) {
    const n = D.company.whatsapp;
    return n ? `https://wa.me/${n}?text=${encodeURIComponent(text)}` : `mailto:${esc(D.company.email)}?subject=Consulta&body=${encodeURIComponent(text)}`;
  }

  /* ---------- Portada ---------- */
  function renderHero() {
    const c = D.company;
    const img = c.heroImage || (D.towers[0] || {}).image || '';
    if (img) $('#heroBg').style.backgroundImage = `url("${img.replace(/"/g, '%22')}")`;
    else $('#hero').classList.add('no-img');
    $('#heroEyebrow').textContent = [c.address, (c.city || '').split(',')[0]].filter(Boolean).join(' · ');
    $('#heroTitle').textContent = c.heroTitle || c.name;
    $('#heroText').textContent = c.heroText || c.tagline || '';
  }

  /* ---------- Aviso fijado ---------- */
  function activeNotices() {
    return (D.notices || [])
      .filter((n) => n.active)
      .sort((a, b) => (b.pinned - a.pinned) || (a.date < b.date ? 1 : -1));
  }
  function renderTopbar() {
    const n = activeNotices().find((x) => x.pinned);
    const el = $('#topbar');
    if (!n) return;
    el.innerHTML = `<div class="wrap"><strong>${esc(n.title)}</strong><a href="#avisos">Ver aviso</a></div>`;
    el.hidden = false;
  }

  /* ---------- Números ---------- */
  function renderFacts() {
    const items = D.company.stats.filter((s) => s.value).map((s) => ({ v: s.value, l: s.label }));
    $('#facts').innerHTML = items.map((i) => `<div class="fact"><b>${esc(i.v)}</b><span>${esc(i.l)}</span></div>`).join('');
    if (!items.length) $('.facts').hidden = true;
  }

  /* ---------- Lightbox simple ---------- */
  const modal = $('#modal');
  function openGallery(list, start) {
    let cur = start || 0;
    modal.className = 'modal lightbox';
    modal.innerHTML = `<button class="m-close" aria-label="Cerrar" id="mClose">×</button>
      <div class="lb-stage" id="lbStage"></div>
      <div class="lb-bar"><button class="btn ghost-light sm" id="lbPrev" aria-label="Anterior">‹</button><span id="lbCap"></span><button class="btn ghost-light sm" id="lbNext" aria-label="Siguiente">›</button></div>`;
    function paint() {
      const it = list[cur];
      $('#lbStage').innerHTML = `<img src="${esc(it.src)}" alt="${esc(it.label || '')}">`;
      $('#lbCap').textContent = `${it.label ? it.label + ' · ' : ''}${cur + 1}/${list.length}`;
    }
    paint();
    $('#lbPrev').onclick = () => { cur = (cur - 1 + list.length) % list.length; paint(); };
    $('#lbNext').onclick = () => { cur = (cur + 1) % list.length; paint(); };
    $('#mClose').onclick = () => modal.close();
    if (!modal.open) modal.showModal();
  }
  document.addEventListener('keydown', (e) => {
    if (!modal.open || !modal.classList.contains('lightbox')) return;
    if (e.key === 'ArrowLeft') $('#lbPrev').click();
    if (e.key === 'ArrowRight') $('#lbNext').click();
  });

  /* ---------- Edificio ---------- */
  function renderBuildings() {
    if (!D.towers.length) {
      $('#obrasList').innerHTML = '<p class="empty">Pronto vamos a publicar nuestros proyectos.</p>';
      return;
    }
    $('#obrasList').innerHTML = D.towers
      .map((t, i) => {
        const s = stat(t.units);
        const gal = (t.gallery || []).map((src, k) => ({ src, label: t.name }));
        const plans = t.floorPlans || [];
        return `<article class="obra" id="obra-${esc(t.id)}">
          <header class="b-head">
            <div><p class="eyebrow dark">El edificio</p><h2>${esc(t.name)}</h2><p class="obra-addr">${esc(t.address)}</p></div>
            <dl class="obra-meta">
              <div><dt>Pisos</dt><dd>${t.floors} + PB</dd></div>
              <div><dt>Unidades</dt><dd>${s.total}</dd></div>
              <div><dt>Entrega</dt><dd>${esc(t.delivery || 'A confirmar')}</dd></div>
            </dl>
          </header>
          <div class="b-main">
            ${t.image ? `<button class="b-img" data-gal="${i}" data-k="0" aria-label="Ampliar foto"><img src="${esc(t.image)}" alt="Render de ${esc(t.name)}" loading="lazy"></button>` : ''}
            <div class="b-text">${t.description ? `<p class="lead">${esc(t.description)}</p>` : ''}
              ${t.progress > 0 ? `<div class="progress"><div class="progress-top"><span>Avance de obra</span><b>${t.progress}%</b></div><div class="bar"><i style="--w:${t.progress}%"></i></div></div>` : ''}
            </div>
          </div>
          ${(t.highlights || []).length ? `<div class="hl">${t.highlights.map((h) => `<div class="hl-i"><h3>${esc(h.title)}</h3><p>${esc(h.text)}</p></div>`).join('')}</div>` : ''}
          ${(t.blocks || []).length ? `<div class="blocks"><h3 class="sub">Tipología</h3><div class="blocks-grid">${t.blocks.map((b, n) => `<div class="blk">
              ${b.image ? `<img src="${esc(b.image)}" alt="${esc(b.name)}" loading="lazy">` : ''}
              <div><span class="num">/ 0${n + 1}</span><h3>${esc(b.name)}</h3><p>${esc(b.text)}</p>${b.levels ? `<p class="levels">${esc(b.levels)}</p>` : ''}</div></div>`).join('')}</div></div>` : ''}
          ${gal.length ? `<div class="gal"><h3 class="sub">Galería</h3><div class="gal-row">${gal.map((g, k) => `<button data-gal="${i}" data-k="${k}" aria-label="Ver foto ${k + 1}"><img src="${esc(g.src)}" alt="" loading="lazy"></button>`).join('')}</div></div>` : ''}
          ${plans.length ? `<div class="gal"><h3 class="sub">Plantas</h3><div class="plans-row">${plans.map((p, k) => `<button data-plan="${i}" data-k="${k}"><img src="${esc(p.src)}" alt="" loading="lazy"><span>${esc(p.label)}</span></button>`).join('')}</div></div>` : ''}
        </article>`;
      })
      .join('');
    $('#obrasList').addEventListener('click', (e) => {
      const g = e.target.closest('[data-gal]');
      if (g) {
        const t = D.towers[Number(g.dataset.gal)];
        const list = (t.gallery || []).map((src) => ({ src, label: t.name }));
        if (g.classList.contains('b-img') && t.image) { openGallery([{ src: t.image, label: t.name }], 0); return; }
        openGallery(list, Number(g.dataset.k));
        return;
      }
      const p = e.target.closest('[data-plan]');
      if (p) openGallery(D.towers[Number(p.dataset.plan)].floorPlans.map((x) => ({ src: x.src, label: x.label })), Number(p.dataset.k));
    });
  }

  /* ---------- Terminaciones ---------- */
  function renderFinishes() {
    const t = D.towers[0];
    const el = $('#finishes');
    if (!t || (!(t.finishUnits || []).length && !(t.finishComplex || []).length)) {
      $('#terminaciones').hidden = true;
      document.querySelector('a[href="#terminaciones"]').hidden = true;
      return;
    }
    el.innerHTML = `<div class="sec-head"><h2>Construcción y terminaciones</h2><p>Materiales de primera línea y procesos constructivos auditados por CUBI.</p></div>
      <div class="fin">
        <div>
          <h3 class="sub">Detalle de terminación de unidades</h3>
          <dl class="fin-list">${(t.finishUnits || []).map((f) => `<div><dt>${esc(f.title)}</dt><dd>${esc(f.text)}</dd></div>`).join('')}</dl>
        </div>
        <aside class="fin-complex">
          <h3 class="sub">Terminaciones generales del complejo</h3>
          <p class="muted">El complejo consta de:</p>
          <ul>${(t.finishComplex || []).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
        </aside>
      </div>`;
  }

  /* ---------- Explorador de unidades ---------- */
  const STATUS_FILTERS = [['all', 'Todas'], ['available', 'Disponibles'], ['reserved', 'Reservadas'], ['sold', 'Vendidas']];
  const bedLabel = (b) => (b === 0 ? 'Local comercial / monoambiente' : b === 3 ? '3 dormitorios o más' : b + (b === 1 ? ' dormitorio' : ' dormitorios'));
  const uTitle = (u) => (u.floor === 0 && /local|zócalo/i.test(u.type) ? 'Local comercial' : `Unidad ${u.code}`);

  function currentTower() {
    return D.towers.find((t) => t.id === state.towerId) || D.towers[0];
  }
  function matches(u) {
    if (state.status !== 'all' && u.status !== state.status) return false;
    if (state.beds !== 'all') {
      const b = Number(state.beds);
      if (b >= 3 ? u.bedrooms < 3 : u.bedrooms !== b) return false;
    }
    return true;
  }

  function renderExplorer() {
    const t = currentTower();
    if (!t) {
      $('#unidades').hidden = true;
      return;
    }
    $('#tabs').innerHTML = D.towers.length > 1
      ? D.towers.map((x) => `<button class="tab" role="tab" aria-selected="${x.id === t.id}" data-t="${esc(x.id)}">${esc(x.name)}</button>`).join('')
      : '';
    $('#tabs').hidden = D.towers.length < 2;
    $('#statusSeg').innerHTML = STATUS_FILTERS.map(
      ([k, l]) => `<button type="button" data-s="${k}" aria-pressed="${state.status === k}">${l}</button>`
    ).join('');
    const beds = [...new Set(t.units.map((u) => Math.min(u.bedrooms, 3)))].sort();
    $('#bedSel').innerHTML =
      '<option value="all">Todos los ambientes</option>' +
      beds.map((b) => `<option value="${b}" ${String(b) === state.beds ? 'selected' : ''}>${bedLabel(b)}</option>`).join('');
    drawElevation(t);
    drawList(t);
  }

  function drawElevation(t) {
    const s = stat(t.units);
    const floors = {};
    t.units.forEach((u) => (floors[u.floor] = floors[u.floor] || []).push(u));
    const order = Object.keys(floors).map(Number).sort((a, b) => b - a);
    const row = (f) => {
      let prev = null;
      const cells = floors[f]
        .sort((a, b) => ((a.block || '') + a.code > (b.block || '') + b.code ? 1 : -1))
        .map((u) => {
          const gap = prev !== null && (u.block || '') !== prev ? '<span class="gap" aria-hidden="true"></span>' : '';
          prev = u.block || '';
          return `${gap}<button class="cell s-${u.status} ${matches(u) ? '' : 'dim'}" data-u="${esc(u.id)}" aria-label="${esc(uTitle(u))}, ${STATUS_LABEL[u.status]}">${esc(u.code)}</button>`;
        })
        .join('');
      return `<div class="floor-row"><span class="floor-n">${floorName(f)}</span><div class="floor-cells">${cells}</div></div>`;
    };
    const blocks = [...new Set(t.units.map((u) => u.block).filter(Boolean))];
    $('#elevation').innerHTML = `
      <div class="elevation-title"><b>${esc(t.name)}</b><span>${s.available} de ${s.total} disponibles</span></div>
      <div class="roof"></div>
      ${order.map(row).join('')}
      <div class="ground"></div>
      ${blocks.length > 1 ? `<p class="blk-note">${blocks.map(esc).join(' &nbsp;|&nbsp; ')}</p>` : ''}
      <div class="legend"><span class="s-available">Disponible</span><span class="s-reserved">Reservada</span><span class="s-sold">Vendida</span></div>`;
  }

  function drawList(t) {
    const rank = { available: 0, reserved: 1, sold: 2 };
    const list = t.units
      .filter(matches)
      .sort((a, b) => rank[a.status] - rank[b.status] || a.floor - b.floor || (a.block || '') .localeCompare(b.block || '') || (a.code > b.code ? 1 : -1));
    const shown = state.showAll ? list : list.slice(0, 8);
    $('#ulistWrap').innerHTML = `
      <div class="units-head"><h3>Unidades</h3><span>${list.length} ${list.length === 1 ? 'resultado' : 'resultados'}</span></div>
      ${
        list.length
          ? `<ul class="ulist">${shown
              .map(
                (u) => `<li><button class="urow" data-u="${esc(u.id)}">
                  <img src="${esc(u.photos[0] || '')}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">
                  <span><span class="u-title">${esc(uTitle(u))} · ${esc(u.type)}</span><br><span class="u-sub">${floorLong(u.floor)} · ${fmtArea(u.area)}${u.block ? ' · ' + esc(u.block) : ''}</span></span>
                  <span class="u-right"><span class="u-price">${money(u.price, u.currency)}</span><br><span class="chip s-${u.status}">${STATUS_LABEL[u.status]}</span></span>
                </button></li>`
              )
              .join('')}</ul>
            ${list.length > 8 && !state.showAll ? `<button class="btn ghost sm more" id="moreBtn">Ver las ${list.length} unidades</button>` : ''}`
          : '<p class="empty">No hay unidades con esos filtros. Probá con otro estado o cantidad de ambientes.</p>'
      }`;
  }

  $('#tabs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-t]');
    if (!b) return;
    state.towerId = b.dataset.t;
    state.beds = 'all';
    state.showAll = false;
    renderExplorer();
  });
  $('#statusSeg').addEventListener('click', (e) => {
    const b = e.target.closest('[data-s]');
    if (!b) return;
    state.status = b.dataset.s;
    state.showAll = false;
    renderExplorer();
  });
  $('#bedSel').addEventListener('change', (e) => {
    state.beds = e.target.value;
    state.showAll = false;
    renderExplorer();
  });
  document.addEventListener('click', (e) => {
    const m = e.target.closest('#moreBtn');
    if (m) {
      state.showAll = true;
      drawList(currentTower());
      return;
    }
    const u = e.target.closest('[data-u]');
    if (u) openUnit(u.dataset.u);
    const l = e.target.closest('[data-lot]');
    if (l) openLot(l.dataset.lo, l.dataset.lot);
  });

  /* ---------- Modal de detalle (unidades y lotes) ---------- */
  function openDetail(o) {
    modal.className = 'modal';
    const media = o.photos.map((p, i) => ({ k: 'Foto ' + (i + 1), src: p, thumb: true }));
    if (o.plan) media.push({ k: 'Plano', src: o.plan, thumb: false, plan: true });
    let cur = 0;
    const isPdf = (s) => /\.pdf(\?|$)/i.test(s) || /%2Fuploads.*\.pdf/i.test(s);
    modal.innerHTML = `<div class="m-grid">
      <div class="m-media">
        <div class="m-stage" id="mStage"></div>
        <div class="m-thumbs" id="mThumbs"></div>
      </div>
      <div class="m-info">
        <button class="m-close" aria-label="Cerrar" id="mClose">×</button>
        <span class="chip s-${o.status}">${STATUS_LABEL[o.status]}</span>
        <h3 id="mTitle">${esc(o.title)}</h3>
        <p class="muted">${esc(o.sub)}</p>
        <p class="m-price">${o.price}</p>
        <dl class="m-dl">${o.rows.filter((r) => r[1] && r[1] !== '—').map(([a, b]) => `<div><dt>${a}</dt><dd>${esc(b)}</dd></div>`).join('')}</dl>
        ${o.desc ? `<p class="m-desc">${esc(o.desc)}</p>` : ''}
        ${o.status === 'sold' ? '<p class="muted">Esta unidad ya fue vendida. Consultanos por otras opciones similares.</p>' : ''}
        <a class="btn" href="${waLink(o.msg)}" target="_blank" rel="noopener">${o.status === 'sold' ? 'Consultar opciones similares' : o.cta}</a>
      </div></div>`;
    function paint() {
      const m = media[cur];
      const stage = $('#mStage', modal);
      stage.classList.toggle('is-plan', !!(m && m.plan));
      if (!m) stage.innerHTML = '<span class="muted">Sin imágenes cargadas</span>';
      else if (isPdf(m.src)) stage.innerHTML = `<a href="${esc(m.src)}" target="_blank" rel="noopener">Abrir plano en PDF</a>`;
      else stage.innerHTML = `<img src="${esc(m.src)}" alt="${esc(m.k)} · ${esc(o.title)}">`;
      $('#mThumbs', modal).innerHTML =
        media.length > 1
          ? media
              .map(
                (x, i) => `<button data-i="${i}" aria-current="${i === cur}" aria-label="${esc(x.k)}">${x.thumb && !isPdf(x.src) ? `<img src="${esc(x.src)}" alt="">` : esc(x.k)}</button>`
              )
              .join('')
          : '';
    }
    paint();
    $('#mThumbs', modal).addEventListener('click', (e) => {
      const b = e.target.closest('[data-i]');
      if (b) {
        cur = Number(b.dataset.i);
        paint();
      }
    });
    $('#mClose', modal).addEventListener('click', () => modal.close());
    if (!modal.open) modal.showModal();
  }

  function openUnit(id) {
    const t = currentTower();
    const u = t.units.find((x) => x.id === id);
    if (!u) return;
    const isLocal = u.floor === 0 && /local|zócalo/i.test(u.type);
    openDetail({
      title: isLocal ? `Local comercial · ${t.name}` : `Unidad ${u.code} · ${t.name}`,
      sub: u.type,
      status: u.status,
      price: money(u.price, u.currency),
      rows: [
        ['Superficie total', u.area ? fmtArea(u.area) : ''],
        ['Dormitorios', isLocal ? '' : u.bedrooms === 0 ? 'Monoambiente' : u.bedrooms],
        ['Baños', u.bathrooms],
        ['Piso', floorLong(u.floor)],
        ['Bloque', u.block],
        ['Balcón', u.balcony ? fmtArea(u.balcony) : ''],
        ['Orientación', u.orientation],
        ['Entrega', t.delivery || 'A confirmar']
      ],
      desc: u.description,
      photos: u.photos,
      plan: u.plan,
      cta: isLocal ? 'Consultar por el local' : 'Consultar por esta unidad',
      msg: isLocal
        ? `Hola, quiero consultar por el local comercial de ${t.name}.`
        : `Hola, quiero consultar por la unidad ${u.code} (${u.type}, ${floorLong(u.floor).toLowerCase()}) de ${t.name}.`
    });
  }

  function openLot(loId, id) {
    const lo = D.loteos.find((x) => x.id === loId);
    const l = lo && lo.lots.find((x) => x.id === id);
    if (!l) return;
    openDetail({
      title: `Lote ${l.code} · ${lo.name}`,
      sub: l.block || lo.subtitle || '',
      status: l.status,
      price: money(l.price, l.currency),
      rows: [
        ['Superficie', fmtArea(l.area)],
        ['Frente', l.front ? String(l.front).replace('.', ',') + ' m' : ''],
        ['Fondo', l.depth ? String(l.depth).replace('.', ',') + ' m' : ''],
        ['Manzana', l.block],
        ['Orientación', l.orientation],
        ['Entrega', lo.delivery]
      ],
      desc: l.description,
      photos: l.photos,
      plan: l.plan,
      cta: 'Consultar por este lote',
      msg: `Hola, quiero consultar por el lote ${l.code}${l.block ? ' (' + l.block + ')' : ''} de ${lo.name}.`
    });
  }
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.close();
  });

  /* ---------- Ubicación y cercanías ---------- */
  function renderLocation() {
    const c = D.company;
    const rows = [
      ['Ubicación de la obra', `${esc(c.address)}${c.city ? '<br>' + esc(c.city) : ''}`],
      c.office && ['Oficinas', esc(c.office)],
      c.hours && ['Horarios de atención', esc(c.hours)],
      c.phone && ['Teléfono', `<a href="tel:${esc(c.phone.replace(/[^\d+]/g, ''))}">${esc(c.phone)}</a>`],
      c.email && ['Email', `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>`]
    ].filter(Boolean);
    $('#locInfo').innerHTML =
      rows.map(([a, b]) => `<div><dt class="muted" style="font-size:.88rem">${a}</dt><dd style="margin:0;font-weight:700">${b}</dd></div>`).join('') +
      `<a class="btn ghost sm" href="https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}" target="_blank" rel="noopener" style="justify-self:start">Cómo llegar</a>`;
    const d1 = 0.006, d2 = 0.0034;
    const bbox = [c.lng - d1, c.lat - d2, c.lng + d1, c.lat + d2].join('%2C');
    $('#map').innerHTML = `<iframe title="Mapa de ubicación de ${esc(c.name)}" loading="lazy" src="https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${c.lat}%2C${c.lng}"></iframe>`;
  }

  function renderNearby() {
    const el = $('#nearby');
    if (!D.nearby.length) { el.hidden = true; return; }
    el.innerHTML = `<h3 class="sub">Cerca de ${esc(D.company.name)}</h3>
      <ul class="n-list">${D.nearby
        .map(
          (p) => `<li><div><b>${esc(p.name)}</b><span>${esc(p.category)}</span></div>
          <div class="n-dist"><b>${esc(p.distance)}</b><span>${esc(p.time)} ${p.mode === 'car' ? 'en auto' : 'a pie'}</span></div></li>`
        )
        .join('')}</ul>`;
  }

  /* ---------- Loteos ---------- */
  function lotStats(lo) {
    return stat(lo.lots);
  }
  function renderLoteos() {
    const list = D.loteos.filter((l) => l.status !== 'hidden');
    const sec = $('#loteos');
    if (!list.length) {
      sec.hidden = true;
      $('#navLoteos').hidden = true;
      return;
    }
    $('#loteosWrap').innerHTML = `<div class="sec-head"><h2>Loteos y lotes</h2><p>Además de departamentos, desarrollamos loteos. Elegí tu lote igual que una unidad: por manzana, medidas y estado.</p></div>
      ${list.map((lo) => (lo.status === 'soon' || !lo.lots.length ? soonCard(lo) : lotExplorer(lo))).join('')}`;
    list.forEach((lo) => { if (lo.status === 'active' && lo.lots.length) { state.lot[lo.id] = state.lot[lo.id] || { status: 'all' }; drawLots(lo); } });
    $('#loteosWrap').addEventListener('click', (e) => {
      const s = e.target.closest('[data-ls]');
      if (s) { state.lot[s.dataset.lo].status = s.dataset.ls; drawLots(D.loteos.find((x) => x.id === s.dataset.lo)); }
    });
  }
  function soonCard(lo) {
    const msg = `Hola, quiero que me avisen cuando salgan a la venta los lotes de ${lo.name}.`;
    return `<article class="loteo soon">
      <div class="lo-art ${lo.image ? '' : 'ph'}">${lo.image ? `<img src="${esc(lo.image)}" alt="${esc(lo.name)}" loading="lazy">` : '<span aria-hidden="true">Q</span>'}</div>
      <div class="lo-body">
        <span class="badge">Próximamente</span>
        <h3>${esc(lo.name)}</h3>
        ${lo.subtitle ? `<p class="obra-addr">${esc(lo.subtitle)}</p>` : ''}
        ${lo.location ? `<p class="muted">${esc(lo.location)}</p>` : ''}
        <p class="lo-desc">${esc(lo.description)}</p>
        <a class="btn" href="${waLink(msg)}" target="_blank" rel="noopener">Quiero que me avisen</a>
      </div>
    </article>`;
  }
  function lotExplorer(lo) {
    const s = lotStats(lo);
    return `<article class="loteo active" id="lo-${esc(lo.id)}">
      <header class="lo-head"><div><span class="badge ok">Lotes a la venta</span><h3>${esc(lo.name)}</h3>${lo.subtitle ? `<p class="obra-addr">${esc(lo.subtitle)}</p>` : ''}</div>
        <p class="muted">${esc(lo.location)}${lo.delivery ? ' · Entrega: ' + esc(lo.delivery) : ''}</p></header>
      ${lo.description ? `<p class="lo-desc">${esc(lo.description)}</p>` : ''}
      <div class="filters"><div class="seg" role="group" aria-label="Filtrar lotes por estado" id="lseg-${esc(lo.id)}"></div><span class="muted">${s.available} de ${s.total} lotes disponibles</span></div>
      <div class="explorer lots"><div class="elevation" id="lgrid-${esc(lo.id)}"></div><div id="llist-${esc(lo.id)}"></div></div>
    </article>`;
  }
  function drawLots(lo) {
    const st = state.lot[lo.id].status;
    const ok = (l) => st === 'all' || l.status === st;
    $('#lseg-' + lo.id).innerHTML = STATUS_FILTERS.map(([k, l]) => `<button type="button" data-lo="${esc(lo.id)}" data-ls="${k}" aria-pressed="${st === k}">${l}</button>`).join('');
    const groups = {};
    lo.lots.forEach((l) => (groups[l.block || 'Lotes'] = groups[l.block || 'Lotes'] || []).push(l));
    const nat = (a, b) => String(a.code).localeCompare(String(b.code), 'es', { numeric: true });
    $('#lgrid-' + lo.id).innerHTML = Object.keys(groups).sort((a, b) => a.localeCompare(b, 'es', { numeric: true })).map((g) => `<div class="lot-block"><span class="lot-bn">${esc(g)}</span><div class="lot-cells">${groups[g].sort(nat).map((l) => `<button class="cell s-${l.status} ${ok(l) ? '' : 'dim'}" data-lo="${esc(lo.id)}" data-lot="${esc(l.id)}" aria-label="Lote ${esc(l.code)}, ${STATUS_LABEL[l.status]}">${esc(l.code)}</button>`).join('')}</div></div>`).join('') +
      '<div class="legend"><span class="s-available">Disponible</span><span class="s-reserved">Reservado</span><span class="s-sold">Vendido</span></div>';
    const rank = { available: 0, reserved: 1, sold: 2 };
    const list = lo.lots.filter(ok).sort((a, b) => rank[a.status] - rank[b.status] || nat(a, b));
    $('#llist-' + lo.id).innerHTML = list.length
      ? `<ul class="ulist">${list.slice(0, 40).map((l) => `<li><button class="urow nophoto" data-lo="${esc(lo.id)}" data-lot="${esc(l.id)}">
          <span><span class="u-title">Lote ${esc(l.code)}${l.block ? ' · ' + esc(l.block) : ''}</span><br><span class="u-sub">${fmtArea(l.area)}${l.front && l.depth ? ' · ' + String(l.front).replace('.', ',') + ' x ' + String(l.depth).replace('.', ',') + ' m' : ''}</span></span>
          <span class="u-right"><span class="u-price">${money(l.price, l.currency)}</span><br><span class="chip s-${l.status}">${STATUS_LABEL[l.status]}</span></span></button></li>`).join('')}</ul>`
      : '<p class="empty">No hay lotes con ese estado.</p>';
  }

  /* ---------- Avisos ---------- */
  function renderNotices() {
    const list = activeNotices();
    if (!list.length) return;
    $('#avisos').hidden = false;
    $('#navAvisos').hidden = false;
    $('#notices').innerHTML = list
      .map(
        (n) => `<article class="notice"><time datetime="${esc(n.date)}">${esc(fmtDate(n.date))}</time>
          <div><h3>${esc(n.title)}${n.pinned ? '<span class="pin">Destacado</span>' : ''}</h3>${n.body ? `<p>${esc(n.body)}</p>` : ''}</div></article>`
      )
      .join('');
  }

  /* ---------- Nosotros ---------- */
  function renderAbout() {
    const c = D.company;
    $('#aboutTitle').textContent = `Sobre ${c.name}`;
    $('#aboutText').outerHTML = `<div id="aboutText" class="about-text" style="margin-top:1.4rem">${paras(c.about)}</div>`;
    const t = D.towers[0];
    $('#aboutArt').innerHTML =
      (t && t.gallery && t.gallery[1] ? `<img src="${esc(t.gallery[1])}" alt="${esc(t.name)}" loading="lazy">` : '') +
      `<ul>${c.stats.filter((s) => s.value).map((s) => `<li><b>${esc(s.value)}</b><span>${esc(s.label)}</span></li>`).join('')}</ul>`;
  }

  /* ---------- Contacto ---------- */
  function renderContact() {
    const names = D.towers.map((t) => t.name).concat(D.loteos.filter((l) => l.status !== 'hidden').map((l) => 'Loteo ' + l.name));
    $('#cfTower').innerHTML = '<option value="">Todavía no sé</option>' + names.map((n) => `<option>${esc(n)}</option>`).join('');
    const c = D.company;
    $('#cfNote').textContent = c.whatsapp ? 'Se abre WhatsApp con tu mensaje listo para enviar.' : 'Se abre tu correo con el mensaje listo para enviar.';
    $('#cf').addEventListener('submit', (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      if (!f.get('name').trim() || !f.get('phone').trim()) {
        $('#cfNote').textContent = 'Completá tu nombre y teléfono para que podamos responderte.';
        return;
      }
      const text = `Hola, soy ${f.get('name')}. ${f.get('tower') ? 'Me interesa ' + f.get('tower') + '. ' : ''}${f.get('msg') || ''} Mi teléfono: ${f.get('phone')}.`;
      window.open(waLink(text), '_blank', 'noopener');
    });
    if (c.whatsapp) {
      const w = $('#waFloat');
      w.href = waLink('Hola, quiero consultar por las unidades de Quinzo.');
      w.target = '_blank';
      w.rel = 'noopener';
      w.hidden = false;
    }
  }

  function renderFooter() {
    const c = D.company;
    $('#footer').innerHTML = `<div><b>${esc(c.name)}</b><br>${esc(c.tagline)}</div>
      <div>${esc(c.office || c.address)}${c.city && !c.office ? ', ' + esc(c.city) : ''}${c.phone ? '<br><a href="tel:' + esc(c.phone.replace(/[^\d+]/g, '')) + '">' + esc(c.phone) + '</a>' : ''}</div>
      <div><a href="/admin">Acceso interno</a></div>`;
  }

  /* ---------- Navegación y observadores ---------- */
  function wireNav() {
    const btn = $('#menuBtn'), nav = $('#nav');
    btn.addEventListener('click', () => {
      const o = nav.classList.toggle('open');
      btn.setAttribute('aria-expanded', o);
    });
    nav.addEventListener('click', (e) => {
      if (e.target.closest('a')) {
        nav.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
      }
    });
  }
  function observe() {
    const targets = document.querySelectorAll('.obra');
    if (!('IntersectionObserver' in window)) {
      targets.forEach((t) => t.classList.add('in'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          en.target.classList.add('in');
          io.unobserve(en.target);
        });
      },
      { threshold: 0.15 }
    );
    targets.forEach((t) => io.observe(t));
  }
})();
