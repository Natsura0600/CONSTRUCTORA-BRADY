(function () {
  const { esc, STATUS_LABEL, money, fmtDate, applyTheme, towerSVG, stat, api } = window.C;
  const $ = (s, r = document) => r.querySelector(s);

  let D = null;
  const state = { towerId: null, status: 'all', beds: 'all', showAll: false };

  /* ---------- Carga ---------- */
  api('/api/data')
    .then((d) => {
      D = d;
      boot();
    })
    .catch(() => {
      $('#obrasList').innerHTML = '<div class="skeleton">No pudimos cargar los datos. Probá recargar la página.</div>';
    });

  function boot() {
    applyTheme(D.theme);
    const c = D.company;
    document.title = `${c.name} · Torres en construcción`;
    $('#brand').innerHTML = `<span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i></span>${esc(c.name)}`;
    $('#heroTitle').textContent = c.heroTitle || c.name;
    $('#heroText').textContent = c.heroText || c.tagline || '';
    renderTopbar();
    renderSkyline();
    renderFacts();
    renderObras();
    state.towerId = (D.towers[0] || {}).id;
    renderExplorer();
    renderNotices();
    renderAbout();
    renderLocation();
    renderContact();
    renderFooter();
    wireNav();
    observe();
    const hash = location.hash;
    if (hash && hash.length > 1) setTimeout(() => { const el = document.getElementById(hash.slice(1)); if (el) el.scrollIntoView(); }, 60);
  }

  /* ---------- Aviso fijado ---------- */
  function activeNotices() {
    return D.notices
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

  /* ---------- Hero: las torres se pintan al cargar ---------- */
  function renderSkyline() {
    const towers = D.towers.slice(0, 4);
    $('#skyline').innerHTML = towers
      .map(
        (t, i) => `<a href="#obras" data-i="${i}">
          ${towerSVG(t, 'h' + i)}
          <div class="cap"><b>${t.progress}%</b><span>${esc(t.name)}</span></div>
        </a>`
      )
      .join('');
    $('#skyline')
      .querySelectorAll('.tower-svg')
      .forEach((svg, i) => {
        svg.querySelector('.tw-fill').style.transitionDelay = 0.25 + i * 0.35 + 's';
        svg.querySelector('.tw-edge') && (svg.querySelector('.tw-edge').style.transitionDelay = 1.9 + i * 0.35 + 's');
        requestAnimationFrame(() => requestAnimationFrame(() => svg.classList.add('in')));
      });
  }

  /* ---------- Números ---------- */
  function renderFacts() {
    const all = D.towers.flatMap((t) => t.units);
    const av = all.filter((u) => u.status === 'available').length;
    const items = D.company.stats.filter((s) => s.value).map((s) => ({ v: s.value, l: s.label }));
    items.push({ v: String(av), l: 'unidades disponibles hoy' });
    $('#facts').innerHTML = items.map((i) => `<div class="fact"><b>${esc(i.v)}</b><span>${esc(i.l)}</span></div>`).join('');
  }

  /* ---------- Obras ---------- */
  function splitBar(s) {
    const t = s.total || 1;
    return `<div class="split" role="img" aria-label="${s.available} disponibles, ${s.reserved} reservadas, ${s.sold} vendidas">
      <i style="width:${(s.sold / t) * 100}%;background:var(--st-sold)"></i>
      <i style="width:${(s.reserved / t) * 100}%;background:var(--st-reserved)"></i>
      <i style="width:${(s.available / t) * 100}%;background:var(--st-available)"></i></div>
      <div class="legend"><span class="s-available">${s.available} disponibles</span><span class="s-reserved">${s.reserved} reservadas</span><span class="s-sold">${s.sold} vendidas</span></div>`;
  }
  function renderObras() {
    if (!D.towers.length) {
      $('#obrasList').innerHTML = '<p class="empty">Pronto vamos a publicar nuestras obras.</p>';
      return;
    }
    $('#obrasList').innerHTML = D.towers
      .map((t, i) => {
        const s = stat(t.units);
        return `<article class="obra" id="obra-${esc(t.id)}">
          <div class="obra-art">${towerSVG(t, 'o' + i)}</div>
          <div class="obra-body">
            <h3>${esc(t.name)}</h3>
            <p class="obra-addr">${esc(t.address)}</p>
            ${t.description ? `<p class="desc">${esc(t.description)}</p>` : ''}
            <div class="progress">
              <div class="progress-top"><span>Avance de obra</span><b>${t.progress}%</b></div>
              <div class="bar"><i style="--w:${t.progress}%"></i></div>
            </div>
            <dl class="obra-meta">
              <div><dt>Pisos</dt><dd>${t.floors}</dd></div>
              <div><dt>Entrega estimada</dt><dd>${esc(t.delivery || 'A confirmar')}</dd></div>
              <div><dt>Unidades</dt><dd>${s.total}</dd></div>
            </dl>
            ${s.total ? splitBar(s) : ''}
            ${s.total ? `<button class="btn ghost sm" data-go="${esc(t.id)}">Ver unidades de ${esc(t.name)}</button>` : ''}
          </div>
        </article>`;
      })
      .join('');
    $('#obrasList').addEventListener('click', (e) => {
      const b = e.target.closest('[data-go]');
      if (!b) return;
      state.towerId = b.dataset.go;
      state.showAll = false;
      renderExplorer();
      document.getElementById('unidades').scrollIntoView();
    });
  }

  /* ---------- Explorador ---------- */
  const STATUS_FILTERS = [['all', 'Todas'], ['available', 'Disponibles'], ['reserved', 'Reservadas'], ['sold', 'Vendidas']];

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
    $('#tabs').innerHTML = D.towers
      .map((x) => `<button class="tab" role="tab" aria-selected="${x.id === t.id}" data-t="${esc(x.id)}">${esc(x.name)}</button>`)
      .join('');
    $('#statusSeg').innerHTML = STATUS_FILTERS.map(
      ([k, l]) => `<button type="button" data-s="${k}" aria-pressed="${state.status === k}">${l}</button>`
    ).join('');
    const beds = [...new Set(t.units.map((u) => Math.min(u.bedrooms, 3)))].sort();
    $('#bedSel').innerHTML =
      '<option value="all">Todos los ambientes</option>' +
      beds.map((b) => `<option value="${b}" ${String(b) === state.beds ? 'selected' : ''}>${b === 0 ? 'Monoambiente' : b === 3 ? '3 dormitorios o más' : b + (b === 1 ? ' dormitorio' : ' dormitorios')}</option>`).join('');
    drawElevation(t);
    drawList(t);
  }

  function drawElevation(t) {
    const s = stat(t.units);
    const floors = {};
    t.units.forEach((u) => (floors[u.floor] = floors[u.floor] || []).push(u));
    const order = Object.keys(floors).map(Number).sort((a, b) => b - a);
    $('#elevation').innerHTML = `
      <div class="elevation-title"><b>${esc(t.name)}</b><span>${s.available} de ${s.total} disponibles</span></div>
      <div class="roof"></div>
      ${order
        .map(
          (f) => `<div class="floor-row"><span class="floor-n">${f}°</span><div class="floor-cells">${floors[f]
            .sort((a, b) => (a.code > b.code ? 1 : -1))
            .map(
              (u) => `<button class="cell s-${u.status} ${matches(u) ? '' : 'dim'}" data-u="${esc(u.id)}" aria-label="Unidad ${esc(u.code)}, ${STATUS_LABEL[u.status]}">${esc(u.code)}</button>`
            )
            .join('')}</div></div>`
        )
        .join('')}
      <div class="ground"></div>
      <div class="legend"><span class="s-available">Disponible</span><span class="s-reserved">Reservada</span><span class="s-sold">Vendida</span></div>`;
  }

  function drawList(t) {
    const rank = { available: 0, reserved: 1, sold: 2 };
    const list = t.units
      .filter(matches)
      .sort((a, b) => rank[a.status] - rank[b.status] || a.floor - b.floor || (a.code > b.code ? 1 : -1));
    const shown = state.showAll ? list : list.slice(0, 8);
    $('#ulistWrap').innerHTML = `
      <div class="units-head"><h3>Unidades</h3><span>${list.length} ${list.length === 1 ? 'resultado' : 'resultados'}</span></div>
      ${
        list.length
          ? `<ul class="ulist">${shown
              .map(
                (u) => `<li><button class="urow" data-u="${esc(u.id)}">
                  <img src="${esc(u.photos[0] || '')}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">
                  <span><span class="u-title">Unidad ${esc(u.code)} · ${esc(u.type)}</span><br><span class="u-sub">Piso ${u.floor} · ${u.area} m² · ${esc(u.orientation || '')}</span></span>
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
  });

  /* ---------- Modal de unidad ---------- */
  const modal = $('#modal');
  function waLink(text) {
    const n = D.company.whatsapp;
    return n ? `https://wa.me/${n}?text=${encodeURIComponent(text)}` : `mailto:${esc(D.company.email)}?subject=Consulta&body=${encodeURIComponent(text)}`;
  }
  function openUnit(id) {
    const t = currentTower();
    const u = t.units.find((x) => x.id === id);
    if (!u) return;
    const media = u.photos.map((p, i) => ({ k: 'Foto ' + (i + 1), src: p, thumb: true }));
    if (u.plan) media.push({ k: 'Plano', src: u.plan, thumb: false });
    let cur = 0;
    const isPdf = (s) => /\.pdf(\?|$)/i.test(s) || /%2Fuploads.*\.pdf/i.test(s);

    const dl = [
      ['Superficie total', u.area ? u.area + ' m²' : '—'],
      ['Cubierta', u.coveredArea ? u.coveredArea + ' m²' : '—'],
      ['Balcón', u.balcony ? u.balcony + ' m²' : '—'],
      ['Dormitorios', u.bedrooms === 0 ? 'Monoambiente' : u.bedrooms],
      ['Baños', u.bathrooms],
      ['Piso', u.floor + '°'],
      ['Orientación', u.orientation || '—'],
      ['Entrega', t.delivery || 'A confirmar']
    ];
    const msg = `Hola, quiero consultar por la unidad ${u.code} (${u.type}, piso ${u.floor}) de ${t.name}.`;
    modal.innerHTML = `<div class="m-grid">
      <div class="m-media">
        <div class="m-stage" id="mStage"></div>
        <div class="m-thumbs" id="mThumbs"></div>
      </div>
      <div class="m-info">
        <button class="m-close" aria-label="Cerrar" id="mClose">×</button>
        <span class="chip s-${u.status}">${STATUS_LABEL[u.status]}</span>
        <h3 id="mTitle">Unidad ${esc(u.code)} · ${esc(t.name)}</h3>
        <p class="muted">${esc(u.type)}</p>
        <p class="m-price">${money(u.price, u.currency)}</p>
        <dl class="m-dl">${dl.map(([a, b]) => `<div><dt>${a}</dt><dd>${esc(b)}</dd></div>`).join('')}</dl>
        ${u.description ? `<p class="m-desc">${esc(u.description)}</p>` : ''}
        ${
          u.status === 'sold'
            ? '<p class="muted">Esta unidad ya fue vendida. Consultanos por otras opciones similares.</p>'
            : ''
        }
        <a class="btn" href="${waLink(msg)}" target="_blank" rel="noopener">${u.status === 'sold' ? 'Consultar opciones similares' : 'Consultar por esta unidad'}</a>
      </div></div>`;

    function paint() {
      const m = media[cur];
      const stage = $('#mStage', modal);
      if (!m) stage.innerHTML = '<span class="muted">Sin imágenes cargadas</span>';
      else if (isPdf(m.src)) stage.innerHTML = `<a href="${esc(m.src)}" target="_blank" rel="noopener">Abrir plano en PDF</a>`;
      else stage.innerHTML = `<img src="${esc(m.src)}" alt="${esc(m.k)} de la unidad ${esc(u.code)}">`;
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
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.close();
  });

  /* ---------- Avisos ---------- */
  function renderNotices() {
    const list = activeNotices();
    $('#notices').innerHTML = list.length
      ? list
          .map(
            (n) => `<article class="notice"><time datetime="${esc(n.date)}">${esc(fmtDate(n.date))}</time>
            <div><h3>${esc(n.title)}${n.pinned ? '<span class="pin">Destacado</span>' : ''}</h3>${n.body ? `<p>${esc(n.body)}</p>` : ''}</div></article>`
          )
          .join('')
      : '<p class="empty">Por ahora no hay avisos. Volvé pronto.</p>';
  }

  /* ---------- Nosotros ---------- */
  function renderAbout() {
    const c = D.company;
    $('#aboutText').textContent = c.about;
    const t = D.towers[0];
    $('#aboutArt').innerHTML =
      (t ? towerSVG({ ...t, progress: 100, name: c.name }, 'ab') : '') +
      `<ul>${c.stats.filter((s) => s.value).map((s) => `<li><b>${esc(s.value)}</b><span>${esc(s.label)}</span></li>`).join('')}</ul>`;
  }

  /* ---------- Ubicación ---------- */
  function renderLocation() {
    const c = D.company;
    const rows = [
      ['Dirección', `${esc(c.address)}${c.city ? '<br>' + esc(c.city) : ''}`],
      c.hours && ['Horarios de atención', esc(c.hours)],
      c.phone && ['Teléfono', `<a href="tel:${esc(c.phone.replace(/[^\d+]/g, ''))}">${esc(c.phone)}</a>`],
      c.email && ['Email', `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>`]
    ].filter(Boolean);
    $('#locInfo').innerHTML =
      rows.map(([a, b]) => `<div><dt class="muted" style="font-size:.88rem">${a}</dt><dd style="margin:0;font-weight:600">${b}</dd></div>`).join('') +
      `<a class="btn ghost sm" href="https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}" target="_blank" rel="noopener" style="justify-self:start">Cómo llegar</a>`;
    const d1 = 0.004, d2 = 0.0024;
    const bbox = [c.lng - d1, c.lat - d2, c.lng + d1, c.lat + d2].join('%2C');
    $('#map').innerHTML = `<iframe title="Mapa de ubicación de ${esc(c.name)}" loading="lazy" src="https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${c.lat}%2C${c.lng}"></iframe>`;
  }

  /* ---------- Contacto ---------- */
  function renderContact() {
    $('#cfTower').innerHTML = '<option value="">Todavía no sé</option>' + D.towers.map((t) => `<option>${esc(t.name)}</option>`).join('');
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
      w.href = waLink('Hola, quiero consultar por las unidades disponibles.');
      w.target = '_blank';
      w.rel = 'noopener';
      w.hidden = false;
    }
  }

  function renderFooter() {
    const c = D.company;
    $('#footer').innerHTML = `<div><b>${esc(c.name)}</b><br>${esc(c.tagline)}</div>
      <div>${esc(c.address)}${c.city ? ', ' + esc(c.city) : ''}</div>
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
    const targets = document.querySelectorAll('.obra, .about-art');
    if (!('IntersectionObserver' in window)) {
      targets.forEach((t) => { t.classList.add('in'); t.querySelectorAll('.tower-svg').forEach((s) => s.classList.add('in')); });
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          en.target.classList.add('in');
          en.target.querySelectorAll('.tower-svg').forEach((s) => s.classList.add('in'));
          io.unobserve(en.target);
        });
      },
      { threshold: 0.25 }
    );
    targets.forEach((t) => io.observe(t));
  }
})();
