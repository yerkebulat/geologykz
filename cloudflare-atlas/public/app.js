(async function () {
  const $ = (id) => document.getElementById(id);
  const phone = matchMedia('(max-width:700px)').matches;
  // Shared view state, read once from the URL hash: #map=z/lat/lng/bearing&ov=..&m=..&l=..&bm=sat&sat=esri&g=1
  const HASH = (function () {
    const raw = (location.hash || '').replace(/^#/, '');
    if (!raw) return null;
    const s = new URLSearchParams(raw);
    const out = { view: null, ov: null, mains: null, special: null, bm: null, sat: null, grid: s.get('g') === '1' };
    const mv = s.get('map');
    if (mv) {
      const p = mv.split('/').map(Number);
      if (p.length >= 3 && isFinite(p[0]) && isFinite(p[1]) && isFinite(p[2])) {
        out.view = { zoom: p[0], lat: p[1], lng: p[2], bearing: isFinite(p[3]) ? p[3] : 0, pitch: isFinite(p[4]) ? p[4] : 0 };
      }
    }
    if (s.has('ov')) out.ov = (s.get('ov') || '').split(',').filter(Boolean);
    if (s.has('m')) out.mains = (s.get('m') || '').split(',').filter(Boolean);
    if (s.has('l')) out.special = (s.get('l') || '').split(',').filter(Boolean);
    if (s.get('bm') === 'sat' || s.get('bm') === 'map') out.bm = s.get('bm');
    if (s.get('sat')) out.sat = s.get('sat');
    return out;
  })();
  const ICON = {
    globe: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.4" fill="none" stroke="currentColor" stroke-width="1.7"/><ellipse cx="12" cy="12" rx="3.7" ry="8.4" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M3.6 12h16.8" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>',
    ruler: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.2" y="8.8" width="17.6" height="6.4" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M7.4 8.8v2.5M11.6 8.8v2.5M15.8 8.8v2.5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    distance: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 16.5 18 7.5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><circle cx="6" cy="16.5" r="2" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="18" cy="7.5" r="2" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
    area: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 7.5 14 5l4.5 5.5-3 7L7 18z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="6" cy="7.5" r="1.3" fill="currentColor"/><circle cx="18.5" cy="10.5" r="1.3" fill="currentColor"/><circle cx="7" cy="18" r="1.3" fill="currentColor"/></svg>',
    chart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 16.8 9 10.2l4 3.6 7.5-7.6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M3.5 20.5h17" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
    swipe: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="4.5" width="17" height="15" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 4.5v15" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M8.4 9.5 6.4 12l2 2.5M15.6 9.5 17.6 12l-2 2.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    bookmark: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5h10A1.5 1.5 0 0 1 18.5 6v14L12 15.8 5.5 20V6A1.5 1.5 0 0 1 7 4.5z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
    gps: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="12" cy="12" r="7.6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="2.2 3.4"/><path d="M12 2.4v2.4M12 19.2v2.4M2.4 12h2.4M19.2 12h2.4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    download: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M8 11.5 12 15.5l4-4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 19.2h14" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>'
  };
  const SITE = window.ATLAS_SITE || { mode: 'atlas' };
  // Per-site memory of the last view and open layers. The URL wins over it.
  const VIEW_STORE = 'atlas-view-v1:' + (SITE.mode === 'public' ? 'public' : 'atlas');
  let SAVED_VIEW = null;
  try { SAVED_VIEW = JSON.parse(localStorage.getItem(VIEW_STORE) || 'null'); } catch (e) { SAVED_VIEW = null; }
  function urlView() {
    try {
      const q = new URLSearchParams(location.search);
      const lat = parseFloat(q.get('lat') || q.get('latitude'));
      const lng = parseFloat(q.get('lng') || q.get('lon') || q.get('long') || q.get('longitude'));
      if (!isFinite(lat) || !isFinite(lng)) return null;
      if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
      const z = parseFloat(q.get('z') || q.get('zoom'));
      const b = parseFloat(q.get('b') || q.get('bearing'));
      return { lat: lat, lng: lng, zoom: isFinite(z) ? z : 12, bearing: isFinite(b) ? b : 0, pitch: 0 };
    } catch (e) { return null; }
  }
  const START = (HASH && HASH.view) || urlView() || (SAVED_VIEW && SAVED_VIEW.view) || null;
  const I18N = window.atlasI18n || {};
  function t(key, vars) { return I18N.t ? I18N.t(key, vars) : key; }
  function pickName(obj, field) { return I18N.pick ? I18N.pick(obj, field) : (obj && (obj[field] || obj.name)) || ''; }
  function pickLeg(e) { return I18N.pickLegend ? I18N.pickLegend(e) : (e && (e.l || e.label)) || ''; }
  function isPaleoGroup(g) {
    const n = String((g && g.name) || '');
    return /^paleo\s*:/i.test(n) || /palinspastic|paleogeograph/i.test(n);
  }
  function isPaleoFile(file) {
    return /^data\/paleo-maps-/i.test(String(file || ''));
  }
  function applySiteChrome() {
    const brand = document.querySelector('.brand');
    const sub = document.querySelector('.sub');
    const logout = document.querySelector('a[href="/__auth/logout"]');
    const docs = document.querySelector('.docs');
    const note = document.getElementById('rights-note') || document.querySelector('.note');
    if (docs) docs.remove();
    if (note) note.textContent = t('rights.note');
    if (SITE.mode === 'public') {
      document.title = 'kzgeology';
      if (brand) brand.textContent = 'kzgeology';
      if (sub) sub.textContent = t('sub.maps');
      if (logout) logout.remove();
    } else {
      document.title = 'Atlas';
      if (brand) brand.textContent = 'Atlas';
      if (sub) sub.textContent = t('sub.maps');
    }
  }
  applySiteChrome();
  const cfg = await (await fetch('maps.json?v=md6', { credentials: 'same-origin' })).json();
  const all = {};
  const ovs = {};
  cfg.groups.forEach(g => {
    if (SITE.mode === 'public' && isPaleoGroup(g)) return;
    g.maps.forEach(m => {
      if (SITE.mode === 'public' && isPaleoFile(m.file)) return;
      if (m.overlay || g.overlay) { m.overlay = true; ovs[m.id] = m; } else all[m.id] = m;
    });
  });
  // Overlay layers (independent toggles); draw order comes from the Active layers stack.
  const OV_ORDER = { fill: 0, line: 1, point: 2 };
  const OV_STORE = 'atlas-overlays-v2';
  const MAP_STORE = 'atlas-map-v2';
  const DEFAULT_OVERLAYS = ['mineral-kz-lithology', 'mineral-kz-faults', 'mineral-kz-deposits'];
  const ovOn = new Set();
  try {
    const raw = localStorage.getItem(OV_STORE);
    if (raw === null) DEFAULT_OVERLAYS.forEach(id => { if (ovs[id]) ovOn.add(id); });
    else (JSON.parse(raw) || []).forEach(id => { if (ovs[id]) ovOn.add(id); });
  } catch (e) {
    DEFAULT_OVERLAYS.forEach(id => { if (ovs[id]) ovOn.add(id); });
  }
  if (HASH && HASH.ov) {
    ovOn.clear();
    HASH.ov.forEach(id => { if (ovs[id]) ovOn.add(id); });
  } else if (SAVED_VIEW && Array.isArray(SAVED_VIEW.ov)) {
    ovOn.clear();
    SAVED_VIEW.ov.forEach(id => { if (ovs[id]) ovOn.add(id); });
  }

  const map = window.atlasMap = new maplibregl.Map({
    container: 'mapview',
    style: 'https://tiles.openfreemap.org/styles/positron',
    center: START ? [START.lng, START.lat] : [66, 45],
    zoom: START ? START.zoom : (phone ? 2.6 : 3.6),
    bearing: START ? (START.bearing || 0) : 0,
    pitch: START ? (START.pitch || 0) : 0,
    attributionControl: false, maxZoom: 19, maxPitch: 0
  });
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
  map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

  // Basemap: OpenFreeMap light (default) or a chosen satellite source, with the light style's labels on top (except Google Hybrid, which has its own).
  const SAT_STORE = 'atlas-sat-source-v1';
  const SAT = {
    esri: {
      label: 'Esri World Imagery',
      // maxzoom 17: deepest Esri imagery level over most of Kazakhstan; deeper requests return grey tiles.
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
      maxzoom: 17,
      attribution: 'Imagery &copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community'
    },
    google: {
      label: 'Google Satellite',
      tiles: [0, 1, 2, 3].map(n => 'https://mt' + n + '.google.com/vt/lyrs=s&x={x}&y={y}&z={z}'),
      maxzoom: 20,
      attribution: 'Imagery &copy; Google'
    },
    hybrid: {
      label: 'Google Hybrid',
      tiles: [0, 1, 2, 3].map(n => 'https://mt' + n + '.google.com/vt/lyrs=y&x={x}&y={y}&z={z}'),
      maxzoom: 20,
      attribution: 'Imagery &copy; Google'
    },
    bing: {
      label: 'Bing Aerial',
      tiles: ['bing://{z}/{x}/{y}'],
      maxzoom: 19,
      attribution: 'Imagery &copy; Microsoft'
    }
  };
  const SAT_IDS = ['esri', 'google', 'hybrid', 'bing'];
  let basemap = 'map';
  let satKind = 'esri';
  let appliedSatKind = null;
  try { if (localStorage.getItem('atlas-basemap') === 'sat') basemap = 'sat'; } catch (e) {}
  try {
    const v = localStorage.getItem(SAT_STORE);
    if (v && SAT[v]) satKind = v;
  } catch (e) {}
  if (HASH && HASH.bm) basemap = HASH.bm;
  else if (SAVED_VIEW && (SAVED_VIEW.bm === 'sat' || SAVED_VIEW.bm === 'map')) basemap = SAVED_VIEW.bm;
  if (HASH && HASH.sat && SAT[HASH.sat]) satKind = HASH.sat;
  else if (SAVED_VIEW && SAVED_VIEW.sat && SAT[SAVED_VIEW.sat]) satKind = SAVED_VIEW.sat;
  function isBasemapLayer(id) {
    return id && id !== 'sat' && !/^(atlas-|eqazyna-|process-|geo200-)/.test(id);
  }
  function toQuadKey(z, x, y) {
    let q = '';
    for (let i = z; i > 0; i--) {
      let d = 0;
      const mask = 1 << (i - 1);
      if (x & mask) d += 1;
      if (y & mask) d += 2;
      q += String(d);
    }
    return q;
  }
  function ensureBingProtocol() {
    if (maplibregl._atlasBing) return;
    maplibregl._atlasBing = true;
    maplibregl.addProtocol('bing', (params, abortController) => {
      const parts = String(params.url || '').replace(/^bing:\/\//, '').split('/');
      const z = parseInt(parts[0], 10), x = parseInt(parts[1], 10), y = parseInt(String(parts[2] || '').split('?')[0], 10);
      if (!isFinite(z) || !isFinite(x) || !isFinite(y)) return Promise.reject(new Error('bad bing tile'));
      const t = (x + y + z) % 4;
      const url = 'https://ecn.t' + t + '.tiles.virtualearth.net/tiles/a' + toQuadKey(z, x, y) + '.jpeg?g=14442';
      const ac = abortController && abortController.signal;
      return fetch(url, ac ? { signal: ac } : {}).then(r => {
        if (!r.ok) throw new Error('bing ' + r.status);
        return r.arrayBuffer();
      }).then(data => ({ data }));
    });
  }
  function applyBasemap() {
    const cfg = SAT[satKind] || SAT.esri;
    if (!map.getSource('sat') || appliedSatKind !== satKind) {
      if (cfg === SAT.bing) ensureBingProtocol();
      const first = (map.getStyle().layers || []).find(l => l.type !== 'background' && isBasemapLayer(l.id));
      const before = first && first.id;
      const vis = basemap === 'sat' ? 'visible' : 'none';
      if (map.getLayer('sat')) map.removeLayer('sat');
      if (map.getSource('sat')) map.removeSource('sat');
      map.addSource('sat', { type: 'raster', tileSize: 256, maxzoom: cfg.maxzoom, tiles: cfg.tiles, attribution: cfg.attribution });
      map.addLayer({ id: 'sat', type: 'raster', source: 'sat', layout: { visibility: vis } }, before);
      appliedSatKind = satKind;
    }
    const sat = basemap === 'sat';
    const hideLabels = sat && satKind === 'hybrid';
    (map.getStyle().layers || []).forEach(l => {
      if (l.id === 'sat') map.setLayoutProperty('sat', 'visibility', sat ? 'visible' : 'none');
      else if (isBasemapLayer(l.id)) {
        if (l.type === 'symbol') map.setLayoutProperty(l.id, 'visibility', hideLabels ? 'none' : 'visible');
        else map.setLayoutProperty(l.id, 'visibility', sat ? 'none' : 'visible');
      }
    });
    document.querySelectorAll('.bm-btn').forEach(b => b.classList.toggle('on', b.dataset.bm === basemap));
    const wrap = $('bm-sat');
    if (wrap) wrap.classList.toggle('on', sat);
  }
  function afterBasemapChange() {
    applyAllState();
    orderLayers();
    if (window.atlasEqazyna) window.atlasEqazyna.syncOrder();
    if (window.atlasGeo200 && window.atlasGeo200.refresh) window.atlasGeo200.refresh();
    if (window.atlasCompare && window.atlasCompare.refresh) window.atlasCompare.refresh();
    queueHash();
    if (window.atlasMeasure && window.atlasMeasure.redraw) window.atlasMeasure.redraw();
    if (window.atlasSketch && window.atlasSketch.redraw) window.atlasSketch.redraw();
  }
  document.querySelectorAll('.bm-btn').forEach(b => b.addEventListener('click', () => {
    basemap = b.dataset.bm; try { localStorage.setItem('atlas-basemap', basemap); } catch (e) {}
    if (map.isStyleLoaded()) applyBasemap();
    else map.once('idle', () => { if (map.isStyleLoaded()) applyBasemap(); if (window.atlasCompare && window.atlasCompare.refresh) window.atlasCompare.refresh(); });
    afterBasemapChange();
  }));
  (function initSatPicker() {
    const btn = $('sat-picker-btn');
    if (!btn) return;
    const menu = document.createElement('div');
    menu.id = 'sat-picker';
    menu.className = 'sat-menu';
    menu.hidden = true;
    menu.setAttribute('role', 'listbox');
    menu.setAttribute('aria-label', t('panel.satSource'));
    SAT_IDS.forEach(id => {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.sat = id;
      b.setAttribute('role', 'option');
      b.textContent = SAT[id].label;
      menu.appendChild(b);
    });
    document.body.appendChild(menu);
    function syncMenu() {
      menu.querySelectorAll('button').forEach(b => b.setAttribute('aria-selected', b.dataset.sat === satKind ? 'true' : 'false'));
    }
    function placeMenu() {
      const r = btn.getBoundingClientRect();
      const mw = Math.max(196, menu.offsetWidth || 196);
      const mh = menu.offsetHeight || (phone ? 176 : 148);
      let left = Math.min(Math.max(8, r.right - mw), window.innerWidth - mw - 8);
      let top = r.bottom + 6;
      if (top + mh > window.innerHeight - 8) top = Math.max(8, r.top - mh - 6);
      menu.style.left = left + 'px';
      menu.style.top = top + 'px';
    }
    function closeMenu() {
      menu.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
    }
    function openMenu() {
      syncMenu();
      menu.hidden = false;
      btn.setAttribute('aria-expanded', 'true');
      placeMenu();
    }
    btn.addEventListener('click', ev => {
      ev.preventDefault();
      ev.stopPropagation();
      if (menu.hidden) openMenu(); else closeMenu();
    });
    menu.addEventListener('click', ev => {
      const b = ev.target.closest('button[data-sat]');
      if (!b) return;
      ev.stopPropagation();
      const id = b.dataset.sat;
      if (SAT[id] && id !== satKind) {
        satKind = id;
        try { localStorage.setItem(SAT_STORE, id); } catch (e) {}
        if (map.isStyleLoaded()) {
          applyBasemap();
          if (basemap === 'sat') afterBasemapChange();
        }
      }
      closeMenu();
    });
    document.addEventListener('click', ev => {
      if (menu.hidden) return;
      if (menu.contains(ev.target) || btn.contains(ev.target)) return;
      closeMenu();
    });
    document.addEventListener('keydown', ev => { if (ev.key === 'Escape') closeMenu(); });
    window.addEventListener('resize', closeMenu);
    const panel = $('panel');
    if (panel) panel.addEventListener('scroll', closeMenu, { passive: true });
    syncMenu();
  })();

  const cache = {};
  // Stackable layers: any number on at once, user draw order (top first), per-layer opacity.
  const LAYER_STORE = 'atlas-layers-v3';
  const DEP = 'mineral-kz-deposits';
  let LS = {};
  try { LS = JSON.parse(localStorage.getItem(LAYER_STORE) || '{}') || {}; } catch (e) { LS = {}; }
  const order = Array.isArray(LS.order) ? LS.order.filter(k => typeof k === 'string') : [];
  const layerOp = (LS.op && typeof LS.op === 'object') ? LS.op : {};
  const layerHid = new Set(Array.isArray(LS.hid) ? LS.hid.filter(k => typeof k === 'string') : []);
  let actOpen = LS.box !== false;
  const mainsOn = new Set();
  (Array.isArray(LS.mains) ? LS.mains : (() => { try { const v = localStorage.getItem(MAP_STORE); return v ? [v] : []; } catch (e) { return []; } })())
    .forEach(id => { if (all[id]) mainsOn.add(id); });
  if (SAVED_VIEW && Array.isArray(SAVED_VIEW.mains)) {
    mainsOn.clear();
    SAVED_VIEW.mains.forEach(id => { if (all[id]) mainsOn.add(id); });
  }
  if (HASH && HASH.mains) {
    mainsOn.clear();
    HASH.mains.forEach(id => { if (all[id]) mainsOn.add(id); });
  }
  if (SAVED_VIEW && SAVED_VIEW.op && typeof SAVED_VIEW.op === 'object') {
    Object.keys(SAVED_VIEW.op).forEach(k => { layerOp[k] = SAVED_VIEW.op[k]; });
  }
  function saveLayers() { try { localStorage.setItem(LAYER_STORE, JSON.stringify({ order, op: layerOp, hid: [...layerHid], mains: [...mainsOn], fig1b: fig1bOn, itm: itmOn, box: actOpen })); } catch (e) {} queueHash(); if (window.atlasCompare && window.atlasCompare.refresh) window.atlasCompare.refresh(); }
  function opOf(k) { const v = Number(layerOp[k]); return isFinite(v) && v >= 0 && v <= 1 ? v : 0.85; }
  window.atlasLayerOpacity = opOf;
  const layerLoad = new Set();
  const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  function setLoading(k, on) {
    if (on) layerLoad.add(k); else layerLoad.delete(k);
    const t = document.querySelector('#active-layers .act-row[data-k="' + String(k).replace(/"/g, '\\"') + '"] .act-t');
    if (t) t.classList.toggle('load', !!on);
  }
  function keyLoading(k) {
    if (layerLoad.has(k)) return true;
    if (k === 'eq') return !!(window.atlasEqazyna && window.atlasEqazyna.isLoading && window.atlasEqazyna.isLoading());
    if (k.startsWith('pr:') && window.atlasProcess && window.atlasProcess.isLoading) return !!window.atlasProcess.isLoading(k.slice(3));
    return false;
  }
  function mainLid(id, s) { return 'atlas-m-' + id + '-' + s; }
  function mainOfLid(lid) { return lid && lid.startsWith('atlas-m-') ? lid.slice(8).replace(/-(fl|ln|pt)$/, '') : null; }
  function mainsActive() { return [...mainsOn].filter(id => map.getLayer(mainLid(id, 'fl'))); }
  async function loadData(m) {
    if (m.kind === 'raster' || m.kind === 'image') return null;
    if (cache[m.id]) return cache[m.id];
    const res = await fetch(m.file, { credentials: 'same-origin' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    if (m.overlay && cache[m.id]) return cache[m.id];
    const ds = res.body.pipeThrough(new DecompressionStream('gzip'));
    const json = JSON.parse(await new Response(ds).text());
    cache[m.id] = json; return json;
  }
  function firstSymbolLayer() {
    const ls = map.getStyle().layers || [];
    const l = ls.find(x => x.type === 'symbol'); return l && l.id;
  }
  function ovLayerIds() { return (map.getStyle().layers || []).map(l => l.id).filter(id => id.startsWith('atlas-ov-')); }
  function ovLayerId(m) { return 'atlas-ov-' + m.id; }
  function ovLayers() { return Object.values(ovs).filter(m => ovOn.has(m.id) && map.getLayer(ovLayerId(m))).map(ovLayerId); }
  // Click selection highlight, drawn above licenses so the chosen feature stays obvious.
  const SEL_SRC = 'atlas-sel';
  const SEL_IDS = ['atlas-sel-fill', 'atlas-sel-line', 'atlas-sel-line-inner', 'atlas-sel-halo', 'atlas-sel-point'];
  const EMPTY_FC = { type: 'FeatureCollection', features: [] };
  let selPopup = null;
  function depositPad() { return phone ? 16 : 10; }
  function faultPad() { return phone ? 7 : 3; }
  const FAULT_SPAN = 90;
  function queryBox(point, pad) { return [[point.x - pad, point.y - pad], [point.x + pad, point.y + pad]]; }
  function raiseSel() {
    const before = firstSymbolLayer();
    SEL_IDS.forEach(id => { if (map.getLayer(id)) { try { map.moveLayer(id, before); } catch (e) {} } });
  }
  function ensureSelLayers() {
    if (!map.getSource(SEL_SRC)) map.addSource(SEL_SRC, { type: 'geojson', data: EMPTY_FC });
    const before = firstSymbolLayer();
    if (!map.getLayer('atlas-sel-fill')) map.addLayer({ id: 'atlas-sel-fill', type: 'fill', source: SEL_SRC,
      filter: ['match', ['geometry-type'], ['Polygon', 'MultiPolygon'], true, false],
      paint: { 'fill-color': '#111111', 'fill-opacity': 0.08 } }, before);
    if (!map.getLayer('atlas-sel-line')) map.addLayer({ id: 'atlas-sel-line', type: 'line', source: SEL_SRC,
      filter: ['match', ['geometry-type'], ['LineString', 'MultiLineString', 'Polygon', 'MultiPolygon'], true, false],
      paint: { 'line-color': '#ffffff', 'line-width': ['interpolate', ['linear'], ['zoom'], 3, 3.2, 8, 6], 'line-opacity': 0.95 } }, before);
    if (!map.getLayer('atlas-sel-line-inner')) map.addLayer({ id: 'atlas-sel-line-inner', type: 'line', source: SEL_SRC,
      filter: ['match', ['geometry-type'], ['LineString', 'MultiLineString', 'Polygon', 'MultiPolygon'], true, false],
      paint: { 'line-color': '#111111', 'line-width': ['interpolate', ['linear'], ['zoom'], 3, 1.4, 8, 2.4] } }, before);
    if (!map.getLayer('atlas-sel-halo')) map.addLayer({ id: 'atlas-sel-halo', type: 'circle', source: SEL_SRC,
      filter: ['match', ['geometry-type'], ['Point', 'MultiPoint'], true, false],
      paint: { 'circle-color': 'rgba(0,0,0,0)', 'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 9, 8, 15],
        'circle-stroke-color': '#ffffff', 'circle-stroke-width': 5, 'circle-stroke-opacity': 0.95 } }, before);
    if (!map.getLayer('atlas-sel-point')) map.addLayer({ id: 'atlas-sel-point', type: 'circle', source: SEL_SRC,
      filter: ['match', ['geometry-type'], ['Point', 'MultiPoint'], true, false],
      paint: { 'circle-color': 'rgba(0,0,0,0)', 'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 9, 8, 15],
        'circle-stroke-color': '#111111', 'circle-stroke-width': 2.2 } }, before);
    raiseSel();
  }
  function clearSel() {
    if (map.getSource(SEL_SRC)) map.getSource(SEL_SRC).setData(EMPTY_FC);
  }
  // Polygon selection: outline only the one clicked polygon's outer edge.
  // Rendered geometry is tile-clipped and can carry many holes, whose white
  // outlines made large parts of the lithology look lighter, so look the
  // polygon up in the original data and draw just its exterior ring, no tint.
  function inRing(pt, ring) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
      if (((yi > pt[1]) !== (yj > pt[1])) && (pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi)) inside = !inside;
    }
    return inside;
  }
  function inPoly(pt, poly) {
    if (!poly.length || !inRing(pt, poly[0])) return false;
    for (let k = 1; k < poly.length; k++) if (inRing(pt, poly[k])) return false;
    return true;
  }
  function polysOf(g) { return !g ? [] : g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : []; }
  const bboxCache = new WeakMap();
  function ringBox(ring) {
    let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
    ring.forEach(p => { if (p[0] < a) a = p[0]; if (p[1] < b) b = p[1]; if (p[0] > c) c = p[0]; if (p[1] > d) d = p[1]; });
    return [a, b, c, d];
  }
  function sourceData(layerId) {
    if (!layerId) return null;
    if (layerId.startsWith('atlas-ov-')) return cache[layerId.slice(9)] || null;
    if (layerId.startsWith('atlas-m-')) return cache[mainOfLid(layerId)] || null;
    if (layerId === 'eqazyna-fill' || layerId === 'eqazyna-line') {
      const s = map.getSource('eqazyna');
      return (s && s._data) || null;
    }
    if (window.atlasProcess && window.atlasProcess.sourceData) {
      const d = window.atlasProcess.sourceData(layerId);
      if (d) return d;
    }
    return null;
  }
  function propsMatch(a, b) {
    if (a.id != null && b.id != null && String(a.id) === String(b.id)) return true;
    return a.l === b.l && a.c === b.c && a.n === b.n;
  }
  function clickedPolygon(feature, lngLat) {
    const pt = [lngLat.lng, lngLat.lat];
    const p = feature.properties || {};
    const data = sourceData(feature.layer && feature.layer.id);
    if (data && data.features) {
      let boxes = bboxCache.get(data);
      if (!boxes) {
        boxes = [];
        data.features.forEach((f, fi) => polysOf(f.geometry).forEach(poly => { if (poly[0]) boxes.push([ringBox(poly[0]), fi, poly]); }));
        bboxCache.set(data, boxes);
      }
      let fallback = null;
      for (const [bb, fi, poly] of boxes) {
        if (pt[0] < bb[0] || pt[0] > bb[2] || pt[1] < bb[1] || pt[1] > bb[3]) continue;
        if (!inPoly(pt, poly)) continue;
        const fp = data.features[fi].properties || {};
        if (propsMatch(fp, p)) return poly;
        if (!fallback) fallback = poly;
      }
      if (fallback) return fallback;
    }
    const parts = polysOf(feature.geometry);
    return parts.find(poly => inPoly(pt, poly)) || parts[0] || null;
  }
  function featKey(f) {
    const p = f.properties || {};
    const lid = (f.layer && f.layer.id) || '';
    return lid + '|' + (p.id || '') + '|' + (p.l || '') + '|' + (p.n || '') + '|' + (p.c || '') + '|' + (p.k || '');
  }
  function uniqFeatures(fs) {
    const seen = new Set(), out = [];
    (fs || []).forEach(f => { const k = featKey(f); if (seen.has(k)) return; seen.add(k); out.push(f); });
    return out;
  }
  function lineLayerIds() {
    const ids = [];
    Object.values(ovs).forEach(m => {
      if (!m || m.kind !== 'line' || !ovOn.has(m.id)) return;
      const lid = ovLayerId(m);
      ids.push(lid);
      if (m.dash) ids.push(lid + '-dash');
    });
    mainsActive().forEach(id => ids.push(mainLid(id, 'ln')));
    return ids.filter(id => map.getLayer(id));
  }
  function fillLayerIds() {
    const ids = ovLayers().filter(id => { const m = ovs[id.replace(/^atlas-ov-/, '')]; return m && m.kind === 'fill'; });
    mainsActive().forEach(id => ids.push(mainLid(id, 'fl')));
    return ids.filter(id => map.getLayer(id));
  }
  function pointLayerIds() {
    const ids = ovLayers().filter(id => { const m = ovs[id.replace(/^atlas-ov-/, '')]; return m && m.kind === 'point'; });
    mainsActive().forEach(id => ids.push(mainLid(id, 'pt')));
    if (map.getLayer('atlas-itm-pt')) ids.push('atlas-itm-pt');
    return ids.filter(id => map.getLayer(id));
  }
  function closestFeature(fs, point) {
    let best = null, bestD = Infinity;
    fs.forEach(f => {
      let d = 0;
      const g = f.geometry;
      if (g && g.type === 'Point' && Array.isArray(g.coordinates)) {
        const pt = map.project(g.coordinates);
        const dx = pt.x - point.x, dy = pt.y - point.y;
        d = dx * dx + dy * dy;
      }
      if (d < bestD) { bestD = d; best = f; }
    });
    return best;
  }
  function closestOnSeg(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy;
    const t = len2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0;
    return { x: ax + t * dx, y: ay + t * dy, t };
  }
  function lineParts(geom) {
    if (!geom) return [];
    if (geom.type === 'LineString') return [geom.coordinates];
    if (geom.type === 'MultiLineString') return geom.coordinates;
    return [];
  }
  function sourceGeom(feature) {
    const data = sourceData(feature.layer && feature.layer.id);
    const p = feature.properties || {};
    if (data && data.features) {
      const match = data.features.find(f => propsMatch(f.properties || {}, p));
      if (match && match.geometry) return match.geometry;
    }
    return feature.geometry;
  }
  function shortFaultSegment(feature, point) {
    const parts = lineParts(sourceGeom(feature));
    let best = null;
    parts.forEach(line => {
      if (!line || line.length < 2) return;
      for (let i = 0; i < line.length - 1; i++) {
        const a = map.project(line[i]), b = map.project(line[i + 1]);
        const c = closestOnSeg(point.x, point.y, a.x, a.y, b.x, b.y);
        const d = (c.x - point.x) * (c.x - point.x) + (c.y - point.y) * (c.y - point.y);
        if (!best || d < best.d) best = { line, i, t: c.t, d };
      }
    });
    if (!best) return null;
    const line = best.line;
    const a = line[best.i], b = line[best.i + 1];
    const mid = [a[0] + (b[0] - a[0]) * best.t, a[1] + (b[1] - a[1]) * best.t];
    const span2 = FAULT_SPAN * FAULT_SPAN;
    const closeEnough = coord => {
      const q = map.project(coord);
      const dx = q.x - point.x, dy = q.y - point.y;
      return dx * dx + dy * dy <= span2;
    };
    let lo = best.i, hi = best.i + 1;
    while (lo > 0 && closeEnough(line[lo - 1])) lo--;
    while (hi < line.length - 1 && closeEnough(line[hi + 1])) hi++;
    const coords = line.slice(lo, hi + 1).map(c => [c[0], c[1]]);
    if (best.t > 0.02 && best.t < 0.98) coords.splice(best.i - lo + 1, 0, mid);
    if (coords.length < 2) return { type: 'LineString', coordinates: [a, b] };
    return { type: 'LineString', coordinates: coords };
  }
  function licenseHits(point) {
    if (window.atlasEqazyna && window.atlasEqazyna.hits) return window.atlasEqazyna.hits(point);
    if (window.atlasEqazyna && window.atlasEqazyna.hit && window.atlasEqazyna.hit(point) && map.getLayer('eqazyna-fill')) {
      return uniqFeatures(map.queryRenderedFeatures(point, { layers: ['eqazyna-fill'] }));
    }
    return [];
  }
  function featuresAt(point) {
    const deposits = [];
    const pts = pointLayerIds();
    if (pts.length) {
      const hits = map.queryRenderedFeatures(queryBox(point, depositPad()), { layers: pts });
      const best = closestFeature(hits, point);
      if (best) deposits.push(best);
    }
    const lines = lineLayerIds();
    const faults = lines.length ? uniqFeatures(map.queryRenderedFeatures(queryBox(point, faultPad()), { layers: lines })) : [];
    const licenses = licenseHits(point);
    const process = (window.atlasProcess && window.atlasProcess.hits) ? window.atlasProcess.hits(point) : [];
    const fl = fillLayerIds();
    const fills = fl.length ? uniqFeatures(map.queryRenderedFeatures(point, { layers: fl })) : [];
    return { deposits, faults, licenses, process, fills };
  }
  function clusterLayerIds() {
    return Object.values(ovs).filter(m => m && m.cluster && ovOn.has(m.id)).map(m => ovLayerId(m) + '-cl').filter(id => map.getLayer(id));
  }
  function clusterAt(point) {
    const layers = clusterLayerIds();
    if (!layers.length) return null;
    const hits = map.queryRenderedFeatures(queryBox(point, depositPad()), { layers });
    return hits[0] || null;
  }
  function zoomToCluster(f) {
    const src = f && map.getSource(f.source);
    const id = f && f.properties && f.properties.cluster_id;
    if (!src || id == null || !src.getClusterExpansionZoom) return;
    src.getClusterExpansionZoom(id, (err, zoom) => {
      if (err || zoom == null) return;
      map.easeTo({ center: f.geometry.coordinates, zoom });
    });
  }
  function hasClickTarget(point) {
    if (clusterAt(point)) return true;
    const h = featuresAt(point);
    return !!(h.deposits.length || h.faults.length || h.licenses.length || (h.process && h.process.length) || h.fills.length);
  }
  function setHitHighlights(hits, lngLat, point) {
    if (!hits) { clearSel(); return; }
    ensureSelLayers();
    const features = [];
    hits.deposits.forEach(f => { if (f.geometry) features.push({ type: 'Feature', geometry: f.geometry, properties: f.properties || {} }); });
    hits.faults.forEach(f => {
      const g = shortFaultSegment(f, point);
      if (g) features.push({ type: 'Feature', geometry: g, properties: f.properties || {} });
    });
    hits.licenses.forEach(f => {
      const poly = lngLat ? clickedPolygon(f, lngLat) : polysOf(f.geometry)[0];
      if (poly && poly[0]) features.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: poly[0] }, properties: f.properties || {} });
    });
    (hits.process || []).forEach(f => {
      const poly = lngLat ? clickedPolygon(f, lngLat) : polysOf(f.geometry)[0];
      if (poly && poly[0]) features.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: poly[0] }, properties: f.properties || {} });
    });
    map.getSource(SEL_SRC).setData({ type: 'FeatureCollection', features });
    raiseSel();
  }

  function depositFields(p) {
    const l = String(p.l || '');
    const parts = l.split('. ').map(x => x.trim()).filter(Boolean);
    if (parts.length >= 3) return { commodity: parts.slice(0, -2).join('. '), type: parts[parts.length - 2], size: parts[parts.length - 1] };
    return { commodity: '', type: l, size: '' };
  }
  function kv(label, value) {
    return value ? `<div class="pp-kv"><span class="pp-k">${esc(label)}</span> ${esc(value)}</div>` : '';
  }
  function featureHtml(f) {
    const lid = f.layer && f.layer.id;
    const ov = lid && lid.startsWith('atlas-ov-') ? ovs[lid.slice(9)] : null;
    const m = ov || all[mainOfLid(lid)] || null;
    const p = f.properties || {};
    let h = '<div class="pp">';
    if (ov && ov.id === 'kz-mineral-deposits') {
      h += `<div class="pp-theme">${esc(pickName(ov, 'title'))}</div>`;
      if (p.n) h += `<div class="pp-l">${esc(p.n)}</div>`;
      if (p.ru && p.ru !== p.n) h += `<div class="pp-l">${esc(p.ru)}</div>`;
      h += kv(t('kv.commodities'), p.maj) + kv(t('kv.minor'), p.minc) + kv(t('kv.type'), p.typ) + kv(t('kv.size'), p.sz) + kv(t('kv.age'), p.age) + kv(t('kv.grade'), p.gr);
      return h + '</div>';
    }
    if (ov && ov.id === 'kz-regional-faults') {
      h += `<div class="pp-theme">${esc(pickName(ov, 'title'))}</div>`;
      if (p.l) h += `<div class="pp-l">${esc(p.l)}</div>`;
      return h + '</div>';
    }
    if (ov && ov.id === 'active-faults') {
      h += `<div class="pp-theme">${esc(pickName(ov, 'title'))}</div>`;
      if (p.n) h += `<div class="pp-l">${esc(p.n)}</div>`;
      h += kv(t('kv.slip'), p.slip) + kv(t('kv.source'), p.src);
      return h + '</div>';
    }
    if (ov && ov.id === 'earthquakes-comcat') {
      h += `<div class="pp-theme">${esc(pickName(ov, 'title'))}</div>`;
      h += `<div class="pp-l">${p.mag != null && p.mag !== '' ? ('M ' + p.mag) : t('popup.earthquake')}</div>`;
      h += kv(t('kv.depth'), (p.dep != null && p.dep !== '') ? (String(p.dep) + ' ' + t('unit.km')) : '');
      h += kv(t('kv.date'), p.t) + kv(t('kv.location'), p.pl);
      return h + '</div>';
    }
    if (lid === 'atlas-itm-pt') {
      h += `<div class="pp-theme">${esc(p.type || '')}</div>`;
      if (p.sample) h += `<div class="pp-l">${esc(p.sample)}</div>`;
      h += kv(t('kv.rock'), p.rock) + kv(t('kv.age'), p.age);
      h += `<div class="pp-k">Safonova et al. 2024</div>`;
      return h + '</div>';
    }
    if (ov && ov.id && ov.id.indexOf('usgs-') === 0) {
      h += `<div class="pp-theme">${esc(pickName(ov, 'title'))}</div>`;
      if (p.n) h += `<div class="pp-l">${esc(p.n)}</div>`;
      const num = v => (v === 0 || v) ? (typeof v === 'number' ? v.toLocaleString('en-US', { maximumFractionDigits: 1 }) : String(v)) : '';
      h += kv(t('kv.type'), p.typ) + kv(t('kv.status'), p.st) + kv(t('kv.commodities'), p.comm);
      h += kv(t('kv.location'), p.loc) + kv(t('kv.operator'), p.op) + kv(t('kv.capacity'), p.cap);
      h += kv(t('kv.year'), p.year);
      h += kv(t('kv.age'), p.age) + kv(t('kv.tract'), p.tract) + kv(t('kv.basin'), p.basin);
      h += kv(t('kv.province'), p.prov) + kv(t('kv.tps'), p.tps);
      h += kv(t('kv.oil'), num(p.oil)) + kv(t('kv.gas'), num(p.gas));
      h += kv(t('kv.depth'), (p.val || p.val === 0) ? `${p.val} ${t('unit.m')}` : '');
      if (p.cu) h += kv(t('kv.cu'), String(p.cu) + ' %');
      if (p.mt) h += kv(t('kv.tonnage'), String(p.mt) + ' Mt');
      return h + '</div>';
    }
    if (ov && Array.isArray(ov.popup)) {
      h += `<div class="pp-theme">${esc(pickName(ov, 'title'))}</div>`;
      if (p.n) h += `<div class="pp-l">${esc(p.n)}</div>`;
      ov.popup.forEach(item => {
        const label = item.k ? t(item.k) : (item.l || '');
        let val = p[item.p];
        if (val == null || val === '') return;
        if (item.u) val = String(val) + ' ' + t(item.u);
        h += kv(label, val);
      });
      return h + '</div>';
    }
    if (ov && ov.kind === 'point') {
      const d = depositFields(p);
      h += `<div class="pp-theme">${esc(pickName(ov, 'title'))}</div>`;
      h += `<div class="pp-l">${esc(p.n || t('popup.unnamedDeposit'))}</div>`;
      h += kv(t('kv.commodity'), d.commodity) + kv(t('kv.type'), d.type) + kv(t('kv.size'), d.size);
    } else if (ov) {
      h += `<div class="pp-theme">${esc(pickName(ov, 'title'))}</div>`;
      if (p.l) h += `<div class="pp-l">${esc(p.l)}</div>`;
      if (p.n) h += `<div class="pp-l">${esc(p.n)}</div>`;
    } else if (m && p.s23) {
      h += `<div class="pp-theme">Safonova et al. 2023</div>`;
      if (p.l) h += `<div class="pp-l">${esc(p.l)}</div>`;
      if (p.u) h += kv(t('kv.group'), p.u);
      if (p.z) h += kv(t('kv.zone'), p.z);
    } else if (m && p.w07) {
      h += `<div class="pp-theme">Windley et al. 2007</div>`;
      if (p.l) h += `<div class="pp-l">${esc(p.l)}</div>`;
      if (p.u) h += kv(t('kv.group'), p.u);
      if (p.a) h += kv(t('kv.age'), p.a);
      if (p.k) h += kv(t('kv.code'), p.k);
    } else if (m) {
      h += `<div class="pp-theme">${esc((m.themes && m.themes[p.t]) || pickName(m, 'title') || '')}</div>`;
      if (p.n) h += `<div class="pp-l">${esc(p.n)}</div>`;
      if (p.l) h += `<div class="pp-l">${esc(p.l)}</div>`;
      if (p.k) h += `<div class="pp-k">${esc(t('kv.code'))}: ${esc(p.k)}</div>`;
    }
    return h + '</div>';
  }
  function licenseSeed(fs) {
    return (fs || []).map(f => {
      const p = f.properties || {};
      return { id: p.id || f.id, type: p.type, label: p.label, color: p.color, title: p.label, group: p.group };
    });
  }
  // Every visible vector layer at the point, grouped by display name.
  function keyActive(k) {
    if (k === 'ov:' + DEP) return ovOn.has(DEP) && !!ovs[DEP];
    return keyOn(k);
  }
  function infoHits(point) {
    const layerKey = new Map();
    const keys = [...new Set(activeKeys().concat(pinnedKeys()))].filter(keyActive);
    const queryable = { fill: 1, line: 1, circle: 1, symbol: 1 };
    keys.forEach(k => {
      keyLayers(k).forEach(lid => {
        const lyr = map.getLayer(lid);
        if (!lyr || !queryable[lyr.type]) return;
        layerKey.set(lid, k);
      });
    });
    const ids = [...layerKey.keys()];
    if (!ids.length) return [];
    const box = queryBox(point, depositPad());
    const query = layers => {
      try { return map.queryRenderedFeatures(box, { layers }) || []; } catch (e) { return null; }
    };
    let feats = query(ids);
    if (!feats) {
      feats = [];
      ids.forEach(id => { const part = query([id]); if (part) feats.push(...part); });
    }
    pointLayerIds().forEach(lid => {
      if (layerKey.has(lid)) return;
      const part = query([lid]);
      if (!part || !part.length) return;
      const ovId = lid.startsWith('atlas-ov-') ? lid.slice(9).replace(/-(cl|cn)$/, '') : null;
      const k = ovId && ovs[ovId] ? 'ov:' + ovId : (lid === 'atlas-itm-pt' ? 'itm' : null);
      if (!k) return;
      layerKey.set(lid, k);
      feats.push(...part);
    });
    const seen = new Set();
    const out = [];
    feats.forEach(f => {
      const k = layerKey.get(f.layer && f.layer.id);
      if (!k) return;
      let sig = k;
      try { sig += '|' + JSON.stringify(f.properties || {}); } catch (e) {}
      if (seen.has(sig)) return;
      seen.add(sig);
      out.push({ key: k, f });
    });
    return out;
  }
  function infoGroups(point) {
    const groups = new Map();
    infoHits(point).forEach(x => {
      let g = groups.get(x.key);
      if (!g) { g = { key: x.key, title: keyTitle(x.key), items: [] }; groups.set(x.key, g); }
      g.items.push(x.f);
    });
    return [...groups.values()];
  }
  function infoRow(f) {
    const tmp = document.createElement('div');
    tmp.innerHTML = featureHtml(f);
    const theme = tmp.querySelector('.pp-theme');
    if (theme) theme.remove();
    return tmp.innerHTML;
  }
  function infoGroupHtml(g) {
    let h = '<div class="pp pp-group"><div class="pp-theme">' + esc(g.title) + '</div>';
    g.items.slice(0, 3).forEach(f => { h += infoRow(f); });
    const rest = g.items.slice(3);
    if (rest.length) {
      h += '<div class="pp-more-rows" hidden>' + rest.map(infoRow).join('') + '</div>';
      h += '<button type="button" class="pp-more" data-count="' + rest.length + '">' + esc(t('info.more', { n: rest.length })) + '</button>';
    }
    return h + '</div>';
  }
  function isSpecialKey(k) { return k === 'eq' || k.startsWith('pr:'); }
  function closeFeaturePopup() { if (selPopup) { selPopup.remove(); selPopup = null; } }
  function openInfoPopup(e) {
    const text = e.lngLat.lat.toFixed(5) + ', ' + e.lngLat.lng.toFixed(5);
    const groups = infoGroups(e.point);
    const lhits = licenseHits(e.point);
    const phits = (window.atlasProcess && window.atlasProcess.hits) ? window.atlasProcess.hits(e.point) : [];
    if (!groups.length && !lhits.length && !phits.length) return false;
    closeFeaturePopup();
    if (window.atlasEqazyna && window.atlasEqazyna.closePopup) window.atlasEqazyna.closePopup();
    const hl = [];
    groups.forEach(g => g.items.forEach(f => {
      const gt = f.geometry && f.geometry.type;
      if (gt === 'Point' || gt === 'LineString' || gt === 'MultiLineString') hl.push(f);
    }));
    if (hl.length) {
      ensureSelLayers();
      map.getSource(SEL_SRC).setData({ type: 'FeatureCollection', features: hl.slice(0, 40).map(f => ({ type: 'Feature', geometry: f.geometry, properties: {} })) });
      raiseSel();
    } else clearSel();
    let h = '<div class="pp-stack">';
    groups.forEach(g => { if (!isSpecialKey(g.key)) h += infoGroupHtml(g); });
    if (phits.length && window.atlasProcess && window.atlasProcess.popupHtml) {
      h += window.atlasProcess.popupHtml(phits);
    }
    if (lhits.length) {
      const seed = licenseSeed(lhits);
      const html = (window.atlasEqazyna && window.atlasEqazyna.popupHtml) ? window.atlasEqazyna.popupHtml(seed, true, null) : '';
      h += '<div class="pp"><div class="pp-theme">' + esc(t('layer.licenses')) + '</div>' + html + '</div>';
    }
    h += '</div>';
    const box = document.createElement('div');
    box.innerHTML = h;
    box.appendChild(coordLine(text));
    selPopup = new maplibregl.Popup({ maxWidth: '320px', className: 'atlas-pop' }).setLngLat(e.lngLat).setDOMContent(box).addTo(map);
    const pop = selPopup;
    selPopup.on('close', () => { if (selPopup === pop) selPopup = null; });
    box.addEventListener('click', ev => {
      const b = ev.target.closest('.pp-more');
      if (!b) return;
      const rows = b.previousElementSibling;
      if (!rows || !rows.classList.contains('pp-more-rows')) return;
      rows.hidden = !rows.hidden;
      b.textContent = rows.hidden ? t('info.more', { n: b.dataset.count }) : t('info.less');
    });
    if (lhits.length && window.atlasEqazyna && window.atlasEqazyna.clickDetails) {
      const seed = licenseSeed(lhits);
      window.atlasEqazyna.clickDetails(e.lngLat).then(items => {
        if (selPopup !== pop) return;
        const body = pop.getElement() && pop.getElement().querySelector('.eqazyna-body');
        if (!body) return;
        const tmp = document.createElement('div');
        tmp.innerHTML = window.atlasEqazyna.popupHtml(items && items.length ? items : seed, false);
        const next = tmp.querySelector('.eqazyna-body');
        if (next) body.replaceWith(next);
      }).catch(() => {
        if (selPopup !== pop) return;
        const body = pop.getElement() && pop.getElement().querySelector('.eqazyna-body');
        if (!body) return;
        const tmp = document.createElement('div');
        tmp.innerHTML = window.atlasEqazyna.popupHtml(seed, false, t('loading.detailsFail'));
        const next = tmp.querySelector('.eqazyna-body');
        if (next) body.replaceWith(next);
      });
    }
    return true;
  }
  window.atlasRaiseSel = raiseSel;
  function setOvOpacity(m) { applyKeyOpacity('ov:' + m.id); }
  function ensurePmtiles() {
    if (window.__pmtilesReg || !window.pmtiles || !maplibregl.addProtocol) return;
    try {
      const proto = new pmtiles.Protocol();
      maplibregl.addProtocol('pmtiles', proto.tile.bind(proto));
      window.__pmtilesReg = true;
    } catch (e) { window.__pmtilesReg = true; }
  }
  function finishOverlay(m, k) {
    setOvOpacity(m);
    syncList();
    renderLegend();
    const done = () => setLoading(k, false);
    if (map.isStyleLoaded && map.loaded && map.loaded()) map.once('idle', done);
    else done();
  }
  async function addRasterOverlay(m, k) {
    ensurePmtiles();
    const lid = ovLayerId(m);
    if (map.getLayer(lid)) { setLoading(k, false); return; }
    if (!map.getSource(lid)) {
      const path = m.file.charAt(0) === '/' ? m.file : '/' + m.file;
      map.addSource(lid, { type: 'raster', url: 'pmtiles://' + location.origin + path, tileSize: 256 });
    }
    const before = firstSymbolLayer();
    map.addLayer({ id: lid, type: 'raster', source: lid, paint: { 'raster-opacity': 0.9, 'raster-fade-duration': 0 } }, before);
    finishOverlay(m, k);
  }
  async function addOverlay(id) {
    const m = ovs[id]; if (!m) return;
    const k = 'ov:' + id;
    setLoading(k, true);
    $('loading').hidden = false; $('loading').textContent = t('loading.map');
    if (m.kind === 'raster' || m.kind === 'image') {
      if (!ovOn.has(id)) { setLoading(k, false); return; }
      $('loading').hidden = true;
      try { await addRasterOverlay(m, k); } catch (e) { $('loading').textContent = t('loading.fail'); setLoading(k, false); }
      return;
    }
    let data;
    try { data = await loadData(m); } catch (e) { $('loading').textContent = t('loading.fail'); setLoading(k, false); return; }
    $('loading').hidden = true;
    if (!ovOn.has(id)) { setLoading(k, false); return; }
    const lid = ovLayerId(m);
    if (map.getLayer(lid)) { setLoading(k, false); return; }
    if (!map.getSource(lid)) {
      const src = { type: 'geojson', data, tolerance: 0.3 };
      if (m.cluster) {
        src.cluster = true;
        src.clusterMaxZoom = 9;
        src.clusterRadius = m.clusterRadius || 44;
        src.clusterMinPoints = 3;
      }
      map.addSource(lid, src);
    }
    const before = firstSymbolLayer();
    if (m.kind === 'fill') {
      const fo = m.fillOpacity != null ? m.fillOpacity : 0.85;
      map.addLayer({ id: lid, type: 'fill', source: lid, paint: { 'fill-color': ['get', 'c'], 'fill-opacity': fo } }, before);
      map.addLayer({ id: lid + '-ol', type: 'line', source: lid,
        paint: { 'line-color': m.outlineColor || 'rgba(45,40,36,0.85)',
          'line-width': ['interpolate', ['linear'], ['zoom'], 3, 0.55, 8, 1.15],
          'line-opacity': 0.9 } }, before);
    }
    if (m.kind === 'line') {
      const width = ['interpolate', ['linear'], ['zoom'], 3, ['*', 0.45, ['coalesce', ['get', 'w'], 1]], 8, ['*', 1.4, ['coalesce', ['get', 'w'], 1]]];
      if (m.dash) {
        map.addLayer({ id: lid, type: 'line', source: lid, filter: ['!=', ['get', 'd'], 1],
          paint: { 'line-color': ['get', 'c'], 'line-width': width } }, before);
        map.addLayer({ id: lid + '-dash', type: 'line', source: lid, filter: ['==', ['get', 'd'], 1],
          paint: { 'line-color': ['get', 'c'], 'line-width': width, 'line-dasharray': [2.2, 2] } }, before);
      } else {
        map.addLayer({ id: lid, type: 'line', source: lid, paint: { 'line-color': ['get', 'c'], 'line-width': width } }, before);
      }
    }
    if (m.kind === 'point') {
      if (m.cluster) {
        map.addLayer({ id: lid + '-cl', type: 'circle', source: lid, filter: ['has', 'point_count'],
          paint: { 'circle-color': m.clusterColor || '#1c1917',
            'circle-radius': ['step', ['get', 'point_count'], 11, 25, 15, 80, 19, 250, 24],
            'circle-stroke-color': '#fafaf9', 'circle-stroke-width': 1.2 } }, before);
        map.addLayer({ id: lid + '-cn', type: 'symbol', source: lid, filter: ['has', 'point_count'],
          layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 11, 'text-font': ['Noto Sans Bold'], 'text-allow-overlap': true },
          paint: { 'text-color': '#fafaf9' } }, before);
      }
      const pt = { id: lid, type: 'circle', source: lid,
        paint: { 'circle-color': ['get', 'c'], 'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, ['*', 0.6, ['coalesce', ['get', 's'], 2]], 8, ['*', 1.6, ['coalesce', ['get', 's'], 2]]], 'circle-stroke-color': '#333', 'circle-stroke-width': 0.6 } };
      if (m.cluster) pt.filter = ['!', ['has', 'point_count']];
      map.addLayer(pt, before);
    }
    finishOverlay(m, k);
  }
  function removeOverlay(id) {
    const m = ovs[id]; if (!m) return;
    const lid = ovLayerId(m);
    [lid + '-cn', lid + '-cl', lid + '-dash', lid + '-ol', lid].forEach(x => { if (map.getLayer(x)) map.removeLayer(x); });
    if (map.getSource(lid)) map.removeSource(lid);
    renderLegend();
  }
  function toggleOverlay(id) {
    if (ovOn.has(id)) { ovOn.delete(id); removeOverlay(id); }
    else { ovOn.add(id); addOverlay(id); }
    try { localStorage.setItem(OV_STORE, JSON.stringify([...ovOn])); } catch (e) {}
    syncButtons(); syncList(); renderLegend();
  }
  function syncButtons() {
    document.querySelectorAll('.map-btn').forEach(b => {
      if (b.id === 'eqazyna-toggle' || b.id === 'geo200-toggle' || b.id === 'fig1b-toggle' || b.id === 'itm-toggle' || (b.id && b.id.startsWith('process-'))) return;
      const on = b.dataset.ov ? ovOn.has(b.dataset.id) : mainsOn.has(b.dataset.id);
      b.classList.toggle('on', on); b.setAttribute('aria-pressed', on);
    });
  }
  async function addMain(id) {
    const m = all[id]; if (!m) return;
    const k = 'm:' + id;
    setLoading(k, true);
    $('loading').hidden = false; $('loading').textContent = t('loading.map');
    let data;
    try { data = await loadData(m); } catch (e) { $('loading').textContent = t('loading.fail'); setLoading(k, false); return; }
    $('loading').hidden = true;
    if (!mainsOn.has(id) || map.getLayer(mainLid(id, 'fl'))) { setLoading(k, false); return; }
    const src = 'atlas-m-' + id, before = firstSymbolLayer();
    if (!map.getSource(src)) map.addSource(src, { type: 'geojson', data, tolerance: 0.3 });
    map.addLayer({ id: mainLid(id, 'fl'), type: 'fill', source: src, filter: ['match', ['geometry-type'], ['Polygon', 'MultiPolygon'], true, false],
      paint: { 'fill-color': ['get', 'c'], 'fill-opacity': 0.85, 'fill-outline-color': 'rgba(60,50,40,0.35)' } }, before);
    map.addLayer({ id: mainLid(id, 'ln'), type: 'line', source: src, filter: ['match', ['geometry-type'], ['LineString', 'MultiLineString'], true, false],
      paint: { 'line-color': ['get', 'c'], 'line-width': ['interpolate', ['linear'], ['zoom'], 3, ['*', 0.45, ['coalesce', ['get', 'w'], 1]], 8, ['*', 1.4, ['coalesce', ['get', 'w'], 1]]] } }, before);
    map.addLayer({ id: mainLid(id, 'pt'), type: 'circle', source: src, filter: ['match', ['geometry-type'], ['Point', 'MultiPoint'], true, false],
      paint: { 'circle-color': ['get', 'c'], 'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, ['*', 0.6, ['coalesce', ['get', 's'], 2]], 8, ['*', 1.6, ['coalesce', ['get', 's'], 2]]],
        'circle-stroke-color': '#fff', 'circle-stroke-width': 0.6 } }, before);
    applyKeyOpacity('m:' + id);
    syncList();
    renderLegend();
    const done = () => setLoading(k, false);
    if (map.loaded && map.loaded()) map.once('idle', done);
    else done();
  }
  function removeMain(id) {
    ['pt', 'ln', 'fl'].forEach(s => { const lid = mainLid(id, s); if (map.getLayer(lid)) map.removeLayer(lid); });
    if (map.getSource('atlas-m-' + id)) map.removeSource('atlas-m-' + id);
  }
  function toggleMain(id) {
    if (mainsOn.has(id)) { mainsOn.delete(id); removeMain(id); }
    else { mainsOn.add(id); addMain(id); }
    syncButtons(); syncList(); renderLegend();
  }

  // Layer registry. Keys: 'm:<id>' main maps, 'ov:<id>' overlay layers, 'fig1b', 'geo200'.
  function styleLayers() { return (map.getStyle() && map.getStyle().layers) || []; }
  function allKeys() {
    return Object.keys(all).map(id => 'm:' + id).concat(Object.keys(ovs).filter(id => id !== DEP).map(id => 'ov:' + id), ['fig1b', 'geo200', 'itm']);
  }
  const KZ_BBOX = [46.5, 40.6, 87.4, 55.5];
  function dataBbox(data) {
    if (!data || !data.features || !data.features.length) return null;
    let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
    const walk = x => {
      if (!x) return;
      if (typeof x[0] === 'number') {
        if (x[0] < a) a = x[0]; if (x[1] < b) b = x[1]; if (x[0] > c) c = x[0]; if (x[1] > d) d = x[1];
      } else x.forEach(walk);
    };
    data.features.forEach(f => { if (f && f.geometry) walk(f.geometry.coordinates); });
    return isFinite(a) ? [a, b, c, d] : null;
  }
  function pinnedKeys() {
    const keys = [];
    if (window.atlasEqazyna && window.atlasEqazyna.isOn && window.atlasEqazyna.isOn()) keys.push('eq');
    const pr = window.atlasProcess;
    if (pr && pr.isOn) {
      if (pr.isOn('pugfn')) keys.push('pr:pugfn');
      if (pr.isOn('auction')) keys.push('pr:auction');
      if (pr.isOn('open')) keys.push('pr:open');
    }
    if (ovOn.has(DEP) && ovs[DEP]) keys.push('ov:' + DEP);
    return keys;
  }
  function keyOn(k) {
    if (k === 'eq') return !!(window.atlasEqazyna && window.atlasEqazyna.isOn && window.atlasEqazyna.isOn());
    if (k.startsWith('pr:')) return !!(window.atlasProcess && window.atlasProcess.isOn && window.atlasProcess.isOn(k.slice(3)));
    if (k.startsWith('m:')) return mainsOn.has(k.slice(2));
    if (k.startsWith('ov:')) return ovOn.has(k.slice(3)) && k.slice(3) !== DEP;
    if (k === 'fig1b') return fig1bOn;
    if (k === 'itm') return itmOn;
    if (k === 'geo200') { const g = window.atlasGeo200; return !!(g && (g.isWanted ? g.isWanted() : g.isOn())); }
    return false;
  }
  function keyTitle(k) {
    if (k === 'eq') return t('layer.licenses');
    if (k === 'pr:open') return t('layer.openApply');
    if (k === 'pr:auction') return t('layer.atAuction');
    if (k === 'pr:pugfn') return t('layer.pugfn');
    if (k.startsWith('m:')) return pickName(all[k.slice(2)] || {}, 'title') || k;
    if (k.startsWith('ov:')) return pickName(ovs[k.slice(3)] || {}, 'title') || k;
    if (k === 'fig1b') return t('layer.orocline');
    if (k === 'itm') return t('layer.itm');
    if (k === 'geo200') return t('layer.geo200');
    return k;
  }
  function keyLayers(k) {
    if (k === 'eq') return window.atlasEqazyna && window.atlasEqazyna.layers ? window.atlasEqazyna.layers() : ['eqazyna-fill', 'eqazyna-casing', 'eqazyna-line'].filter(id => map.getLayer(id));
    if (k.startsWith('pr:')) return window.atlasProcess && window.atlasProcess.layers ? window.atlasProcess.layers(k.slice(3)) : [];
    if (k.startsWith('m:')) return ['fl', 'ln', 'pt'].map(s => mainLid(k.slice(2), s)).filter(id => map.getLayer(id));
    if (k.startsWith('ov:')) {
      const lid = 'atlas-ov-' + k.slice(3);
      return styleLayers().map(l => l.id).filter(id => id === lid || id.startsWith(lid + '-'));
    }
    if (k === 'fig1b') return map.getLayer(FIG1B.id) ? [FIG1B.id] : [];
    if (k === 'itm') return [ITM.id + '-img', ITM.id + '-pt'].filter(id => map.getLayer(id));
    if (k === 'geo200') return styleLayers().map(l => l.id).filter(id => id === 'geo200-fill' || id === 'geo200-outline' || id.startsWith('geo200-scan-'));
    return [];
  }
  function keyBbox(k) {
    if (k === 'eq') return dataBbox(sourceData('eqazyna-fill')) || KZ_BBOX;
    if (k === 'pr:open') return dataBbox((window.atlasProcess && window.atlasProcess.sourceData && (window.atlasProcess.sourceData('process-open-cells-fill') || window.atlasProcess.sourceData('process-open-clusters-fill'))) || null) || KZ_BBOX;
    if (k === 'pr:auction') return dataBbox((window.atlasProcess && window.atlasProcess.sourceData && (window.atlasProcess.sourceData('process-auction-cells-fill') || window.atlasProcess.sourceData('process-auction-clusters-fill'))) || null) || KZ_BBOX;
    if (k === 'pr:pugfn') return dataBbox((window.atlasProcess && window.atlasProcess.sourceData && window.atlasProcess.sourceData('process-pugfn-fill')) || null) || KZ_BBOX;
    if (k.startsWith('m:')) return (all[k.slice(2)] || {}).bbox;
    if (k.startsWith('ov:')) return (ovs[k.slice(3)] || {}).bbox;
    if (k === 'fig1b') return [59.459664, 38.774749, 93.065433, 54.730814];
    if (k === 'itm') return [ITM.coords[0][0], ITM.coords[2][1], ITM.coords[1][0], ITM.coords[0][1]];
    if (k === 'geo200') return window.atlasGeo200 && window.atlasGeo200.bbox ? window.atlasGeo200.bbox() : null;
    return null;
  }
  function swatchOf(k) {
    if (k === 'eq') return { c: '#1d6fa8', g: '' };
    if (k === 'pr:open') return { c: '#22c55e', g: '' };
    if (k === 'pr:auction') return { c: '#ea580c', g: '' };
    if (k === 'pr:pugfn') return { c: '#d97706', g: '' };
    if (k === 'fig1b') return { c: '#a8cdf1', g: '' };
    if (k === 'itm') return { c: '#e11d2a', g: 'point' };
    if (k === 'geo200') return { c: '#d6c09a', g: '' };
    const m = k.startsWith('m:') ? all[k.slice(2)] : k.startsWith('ov:') ? ovs[k.slice(3)] : null;
    const legend = m && Array.isArray(m.legend) ? m.legend : [];
    const rgb = c => {
      const x = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(c || '');
      if (!x) return null;
      let h = x[1]; if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
      return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    };
    const lum = c => { const v = rgb(c); return v ? 0.299 * v[0] + 0.587 * v[1] + 0.114 * v[2] : 0; };
    const sat = c => { const v = rgb(c); if (!v) return 0; const mx = Math.max(...v), mn = Math.min(...v); return mx ? (mx - mn) / mx : 0; };
    const score = (e, kind) => {
      const L = lum(e.c), S = sat(e.c);
      let lumScore;
      if (kind === 'line') lumScore = L <= 80 ? 1.2 : (L <= 160 ? 0.4 : -0.6);
      else if (L < 40 || L > 210) lumScore = -1.2;
      else lumScore = 1 - Math.abs(L - 145) / 145;
      const satScore = S < 0.12 ? 0 : S > 0.92 ? 0.45 : S;
      return (e.n || 0) / 40 + lumScore + satScore;
    };
    const pick = g => {
      const rows = legend.filter(e => e && e.c && e.c !== '#888888' && (!g || e.g === g));
      if (!rows.length) return null;
      let e;
      if (g === 'line' && !rows.some(r => r.n)) e = rows.find(r => lum(r.c) <= 90) || rows[0];
      else e = rows.slice().sort((a, b) => score(b, g || a.g) - score(a, g || b.g))[0];
      return { c: e.c, g: e.g === 'line' ? 'line' : e.g === 'point' ? 'point' : '' };
    };
    return pick('fill') || pick('line') || pick('point') || pick(null) || { c: '#a8a29e', g: '' };
  }
  function applyKeyVis(k) {
    const vis = layerHid.has(k) ? 'none' : 'visible';
    let ids = keyLayers(k);
    if (k === 'geo200') ids = ids.concat(styleLayers().map(l => l.id).filter(id => id.startsWith('geo200-label')));
    ids.forEach(id => { try { map.setLayoutProperty(id, 'visibility', vis); } catch (e) {} });
  }
  function applyAllVis() {
    pinnedKeys().concat(activeKeys()).forEach(applyKeyVis);
  }
  function applyAllState() {
    pinnedKeys().concat(activeKeys()).forEach(applyKeyOpacity);
  }
  function bumpOp(v) { return v <= 0 ? 0 : Math.min(1, v + 0.1); }
  function setPaint(id, prop, val) { try { map.setPaintProperty(id, prop, val); } catch (e) {} }
  function applyKeyOpacity(k) {
    const v = opOf(k), main = k.startsWith('m:');
    let ids = keyLayers(k);
    if (k === 'geo200') ids = ids.concat(styleLayers().map(l => l.id).filter(id => id.startsWith('geo200-label')));
    ids.forEach(id => {
      const layer = map.getLayer(id); if (!layer) return;
      const typ = layer.type;
      if (k === 'eq' || k.startsWith('pr:')) {
        if (typ === 'fill') {
          if (id === 'eqazyna-fill') setPaint(id, 'fill-opacity', ['*', ['case', ['==', ['get', 'group'], 'revoked'], 0.3, 0.55], v]);
          else if (id.indexOf('-clusters-fill') >= 0) setPaint(id, 'fill-opacity', ['interpolate', ['linear'], ['zoom'], 3, 0.54 * v, 8, 0.62 * v]);
          else if (id === 'process-pugfn-fill') setPaint(id, 'fill-opacity', ['interpolate', ['linear'], ['zoom'], 3, 0.28 * v, 8, 0.4 * v]);
          else setPaint(id, 'fill-opacity', ['interpolate', ['linear'], ['zoom'], 3, 0.42 * v, 8, 0.5 * v]);
        } else if (typ === 'line') {
          const base = id === 'eqazyna-casing' ? 0.85 : (id.indexOf('-casing') >= 0 ? 0.9 : (id === 'eqazyna-line' ? 1 : 0.95));
          setPaint(id, 'line-opacity', Math.min(1, base * v));
        } else if (typ === 'circle') {
          setPaint(id, 'circle-opacity', v);
          setPaint(id, 'circle-stroke-opacity', v);
        }
        return;
      }
      if (id === 'geo200-fill') { setPaint(id, 'fill-opacity', 0.18 * v); return; }
      if (id === 'geo200-outline') { setPaint(id, 'line-opacity', v); return; }
      if (typ === 'fill') {
        if (main) setPaint(id, 'fill-opacity', ['case', ['has', 'h'], v * 0.6, v]);
        else {
          const ov = ovs[k.slice(3)];
          const fo = ov && ov.fillOpacity != null ? ov.fillOpacity : 0.85;
          setPaint(id, 'fill-opacity', fo * v);
        }
      }
      else if (typ === 'line') setPaint(id, 'line-opacity', bumpOp(v));
      else if (typ === 'circle') {
        setPaint(id, 'circle-opacity', bumpOp(v));
        setPaint(id, 'circle-stroke-opacity', bumpOp(v));
      }
      else if (typ === 'raster') setPaint(id, 'raster-opacity', v);
      else if (typ === 'symbol') {
        const base = id === 'geo200-label-hi' ? 0.9 : 1;
        setPaint(id, 'text-opacity', base * v);
        setPaint(id, 'text-halo-opacity', v);
        setPaint(id, 'icon-opacity', v);
      }
    });
    applyKeyVis(k);
  }
  function activeKeys() { return order.filter(keyOn); }
  // Draw order, bottom to top: user stack, then 1:200k sheet labels, deposits, subsoil layers, licenses, click highlight, basemap labels.
  function orderLayers() {
    const layers = styleLayers(); if (!layers.length) return;
    const ours = id => /^(atlas-|eqazyna-|process-|geo200-)/.test(id);
    const base = layers.find(l => l.type === 'symbol' && !ours(l.id));
    const seq = [];
    activeKeys().reverse().forEach(k => keyLayers(k).forEach(id => seq.push(id)));
    ['geo200-label', 'geo200-label-hi', 'atlas-ov-' + DEP].forEach(id => seq.push(id));
    layers.forEach(l => { if (l.id.startsWith('process-')) seq.push(l.id); });
    layers.forEach(l => { if (l.id.startsWith('eqazyna-')) seq.push(l.id); });
    SEL_IDS.forEach(id => seq.push(id));
    layers.forEach(l => { if (l.id.startsWith('atlas-measure-')) seq.push(l.id); });
    const ids = layers.map(l => l.id), want = seq.filter(id => ids.includes(id));
    // Skip when already in place: same relative order and nothing foreign between the first one and the labels.
    const pos = want.map(id => ids.indexOf(id)), end = base ? ids.indexOf(base.id) : ids.length;
    let ok = pos.every((p, i) => i === 0 || p > pos[i - 1]);
    if (ok && pos.length) for (let i = pos[0]; i < end; i++) { if (!ours(ids[i])) { ok = false; break; } }
    if (!ok) want.forEach(id => { try { map.moveLayer(id, base && base.id); } catch (e) {} });
    // Keep the measure line above rasters, 1:200k scans and sheet grids.
    ['atlas-measure-halo', 'atlas-measure-casing', 'atlas-measure-line', 'atlas-measure-pts', 'atlas-sketch-halo', 'atlas-sketch-line'].forEach(id => {
      if (map.getLayer(id)) { try { map.moveLayer(id, base && base.id); } catch (e) {} }
    });
  }
  window.atlasOrderLayers = orderLayers;
  function syncList() {
    for (let i = order.length - 1; i >= 0; i--) if (!keyOn(order[i])) order.splice(i, 1);
    allKeys().forEach(k => { if (keyOn(k) && !order.includes(k)) order.unshift(k); });
    saveLayers(); orderLayers(); applyAllState(); renderActive();
  }
  function keyOff(k) {
    layerHid.delete(k);
    if (k.startsWith('m:')) { if (mainsOn.has(k.slice(2))) toggleMain(k.slice(2)); }
    else if (k.startsWith('ov:')) { if (ovOn.has(k.slice(3))) toggleOverlay(k.slice(3)); }
    else if (k === 'fig1b') setFig1b(false);
    else if (k === 'itm') setItm(false);
    else if (k === 'geo200' && window.atlasGeo200 && window.atlasGeo200.setOn) window.atlasGeo200.setOn(false);
    else if (k === 'eq' && window.atlasEqazyna && window.atlasEqazyna.setOn) window.atlasEqazyna.setOn(false);
    else if (k.startsWith('pr:') && window.atlasProcess && window.atlasProcess.setOn) window.atlasProcess.setOn(k.slice(3), false);
  }
  let dragging = null;
  const ICO = {
    chev: '<svg class="act-i act-chev" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6.7 9.2 12 14.5l5.3-5.3 1.4 1.4L12 17.3 5.3 10.6z"/></svg>',
    eye: '<svg class="act-i" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 5C7 5 2.8 8.2 1 12c1.8 3.8 6 7 11 7s9.2-3.2 11-7c-1.8-3.8-6-7-11-7zm0 11.2A4.2 4.2 0 1 1 12 7.8a4.2 4.2 0 0 1 0 8.4zm0-2.4a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6z"/></svg>',
    eyeOff: '<svg class="act-i" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 5C7 5 2.8 8.2 1 12c1.8 3.8 6 7 11 7s9.2-3.2 11-7c-1.8-3.8-6-7-11-7zm0 11.2A4.2 4.2 0 1 1 12 7.8a4.2 4.2 0 0 1 0 8.4zm0-2.4a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6z"/><path fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" d="M4.2 4.2l15.6 15.6"/></svg>',
    more: '<svg class="act-i" viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="12" r="1.7" fill="currentColor"/><circle cx="12" cy="12" r="1.7" fill="currentColor"/><circle cx="18" cy="12" r="1.7" fill="currentColor"/></svg>',
    search: '<svg class="act-i" viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.2" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M15.2 15.2 20 20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>'
  };
  function closeActMenu(box) {
    if (!box) return;
    box.querySelectorAll('.act-menu').forEach(m => m.classList.remove('open', 'up'));
    box.querySelectorAll('.act-b[data-a="menu"]').forEach(b => b.setAttribute('aria-expanded', 'false'));
  }
  let actSeen = new Set();
  // Deposit search: only point overlays of deposits, occurrences, and similar layers.
  const SEARCH_IDS = ['mineral-kz-deposits', 'kz-mineral-deposits'];
  const SEARCH_TITLE = /deposit|occurrence|prospect|facilit|potash|coal|copper/i;
  const searchOpen = new Set();
  const searchQuery = new Map();
  const searchResults = new Map();
  let searchFocusKey = null;
  function searchableMap(k) {
    if (!k || !k.startsWith('ov:')) return null;
    const m = ovs[k.slice(3)];
    if (!m || !m.overlay || m.kind !== 'point') return null;
    if (SEARCH_IDS.includes(m.id) || SEARCH_TITLE.test(String(m.title || ''))) return m;
    return null;
  }
  function searchNameOf(p) {
    return String(p.n || p.name || p.ru || p.name_ru || p.name_kk || p.l || '');
  }
  function fillSearchResults(boxEl) {
    const k = boxEl.dataset.k;
    const inp = boxEl.querySelector('.act-search-inp');
    const res = boxEl.querySelector('.act-search-res');
    if (!inp || !res) return;
    const q = String(inp.value || '').trim().toLowerCase();
    const m = searchableMap(k);
    const out = [];
    if (m && q) {
      const data = sourceData('atlas-ov-' + m.id);
      const feats = (data && data.features) || [];
      for (const f of feats) {
        const p = f.properties || {};
        const names = [p.n, p.name, p.ru, p.name_ru, p.name_kk, p.l].filter(Boolean).map(String);
        if (!names.some(n => n.toLowerCase().includes(q))) continue;
        out.push({ f, name: searchNameOf(p), commodity: String(p.maj || p.comm || depositFields(p).commodity || '') });
        if (out.length >= 10) break;
      }
    }
    searchResults.set(k, out);
    res.innerHTML = out.map((r, i) =>
      '<button type="button" class="act-res" data-i="' + i + '"><span class="act-res-n">' + esc(r.name) + '</span>' +
      (r.commodity ? '<span class="act-res-c">' + esc(r.commodity) + '</span>' : '') + '</button>').join('');
  }
  function pickSearchResult(k, i) {
    const r = (searchResults.get(k) || [])[i];
    if (!r) return;
    const g = r.f.geometry;
    let coords = null;
    if (g && g.type === 'Point') coords = g.coordinates;
    else if (g && g.type === 'MultiPoint' && g.coordinates.length) coords = g.coordinates[0];
    if (!coords) return;
    const lng = coords[0], lat = coords[1];
    map.flyTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), 11), duration: 1200 });
    setTimeout(() => {
      const p = map.project([lng, lat]);
      openInfoPopup({ lngLat: { lng, lat }, point: p });
    }, 1300);
  }
  function pulseSwatch(row) {
    if (!row || reduceMotion()) return;
    const sw = row.querySelector('.act-sw');
    if (!sw) return;
    sw.classList.remove('pulse');
    void sw.offsetWidth;
    sw.classList.add('pulse');
  }
  function actRowSel(k) {
    return '#active-layers .act-row[data-k="' + String(k).replace(/"/g, '\\"') + '"]';
  }
  function animateActRows(box, prev) {
    const rows = box.querySelectorAll('.act-row');
    if (reduceMotion() || box.classList.contains('closed')) {
      rows.forEach(r => actSeen.add(r.dataset.k));
      return;
    }
    rows.forEach(r => {
      const k = r.dataset.k, now = r.getBoundingClientRect(), was = prev[k];
      if (was) {
        const dx = was.left - now.left, dy = was.top - now.top;
        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
          r.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
          r.style.transition = 'none';
          requestAnimationFrame(() => {
            r.style.transition = 'transform .22s ease';
            r.style.transform = '';
            const clear = ev => { if (ev.propertyName === 'transform') { r.style.transition = ''; r.removeEventListener('transitionend', clear); } };
            r.addEventListener('transitionend', clear);
          });
        }
      } else if (actSeen.size) {
        r.classList.add('act-enter');
        r.addEventListener('animationend', () => r.classList.remove('act-enter'), { once: true });
      }
      actSeen.add(k);
    });
    const live = new Set([...rows].map(r => r.dataset.k));
    [...actSeen].forEach(k => { if (!live.has(k)) actSeen.delete(k); });
  }
  function toggleHid(k) {
    if (layerHid.has(k)) layerHid.delete(k); else layerHid.add(k);
    applyKeyVis(k); saveLayers(); renderActive();
    pulseSwatch(document.querySelector(actRowSel(k)));
  }
  function renderActive() {
    const box = $('active-layers'); if (!box || dragging) return;
    const keys = activeKeys();
    const pinned = pinnedKeys();
    if (!keys.length && !pinned.length) { box.hidden = true; box.innerHTML = ''; actSeen.clear(); return; }
    const prev = {};
    if (!reduceMotion()) box.querySelectorAll('.act-row').forEach(r => { prev[r.dataset.k] = r.getBoundingClientRect(); });
    box.hidden = false;
    box.classList.toggle('closed', !actOpen);
    const n = keys.length + pinned.length;
    const row = (k, i, pin) => {
      const hid = layerHid.has(k), sw = swatchOf(k), pct = Math.round(opOf(k) * 100);
      const upDis = i === 0 ? ' disabled' : '', downDis = i === keys.length - 1 ? ' disabled' : '';
      const zoomDis = keyBbox(k) ? '' : ' disabled';
      const sm = searchableMap(k);
      const sOpen = !!(sm && searchOpen.has(k));
      const searchBtn = sm ? `<button type="button" class="act-b act-search-b" data-a="search" aria-label="${esc(t('act.search'))}" title="${esc(t('act.search'))}" aria-expanded="${sOpen}">${ICO.search}</button>` : '';
      const searchBox = sOpen ? `<div class="act-search-box" data-k="${esc(k)}"><input type="text" class="act-search-inp" placeholder="${esc(t('act.searchPlaceholder'))}" aria-label="${esc(t('act.searchPlaceholder'))}" value="${esc(searchQuery.get(k) || '')}" autocomplete="off" spellcheck="false"><div class="act-search-res"></div></div>` : '';
      const menu = `<div class="act-more"><button type="button" class="act-b" data-a="menu" aria-label="${esc(t('act.actions'))}" aria-haspopup="menu" aria-expanded="false">${ICO.more}</button>` +
        `<div class="act-menu" role="menu"><div class="act-menu-in">` +
        (pin ? '' : `<button type="button" role="menuitem" data-a="up"${upDis}>${esc(t('act.up'))}</button><button type="button" role="menuitem" data-a="down"${downDis}>${esc(t('act.down'))}</button>`) +
        `<button type="button" role="menuitem" data-a="zoom"${zoomDis}>${esc(t('act.zoom'))}</button>` +
        `<button type="button" role="menuitem" data-a="off">${esc(t('act.remove'))}</button></div></div></div>`;
      return `<div class="act-row${pin ? ' pinned' : ''}${hid ? ' off' : ''}" data-k="${esc(k)}"><div class="act-top">` +
        (pin ? '<span class="act-grip act-pin" title="Always on top" aria-hidden="true">&#9650;</span>' : '<span class="act-grip" title="Drag to reorder" aria-hidden="true">&#8942;&#8942;</span>') +
        `<span class="act-sw ${sw.g}" style="background:${esc(sw.c)}" aria-hidden="true"></span>` +
        `<span class="act-t${keyLoading(k) ? ' load' : ''}">${esc(keyTitle(k))}</span>` +
        searchBtn +
        `<button type="button" class="act-b" data-a="hid" aria-pressed="${hid}" aria-label="${hid ? t('act.show') : t('act.hide')}">${hid ? ICO.eyeOff : ICO.eye}</button>` +
        menu + '</div>' +
        `<div class="act-op-row"><input type="range" class="act-op" min="0" max="1" step="0.05" value="${opOf(k)}" aria-label="${esc(t('act.opacity', { pct }))}"><span class="act-op-val" title="${esc(t('act.typeValue'))}" tabindex="0">${pct}%</span></div>` +
        searchBox + '</div>';
    };
    box.innerHTML = `<button type="button" class="act-h" aria-expanded="${actOpen}" aria-controls="act-body"><span>${esc(t('act.title', { n }))}</span>${ICO.chev}</button>` +
      '<div class="act-body" id="act-body"><div class="act-body-in">' +
      pinned.map(k => row(k, 0, true)).join('') + keys.map((k, i) => row(k, i, false)).join('') +
      '</div></div>';
    animateActRows(box, prev);
    box.querySelectorAll('.act-search-box').forEach(fillSearchResults);
    if (searchFocusKey) {
      const target = [...box.querySelectorAll('.act-search-box')].find(b => b.dataset.k === searchFocusKey);
      searchFocusKey = null;
      const inp = target && target.querySelector('.act-search-inp');
      if (inp) inp.focus();
    }
  }
  function moveKey(k, d) {
    const i = order.indexOf(k), j = i + d;
    if (i < 0 || j < 0 || j >= order.length) return;
    order.splice(i, 1); order.splice(j, 0, k);
    saveLayers(); orderLayers(); renderActive();
  }
  function initActiveUi() {
    const box = $('active-layers'); if (!box) return;
    const openMenu = (btn) => {
      const menu = btn.parentElement.querySelector('.act-menu'); if (!menu) return;
      const wasOpen = menu.classList.contains('open');
      closeActMenu(box);
      if (wasOpen) return;
      menu.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
      const br = box.getBoundingClientRect(), btnR = btn.getBoundingClientRect();
      if (br.bottom - btnR.bottom < 150) menu.classList.add('up');
      const first = [...menu.querySelectorAll('button')].find(x => !x.disabled);
      if (first) first.focus({ preventScroll: true });
    };
    const startOpEdit = (lab) => {
      const row = lab.closest('.act-row'); if (!row) return;
      const k = row.dataset.k, cur = Math.round(opOf(k) * 100);
      const inp = document.createElement('input');
      inp.type = 'text';
      inp.inputMode = 'numeric';
      inp.className = 'act-op-edit';
      inp.value = String(cur);
      inp.setAttribute('aria-label', t('act.opacityPct'));
      lab.replaceWith(inp);
      inp.focus(); inp.select();
      let done = false;
      const commit = (ok) => {
        if (done) return; done = true;
        if (ok) {
          const n = parseInt(String(inp.value).trim(), 10);
          if (isFinite(n)) {
            layerOp[k] = Math.max(0, Math.min(100, n)) / 100;
            applyKeyOpacity(k); saveLayers();
          }
        }
        renderActive();
        const next = document.querySelector(actRowSel(k));
        if (ok) pulseSwatch(next);
      };
      inp.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); commit(true); }
        else if (e.key === 'Escape') { e.preventDefault(); commit(false); }
      });
      inp.addEventListener('blur', () => commit(true));
    };
    box.addEventListener('input', e => {
      const inp = e.target.closest('.act-search-inp');
      if (!inp) return;
      const wrapEl = inp.closest('.act-search-box');
      if (!wrapEl) return;
      searchQuery.set(wrapEl.dataset.k, inp.value);
      fillSearchResults(wrapEl);
    });
    box.addEventListener('click', e => {
      const res = e.target.closest('.act-res');
      if (res) {
        const wrapEl = res.closest('.act-search-box');
        if (wrapEl) pickSearchResult(wrapEl.dataset.k, Number(res.dataset.i));
        return;
      }
      const lab = e.target.closest('.act-op-val');
      if (lab) { startOpEdit(lab); return; }
      const head = e.target.closest('.act-h');
      if (head) {
        actOpen = !actOpen;
        box.classList.toggle('closed', !actOpen);
        head.setAttribute('aria-expanded', actOpen);
        closeActMenu(box);
        saveLayers();
        return;
      }
      const b = e.target.closest('button'); if (!b || b.disabled) return;
      if (b.closest('.act-menu') || b.classList.contains('act-b')) {
        const row = b.closest('.act-row');
        const a = b.dataset.a;
        if (a === 'menu') { openMenu(b); return; }
        if (!row) return;
        const k = row.dataset.k;
        if (a === 'search') {
          if (searchOpen.has(k)) searchOpen.delete(k);
          else { searchOpen.add(k); searchQuery.set(k, ''); searchFocusKey = k; }
          renderActive();
          return;
        }
        if (a === 'hid') toggleHid(k);
        else if (a === 'up') moveKey(k, -1);
        else if (a === 'down') moveKey(k, 1);
        else if (a === 'off') keyOff(k);
        else if (a === 'zoom') { const bb = keyBbox(k); if (bb) map.fitBounds(bb, { padding: phone ? 20 : { top: 30, bottom: 30, left: 330, right: 330 }, duration: 400 }); closeActMenu(box); }
      }
    });
    box.addEventListener('keydown', e => {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('act-op-val')) {
        e.preventDefault(); startOpEdit(e.target); return;
      }
      const menu = e.target.closest('.act-menu');
      if (e.key === 'Escape') {
        const btn = box.querySelector('.act-b[data-a="menu"][aria-expanded="true"]');
        closeActMenu(box);
        if (btn) btn.focus();
        return;
      }
      if (!menu || (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Home' && e.key !== 'End')) return;
      const items = [...menu.querySelectorAll('button:not(:disabled)')];
      if (!items.length) return;
      e.preventDefault();
      const i = items.indexOf(e.target);
      if (e.key === 'Home') items[0].focus();
      else if (e.key === 'End') items[items.length - 1].focus();
      else if (e.key === 'ArrowDown') items[(i + 1) % items.length].focus();
      else items[(i - 1 + items.length) % items.length].focus();
    });
    document.addEventListener('pointerdown', e => {
      if (e.target.closest('.act-menu') || box.contains(e.target)) return;
      closeActMenu(box);
    });
    let saveT;
    box.addEventListener('input', e => {
      if (!e.target.classList.contains('act-op')) return;
      const row = e.target.closest('.act-row');
      const k = row.dataset.k;
      layerOp[k] = Number(e.target.value); applyKeyOpacity(k);
      const lab = row.querySelector('.act-op-val');
      const pct = Math.round(Number(e.target.value) * 100);
      if (lab) lab.textContent = pct + '%';
      e.target.setAttribute('aria-label', t('act.opacity', { pct }));
      if (!e.target._pulsed) { e.target._pulsed = true; pulseSwatch(row); setTimeout(() => { e.target._pulsed = false; }, 200); }
      clearTimeout(saveT); saveT = setTimeout(saveLayers, 300);
    });
    box.addEventListener('pointerdown', e => {
      if (e.target.closest('.act-menu')) return;
      const open = box.querySelector('.act-menu.open');
      if (open && !e.target.closest('[data-a="menu"]')) closeActMenu(box);
      const g = e.target.closest('.act-grip'); if (!g) return;
      const row = g.closest('.act-row'); if (!row || row.classList.contains('pinned')) return;
      e.preventDefault();
      try { g.setPointerCapture(e.pointerId); } catch (err) {}
      dragging = { row, id: e.pointerId };
      row.classList.add('drag');
    });
    box.addEventListener('pointermove', e => {
      if (!dragging || e.pointerId !== dragging.id) return;
      const rows = [...box.querySelectorAll('.act-row:not(.pinned)')].filter(r => r !== dragging.row);
      const next = rows.find(r => { const bb = r.getBoundingClientRect(); return e.clientY < bb.top + bb.height / 2; });
      if (next) { if (next.previousElementSibling !== dragging.row) next.before(dragging.row); }
      else if (rows.length && rows[rows.length - 1].nextElementSibling !== dragging.row) rows[rows.length - 1].after(dragging.row);
    });
    const end = e => {
      if (!dragging || e.pointerId !== dragging.id) return;
      dragging.row.classList.remove('drag');
      dragging = null;
      const keys = [...box.querySelectorAll('.act-row:not(.pinned)')].map(r => r.dataset.k);
      const rest = order.filter(k => !keys.includes(k));
      order.splice(0, order.length, ...keys, ...rest);
      saveLayers(); orderLayers(); renderActive();
    };
    box.addEventListener('pointerup', end);
    box.addEventListener('pointercancel', end);
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  function legendRampHtml(ramp) {
    if (!ramp || !Array.isArray(ramp.stops) || ramp.stops.length < 2) return '';
    const stops = ramp.stops;
    const colors = stops.map((s, i) => {
      const pct = (i / (stops.length - 1)) * 100;
      return esc(String(s[1])) + ' ' + pct + '%';
    }).join(', ');
    let h = '';
    if (ramp.title) h += `<div class="lg-note">${esc(ramp.title)}</div>`;
    h += `<div class="lg-ramp" style="background:linear-gradient(to right, ${colors})"></div>`;
    h += '<div class="lg-ramp-labels">' + stops.map(s => `<span>${esc(String(s[0]))}</span>`).join('') + '</div>';
    if (ramp.unit) h += `<div class="lg-note">${esc(ramp.unit)}</div>`;
    return h;
  }
  function legendRows(m, rows) {
    let h = '';
    const lang = I18N.lang ? I18N.lang() : 'en';
    const note = (lang !== 'en' && m['legendNote_' + lang]) ? m['legendNote_' + lang] : (m.id === 'active-faults' ? t('note.activeFaults') : m.id === 'earthquakes-comcat' ? t('note.quakes') : m.legendNote);
    if (note) h += `<div class="lg-note">${esc(note)}</div>`;
    if (m.legendRamp) {
      const ramp = Object.assign({}, m.legendRamp);
      ramp.title = pickName(ramp, 'title') || (m.id === 'seismic-hazard-pga475' ? t('ramp.pga') : m.id === 'emag2-anomaly' ? t('ramp.emag') : ramp.title);
      if (ramp.unit) ramp.unit = pickName(ramp, 'unit') || ramp.unit;
      h += legendRampHtml(ramp);
    }
    const byT = {};
    rows.forEach(e => { (byT[e.t] = byT[e.t] || []).push(e); });
    const ts = Object.keys(byT).map(Number).sort((a, b) => b - a);
    ts.forEach(t => {
      const items = byT[t].filter(e => e.c !== '#888888');
      if (!items.length) return;
      if (!m.overlay) h += `<div class="lg-theme">${esc((m.themes && m.themes[t]) || '')}</div>`;
      const seen = new Set();
      items.forEach(e => {
        const key = e.c + '|' + e.l; if (seen.has(key)) return; seen.add(key);
        h += `<div class="lg-row"><span class="sw ${e.g === 'fill' ? '' : e.g}" style="background:${esc(e.c)}"></span><span>${esc(pickLeg(e) || (m.themes && m.themes[t]) || '')}</span></div>`;
      });
    });
    return h;
  }
  function layerBlock(btn) {
    return '<div class="layer-block">' + btn + '</div>';
  }
  function renderLegend() {
    const shown = Object.values(ovs).filter(m => ovOn.has(m.id)).sort((a, b) => OV_ORDER[b.kind] - OV_ORDER[a.kind]);
    activeKeys().filter(k => k.startsWith('m:')).forEach(k => { if (all[k.slice(2)]) shown.push(all[k.slice(2)]); });
    const eqOn = !!(window.atlasEqazyna && window.atlasEqazyna.isOn());
    const prOn = !!(window.atlasProcess && window.atlasProcess.anyOn && window.atlasProcess.anyOn());
    const geoOn = !!(window.atlasGeo200 && window.atlasGeo200.isOn && window.atlasGeo200.isOn());
    const pr = window.atlasProcess;
    if (!shown.length && !eqOn && !prOn && !geoOn && !fig1bOn && !itmOn) { $('legend').hidden = true; return; }
    $('legend').hidden = false;
    const extra = (eqOn ? 1 : 0) + (prOn ? 1 : 0) + (geoOn ? 1 : 0) + (fig1bOn ? 1 : 0) + (itmOn ? 1 : 0);
    $('legend-title').textContent = (shown.length + extra) === 1 ? (shown[0] ? pickName(shown[0], 'title') : (geoOn ? t('layer.geo200') : (fig1bOn ? t('layer.orocline') : itmOn ? t('layer.itm') : t('layer.subsoil')))) : t('legend.title');
    let h = '';
    if (geoOn && window.atlasGeo200.legendHtml) h += window.atlasGeo200.legendHtml() || '';
    if (prOn && window.atlasProcess.legendHtml) h += window.atlasProcess.legendHtml() || '';
    if (eqOn) h += (window.atlasEqazyna.legendHtml() || '');
    if (fig1bOn) h += fig1bLegendHtml(!h && !shown.length);
    if (itmOn) h += itmLegendHtml(!h && !shown.length);
    shown.forEach(m => {
      if (shown.length > 1 || h) h += `<div class="lg-map">${esc(pickName(m, 'title'))}</div>`;
      h += legendRows(m, m.legend);
    });
    if (!h) { $('legend').hidden = true; return; }
    $('legend-body').innerHTML = h;
  }
  // Li et al. 2018: georeferenced raster (Web Mercator image), off by default, below vector maps and licenses.
  const FIG1B = {
    id: 'atlas-fig1b', url: 'data/li2018-fig1b.webp?v=1',
    title: 'Kazakhstan orocline', /* display via t('layer.orocline') */
    coords: [[59.459664, 54.730814], [93.065433, 54.730814], [93.065433, 38.774749], [59.459664, 38.774749]],
    cite: 'Li et al. 2018',
    legend: [
      ['#f3e6dd', 'Precambrian continental blocks'], ['#ead095', 'Peri-Siberian orogenic system'],
      ['#fcfdd6', 'Sedimentary basins'], ['#eaf2e5', 'Accretionary and collisional belts'],
      ['#d4d5d5', 'Accretionary wedge or suture: Ordovician-Carboniferous'], ['#b995c3', 'Accretionary wedge or suture: Ordovician'],
      ['#17883a', 'Accretionary wedge or suture: Cambrian-Silurian'],
      ['#daa6a8', 'Arc: Late Devonian-Carboniferous, mixed with the DVB (hatched)'], ['#c7c3dc', 'Arc: Early to middle Devonian (hatched)'],
      ['#a8cdf1', 'Arc: Devonian-Carboniferous'], ['#a9cb9f', 'Arc: Silurian-Carboniferous'],
      ['#7bb3c7', 'Arc: Ordovician, Kokchetav-North Tianshan arc'], ['#b0bc63', 'Arc: Cambrian-Silurian'], ['#b3c1d2', 'Arc: Cambrian'],
      ['#1f8a3c', 'Trace of suture zones', 'line'], ['#b0177f', 'Strike-slip faults or shear zones', 'line']
    ]
  };
  let fig1bOn = HASH && HASH.special ? HASH.special.includes('fig1b') : (SAVED_VIEW && Array.isArray(SAVED_VIEW.special) ? SAVED_VIEW.special.includes('fig1b') : !!LS.fig1b);
  function fig1bLegendHtml(solo) {
    let h = solo ? '' : `<div class="lg-map">${esc(t('layer.orocline'))}</div>`;
    FIG1B.legend.forEach(e => { h += `<div class="lg-row"><span class="sw ${e[2] || ''}" style="background:${esc(e[0])}"></span><span>${esc(e[1])}</span></div>`; });
    return h;
  }
  function setFig1b(on) {
    fig1bOn = on;
    if (on) {
      setLoading('fig1b', true);
      if (!map.getSource(FIG1B.id)) map.addSource(FIG1B.id, { type: 'image', url: FIG1B.url, coordinates: FIG1B.coords });
      if (!map.getLayer(FIG1B.id)) map.addLayer({ id: FIG1B.id, type: 'raster', source: FIG1B.id, paint: { 'raster-opacity': opOf('fig1b'), 'raster-fade-duration': 0 } }, firstSymbolLayer());
      const done = () => setLoading('fig1b', false);
      if (map.loaded && map.loaded()) map.once('idle', done); else done();
    } else {
      setLoading('fig1b', false);
      if (map.getLayer(FIG1B.id)) map.removeLayer(FIG1B.id);
      if (map.getSource(FIG1B.id)) map.removeSource(FIG1B.id);
    }
    const b = $('fig1b-toggle');
    if (b) { b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); }
    syncList();
    renderLegend();
  }
  // Safonova et al. 2024 Itmurundy zone: georeferenced raster plus dated sample points, one layer.
  const ITM = {
    id: 'atlas-itm', url: 'data/safonova2024-itmurundy.webp?v=1', pts: 'data/safonova2024-itmurundy-points.json?v=1',
    title: 'Itmurundy zone', cite: 'Safonova et al. 2024',
    coords: [[76.007306, 46.985058], [76.869677, 46.985058], [76.869677, 46.665591], [76.007306, 46.665591]]
  };
  let itmOn = HASH && HASH.special ? HASH.special.includes('itm') : (SAVED_VIEW && Array.isArray(SAVED_VIEW.special) ? SAVED_VIEW.special.includes('itm') : !!LS.itm);
  function itmLegendHtml(solo) {
    let h = solo ? '' : `<div class="lg-map">${esc(t('layer.itm'))}</div>`;
    [['#e11d2a', t('leg.granitoids')], ['#facc15', t('leg.sandstones')], ['#111111', t('leg.microfossils')]]
      .forEach(e => { h += `<div class="lg-row"><span class="sw point" style="background:${e[0]}"></span><span>${e[1]}</span></div>`; });
    return h;
  }
  async function setItm(on) {
    itmOn = on;
    const b = $('itm-toggle');
    if (b) { b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); }
    if (on) {
      setLoading('itm', true);
      if (!map.getSource(ITM.id + '-img')) map.addSource(ITM.id + '-img', { type: 'image', url: ITM.url, coordinates: ITM.coords });
      if (!map.getLayer(ITM.id + '-img')) map.addLayer({ id: ITM.id + '-img', type: 'raster', source: ITM.id + '-img', paint: { 'raster-opacity': opOf('itm'), 'raster-fade-duration': 0 } }, firstSymbolLayer());
      if (!cache.itmPts) { try { cache.itmPts = await (await fetch(ITM.pts, { credentials: 'same-origin' })).json(); } catch (e) { cache.itmPts = null; } }
      if (itmOn && cache.itmPts && !map.getSource(ITM.id + '-pt')) map.addSource(ITM.id + '-pt', { type: 'geojson', data: cache.itmPts });
      if (itmOn && map.getSource(ITM.id + '-pt') && !map.getLayer(ITM.id + '-pt')) map.addLayer({ id: ITM.id + '-pt', type: 'circle', source: ITM.id + '-pt',
        paint: { 'circle-color': ['get', 'c'], 'circle-radius': ['interpolate', ['linear'], ['zoom'], 7, 3.5, 12, 7], 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 1.2 } }, firstSymbolLayer());
      applyKeyOpacity('itm');
      const done = () => setLoading('itm', false);
      if (map.loaded && map.loaded()) map.once('idle', done); else done();
    } else {
      setLoading('itm', false);
      [ITM.id + '-pt', ITM.id + '-img'].forEach(id => { if (map.getLayer(id)) map.removeLayer(id); if (map.getSource(id)) map.removeSource(id); });
    }
    syncList();
    renderLegend();
  }
  function mapBtn(m, overlay) {
    const ov = overlay ? ' data-ov="1"' : '';
    return `<button type="button" class="map-btn ov-btn"${ov} data-id="${m.id}" aria-pressed="false"><span class="ov-box"></span>${esc(pickName(m, 'title'))}</button>`;
  }
  // panel
  let h = '';
  cfg.groups.forEach(g => {
    if (SITE.mode === 'public' && isPaleoGroup(g)) return;
    if (!g.maps.length) return;
    h += `<section class="group"${g.id ? ` data-gid="${esc(g.id)}"` : ` data-gname="${esc(g.name)}"`}><h3>${esc(pickName(g, 'name'))}</h3>`;
    g.maps.forEach(m => {
      h += layerBlock(mapBtn(m, !!m.overlay));
    });
    h += '</section>';
  });
  $('groups').innerHTML = h;
  function insertAfterHead(section, nodes) {
    if (!section) return;
    const head = section.querySelector('h3');
    let ref = head;
    nodes.forEach(node => {
      if (ref) ref.after(node);
      else section.appendChild(node);
      ref = node;
    });
  }
  const geology = $('groups').querySelector('[data-gid="geology"]');
  const geo200Wrap = document.createElement('div');
  geo200Wrap.innerHTML = layerBlock('<button type="button" class="map-btn ov-btn" id="geo200-toggle" aria-pressed="false"><span class="ov-box"></span>' + esc(t('layer.geo200')) + '</button>');
  if (geology) {
    const firstBlock = geology.querySelector('.layer-block');
    if (firstBlock) firstBlock.after(geo200Wrap.firstElementChild);
    else geology.appendChild(geo200Wrap.firstElementChild);
  }
  const mining = $('groups').querySelector('[data-gid="mining"]');
  const subWrap = document.createElement('div');
  subWrap.innerHTML =
    layerBlock('<button type="button" class="map-btn ov-btn" id="process-open-toggle" aria-pressed="false"><span class="ov-box"></span>' + esc(t('layer.openApply')) + '</button>') +
    layerBlock('<button type="button" class="map-btn ov-btn" id="process-auction-toggle" aria-pressed="false"><span class="ov-box"></span>' + esc(t('layer.atAuction')) + '</button>') +
    layerBlock('<button type="button" class="map-btn ov-btn" id="eqazyna-toggle" aria-pressed="false"><span class="ov-box"></span>' + esc(t('layer.licenses')) + '</button>') +
    '<div id="eqazyna-status" class="eqazyna-status" hidden></div>' +
    layerBlock('<button type="button" class="map-btn ov-btn" id="process-pugfn-toggle" aria-pressed="false"><span class="ov-box"></span>' + esc(t('layer.pugfn')) + '</button>') +
    '<div id="process-status" class="eqazyna-status" hidden></div>';
  insertAfterHead(mining, Array.from(subWrap.childNodes).filter(n => n.nodeType === 1));
  const other = $('groups').querySelector('[data-gid="other"]');
  const ibWrap = document.createElement('div');
  ibWrap.innerHTML = layerBlock('<button type="button" class="map-btn ov-btn" id="itm-toggle" aria-pressed="false"><span class="ov-box"></span>' + esc(t('layer.itm')) + '</button>') +
    layerBlock('<button type="button" class="map-btn ov-btn" id="fig1b-toggle" aria-pressed="false"><span class="ov-box"></span>' + esc(t('layer.orocline')) + '</button>');
  const ib = ibWrap.querySelector('#itm-toggle');
  const fb = ibWrap.querySelector('#fig1b-toggle');
  ib.addEventListener('click', () => setItm(!itmOn));
  fb.addEventListener('click', () => setFig1b(!fig1bOn));
  if (other) {
    other.appendChild(ibWrap.children[0]);
    other.appendChild(ibWrap.children[0]);
  }
  $('groups').addEventListener('click', e => {
    const b = e.target.closest('.map-btn'); if (!b) return;
    if (b.id === 'eqazyna-toggle' || b.id === 'geo200-toggle' || b.id === 'fig1b-toggle' || b.id === 'itm-toggle' || (b.id && b.id.startsWith('process-'))) return;
    if (b.dataset.ov) { toggleOverlay(b.dataset.id); return; }
    toggleMain(b.dataset.id);
  });

  function placeScale() {
    const el = $('map-scale');
    if (!el) return;
    if (phone && !$('panel').classList.contains('closed')) {
      el.style.bottom = 'calc(' + ($('panel').offsetHeight + 8) + 'px + env(safe-area-inset-bottom, 0px))';
    } else {
      el.style.bottom = '';
    }
  }
  function initScaleChrome() {
    const wrap = $('map-scale');
    const bar = $('scalebar');
    if (!wrap || !bar) return;
    wrap.classList.remove('scale-off');
    const track = bar.querySelector('.scalebar-track');
    const labelEl = bar.querySelector('.scalebar-n');
    function formatMetres(m) {
      if (m >= 1000) return (m / 1000) + ' ' + t('unit.km');
      if (m >= 1) return Math.round(m) + ' ' + t('unit.m');
      return String(m) + ' ' + t('unit.m');
    }
    function updateNorth() {
      const g = document.querySelector('#map-north .north-rot');
      if (!g) return;
      g.removeAttribute('transform');
      g.style.transformOrigin = '50% 50%';
      g.style.transformBox = 'view-box';
      g.style.transform = 'rotate(' + (-map.getBearing()) + 'deg)';
    }
    function updateScale() {
      updateNorth();
      const maxPx = phone ? 96 : 120;
      const box = map.getContainer();
      const y = box.clientHeight / 2;
      const x = box.clientWidth / 2;
      const a = map.unproject([x, y]);
      const b = map.unproject([x + maxPx, y]);
      const maxM = a.distanceTo(b);
      if (!isFinite(maxM) || maxM <= 0) return;
      const exp = Math.pow(10, Math.floor(Math.log10(maxM)));
      const f = maxM / exp;
      const nice = (f >= 5 ? 5 : f >= 2 ? 2 : 1) * exp;
      const px = Math.max(40, Math.round(maxPx * (nice / maxM)));
      bar.style.width = px + 'px';
      const text = formatMetres(nice);
      labelEl.textContent = text;
      bar.setAttribute('aria-label', text);
      if (track.children.length !== 4) track.innerHTML = '<i></i><i></i><i></i><i></i>';
    }
    function canPitch() {
      try {
        if (typeof map.getMaxPitch === 'function' && map.getMaxPitch() <= 0) return false;
        const drag = map.dragRotate && map.dragRotate.isEnabled();
        const touch = map.touchPitch && map.touchPitch.isEnabled();
        return !!(drag || touch);
      } catch (e) { return false; }
    }
    function resetPlanView(ms) {
      const opts = { bearing: 0, duration: ms == null ? 300 : ms };
      if (canPitch()) opts.pitch = 0;
      map.easeTo(opts);
    }
    function typingTarget(el) {
      if (!el) return false;
      const tag = (el.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
      if (el.isContentEditable) return true;
      return !!(el.closest && el.closest('input, textarea, select, [contenteditable="true"], [contenteditable=""]'));
    }
    $('map-north').addEventListener('click', () => { resetPlanView(300); });
    const topBtn = $('topview-btn');
    if (topBtn) topBtn.addEventListener('click', () => { resetPlanView(300); });
    document.addEventListener('keydown', ev => {
      if (ev.key !== 'd' && ev.key !== 'D') return;
      if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
      if (ev.repeat) return;
      if (typingTarget(ev.target) || typingTarget(document.activeElement)) return;
      ev.preventDefault();
      resetPlanView(300);
    });
    map.on('move', updateScale);
    map.on('resize', () => { placeScale(); updateScale(); });
    placeScale();
    if (map.loaded()) updateScale();
    else map.once('load', updateScale);
  }


  const TOOL_ORDER = {
    'sketch-btn': 1,
    'measure-btn': 2,
    'grid-toggle': 3,
    'profile-btn': 4,
    'compare-btn': 5,
    'bookmark-btn': 6,
    'globe-toggle': 7,
    'print-btn': 8
  };
  function ensureToolsGrid() {
    const box = $('measure-box');
    if (!box) return null;
    let grid = $('tools-grid');
    if (!grid) {
      grid = document.createElement('div');
      grid.id = 'tools-grid';
      grid.className = 'tools-grid';
      box.appendChild(grid);
    }
    return grid;
  }
  function placeToolBtn(btn) {
    const grid = ensureToolsGrid();
    if (!grid || !btn) return;
    const order = TOOL_ORDER[btn.id];
    if (order) btn.style.order = String(order);
    grid.appendChild(btn);
  }
  window.atlasPlaceTool = placeToolBtn;

  function initMeasure() {
    const R = 6371000;
    const toRad = d => d * Math.PI / 180;
    const SRC = 'atlas-measure';
    const LIDS = ['atlas-measure-halo', 'atlas-measure-casing', 'atlas-measure-line', 'atlas-measure-pts', 'atlas-measure-fill'];
    let on = false, done = false, verts = [];
    let mode = 'distance';
    let lastTap = 0, lastPt = null, labelMk = null, hover = null;
    const box = document.createElement('div');
    box.id = 'measure-box';
    box.className = 'measure-box';
    box.innerHTML = '<div class="measure-actions" id="measure-actions" hidden>' +
      '<div class="measure-mode" role="group" aria-label="' + t('tool.measure') + '">' +
      '<button type="button" id="measure-dist" aria-pressed="true" aria-label="' + t('tool.distance') + '" title="' + t('tool.distance') + '">' + ICON.distance + '</button>' +
      '<button type="button" id="measure-area" aria-pressed="false" aria-label="' + t('tool.area') + '" title="' + t('tool.area') + '">' + ICON.area + '</button>' +
      '</div>' +
      '<button type="button" id="measure-done">' + t('tool.done') + '</button>' +
      '<button type="button" id="measure-clear">' + t('tool.clear') + '</button>' +
      '</div>';
    box.hidden = true;
    (document.querySelector('.wrap') || document.getElementById('mapview') || document.body).appendChild(box);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'measure-btn';
    btn.id = 'measure-btn';
    btn.setAttribute('aria-pressed', 'false');
    btn.setAttribute('aria-label', t('tool.measure'));
    btn.title = t('tool.measure');
    btn.innerHTML = ICON.ruler;
    placeToolBtn(btn);
    const actions = box.querySelector('#measure-actions');
    function haversine(a, b) {
      const dLat = toRad(b[1] - a[1]), dLon = toRad(b[0] - a[0]);
      const lat1 = toRad(a[1]), lat2 = toRad(b[1]);
      const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
      return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
    }
    function dest(a, b, f) {
      const lat1 = toRad(a[1]), lon1 = toRad(a[0]);
      const lat2 = toRad(b[1]), lon2 = toRad(b[0]);
      const d = haversine(a, b) / R;
      if (d < 1e-12) return [a[0], a[1]];
      const sinD = Math.sin(d), cosD = Math.cos(d);
      const A = Math.sin((1 - f) * d) / sinD, B = Math.sin(f * d) / sinD;
      const x = A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2);
      const y = A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2);
      const z = A * Math.sin(lat1) + B * Math.sin(lat2);
      return [Math.atan2(y, x) * 180 / Math.PI, Math.atan2(z, Math.sqrt(x * x + y * y)) * 180 / Math.PI];
    }
    function densify(a, b) {
      const d = haversine(a, b);
      const n = Math.max(1, Math.ceil(d / 25000));
      const pts = [a];
      for (let i = 1; i < n; i++) pts.push(dest(a, b, i / n));
      pts.push(b);
      return pts;
    }
    function fmt(m) {
      if (m < 1000) return Math.round(m) + ' ' + t('unit.m');
      const km = m / 1000;
      const s = km < 10 ? km.toFixed(2) : km < 100 ? km.toFixed(1) : String(Math.round(km));
      return s.replace(/\.0+$/, '').replace(/(\.\d)0$/, '$1') + ' ' + t('unit.km');
    }
    function segments() {
      const out = [];
      for (let i = 1; i < verts.length; i++) out.push(haversine(verts[i - 1], verts[i]));
      return out;
    }
    function totalM() { return segments().reduce((s, x) => s + x, 0); }
    function ring() { return verts.length >= 3 ? verts.concat([verts[0]]) : verts; }
    function perimeterM() {
      const r = ring();
      let t = 0;
      for (let i = 1; i < r.length; i++) t += haversine(r[i - 1], r[i]);
      return t;
    }
    function areaM2() {
      if (verts.length < 3) return 0;
      const R = 6378137;
      const pts = ring();
      let sum = 0;
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1];
        sum += (toRad(b[0]) - toRad(a[0])) * (2 + Math.sin(toRad(a[1])) + Math.sin(toRad(b[1])));
      }
      return Math.abs(sum * R * R / 2);
    }
    function fmtArea(m2) {
      if (m2 < 1e6) {
        const ha = m2 / 1e4;
        return (ha < 10 ? ha.toFixed(2) : ha < 100 ? ha.toFixed(1) : Math.round(ha)) + ' ' + t('unit.ha');
      }
      const km2 = m2 / 1e6;
      return (km2 < 10 ? km2.toFixed(2) : km2 < 100 ? km2.toFixed(1) : Math.round(km2)) + ' ' + t('unit.km2');
    }
    function lineFeat(a, b, rubber) {
      return { type: 'Feature', properties: { rubber: rubber ? 1 : 0 }, geometry: { type: 'LineString', coordinates: densify(a, b) } };
    }
    function fcLine() {
      const features = [];
      if (verts.length >= 2) {
        const srcPts = mode === 'area' && verts.length >= 3 ? ring() : verts;
        const coords = [];
        for (let i = 1; i < srcPts.length; i++) densify(srcPts[i - 1], srcPts[i]).forEach((p, j) => { if (j || !coords.length) coords.push(p); });
        features.push({ type: 'Feature', properties: { rubber: 0 }, geometry: { type: 'LineString', coordinates: coords } });
      }
      if (!done && hover && verts.length >= 1) features.push(lineFeat(verts[verts.length - 1], hover, true));
      return { type: 'FeatureCollection', features };
    }
    function fcPoly() {
      if (mode !== 'area' || verts.length < 3) return { type: 'FeatureCollection', features: [] };
      const pts = ring();
      const coords = [];
      for (let i = 1; i < pts.length; i++) densify(pts[i - 1], pts[i]).forEach((p, j) => { if (j || !coords.length) coords.push(p); });
      coords.push(coords[0]);
      return { type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [coords] } }] };
    }
    function fcPts() {
      return { type: 'FeatureCollection', features: verts.map((c, i) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: c }, properties: { i } })) };
    }
    function raise() {
      const layers = (map.getStyle() && map.getStyle().layers) || [];
      const base = layers.find(l => l.type === 'symbol' && !/^(atlas-|eqazyna-|process-|geo200-)/.test(l.id));
      const before = base && base.id;
      LIDS.forEach(id => { if (map.getLayer(id)) { try { map.moveLayer(id, before); } catch (e) {} } });
    }
    function ensure() {
      if (!map.getStyle() || !map.getStyle().layers) return;
      if (!map.getSource(SRC)) map.addSource(SRC, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      if (!map.getSource(SRC + '-pts')) map.addSource(SRC + '-pts', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      if (!map.getSource(SRC + '-poly')) map.addSource(SRC + '-poly', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      const layers = (map.getStyle() && map.getStyle().layers) || [];
      const base = layers.find(l => l.type === 'symbol' && !/^(atlas-|eqazyna-|process-|geo200-)/.test(l.id));
      const before = base && base.id;
      const lineLayout = { 'line-join': 'round', 'line-cap': 'round' };
      if (!map.getLayer('atlas-measure-fill')) map.addLayer({ id: 'atlas-measure-fill', type: 'fill', source: SRC + '-poly',
        paint: { 'fill-color': '#1c1917', 'fill-opacity': 0.08 } }, before);
      if (!map.getLayer('atlas-measure-halo')) map.addLayer({ id: 'atlas-measure-halo', type: 'line', source: SRC,
        layout: lineLayout, paint: { 'line-color': '#1c1917', 'line-width': 5, 'line-opacity': 0.45 } }, before);
      if (!map.getLayer('atlas-measure-casing')) map.addLayer({ id: 'atlas-measure-casing', type: 'line', source: SRC,
        layout: lineLayout, paint: { 'line-color': '#fafaf9', 'line-width': 3.4, 'line-opacity': 0.95 } }, before);
      if (!map.getLayer('atlas-measure-line')) map.addLayer({ id: 'atlas-measure-line', type: 'line', source: SRC,
        layout: lineLayout, paint: { 'line-color': '#1c1917', 'line-width': 1.75 } }, before);
      if (!map.getLayer('atlas-measure-pts')) map.addLayer({ id: 'atlas-measure-pts', type: 'circle', source: SRC + '-pts',
        paint: { 'circle-color': '#1c1917', 'circle-radius': 3.5, 'circle-stroke-color': '#fafaf9', 'circle-stroke-width': 2 } }, before);
      raise();
    }
    function setLabel() {
      if (labelMk) { labelMk.remove(); labelMk = null; }
      const need = mode === 'area' ? 3 : 2;
      if (verts.length < need) return;
      const el = document.createElement('div');
      el.className = 'measure-label';
      if (mode === 'area') {
        el.innerHTML = '<div class="ms-seg">' + fmt(perimeterM()) + '</div>' +
          '<div class="ms-total">' + fmtArea(areaM2()) + '</div>';
      } else {
        const segs = segments();
        el.innerHTML = segs.map(m => '<div class="ms-seg">' + fmt(m) + '</div>').join('') +
          '<div class="ms-total">' + fmt(totalM()) + '</div>';
      }
      const last = verts[verts.length - 1];
      labelMk = new maplibregl.Marker({ element: el, anchor: 'left', offset: [12, 0], pitchAlignment: 'viewport', rotationAlignment: 'viewport' })
        .setLngLat(last).addTo(map);
    }
    function paintLine() {
      ensure();
      if (map.getSource(SRC)) map.getSource(SRC).setData(fcLine());
      if (map.getSource(SRC + '-pts')) map.getSource(SRC + '-pts').setData(fcPts());
      if (map.getSource(SRC + '-poly')) map.getSource(SRC + '-poly').setData(fcPoly());
    }
    function redraw() {
      paintLine();
      setLabel();
    }
    function clearLine() {
      verts = [];
      done = false;
      lastTap = 0; lastPt = null; hover = null;
      if (map.getSource(SRC)) map.getSource(SRC).setData({ type: 'FeatureCollection', features: [] });
      if (map.getSource(SRC + '-pts')) map.getSource(SRC + '-pts').setData({ type: 'FeatureCollection', features: [] });
      if (map.getSource(SRC + '-poly')) map.getSource(SRC + '-poly').setData({ type: 'FeatureCollection', features: [] });
      if (labelMk) { labelMk.remove(); labelMk = null; }
    }
    const doneBtn = box.querySelector('#measure-done');
    const clearBtn = box.querySelector('#measure-clear');
    function syncMeasureUi() {
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      const keep = on || (done && verts.length >= 2);
      actions.hidden = !keep;
      if (doneBtn) doneBtn.hidden = !on || done;
      document.body.classList.toggle('measure-on', on);
    }
    function setOn(v) {
      if (!v) {
        on = false;
        done = false;
        clearLine();
        syncMeasureUi();
        try { map.doubleClickZoom.enable(); } catch (e) {}
        map.getCanvas().style.cursor = '';
        return;
      }
      if (done && verts.length) {
        clearLine();
        on = false;
        syncMeasureUi();
        try { map.doubleClickZoom.enable(); } catch (e) {}
        map.getCanvas().style.cursor = '';
        return;
      }
      on = true;
      done = false;
      hover = null;
      ensure();
      syncMeasureUi();
      try { map.doubleClickZoom.disable(); } catch (e) {}
      closeFeaturePopup();
      clearSel();
      if (window.atlasSketch && window.atlasSketch.active && window.atlasSketch.active()) window.atlasSketch.setOn(false);
      if (window.atlasProfile && window.atlasProfile.active && window.atlasProfile.active()) window.atlasProfile.setOn(false);
      if (window.atlasCompare && window.atlasCompare.active && window.atlasCompare.active()) window.atlasCompare.setOn(false);
    }
    function finish() {
      if (!on) return;
      const need = mode === 'area' ? 3 : 2;
      if (verts.length < need) { setOn(false); return; }
      done = true;
      hover = null;
      on = false;
      try { map.doubleClickZoom.enable(); } catch (e) {}
      map.getCanvas().style.cursor = '';
      syncMeasureUi();
      redraw();
    }
    function addVertex(ll) {
      if (verts.length) {
        const prev = verts[verts.length - 1];
        if (Math.abs(prev[0] - ll[0]) < 1e-10 && Math.abs(prev[1] - ll[1]) < 1e-10) return;
      }
      verts.push(ll);
      redraw();
    }
    function handleClick(e) {
      if (!on || done) return false;
      const now = Date.now(), pt = e.point;
      if (mode === 'area' && verts.length >= 3) {
        const p0 = map.project(verts[0]);
        if (Math.hypot(p0.x - pt.x, p0.y - pt.y) < 14) { finish(); return true; }
      }
      if (lastPt && now - lastTap < 350 && Math.hypot(pt.x - lastPt.x, pt.y - lastPt.y) < 18) {
        finish();
        lastTap = 0;
        lastPt = null;
        return true;
      }
      lastTap = now;
      lastPt = { x: pt.x, y: pt.y };
      addVertex([e.lngLat.lng, e.lngLat.lat]);
      return true;
    }
    function place() {
      const wrapEl = document.querySelector('.wrap');
      const corner = document.querySelector('.maplibregl-ctrl-bottom-right');
      const wr = wrapEl ? wrapEl.getBoundingClientRect() : { right: window.innerWidth, bottom: window.innerHeight };
      const gap = 8;
      const edge = matchMedia('(max-width:700px)').matches ? 10 : 12;
      let right = 52, bottom = edge;
      if (corner) {
        const cr = corner.getBoundingClientRect();
        right = Math.max(edge, Math.round(wr.right - cr.left + gap));
        bottom = Math.max(edge, Math.round(wr.bottom - cr.bottom));
      }
      box.style.right = right + 'px';
      box.style.bottom = 'calc(' + bottom + 'px + env(safe-area-inset-bottom, 0px))';
    }
    function bindMeasureTap(el, fn) {
      if (!el) return;
      let last = 0;
      const run = ev => {
        ev.preventDefault();
        ev.stopPropagation();
        const now = Date.now();
        if (now - last < 400) return;
        last = now;
        fn();
      };
      el.addEventListener('pointerdown', ev => ev.stopPropagation());
      el.addEventListener('touchstart', ev => ev.stopPropagation(), { passive: true });
      el.addEventListener('click', run);
      el.addEventListener('pointerup', ev => {
        ev.stopPropagation();
        if (ev.pointerType === 'touch') run(ev);
      });
    }
    bindMeasureTap(btn, () => setOn(!on));
    bindMeasureTap(doneBtn, finish);
    bindMeasureTap(clearBtn, () => setOn(false));
    const distBtn = box.querySelector('#measure-dist');
    const areaBtn = box.querySelector('#measure-area');
    function setMode(m) {
      mode = m === 'area' ? 'area' : 'distance';
      if (distBtn) distBtn.setAttribute('aria-pressed', String(mode === 'distance'));
      if (areaBtn) areaBtn.setAttribute('aria-pressed', String(mode === 'area'));
      clearLine();
      redraw();
    }
    bindMeasureTap(distBtn, () => setMode('distance'));
    bindMeasureTap(areaBtn, () => setMode('area'));
    map.on('dblclick', e => {
      if (!on || done) return;
      e.preventDefault();
      finish();
    });
    map.getCanvas().addEventListener('contextmenu', ev => { if (on) ev.preventDefault(); });
    map.on('resize', place);
    if (!phone) {
      map.on('mousemove', e => {
        if (!on || done || !verts.length) {
          if (hover) { hover = null; paintLine(); }
          return;
        }
        hover = [e.lngLat.lng, e.lngLat.lat];
        paintLine();
      });
      map.getCanvas().addEventListener('mouseleave', () => {
        if (!hover) return;
        hover = null;
        paintLine();
      });
    }
    function whenStyleReady(fn) {
      if (map.isStyleLoaded()) fn();
      else map.once('styledata', function wait() {
        if (map.isStyleLoaded()) fn();
        else map.once('styledata', wait);
      });
    }
    whenStyleReady(() => { ensure(); place(); });
    setTimeout(place, 400);
    window.atlasMeasure = {
      click: handleClick,
      active: () => on,
      finished: () => done,
      place,
      redraw,
      setOn
    };
  }


  function initSketch() {
    const box = $('measure-box');
    if (!box) return;
    const STORE = 'atlas-sketch-v1';
    const SRC = 'atlas-sketch';
    const LIDS = ['atlas-sketch-halo', 'atlas-sketch-line'];
    const COLOURS = [
      { id: 'red', hex: '#dc2626', labelKey: 'color.red' },
      { id: 'black', hex: '#1c1917', labelKey: 'color.black' },
      { id: 'blue', hex: '#1d4ed8', labelKey: 'color.blue' },
      { id: 'yellow', hex: '#eab308', labelKey: 'color.yellow' }
    ];
    const WIDTHS = { thin: 2.5, thick: 6 };
    const ico = {
      pencil: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 20.2 5.1 16 16.6 4.5a2 2 0 0 1 2.8 0l.1.1a2 2 0 0 1 0 2.8L8 19.1 3.8 20.4 4 20.2zm10.1-13.4 2.9 2.9"/></svg>',
      eraser: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M5 14.8 13.2 6.6a2 2 0 0 1 2.8 0l1.4 1.4a2 2 0 0 1 0 2.8L9.2 19H5v-4.2zM4 20h16v1.8H4z"/></svg>',
      thin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path stroke="currentColor" stroke-width="1.6" stroke-linecap="round" d="M5 12h14"/></svg>',
      thick: '<svg viewBox="0 0 24 24" aria-hidden="true"><path stroke="currentColor" stroke-width="4.2" stroke-linecap="round" d="M5 12h14"/></svg>',
      undo: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M8 8H4v4"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M5.2 15.2A7 7 0 1 0 6 8.4"/></svg>',
      clear: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M6 7h12M9 7V5.8A1.8 1.8 0 0 1 10.8 4h2.4A1.8 1.8 0 0 1 15 5.8V7m-7.2 0 0.6 11.2A1.8 1.8 0 0 0 10.2 20h3.6a1.8 1.8 0 0 0 1.8-1.8L16.2 7"/></svg>'
    };
    let on = false, tool = 'pencil', colour = COLOURS[0].hex, width = WIDTHS.thin;
    let features = [], undoStack = [], nextId = 1;
    let pointers = new Set(), pending = null, live = null, eraseBatch = null;
    try {
      const raw = JSON.parse(localStorage.getItem(STORE) || 'null');
      if (raw && Array.isArray(raw.features)) {
        features = raw.features.filter(f => f && f.geometry && f.geometry.type === 'LineString' && Array.isArray(f.geometry.coordinates) && f.properties);
        features.forEach(f => { const id = Number(f.properties.id); if (isFinite(id) && id >= nextId) nextId = id + 1; });
      }
      if (raw && COLOURS.some(c => c.hex === raw.colour)) colour = raw.colour;
      if (raw && (raw.width === WIDTHS.thin || raw.width === WIDTHS.thick)) width = raw.width;
    } catch (e) {}

    const measureBtn = $('measure-btn');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'sketch-btn';
    btn.className = 'measure-btn';
    btn.setAttribute('aria-pressed', 'false');
    btn.setAttribute('aria-label', t('tool.sketch'));
    btn.title = t('tool.sketch');
    btn.innerHTML = ico.pencil;
    placeToolBtn(btn);
    const bar = document.createElement('div');
    bar.id = 'sketch-bar';
    bar.className = 'sketch-bar';
    bar.hidden = true;
    bar.innerHTML =
      '<button type="button" data-tool="pencil" aria-label="' + t('tool.pencil') + '" title="' + t('tool.pencil') + '">' + ico.pencil + '</button>' +
      '<button type="button" data-tool="erase" aria-label="' + t('tool.eraser') + '" title="' + t('tool.eraser') + '">' + ico.eraser + '</button>' +
      COLOURS.map(c => '<button type="button" class="sketch-color" data-colour="' + c.hex + '" aria-label="' + t(c.labelKey) + '" title="' + t(c.labelKey) + '"><span class="sketch-sw" style="background:' + c.hex + '"></span></button>').join('') +
      '<button type="button" data-width="thin" aria-label="' + t('tool.thin') + '" title="' + t('tool.thin') + '">' + ico.thin + '</button>' +
      '<button type="button" data-width="thick" aria-label="' + t('tool.thick') + '" title="' + t('tool.thick') + '">' + ico.thick + '</button>' +
      '<button type="button" data-act="undo" aria-label="' + t('tool.undo') + '" title="' + t('tool.undo') + '">' + ico.undo + '</button>' +
      '<button type="button" data-act="clear" aria-label="' + t('tool.clear') + '" title="' + t('tool.clear') + '">' + ico.clear + '</button>';
    box.insertBefore(bar, box.firstChild);

    function save() {
      try {
        const payload = JSON.stringify({ features, colour, width });
        if (payload.length > 900000) {
          features = features.slice(Math.floor(features.length / 3));
        }
        localStorage.setItem(STORE, JSON.stringify({ features, colour, width }));
      } catch (e) {}
    }
    function fc() {
      return { type: 'FeatureCollection', features: live ? features.concat([live]) : features };
    }
    function raise() {
      const layers = (map.getStyle() && map.getStyle().layers) || [];
      const base = layers.find(l => l.type === 'symbol' && !/^(atlas-|eqazyna-|process-|geo200-)/.test(l.id));
      LIDS.forEach(id => { if (map.getLayer(id)) { try { map.moveLayer(id, base && base.id); } catch (e) {} } });
    }
    function ensure() {
      if (!map.getStyle() || !map.getStyle().layers) return;
      if (!map.getSource(SRC)) map.addSource(SRC, { type: 'geojson', data: fc() });
      const layers = (map.getStyle() && map.getStyle().layers) || [];
      const base = layers.find(l => l.type === 'symbol' && !/^(atlas-|eqazyna-|process-|geo200-)/.test(l.id));
      const before = base && base.id;
      const layout = { 'line-join': 'round', 'line-cap': 'round' };
      if (!map.getLayer('atlas-sketch-halo')) map.addLayer({
        id: 'atlas-sketch-halo', type: 'line', source: SRC, layout,
        paint: { 'line-color': '#fafaf9', 'line-width': ['+', ['to-number', ['get', 'width']], 2.2], 'line-opacity': 0.9 }
      }, before);
      if (!map.getLayer('atlas-sketch-line')) map.addLayer({
        id: 'atlas-sketch-line', type: 'line', source: SRC, layout,
        paint: { 'line-color': ['get', 'colour'], 'line-width': ['to-number', ['get', 'width']] }
      }, before);
      raise();
    }
    function paint() {
      ensure();
      if (map.getSource(SRC)) map.getSource(SRC).setData(fc());
    }
    function syncBar() {
      bar.querySelectorAll('[data-tool]').forEach(b => b.setAttribute('aria-pressed', b.dataset.tool === tool ? 'true' : 'false'));
      bar.querySelectorAll('[data-colour]').forEach(b => b.setAttribute('aria-pressed', b.dataset.colour === colour ? 'true' : 'false'));
      bar.querySelectorAll('[data-width]').forEach(b => b.setAttribute('aria-pressed', String(WIDTHS[b.dataset.width]) === String(width) ? 'true' : 'false'));
    }
    function setOn(v) {
      on = !!v;
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      bar.hidden = !on;
      document.body.classList.toggle('sketch-on', on);
      if (on) {
        tool = 'pencil';
        syncBar();
        ensure();
        paint();
        closeFeaturePopup();
        clearSel();
        try { map.doubleClickZoom.disable(); } catch (e) {}
        if (window.atlasMeasure && window.atlasMeasure.active && window.atlasMeasure.active() && window.atlasMeasure.setOn) window.atlasMeasure.setOn(false);
        if (window.atlasProfile && window.atlasProfile.active && window.atlasProfile.active()) window.atlasProfile.setOn(false);
        if (window.atlasCompare && window.atlasCompare.active && window.atlasCompare.active()) window.atlasCompare.setOn(false);
      } else {
        pending = null; live = null; eraseBatch = null;
        pointers.clear();
        try { map.dragPan.enable(); } catch (e) {}
        if (!(window.atlasMeasure && window.atlasMeasure.active && window.atlasMeasure.active())) {
          try { map.doubleClickZoom.enable(); } catch (e) {}
        }
        map.getCanvas().style.cursor = '';
      }
    }
    function eventPoint(e) {
      const el = map.getCanvas();
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      const ll = map.unproject([x, y]);
      return { pt: { x, y }, ll: [ll.lng, ll.lat] };
    }
    function makeFeat(id, coords, col, w) {
      return { type: 'Feature', properties: { id, colour: col, width: w }, geometry: { type: 'LineString', coordinates: coords } };
    }
    function pxDist(a, b) {
      const p = map.project({ lng: a[0], lat: a[1] }), q = map.project({ lng: b[0], lat: b[1] });
      return Math.hypot(p.x - q.x, p.y - q.y);
    }
    function hitErase(p) {
      const pad = phone ? 16 : 12;
      let hits = [];
      try { hits = map.queryRenderedFeatures([[p.pt.x - pad, p.pt.y - pad], [p.pt.x + pad, p.pt.y + pad]], { layers: ['atlas-sketch-line'] }) || []; } catch (e) {}
      const ids = new Set(hits.map(f => String(f.properties && f.properties.id)));
      if (!ids.size) return;
      const kept = [], removed = [];
      features.forEach(f => {
        if (ids.has(String(f.properties.id))) removed.push(f);
        else kept.push(f);
      });
      if (!removed.length) return;
      features = kept;
      eraseBatch = (eraseBatch || []).concat(removed);
      paint();
    }
    function finishErase() {
      if (eraseBatch && eraseBatch.length) {
        undoStack.push({ type: 'erase', features: eraseBatch });
        if (undoStack.length > 50) undoStack.shift();
        save();
      }
      eraseBatch = null;
    }
    function startPencil(p) {
      live = makeFeat(nextId++, [p.ll], colour, width);
      paint();
    }
    function addPencil(p) {
      if (!live) return;
      const coords = live.geometry.coordinates;
      if (pxDist(coords[coords.length - 1], p.ll) < 2) return;
      coords.push(p.ll);
      paint();
    }
    function endPencil() {
      if (!live) return;
      const coords = live.geometry.coordinates;
      if (coords.length === 1) coords.push([coords[0][0] + 1e-7, coords[0][1] + 1e-7]);
      features.push(live);
      undoStack.push({ type: 'add', feature: live });
      if (undoStack.length > 50) undoStack.shift();
      live = null;
      save();
      paint();
    }
    function cancelLive() {
      live = null;
      pending = null;
      finishErase();
      paint();
    }
    function onDown(e) {
      if (!on) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      pointers.add(e.pointerId);
      if (e.pointerType === 'touch' && pointers.size >= 2) {
        cancelLive();
        try { map.dragPan.enable(); } catch (err) {}
        return;
      }
      const p = eventPoint(e);
      pending = { id: e.pointerId, start: p, moved: false };
      if (tool === 'erase') {
        try { map.dragPan.disable(); } catch (err) {}
        e.preventDefault();
        eraseBatch = [];
        hitErase(p);
      }
    }
    function onMove(e) {
      if (!on || !pointers.has(e.pointerId)) return;
      if (e.pointerType === 'touch' && pointers.size >= 2) {
        if (live || pending) cancelLive();
        try { map.dragPan.enable(); } catch (err) {}
        return;
      }
      const p = eventPoint(e);
      if (pending && pending.id === e.pointerId && tool === 'pencil') {
        const d = Math.hypot(p.pt.x - pending.start.pt.x, p.pt.y - pending.start.pt.y);
        if (d >= 3) {
          pending.moved = true;
          try { map.dragPan.disable(); } catch (err) {}
          e.preventDefault();
          if (!live) startPencil(pending.start);
          addPencil(p);
        }
        return;
      }
      if (live) { e.preventDefault(); addPencil(p); }
      else if (eraseBatch) { e.preventDefault(); hitErase(p); }
    }
    function onUp(e) {
      pointers.delete(e.pointerId);
      if (pending && pending.id === e.pointerId && tool === 'pencil' && !pending.moved) {
        startPencil(pending.start);
        endPencil();
      } else if (live) {
        endPencil();
      }
      if (eraseBatch) finishErase();
      pending = null;
      if (pointers.size === 0) {
        try { map.dragPan.enable(); } catch (err) {}
      }
    }
    const canvas = map.getCanvas();
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    canvas.addEventListener('contextmenu', ev => { if (on) ev.preventDefault(); });

    btn.addEventListener('click', ev => { ev.stopPropagation(); setOn(!on); });
    bar.addEventListener('click', ev => {
      ev.stopPropagation();
      const b = ev.target.closest('button');
      if (!b) return;
      if (b.dataset.tool) { tool = b.dataset.tool; syncBar(); }
      else if (b.dataset.colour) { colour = b.dataset.colour; tool = 'pencil'; save(); syncBar(); }
      else if (b.dataset.width) { width = WIDTHS[b.dataset.width] || width; tool = 'pencil'; save(); syncBar(); }
      else if (b.dataset.act === 'undo') {
        const a = undoStack.pop();
        if (!a) return;
        if (a.type === 'add') features = features.filter(f => f.properties.id !== a.feature.properties.id);
        else if (a.type === 'erase' || a.type === 'clear') features = features.concat(a.features);
        save(); paint();
      } else if (b.dataset.act === 'clear') {
        if (!features.length) return;
        undoStack.push({ type: 'clear', features: features.slice() });
        if (undoStack.length > 50) undoStack.shift();
        features = [];
        save(); paint();
      }
    });
    function whenStyleReady(fn) {
      if (map.isStyleLoaded()) fn();
      else map.once('styledata', function wait() {
        if (map.isStyleLoaded()) fn();
        else map.once('styledata', wait);
      });
    }
    whenStyleReady(() => { ensure(); paint(); if (window.atlasMeasure && window.atlasMeasure.place) window.atlasMeasure.place(); });
    window.atlasSketch = { setOn, active: () => on, redraw: paint, tool: () => tool };
  }

  // ---- shared links, coordinate go-to, and grid --------------------------
  let gridOn = !!(HASH && HASH.grid);
  if (!(HASH && HASH.grid)) {
    try { gridOn = localStorage.getItem('atlas-grid-v1') === '1'; } catch (e) {}
  }
  const GRID_STEPS = [1 / 60, 2 / 60, 5 / 60, 0.1, 0.2, 0.25, 0.5, 1, 2, 5, 10, 15, 30];
  const GRID_SRC = 'atlas-grid';
  function gridFmt(v, isLat, step) {
    const a = Math.abs(v);
    let d = Math.floor(a + 1e-9);
    let m = Math.round((a - d) * 60);
    if (m >= 60) { d += 1; m = 0; }
    let s = d + '\u00B0';
    if (step < 1) s += (m < 10 ? '0' : '') + m + '\u2032';
    return s + (isLat ? (v >= 0 ? t('dir.N') : t('dir.S')) : (v >= 0 ? t('dir.E') : t('dir.W')));
  }
  function gridFeatures() {
    const b = map.getBounds();
    const west = b.getWest(), east = b.getEast(), south = b.getSouth(), north = b.getNorth();
    const spanX = east - west;
    const feats = [];
    if (!(spanX > 0) || !isFinite(spanX)) return { type: 'FeatureCollection', features: feats };
    const degPerPx = spanX / Math.max(1, map.getContainer().clientWidth);
    let step = GRID_STEPS[GRID_STEPS.length - 1];
    for (let i = 0; i < GRID_STEPS.length; i++) {
      if (GRID_STEPS[i] / degPerPx >= 90) { step = GRID_STEPS[i]; break; }
    }
    const N = 24;
    for (let lon = Math.ceil((west - 1e-9) / step) * step; lon <= east + 1e-9; lon += step) {
      const cs = [];
      for (let j = 0; j <= N; j++) cs.push([lon, south + (north - south) * j / N]);
      feats.push({ type: 'Feature', properties: { t: gridFmt(lon, false, step) }, geometry: { type: 'LineString', coordinates: cs } });
    }
    for (let lat = Math.ceil((south - 1e-9) / step) * step; lat <= north + 1e-9; lat += step) {
      const cs = [];
      for (let j = 0; j <= N; j++) cs.push([west + (east - west) * j / N, lat]);
      feats.push({ type: 'Feature', properties: { t: gridFmt(lat, true, step) }, geometry: { type: 'LineString', coordinates: cs } });
    }
    return { type: 'FeatureCollection', features: feats };
  }
  function gridEnsure() {
    if (!map.getStyle()) return;
    if (!map.getSource(GRID_SRC)) map.addSource(GRID_SRC, { type: 'geojson', data: gridFeatures() });
    const before = firstSymbolLayer();
    if (!map.getLayer('atlas-grid-line')) map.addLayer({
      id: 'atlas-grid-line', type: 'line', source: GRID_SRC,
      paint: { 'line-color': 'rgba(28,25,23,.4)', 'line-width': 1 }
    }, before);
    if (!map.getLayer('atlas-grid-label')) map.addLayer({
      id: 'atlas-grid-label', type: 'symbol', source: GRID_SRC,
      layout: {
        'symbol-placement': 'line', 'text-field': ['get', 't'], 'text-font': ['Noto Sans Regular'],
        'text-size': 11, 'symbol-spacing': 260, 'text-padding': 2, 'text-keep-upright': true
      },
      paint: { 'text-color': '#1c1917', 'text-halo-color': '#fafaf9', 'text-halo-width': 1.2 }
    }, before);
  }
  function gridUpdate() {
    if (!gridOn || !map.isStyleLoaded()) return;
    gridEnsure();
    const src = map.getSource(GRID_SRC);
    if (src) src.setData(gridFeatures());
  }
  function setGrid(on) {
    gridOn = !!on;
    try { localStorage.setItem('atlas-grid-v1', gridOn ? '1' : '0'); } catch (e) {}
    const btn = $('grid-toggle');
    if (btn) { btn.setAttribute('aria-pressed', String(gridOn)); btn.classList.toggle('on', gridOn); }
    if (gridOn) gridUpdate();
    else {
      ['atlas-grid-label', 'atlas-grid-line'].forEach(id => { if (map.getLayer(id)) map.removeLayer(id); });
      if (map.getSource(GRID_SRC)) map.removeSource(GRID_SRC);
    }
    queueHash();
  }
  function initGrid() {
    const box = $('measure-box');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'grid-toggle';
    btn.className = 'measure-btn';
    btn.title = t('tool.grid');
    btn.setAttribute('aria-label', t('tool.grid'));
    btn.setAttribute('aria-pressed', String(gridOn));
    btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 4.5h15v15h-15z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M9.5 4.5v15M14.5 4.5v15M4.5 9.5h15M4.5 14.5h15" fill="none" stroke="currentColor" stroke-width="1.2" stroke-opacity=".55"/></svg>';
    btn.addEventListener('click', () => setGrid(!gridOn));
    placeToolBtn(btn);
    map.on('moveend', gridUpdate);
    map.on('style.load', () => { if (gridOn) { gridEnsure(); gridUpdate(); } });
    if (gridOn) gridUpdate();
  }

  function hashParams() {
    const c = map.getCenter();
    const p = new URLSearchParams();
    p.set('map', [map.getZoom().toFixed(2), c.lat.toFixed(4), c.lng.toFixed(4), map.getBearing().toFixed(1), map.getPitch().toFixed(1)].join('/'));
    const ov = [...ovOn].filter(id => ovs[id]);
    const mn = [...mainsOn].filter(id => all[id]);
    const sp = [];
    if (fig1bOn) sp.push('fig1b');
    if (itmOn) sp.push('itm');
    if (window.atlasEqazyna && window.atlasEqazyna.isOn && window.atlasEqazyna.isOn()) sp.push('eq');
    const pr = window.atlasProcess;
    if (pr && pr.isOn) ['open', 'auction', 'pugfn'].forEach(id => { if (pr.isOn(id)) sp.push('pr:' + id); });
    if (window.atlasGeo200 && window.atlasGeo200.isOn && window.atlasGeo200.isOn()) sp.push('geo200');
    if (!ov.length) p.delete('ov'); else p.set('ov', ov.join(','));
    if (!mn.length) p.delete('m'); else p.set('m', mn.join(','));
    if (!sp.length) p.delete('l'); else p.set('l', sp.join(','));
    if (gridOn) p.set('g', '1');
    if (basemap === 'sat') { p.set('bm', 'sat'); p.set('sat', satKind); }
    return p;
  }
  function writeHash() {
    if (!map.getStyle()) return;
    try { history.replaceState(null, '', location.pathname + location.search + '#' + hashParams().toString()); } catch (e) {}
  }
  let hashTimer = null;
  function saveViewState() {
    if (!map.getStyle()) return;
    const c = map.getCenter();
    const ov = [...ovOn].filter(id => ovs[id]);
    const mn = [...mainsOn].filter(id => all[id]);
    const sp = [];
    if (fig1bOn) sp.push('fig1b');
    if (itmOn) sp.push('itm');
    if (window.atlasEqazyna && window.atlasEqazyna.isOn && window.atlasEqazyna.isOn()) sp.push('eq');
    const pr = window.atlasProcess;
    if (pr && pr.isOn) ['open', 'auction', 'pugfn'].forEach(id => { if (pr.isOn(id)) sp.push('pr:' + id); });
    if (window.atlasGeo200 && window.atlasGeo200.isOn && window.atlasGeo200.isOn()) sp.push('geo200');
    try {
      localStorage.setItem(VIEW_STORE, JSON.stringify({
        v: 1,
        view: {
          lat: +c.lat.toFixed(5), lng: +c.lng.toFixed(5),
          zoom: +map.getZoom().toFixed(3), bearing: +map.getBearing().toFixed(1), pitch: +map.getPitch().toFixed(1)
        },
        ov, mains: mn, op: layerOp, special: sp, bm: basemap, sat: satKind
      }));
    } catch (e) {}
  }
  function queueHash() { clearTimeout(hashTimer); hashTimer = setTimeout(() => { writeHash(); saveViewState(); }, 300); }
  // A share link pasted while the app is already open changes only the hash;
  // reload once so the view state is rebuilt from it.
  window.addEventListener('hashchange', () => { try { location.reload(); } catch (e) {} });

  function initProfile() {
    const box = $('measure-box');
    const SRC = 'atlas-profile';
    let on = false, done = false, verts = [];
    let lastTap = 0, lastPt = null;
    let panel = null, dotMk = null, samples = null, lastData = null;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'profile-btn';
    btn.className = 'measure-btn';
    btn.title = t('tool.profile');
    btn.setAttribute('aria-label', t('tool.profile'));
    btn.setAttribute('aria-pressed', 'false');
    btn.innerHTML = ICON.chart;
    placeToolBtn(btn);

    function toRad(d) { return d * Math.PI / 180; }
    function haversine(a, b) {
      const R = 6371000;
      const dLat = toRad(b[1] - a[1]), dLon = toRad(b[0] - a[0]);
      const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[1])) * Math.cos(toRad(b[1])) * Math.sin(dLon / 2) ** 2;
      return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
    }
    function dest(a, b, f) {
      const R = 6371000;
      const lat1 = toRad(a[1]), lon1 = toRad(a[0]);
      const lat2 = toRad(b[1]), lon2 = toRad(b[0]);
      const d = haversine(a, b) / R;
      if (d < 1e-12) return [a[0], a[1]];
      const sinD = Math.sin(d), cosD = Math.cos(d);
      const A = Math.sin((1 - f) * d) / sinD, B = Math.sin(f * d) / sinD;
      const x = A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2);
      const y = A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2);
      const z = A * Math.sin(lat1) + B * Math.sin(lat2);
      return [Math.atan2(y, x) * 180 / Math.PI, Math.atan2(z, Math.sqrt(x * x + y * y)) * 180 / Math.PI];
    }
    function ensure() {
      if (!map.getStyle()) return;
      if (!map.getSource(SRC)) map.addSource(SRC, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      if (!map.getSource(SRC + '-pts')) map.addSource(SRC + '-pts', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      const layers = (map.getStyle() && map.getStyle().layers) || [];
      const base = layers.find(l => l.type === 'symbol' && !/^(atlas-|eqazyna-|process-|geo200-)/.test(l.id));
      const before = base && base.id;
      if (!map.getLayer('atlas-profile-line')) map.addLayer({ id: 'atlas-profile-line', type: 'line', source: SRC,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#1c1917', 'line-width': 1.75 } }, before);
      if (!map.getLayer('atlas-profile-pts')) map.addLayer({ id: 'atlas-profile-pts', type: 'circle', source: SRC + '-pts',
        paint: { 'circle-color': '#1c1917', 'circle-radius': 3.5, 'circle-stroke-color': '#fafaf9', 'circle-stroke-width': 2 } }, before);
    }
    function paint() {
      ensure();
      if (map.getSource(SRC)) map.getSource(SRC).setData({ type: 'FeatureCollection', features: verts.length >= 2 ? [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: verts } }] : [] });
      if (map.getSource(SRC + '-pts')) map.getSource(SRC + '-pts').setData({ type: 'FeatureCollection', features: verts.map((c, i) => ({ type: 'Feature', properties: { i }, geometry: { type: 'Point', coordinates: c } })) });
    }
    function clearLine() {
      verts = []; done = false; lastTap = 0; lastPt = null;
      if (map.getSource(SRC)) map.getSource(SRC).setData({ type: 'FeatureCollection', features: [] });
      if (map.getSource(SRC + '-pts')) map.getSource(SRC + '-pts').setData({ type: 'FeatureCollection', features: [] });
    }
    function closePanel() {
      if (headAbort) { try { headAbort.abort(); } catch (e) {} headAbort = null; }
      if (panel) { panel.remove(); panel = null; }
      if (dotMk) { dotMk.remove(); dotMk = null; }
      samples = null;
    }
    function setOn(v) {
      on = !!v;
      done = false;
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      document.body.classList.toggle('profile-on', on);
      if (on) {
        clearLine();
        closePanel();
        lastData = null;
        demCache.clear();
        try { map.doubleClickZoom.disable(); } catch (e) {}
        closeFeaturePopup(); clearSel();
        if (window.atlasSketch && window.atlasSketch.active && window.atlasSketch.active()) window.atlasSketch.setOn(false);
        if (window.atlasMeasure && window.atlasMeasure.active && window.atlasMeasure.active()) window.atlasMeasure.setOn(false);
        if (window.atlasCompare && window.atlasCompare.active && window.atlasCompare.active()) window.atlasCompare.setOn(false);
        paint();
        showHint();
      } else {
        computeGen++;
        try { map.doubleClickZoom.enable(); } catch (e) {}
        clearLine();
        closePanel();
      }
    }
    const Z = 11;
    const demCache = new Map();
    function tileOf(lng, lat) {
      const n = 1 << Z;
      const la = Math.max(-85.05, Math.min(85.05, lat));
      const x = Math.floor((lng + 180) / 360 * n);
      const y = Math.floor((1 - Math.log(Math.tan(toRad(la)) + 1 / Math.cos(toRad(la))) / Math.PI) / 2 * n);
      return { x: Math.max(0, Math.min(n - 1, x)), y: Math.max(0, Math.min(n - 1, y)), n };
    }
    function tilePixel(lng, lat, t) {
      const la = Math.max(-85.05, Math.min(85.05, lat));
      const fx = ((lng + 180) / 360 * t.n - t.x) * 256;
      const fy = ((1 - Math.log(Math.tan(toRad(la)) + 1 / Math.cos(toRad(la))) / Math.PI) / 2 * t.n - t.y) * 256;
      return { x: Math.max(0, Math.min(255, Math.floor(fx))), y: Math.max(0, Math.min(255, Math.floor(fy))) };
    }
    function pixelsFromImage(img) {
      if (!img) return null;
      const cv = document.createElement('canvas');
      cv.width = 256; cv.height = 256;
      const cx = cv.getContext('2d');
      try {
        cx.drawImage(img, 0, 0);
        return cx.getImageData(0, 0, 256, 256);
      } catch (e) { return null; }
    }
    function abortAfter(ms) {
      if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') return AbortSignal.timeout(ms);
      const c = new AbortController();
      setTimeout(() => c.abort(), ms);
      return c.signal;
    }
    function imageFromUrl(url) {
      return new Promise(resolve => {
        const img = new Image();
        const done = v => { clearTimeout(tm); img.onload = img.onerror = null; resolve(v); };
        const tm = setTimeout(() => done(null), 4000);
        img.crossOrigin = 'anonymous';
        img.onload = () => done(img);
        img.onerror = () => done(null);
        img.src = url;
      });
    }
    function loadTile(x, y) {
      const key = Z + '/' + x + '/' + y;
      if (demCache.has(key)) return demCache.get(key);
      const url = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/' + Z + '/' + x + '/' + y + '.png';
      const p = fetch(url, { signal: abortAfter(5000) })
        .then(r => { if (!r.ok) throw new Error('tile ' + r.status); return r.blob(); })
        .then(b => (typeof createImageBitmap === 'function' ? createImageBitmap(b) : Promise.reject(new Error('no bitmap'))))
        .then(pixelsFromImage)
        .catch(() => imageFromUrl(url).then(pixelsFromImage))
        .catch(() => null);
      demCache.set(key, p);
      return p;
    }
    async function elevationAt(lng, lat) {
      const t = tileOf(lng, lat);
      const img = await loadTile(t.x, t.y);
      if (!img) return null;
      const p = tilePixel(lng, lat, t);
      const i = (p.y * 256 + p.x) * 4;
      const d = img.data;
      return d[i] * 256 + d[i + 1] + d[i + 2] / 256 - 32768;
    }
    async function sampleAll() {
      const N = 200;
      const segs = [];
      let total = 0;
      for (let i = 1; i < verts.length; i++) { const d = haversine(verts[i - 1], verts[i]); segs.push({ a: verts[i - 1], b: verts[i], d }); total += d; }
      const out = [];
      for (let k = 0; k < N; k++) {
        const target = total * (k / (N - 1));
        let acc = 0;
        for (let s = 0; s < segs.length; s++) {
          const g = segs[s];
          if (acc + g.d >= target || s === segs.length - 1) {
            const f = g.d > 0 ? Math.min(1, (target - acc) / g.d) : 0;
            const p = dest(g.a, g.b, f);
            out.push({ d: target, lng: p[0], lat: p[1], e: null });
            break;
          }
          acc += g.d;
        }
      }
      const pending = [];
      const seen = new Set();
      for (const s of out) {
        const tile = tileOf(s.lng, s.lat);
        const k = tile.x + '/' + tile.y;
        if (seen.has(k)) continue;
        seen.add(k);
        pending.push(loadTile(tile.x, tile.y));
      }
      await Promise.all(pending);
      for (const s of out) s.e = await elevationAt(s.lng, s.lat);
      return { samples: out, total };
    }
    function smooth(arr) {
      return arr.map((s, i) => {
        if (s.e == null) return s;
        const win = [arr[i - 1], s, arr[i + 1]].filter(x => x && x.e != null).map(x => x.e);
        return { d: s.d, lng: s.lng, lat: s.lat, e: win.reduce((a, b) => a + b, 0) / win.length };
      });
    }
    function stats(arr) {
      let min = Infinity, max = -Infinity, ascent = 0, prev = null;
      arr.forEach(s => {
        if (s.e == null) { prev = null; return; }
        if (s.e < min) min = s.e;
        if (s.e > max) max = s.e;
        if (prev != null) { const d = s.e - prev; if (d > 0) ascent += d; }
        prev = s.e;
      });
      return { min: isFinite(min) ? min : null, max: isFinite(max) ? max : null, ascent: ascent };
    }
    function fmtM(v) { return Math.round(v) + ' ' + t('unit.m'); }
    function fmtCoord(lat, lng) {
      return (Number(lat)).toFixed(5) + ', ' + (Number(lng)).toFixed(5);
    }
    function profileStamp() {
      const d = new Date();
      const p = n => String(n).padStart(2, '0');
      return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes());
    }
    function profileCredit() {
      return 'kzgeology.com \u00B7 elevation: Mapzen / AWS Terrain Tiles';
    }
    function profileEnds() {
      const a = verts && verts.length ? verts[0] : (lastData && lastData.samples && lastData.samples[0]);
      const b = verts && verts.length ? verts[verts.length - 1] : (lastData && lastData.samples && lastData.samples[lastData.samples.length - 1]);
      const start = a ? (Array.isArray(a) ? { lng: a[0], lat: a[1] } : { lng: a.lng, lat: a.lat }) : null;
      const end = b ? (Array.isArray(b) ? { lng: b[0], lat: b[1] } : { lng: b.lng, lat: b.lat }) : null;
      return { start, end };
    }
    function downloadBlob(blob, name) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.rel = 'noopener';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { try { URL.revokeObjectURL(url); } catch (e) {} a.remove(); }, 2500);
    }
    const CRC_TABLE = (function () {
      const t = new Uint32Array(256);
      for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        t[n] = c >>> 0;
      }
      return t;
    })();
    function crc32(u8) {
      let c = 0xFFFFFFFF;
      for (let i = 0; i < u8.length; i++) c = CRC_TABLE[(c ^ u8[i]) & 0xFF] ^ (c >>> 8);
      return (c ^ 0xFFFFFFFF) >>> 0;
    }
    function u16(n) { return new Uint8Array([n & 255, (n >>> 8) & 255]); }
    function u32(n) { return new Uint8Array([n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255]); }
    function zipStore(files) {
      const enc = new TextEncoder();
      const now = new Date();
      const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
      const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
      const locals = [], centrals = [];
      let offset = 0;
      files.forEach(f => {
        const name = enc.encode(f.name);
        const data = typeof f.data === 'string' ? enc.encode(f.data) : f.data;
        const crc = crc32(data);
        const loc = new Uint8Array(30 + name.length + data.length);
        loc.set([0x50, 0x4b, 0x03, 0x04, 20, 0, 0, 0, 0, 0], 0);
        loc.set(u16(dosTime), 10); loc.set(u16(dosDate), 12);
        loc.set(u32(crc), 14); loc.set(u32(data.length), 18); loc.set(u32(data.length), 22);
        loc.set(u16(name.length), 26); loc.set(u16(0), 28);
        loc.set(name, 30); loc.set(data, 30 + name.length);
        locals.push(loc);
        const cen = new Uint8Array(46 + name.length);
        cen.set([0x50, 0x4b, 0x01, 0x02, 20, 0, 20, 0, 0, 0, 0, 0], 0);
        cen.set(u16(dosTime), 12); cen.set(u16(dosDate), 14);
        cen.set(u32(crc), 16); cen.set(u32(data.length), 20); cen.set(u32(data.length), 24);
        cen.set(u16(name.length), 28);
        cen.set(u16(0), 30); cen.set(u16(0), 32); cen.set(u16(0), 34); cen.set(u16(0), 36);
        cen.set(u32(0), 38); cen.set(u32(offset), 42);
        cen.set(name, 46);
        centrals.push(cen);
        offset += loc.length;
      });
      const cdStart = offset;
      let cdSize = 0;
      centrals.forEach(c => { cdSize += c.length; });
      const end = new Uint8Array(22);
      end.set([0x50, 0x4b, 0x05, 0x06, 0, 0, 0, 0], 0);
      end.set(u16(files.length), 8); end.set(u16(files.length), 10);
      end.set(u32(cdSize), 12); end.set(u32(cdStart), 16); end.set(u16(0), 20);
      const out = new Uint8Array(cdStart + cdSize + 22);
      let p = 0;
      locals.forEach(x => { out.set(x, p); p += x.length; });
      centrals.forEach(x => { out.set(x, p); p += x.length; });
      out.set(end, p);
      return out;
    }
    function xmlEsc(s) {
      return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    }
    function colLetter(n) {
      let s = '';
      n += 1;
      while (n > 0) {
        const r = (n - 1) % 26;
        s = String.fromCharCode(65 + r) + s;
        n = Math.floor((n - 1) / 26);
      }
      return s;
    }
    function xlsxInline(ref, s) {
      return '<c r="' + ref + '" t="inlineStr"><is><t>' + xmlEsc(s) + '</t></is></c>';
    }
    function xlsxNum(ref, n) {
      if (n == null || !isFinite(n)) return '<c r="' + ref + '"/>';
      return '<c r="' + ref + '" t="n"><v>' + n + '</v></c>';
    }
    function xlsxSheet(rows) {
      let out = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>';
      rows.forEach((row, i) => {
        const r = i + 1;
        out += '<row r="' + r + '">';
        (row || []).forEach((cell, c) => {
          const ref = colLetter(c) + r;
          if (cell && cell.t === 'n') out += xlsxNum(ref, cell.v);
          else out += xlsxInline(ref, cell == null ? '' : (cell.v != null ? cell.v : cell));
        });
        out += '</row>';
      });
      out += '</sheetData></worksheet>';
      return out;
    }
    function buildXlsx(data, st) {
      const ends = profileEnds();
      const sampleRows = [['distance_km', 'elevation_m', 'lat', 'lon']];
      (data.samples || []).forEach(s => {
        sampleRows.push([
          { t: 'n', v: +(s.d / 1000).toFixed(6) },
          s.e == null ? '' : { t: 'n', v: +Number(s.e).toFixed(3) },
          { t: 'n', v: +Number(s.lat).toFixed(6) },
          { t: 'n', v: +Number(s.lng).toFixed(6) }
        ]);
      });
      const sum = [];
      sum.push([t('profile.exportTitle')]);
      sum.push([t('profile.min'), st.min == null ? '' : { t: 'n', v: +st.min.toFixed(3) }]);
      sum.push([t('profile.max'), st.max == null ? '' : { t: 'n', v: +st.max.toFixed(3) }]);
      sum.push([t('profile.ascent'), st.min == null ? '' : { t: 'n', v: +st.ascent.toFixed(3) }]);
      sum.push([t('profile.totalLength'), { t: 'n', v: +((data.total || 0) / 1000).toFixed(6) }]);
      if (ends.start) sum.push([t('profile.start'), fmtCoord(ends.start.lat, ends.start.lng)]);
      if (ends.end) sum.push([t('profile.end'), fmtCoord(ends.end.lat, ends.end.lng)]);
      sum.push([t('profile.source'), profileCredit()]);
      sum.push([]);
      sum.push([t('profile.vertices')]);
      (verts || []).forEach((v, i) => {
        sum.push([{ t: 'n', v: i + 1 }, { t: 'n', v: +Number(v[1]).toFixed(6) }, { t: 'n', v: +Number(v[0]).toFixed(6) }]);
      });
      const s1 = t('profile.samples').replace(/[:\\/?*\[\]]/g, '').slice(0, 31) || 'Samples';
      const s2 = t('profile.summary').replace(/[:\\/?*\[\]]/g, '').slice(0, 31) || 'Summary';
      const types = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
        '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
        '<Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
        '</Types>';
      const rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
        '</Relationships>';
      const wbRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
        '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>' +
        '</Relationships>';
      const wb = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
        '<sheets>' +
        '<sheet name="' + xmlEsc(s1) + '" sheetId="1" r:id="rId1"/>' +
        '<sheet name="' + xmlEsc(s2) + '" sheetId="2" r:id="rId2"/>' +
        '</sheets></workbook>';
      const bytes = zipStore([
        { name: '[Content_Types].xml', data: types },
        { name: '_rels/.rels', data: rels },
        { name: 'xl/workbook.xml', data: wb },
        { name: 'xl/_rels/workbook.xml.rels', data: wbRels },
        { name: 'xl/worksheets/sheet1.xml', data: xlsxSheet(sampleRows) },
        { name: 'xl/worksheets/sheet2.xml', data: xlsxSheet(sum) }
      ]);
      return new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    }
    function csvCell(v) {
      const s = String(v == null ? '' : v);
      if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
      return s;
    }
    function buildCsv(data, st) {
      const ends = profileEnds();
      const lines = [];
      lines.push(csvCell(t('profile.exportTitle')));
      lines.push([csvCell(t('profile.min')), st.min == null ? '' : st.min.toFixed(3)].join(','));
      lines.push([csvCell(t('profile.max')), st.max == null ? '' : st.max.toFixed(3)].join(','));
      lines.push([csvCell(t('profile.ascent')), st.min == null ? '' : st.ascent.toFixed(3)].join(','));
      lines.push([csvCell(t('profile.totalLength')), ((data.total || 0) / 1000).toFixed(6)].join(','));
      if (ends.start) lines.push([csvCell(t('profile.start')), csvCell(fmtCoord(ends.start.lat, ends.start.lng))].join(','));
      if (ends.end) lines.push([csvCell(t('profile.end')), csvCell(fmtCoord(ends.end.lat, ends.end.lng))].join(','));
      lines.push([csvCell(t('profile.source')), csvCell(profileCredit())].join(','));
      lines.push('');
      lines.push('distance_km,elevation_m,lat,lon');
      (data.samples || []).forEach(s => {
        lines.push([
          (s.d / 1000).toFixed(6),
          s.e == null ? '' : Number(s.e).toFixed(3),
          Number(s.lat).toFixed(6),
          Number(s.lng).toFixed(6)
        ].join(','));
      });
      return new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    }
    function buildPng(data, st) {
      const cssW = 880, cssH = 460, sc = 2;
      const cv = document.createElement('canvas');
      cv.width = cssW * sc; cv.height = cssH * sc;
      const cx = cv.getContext('2d');
      cx.scale(sc, sc);
      cx.fillStyle = '#ffffff';
      cx.fillRect(0, 0, cssW, cssH);
      const ink = '#1c1917', mute = '#78716c';
      const padL = 64, padR = 28, padT = 96, padB = 92;
      const plotW = cssW - padL - padR, plotH = cssH - padT - padB;
      cx.fillStyle = ink;
      cx.font = '600 20px Inter,system-ui,sans-serif';
      cx.fillText(t('profile.exportTitle'), 28, 36);
      cx.font = '13px Inter,system-ui,sans-serif';
      cx.fillStyle = mute;
      const minL = t('profile.min') + '  ';
      const maxL = t('profile.max') + '  ';
      const ascL = t('profile.ascent') + '  ';
      const minV = st.min == null ? '-' : fmtM(st.min);
      const maxV = st.max == null ? '-' : fmtM(st.max);
      const ascV = st.min == null ? '-' : fmtM(st.ascent);
      let x = 28;
      function stat(label, val) {
        cx.fillStyle = mute; cx.font = '13px Inter,system-ui,sans-serif';
        cx.fillText(label, x, 64);
        x += cx.measureText(label).width;
        cx.fillStyle = ink; cx.font = '600 13px "JetBrains Mono",ui-monospace,monospace';
        cx.fillText(val, x, 64);
        x += cx.measureText(val).width + 22;
      }
      stat(minL, minV); stat(maxL, maxV); stat(ascL, ascV);
      const lo = (st.min == null ? 0 : st.min) - 5, hi = (st.max == null ? 1 : st.max) + 5;
      const span = Math.max(1, hi - lo);
      const es = (data.samples || []).filter(s => s.e != null);
      cx.strokeStyle = '#e7e5e4';
      cx.lineWidth = 1;
      const ticks = 4;
      cx.font = '11px "JetBrains Mono",ui-monospace,monospace';
      cx.fillStyle = mute;
      cx.textAlign = 'right';
      for (let i = 0; i <= ticks; i++) {
        const yy = padT + plotH - (i / ticks) * plotH;
        const ev = lo + (i / ticks) * span;
        cx.beginPath(); cx.moveTo(padL, yy); cx.lineTo(padL + plotW, yy); cx.stroke();
        cx.fillText(Math.round(ev) + ' ' + t('unit.m'), padL - 8, yy + 4);
      }
      const totalKm = (data.total || 0) / 1000;
      cx.textAlign = 'center';
      cx.beginPath(); cx.moveTo(padL, padT + plotH); cx.lineTo(padL + plotW, padT + plotH); cx.stroke();
      cx.fillText('0 ' + t('unit.km'), padL, padT + plotH + 18);
      cx.fillText(totalKm.toFixed(1) + ' ' + t('unit.km'), padL + plotW, padT + plotH + 18);
      cx.textAlign = 'left';
      if (es.length) {
        const n = data.samples.length;
        cx.beginPath();
        let started = false;
        data.samples.forEach((s, i) => {
          if (s.e == null) { started = false; return; }
          const px = padL + (n < 2 ? 0 : (i / (n - 1)) * plotW);
          const py = padT + plotH - ((s.e - lo) / span) * plotH;
          if (started) cx.lineTo(px, py); else { cx.moveTo(px, py); started = true; }
        });
        cx.strokeStyle = ink;
        cx.lineWidth = 1.6;
        cx.lineJoin = 'round';
        cx.lineCap = 'round';
        cx.stroke();
      }
      const ends = profileEnds();
      cx.fillStyle = mute;
      cx.font = '12px Inter,system-ui,sans-serif';
      let metaY = padT + plotH + 40;
      if (ends.start) cx.fillText(t('profile.start') + '  ' + fmtCoord(ends.start.lat, ends.start.lng), 28, metaY);
      if (ends.end) cx.fillText(t('profile.end') + '  ' + fmtCoord(ends.end.lat, ends.end.lng), 28, metaY + 18);
      cx.font = '11px Inter,system-ui,sans-serif';
      cx.fillStyle = mute;
      cx.fillText(profileCredit(), 28, cssH - 16);
      const raw = cv.toDataURL('image/png');
      const bin = atob(raw.split(',')[1]);
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      return new Blob([arr], { type: 'image/png' });
    }
    function exportReady() {
      return !!(lastData && lastData.samples && lastData.samples.some(s => s.e != null));
    }
    function exportProfile(fmt) {
      if (!exportReady()) return;
      const data = lastData;
      const st = stats(smooth(data.samples));
      const base = 'kzgeology-profile-' + profileStamp();
      try {
        if (fmt === 'png') downloadBlob(buildPng(data, st), base + '.png');
        else if (fmt === 'xlsx') downloadBlob(buildXlsx(data, st), base + '.xlsx');
        else if (fmt === 'csv') downloadBlob(buildCsv(data, st), base + '.csv');
      } catch (e) {}
    }
    let headAbort = null;
    function headHtml(canDownload) {
      return '<div class="profile-head"><strong>' + esc(t('tool.profile')) + '</strong>' +
        '<div class="profile-head-actions">' +
        '<button type="button" class="profile-close" aria-label="' + t('profile.close') + '" title="' + t('profile.close') + '">\u00D7</button>' +
        '<button type="button" class="profile-dl" id="profile-dl"' + (canDownload ? '' : ' disabled') +
        ' aria-haspopup="menu" aria-expanded="false" aria-label="' + t('profile.download') + '" title="' + t('profile.download') + '">' + ICON.download + '</button>' +
        '</div></div>';
    }
    function bindHead(canDownload) {
      bindClose();
      if (headAbort) { try { headAbort.abort(); } catch (e) {} headAbort = null; }
      const dl = panel && panel.querySelector('#profile-dl');
      if (!dl || !canDownload) return;
      const actions = dl.parentNode;
      const menu = document.createElement('div');
      menu.id = 'profile-dl-menu';
      menu.className = 'profile-dl-menu';
      menu.hidden = true;
      menu.setAttribute('role', 'menu');
      [['png', 'profile.png'], ['xlsx', 'profile.excel'], ['csv', 'profile.csv']].forEach(pair => {
        const b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('role', 'menuitem');
        b.dataset.fmt = pair[0];
        b.textContent = t(pair[1]);
        menu.appendChild(b);
      });
      actions.appendChild(menu);
      function closeMenu() {
        menu.hidden = true;
        dl.setAttribute('aria-expanded', 'false');
      }
      function openMenu() {
        menu.hidden = false;
        dl.setAttribute('aria-expanded', 'true');
      }
      dl.addEventListener('click', ev => {
        ev.preventDefault(); ev.stopPropagation();
        if (menu.hidden) openMenu(); else closeMenu();
      });
      menu.addEventListener('click', ev => {
        ev.stopPropagation();
        const b = ev.target.closest('button[data-fmt]');
        if (!b) return;
        closeMenu();
        exportProfile(b.dataset.fmt);
      });
      headAbort = typeof AbortController === 'function' ? new AbortController() : null;
      const sig = headAbort ? { signal: headAbort.signal } : false;
      const onDoc = ev => { if (!actions.contains(ev.target)) closeMenu(); };
      const onKey = ev => { if (ev.key === 'Escape') closeMenu(); };
      if (sig) {
        document.addEventListener('click', onDoc, sig);
        document.addEventListener('keydown', onKey, sig);
      } else {
        document.addEventListener('click', onDoc);
        document.addEventListener('keydown', onKey);
      }
    }

    function showPanel(data) {
      closePanel();
      samples = data.samples;
      const st = stats(smooth(data.samples));
      const W = 560, H = 96;
      let chart;
      const es = data.samples.filter(s => s.e != null);
      if (es.length) {
        const lo = st.min - 5, hi = st.max + 5;
        const span = Math.max(1, hi - lo);
        let path = '', started = false;
        data.samples.forEach((s, i) => {
          if (s.e == null) { started = false; return; }
          const x = (i / (data.samples.length - 1)) * W;
          const y = H - ((s.e - lo) / span) * H;
          path += (started ? ' L' : ' M') + x.toFixed(1) + ' ' + y.toFixed(1);
          started = true;
        });
        chart = '<svg class="profile-chart" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" role="img" aria-label="' + esc(t('tool.profile')) + '">' +
          '<path d="' + path + '" fill="none" stroke="#1c1917" stroke-width="1.5" vector-effect="non-scaling-stroke"/></svg>';
      } else {
        chart = '<div class="profile-empty">' + esc(t('profile.fail')) + '</div>';
      }
      panel = document.createElement('div');
      panel.id = 'profile-panel';
      panel.className = 'profile-panel';
      panel.innerHTML = headHtml(!!es.length) +
        '<div class="profile-stats">' +
        '<span>' + esc(t('profile.min')) + ' <b>' + (st.min == null ? '-' : fmtM(st.min)) + '</b></span>' +
        '<span>' + esc(t('profile.max')) + ' <b>' + (st.max == null ? '-' : fmtM(st.max)) + '</b></span>' +
        '<span>' + esc(t('profile.ascent')) + ' <b>' + (st.min == null ? '-' : fmtM(st.ascent)) + '</b></span>' +
        '</div>' + chart +
        '<div class="profile-axis"><span>0 ' + esc(t('unit.km')) + '</span><span>' + (data.total / 1000).toFixed(1) + ' ' + esc(t('unit.km')) + '</span></div>';
      (document.querySelector('.wrap') || document.body).appendChild(panel);
      bindHead(!!es.length);
      const svg = panel.querySelector('.profile-chart');
      if (svg) {
        const tip = document.createElement('div');
        tip.className = 'profile-tip';
        tip.hidden = true;
        panel.appendChild(tip);
        dotMk = new maplibregl.Marker({ element: (() => { const d = document.createElement('div'); d.className = 'profile-dot'; return d; })(), anchor: 'center' });
        function pick(clientX) {
          const r = svg.getBoundingClientRect();
          const pr = panel.getBoundingClientRect();
          const f = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
          const i = Math.round(f * (data.samples.length - 1));
          const s = data.samples[i];
          if (!s) return;
          if (s.e == null) { tip.hidden = true; if (dotMk) dotMk.remove(); return; }
          dotMk.setLngLat([s.lng, s.lat]).addTo(map);
          tip.textContent = (s.d / 1000).toFixed(2) + ' ' + t('unit.km') + ' \u00B7 ' + fmtM(s.e);
          tip.hidden = false;
          tip.style.left = Math.round(clientX - pr.left) + 'px';
          tip.style.top = Math.round(r.top - pr.top - 6) + 'px';
        }
        svg.addEventListener('mousemove', ev => pick(ev.clientX));
        svg.addEventListener('touchmove', ev => { const tch = ev.touches && ev.touches[0]; if (tch) pick(tch.clientX); }, { passive: true });
        svg.addEventListener('mouseleave', () => { tip.hidden = true; if (dotMk) dotMk.remove(); });
      }
    }
    function bindClose() {
      const c = panel && panel.querySelector('.profile-close');
      if (c) c.addEventListener('click', () => setOn(false));
    }
    function showHint(msg) {
      closePanel();
      panel = document.createElement('div');
      panel.id = 'profile-panel';
      panel.className = 'profile-panel';
      panel.innerHTML = headHtml(false) +
        '<div class="profile-hint">' + esc(msg || t('profile.hint')) + '</div>';
      (document.querySelector('.wrap') || document.body).appendChild(panel);
      bindHead(false);
    }
    let computeTimer = 0, computeGen = 0;
    function queueCompute() {
      if (verts.length < 2) {
        lastData = null;
        showHint();
        return;
      }
      showHint(t('profile.loading'));
      const gen = ++computeGen;
      clearTimeout(computeTimer);
      computeTimer = setTimeout(() => { runCompute(gen); }, 180);
    }
    async function runCompute(gen) {
      try {
        const data = await sampleAll();
        if (gen !== computeGen || !on) return;
        lastData = data;
        showPanel(data);
      } catch (err) {
        if (gen !== computeGen || !on) return;
        lastData = { samples: [], total: 0 };
        showPanel(lastData);
      }
    }
    function handleClick(e) {
      if (!on || done) return false;
      const now = Date.now(), pt = e.point;
      if (lastPt && now - lastTap < 350 && Math.hypot(pt.x - lastPt.x, pt.y - lastPt.y) < 18) {
        lastTap = 0; lastPt = null;
        if (verts.length >= 2) queueCompute();
        return true;
      }
      lastTap = now; lastPt = { x: pt.x, y: pt.y };
      verts.push([e.lngLat.lng, e.lngLat.lat]);
      paint();
      queueCompute();
      return true;
    }
    (function bindTap(el, fn) {
      let last = 0;
      const run = ev => {
        ev.preventDefault(); ev.stopPropagation();
        const now = Date.now();
        if (now - last < 400) return;
        last = now; fn();
      };
      el.addEventListener('pointerdown', ev => ev.stopPropagation());
      el.addEventListener('touchstart', ev => ev.stopPropagation(), { passive: true });
      el.addEventListener('click', run);
    })(btn, () => setOn(!on));
    map.on('dblclick', e => { if (on) e.preventDefault(); });
    window.atlasProfile = {
      click: handleClick,
      active: () => on,
      setOn,
      relabel: () => {
        btn.title = t('tool.profile');
        btn.setAttribute('aria-label', t('tool.profile'));
        if (lastData && panel) showPanel(lastData);
        else if (on && panel) showHint(verts.length >= 2 ? t('profile.loading') : undefined);
      }
    };
  }

  function initCompare() {
    const box = $('measure-box');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'compare-btn';
    btn.className = 'measure-btn';
    btn.title = t('tool.compare');
    btn.setAttribute('aria-label', t('tool.compare'));
    btn.setAttribute('aria-pressed', 'false');
    btn.innerHTML = ICON.swipe;
    placeToolBtn(btn);

    let on = false, map2 = null, layerEl = null, bar = null, handle = null;
    let leftKey = 'bm', rightKey = 'bm';
    let copiedLayers = [], copiedSources = [];
    let dragX = 50;

    function allActiveKeys() {
      return [...new Set(activeKeys().concat(pinnedKeys()))].filter(k => keyOn(k));
    }
    function sync2() {
      if (!map2) return;
      const c = map.getCenter();
      try { map2.jumpTo({ center: [c.lng, c.lat], zoom: map.getZoom(), bearing: map.getBearing(), pitch: map.getPitch() }); } catch (e) {}
    }
    function compareLayerIds(k) {
      let ids = keyLayers(k);
      if (k === 'geo200') ids = ids.concat(styleLayers().map(l => l.id).filter(id => id.startsWith('geo200-label')));
      return ids;
    }
    function applySides() {
      if (!on) return;
      allActiveKeys().forEach(k => {
        compareLayerIds(k).forEach(lid => {
          if (!map.getLayer(lid)) return;
          try { map.setLayoutProperty(lid, 'visibility', k === leftKey ? 'visible' : 'none'); } catch (e) {}
        });
      });
      applyRight();
    }
    function clearRight() {
      if (!map2) return;
      copiedLayers.forEach(id => { try { if (map2.getLayer(id)) map2.removeLayer(id); } catch (e) {} });
      copiedSources.forEach(sid => { try { if (map2.getSource(sid)) map2.removeSource(sid); } catch (e) {} });
      copiedLayers = []; copiedSources = [];
    }
    function sourceDef(sid) {
      const src = map.getSource(sid);
      if (!src) return null;
      let def = null;
      try { if (typeof src.serialize === 'function') def = src.serialize(); } catch (e) { def = null; }
      if (!def) {
        const raw = ((map.getStyle() || {}).sources || {})[sid];
        if (!raw) return null;
        def = Object.assign({}, raw);
      } else {
        def = Object.assign({}, def);
      }
      if (def.type === 'geojson') {
        let data = sourceData(sid);
        if (!data) {
          try { if (typeof src.getData === 'function') data = src.getData(); } catch (e) {}
        }
        if (!data) {
          try { data = (src._options && src._options.data) || (src.options && src.options.data); } catch (e) {}
        }
        if (data) def.data = data;
      }
      return def;
    }
    function cloneLayer(l) {
      const copy = JSON.parse(JSON.stringify(l));
      if (!copy.layout) copy.layout = {};
      copy.layout.visibility = 'visible';
      return copy;
    }
    function syncMap2Basemap() {
      if (!map2 || !map2.isStyleLoaded()) return;
      const satOn = basemap === 'sat';
      (map2.getStyle().layers || []).forEach(l => {
        if (l.id === 'sat' || !isBasemapLayer(l.id)) return;
        try {
          if (l.type === 'symbol') map2.setLayoutProperty(l.id, 'visibility', (satOn && satKind === 'hybrid') ? 'none' : 'visible');
          else if (l.type !== 'background') map2.setLayoutProperty(l.id, 'visibility', satOn ? 'none' : 'visible');
        } catch (e) {}
      });
    }
    let applyingRight = false, rightAgain = false;
    function map2Ready() {
      return !!(map2 && map2.getStyle && map2.getStyle() && (map2.getStyle().layers || []).length);
    }
    function applyRight() {
      if (!map2) return;
      if (!map2Ready()) {
        const retry = () => { if (on) applyRight(); };
        map2.once('load', retry);
        map2.once('idle', retry);
        return;
      }
      if (applyingRight) { rightAgain = true; return; }
      applyingRight = true;
      rightAgain = false;
      clearRight();
      const st = map.getStyle();
      const before = (map2.getStyle().layers || []).find(l => l.type === 'symbol' && !/^(atlas-|eqazyna-|process-|geo200-)/.test(l.id));
      if (basemap === 'sat') {
        const def = sourceDef('sat');
        if (def && !map2.getSource('sat')) {
          try { map2.addSource('sat', def); copiedSources.push('sat'); } catch (e) {}
        }
        const satLayer = (st.layers || []).find(l => l.id === 'sat');
        if (satLayer && map2.getSource('sat') && !map2.getLayer('sat')) {
          try { map2.addLayer(cloneLayer(satLayer), before && before.id); copiedLayers.push('sat'); } catch (e) {}
        }
        try { if (map2.getLayer('sat')) map2.setLayoutProperty('sat', 'visibility', 'visible'); } catch (e) {}
      }
      syncMap2Basemap();
      if (rightKey === 'bm') return;
      const ids = compareLayerIds(rightKey);
      const layers = (st.layers || []).filter(l => ids.includes(l.id));
      const srcIds = [...new Set(layers.map(l => l.source).filter(Boolean))];
      srcIds.forEach(sid => {
        if (map2.getSource(sid)) return;
        const def = sourceDef(sid);
        if (!def) return;
        try { map2.addSource(sid, def); copiedSources.push(sid); } catch (e) {}
      });
      layers.forEach(l => {
        if (map2.getLayer(l.id) || !map2.getSource(l.source)) return;
        try {
          map2.addLayer(cloneLayer(l), before && before.id);
          copiedLayers.push(l.id);
        } catch (e) {}
      });
      applyingRight = false;
      if (rightAgain && on) applyRight();
    }
    function keyOptions() {
      const keys = allActiveKeys();
      const opts = [{ v: 'bm', label: t('compare.basemap') }];
      keys.forEach(k => opts.push({ v: k, label: keyTitle(k) }));
      return opts;
    }
    function fillSelects() {
      if (!bar) return;
      const opts = keyOptions();
      const has = v => opts.some(o => o.v === v);
      if (!has(leftKey)) leftKey = 'bm';
      if (!has(rightKey)) rightKey = 'bm';
      [['#compare-left', leftKey], ['#compare-right', rightKey]].forEach(pair => {
        const sel = bar.querySelector(pair[0]);
        if (!sel) return;
        sel.innerHTML = opts.map(o => '<option value="' + esc(o.v) + '" title="' + esc(o.label) + '">' + esc(o.label) + '</option>').join('');
        sel.value = pair[1];
        const cur = opts.find(o => o.v === pair[1]);
        sel.title = cur ? cur.label : '';
      });
    }
    function buildUi() {
      const wrapEl = document.querySelector('.wrap') || document.body;
      layerEl = document.createElement('div');
      layerEl.id = 'compare-map';
      layerEl.className = 'compare-map';
      wrapEl.appendChild(layerEl);
      map2 = new maplibregl.Map({
        container: layerEl,
        style: 'https://tiles.openfreemap.org/styles/positron',
        center: map.getCenter(), zoom: map.getZoom(), bearing: map.getBearing(), pitch: map.getPitch(),
        interactive: false, attributionControl: false, maxZoom: 19, maxPitch: 0
      });
      map2.on('load', () => { applyRight(); sync2(); });

      bar = document.createElement('div');
      bar.id = 'compare-bar';
      bar.className = 'compare-bar';
      bar.innerHTML = '<label>' + esc(t('compare.left')) + '<select id="compare-left" aria-label="' + t('compare.left') + '"></select></label>' +
        '<label>' + esc(t('compare.right')) + '<select id="compare-right" aria-label="' + t('compare.right') + '"></select></label>';
      wrapEl.appendChild(bar);
      fillSelects();
      bar.querySelector('#compare-left').addEventListener('change', ev => { leftKey = ev.target.value; applySides(); });
      bar.querySelector('#compare-right').addEventListener('change', ev => { rightKey = ev.target.value; applyRight(); });

      handle = document.createElement('div');
      handle.id = 'compare-handle';
      handle.className = 'compare-handle';
      handle.setAttribute('role', 'slider');
      handle.setAttribute('aria-label', t('compare.slider'));
      handle.setAttribute('aria-valuemin', '2');
      handle.setAttribute('aria-valuemax', '98');
      handle.tabIndex = 0;
      handle.innerHTML = '<span class="compare-grip"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 8 5 12l4 4M15 8l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span>';
      wrapEl.appendChild(handle);
      function setX(v) {
        dragX = Math.min(98, Math.max(2, v));
        handle.style.left = dragX + '%';
        if (layerEl) layerEl.style.clipPath = 'inset(0 0 0 ' + dragX + '%)';
        handle.setAttribute('aria-valuenow', String(Math.round(dragX)));
      }
      setX(50);
      let dragging = false;
      handle.addEventListener('pointerdown', ev => {
        dragging = true;
        try { handle.setPointerCapture(ev.pointerId); } catch (e) {}
        ev.preventDefault(); ev.stopPropagation();
      });
      window.addEventListener('pointermove', ev => {
        if (!dragging) return;
        const wr = (document.querySelector('.wrap') || document.body).getBoundingClientRect();
        setX(((ev.clientX - wr.left) / wr.width) * 100);
      });
      window.addEventListener('pointerup', () => { dragging = false; });
      window.addEventListener('pointercancel', () => { dragging = false; });
      handle.addEventListener('keydown', ev => {
        if (ev.key === 'ArrowLeft') { setX(dragX - 2); ev.preventDefault(); }
        else if (ev.key === 'ArrowRight') { setX(dragX + 2); ev.preventDefault(); }
      });
    }
    function destroy() {
      applyingRight = false; rightAgain = false;
      allActiveKeys().forEach(k => applyKeyVis(k));
      map.off('move', sync2);
      if (map2) { try { map2.remove(); } catch (e) {} map2 = null; }
      if (layerEl) { layerEl.remove(); layerEl = null; }
      if (bar) { bar.remove(); bar = null; }
      if (handle) { handle.remove(); handle = null; }
      copiedLayers = []; copiedSources = [];
    }
    function setOn(v) {
      on = !!v;
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      document.body.classList.toggle('compare-on', on);
      if (on) {
        closeFeaturePopup(); clearSel();
        if (window.atlasSketch && window.atlasSketch.active && window.atlasSketch.active()) window.atlasSketch.setOn(false);
        if (window.atlasMeasure && window.atlasMeasure.active && window.atlasMeasure.active()) window.atlasMeasure.setOn(false);
        if (window.atlasProfile && window.atlasProfile.active && window.atlasProfile.active()) window.atlasProfile.setOn(false);
        const keys = allActiveKeys();
        leftKey = 'bm';
        rightKey = keys.length ? keys[0] : 'bm';
        buildUi();
        applySides();
        map.on('move', sync2);
      } else {
        destroy();
      }
    }
    function refresh() {
      if (!on) return;
      const keys = allActiveKeys();
      if (leftKey !== 'bm' && !keys.includes(leftKey)) leftKey = 'bm';
      if (rightKey !== 'bm' && !keys.includes(rightKey)) rightKey = 'bm';
      fillSelects();
      applySides();
    }
    (function bindTap(el, fn) {
      let last = 0;
      const run = ev => {
        ev.preventDefault(); ev.stopPropagation();
        const now = Date.now();
        if (now - last < 400) return;
        last = now; fn();
      };
      el.addEventListener('pointerdown', ev => ev.stopPropagation());
      el.addEventListener('touchstart', ev => ev.stopPropagation(), { passive: true });
      el.addEventListener('click', run);
    })(btn, () => setOn(!on));
    map.on('resize', () => { if (map2) { try { map2.resize(); } catch (e) {} sync2(); } });
    window.atlasCompare = { active: () => on, setOn, refresh, map2: () => map2 };
  }

  // ---- bookmarks ---------------------------------------------------------
  const BOOKMARKS = [
    { id: 'jezkazgan', name: { en: 'Jezkazgan copper', kk: 'Жезқазған мысы', ru: 'Медь Жезказгана' }, center: [67.71, 47.78], zoom: 8, layers: ['mineral-kz-deposits', 'kz-mineral-deposits'] },
    { id: 'tien-shan', name: { en: 'Tien Shan active faults', kk: 'Тянь-Шань белсенді жарылымдары', ru: 'Активные разломы Тянь-Шаня' }, center: [78.4, 42.6], zoom: 6, layers: ['active-faults', 'earthquakes-comcat'] },
    { id: 'caspian', name: { en: 'Caspian and Teniz basins', kk: 'Каспий және Теңіз алаптары', ru: 'Каспийский и Тенизский бассейны' }, center: [55.5, 46.5], zoom: 5, layers: ['mineral-kz-lithology'] },
    { id: 'altai', name: { en: 'Altai', kk: 'Алтай', ru: 'Алтай' }, center: [85.6, 49.4], zoom: 6, layers: ['mineral-kz-lithology', 'mineral-kz-faults'] },
    { id: 'karatau', name: { en: 'Karatau', kk: 'Қаратау', ru: 'Каратау' }, center: [69.6, 43.3], zoom: 7, layers: ['mineral-kz-lithology'] },
    { id: 'balkhash', name: { en: 'Balkhash', kk: 'Балқаш', ru: 'Балхаш' }, center: [74.9, 46.8], zoom: 6, layers: ['kz-mineral-deposits'] }
  ];
  const BM_STORE = 'atlas-bookmarks-v1';

  function initBookmarks() {
    const box = $('measure-box');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'bookmark-btn';
    btn.className = 'measure-btn';
    btn.title = t('tool.bookmarks');
    btn.setAttribute('aria-label', t('tool.bookmarks'));
    btn.setAttribute('aria-haspopup', 'dialog');
    btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = ICON.bookmark;
    placeToolBtn(btn);

    let bar = null;
    function readSaved() {
      try { const a = JSON.parse(localStorage.getItem(BM_STORE) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; }
    }
    function writeSaved(list) { try { localStorage.setItem(BM_STORE, JSON.stringify(list)); } catch (e) {} }
    function bmName(b) {
      const lang = I18N.lang ? I18N.lang() : 'en';
      return (b.name && (b.name[lang] || b.name.en)) || b.id;
    }
    function fly(center, zoom) {
      if (!center || center.length !== 2) return;
      map.flyTo({ center: center, zoom: zoom || map.getZoom(), duration: 1200 });
    }
    function navigateCurated(b) {
      (b.layers || []).forEach(id => {
        if (ovs[id] && !ovOn.has(id)) toggleOverlay(id);
        else if (all[id] && !mainsOn.has(id)) toggleMain(id);
      });
      fly(b.center, b.zoom);
    }
    function currentSpecial() {
      const sp = [];
      if (window.atlasEqazyna && window.atlasEqazyna.isOn && window.atlasEqazyna.isOn()) sp.push('eq');
      const pr = window.atlasProcess;
      if (pr && pr.isOn) ['open', 'auction', 'pugfn'].forEach(id => { if (pr.isOn(id)) sp.push('pr:' + id); });
      if (window.atlasGeo200 && window.atlasGeo200.isOn && window.atlasGeo200.isOn()) sp.push('geo200');
      return sp;
    }
    function applySaved(s) {
      const ov = new Set((s.ov || []).filter(id => ovs[id]));
      const mn = new Set((s.mains || []).filter(id => all[id]));
      [...ovOn].forEach(id => { if (!ov.has(id)) toggleOverlay(id); });
      ov.forEach(id => { if (!ovOn.has(id)) toggleOverlay(id); });
      [...mainsOn].forEach(id => { if (!mn.has(id)) toggleMain(id); });
      mn.forEach(id => { if (!mainsOn.has(id)) toggleMain(id); });
      const sp = Array.isArray(s.special) ? s.special : [];
      if (window.atlasEqazyna && window.atlasEqazyna.setOn) window.atlasEqazyna.setOn(sp.includes('eq'));
      if (window.atlasProcess && window.atlasProcess.setOn) ['open', 'auction', 'pugfn'].forEach(id => window.atlasProcess.setOn(id, sp.includes('pr:' + id)));
      if (window.atlasGeo200 && window.atlasGeo200.setOn) window.atlasGeo200.setOn(sp.includes('geo200'));
      fly(s.center, s.zoom);
    }
    function saveCurrent() {
      const inp = bar.querySelector('.bm-name');
      const name = String(inp.value || '').trim();
      if (!name) { inp.focus(); return; }
      const c = map.getCenter();
      const list = readSaved();
      list.push({
        id: 'u' + Date.now().toString(36),
        name: name.slice(0, 60),
        center: [c.lng, c.lat],
        zoom: map.getZoom(),
        ov: [...ovOn].filter(id => ovs[id]),
        mains: [...mainsOn].filter(id => all[id]),
        special: currentSpecial()
      });
      writeSaved(list);
      inp.value = '';
      renderBar();
    }
    function renderBar() {
      if (!bar) return;
      const saved = readSaved();
      bar.innerHTML = '<div class="bm-list">' +
        BOOKMARKS.map((b, i) => '<button type="button" class="bm-item" data-bm="' + i + '">' + esc(bmName(b)) + '</button>').join('') +
        '</div>' +
        (saved.length ? '<div class="bm-list bm-saved">' + saved.map(s =>
          '<div class="bm-row"><button type="button" class="bm-item" data-saved="' + esc(s.id) + '">' + esc(s.name) + '</button>' +
          '<button type="button" class="bm-del" data-del="' + esc(s.id) + '" aria-label="' + esc(t('bm.delete')) + '">\u00D7</button></div>'
        ).join('') + '</div>' : '') +
        '<div class="bm-save"><input type="text" class="bm-name" maxlength="60" placeholder="' + esc(t('bm.name')) + '" aria-label="' + esc(t('bm.name')) + '">' +
        '<button type="button" class="bm-add">' + esc(t('bm.save')) + '</button></div>';
    }
    function openBar() {
      if (!bar) {
        bar = document.createElement('div');
        bar.id = 'bookmark-bar';
        bar.className = 'bookmark-bar';
        bar.hidden = true;
        if (box) box.appendChild(bar); else (document.querySelector('.wrap') || document.body).appendChild(bar);
        bar.addEventListener('click', ev => {
          const b = ev.target.closest('[data-bm],[data-saved],[data-del],.bm-add');
          if (!b) return;
          if (b.hasAttribute('data-bm')) {
            const bm = BOOKMARKS[Number(b.getAttribute('data-bm'))];
            if (bm) { navigateCurated(bm); closeBar(); }
            return;
          }
          if (b.hasAttribute('data-saved')) {
            const s = readSaved().find(x => x.id === b.getAttribute('data-saved'));
            if (s) { applySaved(s); closeBar(); }
            return;
          }
          if (b.hasAttribute('data-del')) {
            writeSaved(readSaved().filter(x => x.id !== b.getAttribute('data-del')));
            renderBar();
            return;
          }
          if (b.classList.contains('bm-add')) saveCurrent();
        });
        bar.addEventListener('keydown', ev => {
          if (ev.key === 'Enter' && ev.target.classList.contains('bm-name')) { ev.preventDefault(); saveCurrent(); }
        });
      }
      renderBar();
      bar.hidden = false;
      btn.setAttribute('aria-expanded', 'true');
    }
    function closeBar() {
      if (bar) bar.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
    }
    btn.addEventListener('click', ev => {
      ev.stopPropagation();
      if (bar && !bar.hidden) closeBar(); else openBar();
    });
    document.addEventListener('click', ev => {
      if (!bar || bar.hidden) return;
      if (bar.contains(ev.target) || btn.contains(ev.target)) return;
      closeBar();
    });
    document.addEventListener('keydown', ev => { if (ev.key === 'Escape') closeBar(); });
    window.atlasBookmarks = { relabel: () => { btn.title = t('tool.bookmarks'); btn.setAttribute('aria-label', t('tool.bookmarks')); if (bar && !bar.hidden) renderBar(); } };
  }

  // ---- field GPS ---------------------------------------------------------
  const GPS_STORE = 'atlas-gps-points-v1';

  function initGps() {
    const box = $('measure-box');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'gps-btn';
    btn.className = 'measure-btn';
    btn.title = t('tool.gps');
    btn.setAttribute('aria-label', t('tool.gps'));
    btn.setAttribute('aria-pressed', 'false');
    btn.innerHTML = ICON.gps;
    const left = document.querySelector('.north-tools');
    const topBtn = $('topview-btn');
    btn.classList.add('topview-btn');
    if (left && topBtn) left.insertBefore(btn, topBtn);
    else if (left) left.insertBefore(btn, left.firstChild);
    else if (box) box.appendChild(btn);

    let gpsOn = false, watchId = null, lastFix = null, follow = true;
    let panel = null, listEl = null, statusEl = null, noteInp = null, logBtn = null;
    let dotMarker = null;
    let points = [];
    try {
      const raw = JSON.parse(localStorage.getItem(GPS_STORE) || '[]');
      if (Array.isArray(raw)) points = raw.filter(p => p && isFinite(p.lat) && isFinite(p.lng));
    } catch (e) { points = []; }
    function savePoints() { try { localStorage.setItem(GPS_STORE, JSON.stringify(points)); } catch (e) {} }
    function ensurePts() {
      if (!map.getStyle()) return;
      if (!map.getSource('atlas-gps-pts')) map.addSource('atlas-gps-pts', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      if (!map.getLayer('atlas-gps-dots')) {
        const before = firstSymbolLayer();
        map.addLayer({ id: 'atlas-gps-dots', type: 'circle', source: 'atlas-gps-pts',
          paint: { 'circle-radius': 4.5, 'circle-color': '#1c1917', 'circle-stroke-color': '#fafaf9', 'circle-stroke-width': 1.6 } }, before);
      }
    }
    function drawPoints() {
      ensurePts();
      const src = map.getSource('atlas-gps-pts');
      if (src) src.setData({ type: 'FeatureCollection', features: points.map(p => ({ type: 'Feature', properties: { id: p.id }, geometry: { type: 'Point', coordinates: [p.lng, p.lat] } })) });
    }
    function ensureAcc() {
      if (!map.getStyle()) return;
      if (!map.getSource('atlas-gps')) map.addSource('atlas-gps', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      if (!map.getLayer('atlas-gps-acc')) {
        const before = firstSymbolLayer();
        map.addLayer({ id: 'atlas-gps-acc', type: 'circle', source: 'atlas-gps',
          paint: { 'circle-radius': 20, 'circle-color': 'rgba(28,25,23,.08)', 'circle-stroke-color': 'rgba(28,25,23,.28)', 'circle-stroke-width': 1 } }, before);
      }
    }
    function drawAccuracy() {
      if (!lastFix || !gpsOn) return;
      ensureAcc();
      const src = map.getSource('atlas-gps');
      if (src) src.setData({ type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [lastFix.lng, lastFix.lat] } }] });
      const mpp = 156543.03392 * Math.cos(lastFix.lat * Math.PI / 180) / Math.pow(2, map.getZoom());
      const r = Math.max(4, (lastFix.acc || 0) / Math.max(0.01, mpp));
      if (map.getLayer('atlas-gps-acc')) map.setPaintProperty('atlas-gps-acc', 'circle-radius', r);
    }
    function placeMarker() {
      if (!lastFix) return;
      if (!dotMarker) {
        const el = document.createElement('div');
        el.className = 'gps-mk';
        el.innerHTML = '<span class="gps-arrow"></span><span class="gps-mk-dot"></span>';
        dotMarker = new maplibregl.Marker({ element: el, anchor: 'center' });
      }
      dotMarker.setLngLat([lastFix.lng, lastFix.lat]).addTo(map);
      const el = dotMarker.getElement();
      const arrow = el.querySelector('.gps-arrow');
      const hasHead = lastFix.heading != null;
      el.classList.toggle('has-head', hasHead);
      if (arrow && hasHead) arrow.style.transform = 'rotate(' + (lastFix.heading - (map.getBearing() || 0)) + 'deg)';
    }
    function status(text) { if (statusEl) statusEl.textContent = text; }
    function fmtTime(t) { try { return new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } }
    function renderList() {
      if (!listEl) return;
      listEl.innerHTML = points.slice().reverse().map(p =>
        '<div class="gps-row"><span class="gps-row-t">' + esc(fmtTime(p.t)) + '</span>' +
        '<span class="gps-row-n">' + esc(p.note || p.unit || '') + '</span>' +
        '<button type="button" class="gps-del" data-del="' + esc(p.id) + '" aria-label="' + esc(t('gps.delete')) + '">\u00D7</button></div>').join('');
    }
    function unitAt(lng, lat) {
      try {
        const keys = [...new Set(activeKeys().concat(pinnedKeys()))].filter(keyOn);
        const lids = [];
        keys.forEach(k => keyLayers(k).forEach(id => {
          const l = map.getLayer(id);
          if (l && (l.type === 'fill' || l.type === 'line')) lids.push(id);
        }));
        if (!lids.length) return '';
        const feats = map.queryRenderedFeatures(map.project([lng, lat]), { layers: lids }) || [];
        for (const f of feats) {
          const lid = f.layer && f.layer.id;
          const k = keys.find(key => keyLayers(key).includes(lid));
          if (!k) continue;
          const p = f.properties || {};
          if (k.startsWith('ov:')) {
            const m = ovs[k.slice(3)];
            if (!m) continue;
            return (pickName(m, 'title') + (p.l ? ' \u00B7 ' + p.l : '')).slice(0, 120);
          }
          if (k.startsWith('m:')) {
            const m = all[k.slice(2)];
            if (!m) continue;
            const theme = (m.themes && m.themes[p.t]) || pickName(m, 'title');
            return (theme + (p.l ? ' \u00B7 ' + p.l : '')).slice(0, 120);
          }
        }
      } catch (e) {}
      return '';
    }
    function logPoint() {
      if (!lastFix) return;
      const note = String((noteInp && noteInp.value) || '').trim().slice(0, 120);
      points.push({
        id: 'p' + Date.now().toString(36),
        lat: +lastFix.lat.toFixed(6),
        lng: +lastFix.lng.toFixed(6),
        acc: Math.round(lastFix.acc || 0),
        t: Date.now(),
        note: note,
        unit: unitAt(lastFix.lng, lastFix.lat)
      });
      savePoints();
      drawPoints();
      renderList();
      if (noteInp) noteInp.value = '';
    }
    function csvCell(v) {
      const s = String(v == null ? '' : v);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }
    function download(blob, name) {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => { try { URL.revokeObjectURL(a.href); } catch (e) {} }, 4000);
    }
    function exportGps(kind) {
      const base = 'kzgeology-gps-' + new Date().toISOString().slice(0, 10);
      if (!points.length) return;
      if (kind === 'geojson') {
        const fc = {
          type: 'FeatureCollection',
          features: points.map(p => ({
            type: 'Feature',
            properties: { time: new Date(p.t).toISOString(), accuracy: p.acc, note: p.note || '', unit: p.unit || '' },
            geometry: { type: 'Point', coordinates: [p.lng, p.lat] }
          }))
        };
        download(new Blob([JSON.stringify(fc, null, 2)], { type: 'application/geo+json' }), base + '.geojson');
      } else {
        const rows = [['lat', 'lon', 'accuracy_m', 'time', 'note', 'unit']].concat(points.map(p => [
          p.lat, p.lng, p.acc, new Date(p.t).toISOString(), p.note || '', p.unit || ''
        ]));
        const csv = rows.map(r => r.map(csvCell).join(',')).join('\r\n');
        download(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }), base + '.csv');
      }
    }
    function buildPanel() {
      if (panel) return;
      panel = document.createElement('div');
      panel.id = 'gps-bar';
      panel.className = 'gps-bar';
      panel.hidden = true;
      panel.innerHTML = '<div class="gps-status"></div>' +
        '<div class="gps-log"><input type="text" class="gps-note" maxlength="120" placeholder="' + esc(t('gps.note')) + '" aria-label="' + esc(t('gps.note')) + '">' +
        '<button type="button" class="gps-log-btn" disabled>' + esc(t('gps.log')) + '</button></div>' +
        '<div class="gps-list"></div>' +
        '<div class="gps-actions"><button type="button" data-exp="csv">' + esc(t('gps.csv')) + '</button><button type="button" data-exp="geojson">' + esc(t('gps.geojson')) + '</button></div>';
      const left = document.querySelector('.north-tools');
      if (left) left.appendChild(panel);
      else if (box) box.appendChild(panel);
      else (document.querySelector('.wrap') || document.body).appendChild(panel);
      statusEl = panel.querySelector('.gps-status');
      listEl = panel.querySelector('.gps-list');
      noteInp = panel.querySelector('.gps-note');
      logBtn = panel.querySelector('.gps-log-btn');
      logBtn.addEventListener('click', logPoint);
      panel.addEventListener('click', ev => {
        const del = ev.target.closest('.gps-del');
        if (del) {
          points = points.filter(p => p.id !== del.getAttribute('data-del'));
          savePoints();
          drawPoints();
          renderList();
          return;
        }
        const ex = ev.target.closest('[data-exp]');
        if (ex) exportGps(ex.getAttribute('data-exp'));
      });
    }
    function startWatch() {
      if (!navigator.geolocation) { status(t('gps.denied')); return; }
      gpsOn = true;
      follow = true;
      btn.setAttribute('aria-pressed', 'true');
      buildPanel();
      panel.hidden = false;
      status(t('gps.waiting'));
      renderList();
      drawPoints();
      if (logBtn) logBtn.disabled = true;
      watchId = navigator.geolocation.watchPosition(onFix, onErr, { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 });
    }
    function stopWatch() {
      gpsOn = false;
      btn.setAttribute('aria-pressed', 'false');
      if (watchId != null && navigator.geolocation) { try { navigator.geolocation.clearWatch(watchId); } catch (e) {} }
      watchId = null;
      lastFix = null;
      if (dotMarker) { dotMarker.remove(); dotMarker = null; }
      if (map.getLayer('atlas-gps-acc')) map.removeLayer('atlas-gps-acc');
      if (map.getSource('atlas-gps')) map.removeSource('atlas-gps');
      if (panel) panel.hidden = true;
    }
    function onFix(pos) {
      if (!pos || !pos.coords) return;
      const c = pos.coords;
      lastFix = {
        lat: c.latitude,
        lng: c.longitude,
        acc: c.accuracy || 0,
        heading: (c.heading != null && isFinite(c.heading)) ? c.heading : null
      };
      placeMarker();
      drawAccuracy();
      status(Math.round(lastFix.acc) + ' ' + t('unit.m'));
      if (logBtn) logBtn.disabled = false;
      if (follow) map.easeTo({ center: [lastFix.lng, lastFix.lat], duration: 600 });
    }
    function onErr(err) {
      status(t('gps.denied'));
      if (logBtn) logBtn.disabled = true;
    }
    (function bindTap(el, fn) {
      let last = 0;
      const run = ev => {
        ev.preventDefault(); ev.stopPropagation();
        const now = Date.now();
        if (now - last < 400) return;
        last = now; fn();
      };
      el.addEventListener('pointerdown', ev => ev.stopPropagation());
      el.addEventListener('touchstart', ev => ev.stopPropagation(), { passive: true });
      el.addEventListener('click', run);
    })(btn, () => { if (gpsOn) stopWatch(); else startWatch(); });
    map.on('zoom', drawAccuracy);
    map.on('rotate', () => { if (gpsOn) placeMarker(); });
    map.on('dragstart', () => { if (gpsOn) follow = false; });
    map.on('zoomstart', () => { if (gpsOn) follow = false; });
    map.on('style.load', () => { ensurePts(); drawPoints(); });
    ensurePts();
    drawPoints();
    window.atlasGps = {
      relabel: () => {
        btn.title = t('tool.gps');
        btn.setAttribute('aria-label', t('tool.gps'));
        if (panel) {
          const note = panel.querySelector('.gps-note');
          if (note) { note.placeholder = t('gps.note'); note.setAttribute('aria-label', t('gps.note')); }
          const lg = panel.querySelector('.gps-log-btn');
          if (lg) lg.textContent = t('gps.log');
          renderList();
        }
      }
    };
  }

  function initGoTo() {
    const input = $('goto-input');
    const btn = $('goto-btn');
    if (!input || !btn) return;
    function dmsVal(d, m, s, dir) {
      let v = (d || 0) + (m || 0) / 60 + (s || 0) / 3600;
      if (/[SW]/i.test(dir || '')) v = -v;
      return v;
    }
    function coordFromText(text) {
      const s = String(text || '').trim();
      if (!s) return null;
      const dec = s.match(/^(-?\d{1,2}(?:[.,]\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:[.,]\d+)?)$/);
      if (dec) {
        const lat = parseFloat(dec[1].replace(',', '.'));
        const lng = parseFloat(dec[2].replace(',', '.'));
        if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) return [lng, lat];
      }
      const re = /(\d+(?:\.\d+)?)\s*[°d]?\s*(?:(\d+(?:\.\d+)?)\s*['′m])?\s*(?:(\d+(?:\.\d+)?)\s*["″s])?\s*([NSEWnsew])?/g;
      const found = [];
      let m;
      while (found.length < 2 && (m = re.exec(s))) {
        if (!m[4]) continue;
        found.push({ v: dmsVal(+m[1], +m[2] || 0, +m[3] || 0, m[4]), dir: m[4].toUpperCase() });
      }
      if (found.length === 2) {
        const latP = (found[0].dir === 'N' || found[0].dir === 'S') ? found[0] : found[1];
        const lngP = latP === found[0] ? found[1] : found[0];
        if (Math.abs(latP.v) <= 90 && Math.abs(lngP.v) <= 180) return [lngP.v, latP.v];
      }
      return null;
    }
    function go() {
      const v = coordFromText(input.value);
      input.classList.remove('bad');
      if (!v) { input.classList.add('bad'); input.focus(); return; }
      map.flyTo({ center: v, zoom: Math.max(map.getZoom(), 9), duration: 1200 });
      if (phone) setPanel(false);
    }
    btn.addEventListener('click', go);
    input.addEventListener('keydown', ev => { if (ev.key === 'Enter') { ev.preventDefault(); go(); } });
  }

  function setPanel(open) {
    $('panel').classList.toggle('closed', !open);
    document.body.classList.toggle('panel-closed', !open);
    $('layers-btn').textContent = open ? t('panel.hideMaps') : t('panel.maps');
    $('layers-btn').setAttribute('aria-expanded', open);
    placeScale();
  }
  $('layers-btn').addEventListener('click', () => setPanel($('panel').classList.contains('closed')));
  setPanel(!phone);
  function setLegend(open) { $('legend').classList.toggle('min', !open); $('legend-toggle').textContent = open ? t('legend.hide') : t('legend.title'); $('legend-toggle').setAttribute('aria-expanded', open); }
  $('legend-toggle').addEventListener('click', () => setLegend($('legend').classList.contains('min')));
  setLegend(!phone);

  function initGlobeMode() {
    const STORE = 'atlas-globe-v1';
    const DEM_SRC = 'atlas-dem';
    const HS_SRC = 'atlas-dem-hs';
    const HS_ID = 'atlas-hillshade';
    const EXAG = 1.3;
    const TERRAIN_MIN_ZOOM = 3;
    const DEM = {
      type: 'raster-dem',
      tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
      tileSize: 256,
      maxzoom: 15,
      encoding: 'terrarium',
      attribution: 'Terrain: Mapzen/Tilezen via AWS Open Data; USGS (SRTM, GMTED2010), NOAA (ETOPO1)'
    };
    let on = false;
    try { if (localStorage.getItem(STORE) === '1') on = true; } catch (e) {}

    const box = $('measure-box');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'globe-toggle';
    btn.className = 'measure-btn globe-btn';
    btn.setAttribute('aria-pressed', 'false');
    btn.setAttribute('aria-label', t('tool.3d'));
    btn.title = '3D';
    btn.innerHTML = ICON.globe;
    placeToolBtn(btn);

    function persist(v) {
      try { localStorage.setItem(STORE, v ? '1' : '0'); } catch (e) {}
    }
    function ensureDem() {
      if (!map.getStyle()) return;
      if (!map.getSource(DEM_SRC)) map.addSource(DEM_SRC, DEM);
      if (!map.getSource(HS_SRC)) map.addSource(HS_SRC, DEM);
    }
    function placeHillshade() {
      if (map.getLayer(HS_ID)) return;
      const layers = (map.getStyle() && map.getStyle().layers) || [];
      const firstOurs = layers.find(l => /^(atlas-|eqazyna-|process-|geo200-)/.test(l.id) && l.id !== HS_ID);
      map.addLayer({
        id: HS_ID,
        type: 'hillshade',
        source: HS_SRC,
        layout: { visibility: 'visible' },
        paint: {
          'hillshade-exaggeration': 0.35,
          'hillshade-shadow-color': '#473B24',
          'hillshade-highlight-color': '#fafaf9',
          'hillshade-illumination-direction': 315
        }
      }, firstOurs && firstOurs.id);
    }
    function wantTerrain() {
      return on && map.getZoom() >= TERRAIN_MIN_ZOOM;
    }
    function syncTerrain() {
      if (!map.getStyle()) return;
      if (wantTerrain()) {
        ensureDem();
        try {
          const cur = typeof map.getTerrain === 'function' ? map.getTerrain() : null;
          if (!cur || cur.source !== DEM_SRC) map.setTerrain({ source: DEM_SRC, exaggeration: EXAG });
        } catch (e) {}
        if (!map.getLayer(HS_ID)) placeHillshade();
        else {
          try { map.setLayoutProperty(HS_ID, 'visibility', 'visible'); } catch (e) {}
        }
      } else {
        try { if (typeof map.getTerrain === 'function' && map.getTerrain()) map.setTerrain(null); } catch (e) {}
        if (map.getLayer(HS_ID)) {
          try { map.setLayoutProperty(HS_ID, 'visibility', 'none'); } catch (e) {}
        }
      }
    }
    function apply(v, save, animate) {
      on = !!v;
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      if (save) persist(on);
      if (!map.getStyle()) return;
      if (on) {
        try { map.setProjection({ type: 'globe' }); } catch (e) {}
        try { map.setMaxPitch(85); } catch (e) {}
        try {
          if (map.dragRotate) map.dragRotate.enable();
          if (map.touchPitch) map.touchPitch.enable();
        } catch (e) {}
        try {
          if (typeof map.setSky === 'function') {
            map.setSky({
              'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 0.8, 5, 0]
            });
          }
        } catch (e) {}
        syncTerrain();
        if (animate !== false && (map.getPitch() || 0) < 20) {
          try { map.easeTo({ pitch: 45, duration: 600 }); } catch (e) {}
        }
      } else {
        syncTerrain();
        try { if (typeof map.setSky === 'function') map.setSky({ 'atmosphere-blend': 0 }); } catch (e) {}
        try { map.setProjection({ type: 'mercator' }); } catch (e) {}
        const finish = () => {
          if (on) return;
          try { map.setMaxPitch(0); } catch (e) {}
        };
        if (animate !== false && (map.getPitch() || 0) > 0) {
          try {
            map.easeTo({ pitch: 0, duration: 400 });
            map.once('moveend', finish);
          } catch (e) { finish(); }
        } else {
          try { map.jumpTo({ pitch: 0, center: map.getCenter(), zoom: map.getZoom(), bearing: map.getBearing() }); } catch (e) {}
          finish();
        }
      }
    }

    btn.addEventListener('click', () => apply(!on, true, true));
    map.on('zoom', syncTerrain);
    map.on('style.load', () => { apply(on, false, false); });
    if (map.loaded()) apply(on, false, !on ? false : true);
    else map.once('load', () => apply(on, false, !on ? false : true));
  }

  initActiveUi();
  initScaleChrome();
  initMeasure();
  initSketch();
  initGlobeMode();
  initGrid();
  initProfile();
  initCompare();
  initBookmarks();
  initGps();
  initGoTo();

  // Clicked point coordinates with a Copy button, in the feature popup or a small one of its own.
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise((resolve, reject) => {
      const t = document.createElement('textarea');
      t.value = text; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0';
      document.body.appendChild(t); t.select();
      try { document.execCommand('copy') ? resolve() : reject(); } catch (e) { reject(e); } finally { t.remove(); }
    });
  }
  (function initCopyLink() {
    const btn = $('copy-link');
    if (!btn) return;
    let timer;
    btn.addEventListener('click', () => {
      writeHash();
      const url = location.href;
      const done = ok => {
        btn.textContent = ok ? t('panel.copied') : t('panel.copyLink');
        clearTimeout(timer);
        timer = setTimeout(() => { btn.textContent = t('panel.copyLink'); }, 1500);
        if (!ok) { try { window.prompt(t('panel.copyThisLink'), url); } catch (e) {} }
      };
      copyText(url).then(() => done(true), () => done(false));
    });
  })();
  function coordLine(text) {
    const row = document.createElement('div');
    row.className = 'coord-line';
    row.innerHTML = '<span class="coord-text"></span><button type="button" class="coord-copy">' + t('panel.copy') + '</button>';
    row.querySelector('.coord-text').textContent = text;
    const btn = row.querySelector('.coord-copy');
    let timer;
    btn.addEventListener('click', ev => {
      ev.stopPropagation();
      copyText(text).then(() => { btn.textContent = t('panel.copied'); }, () => { btn.textContent = t('panel.copyFailed'); });
      clearTimeout(timer);
      timer = setTimeout(() => { btn.textContent = t('panel.copy'); }, 1500);
    });
    return row;
  }
  map.on('click', e => {
    if (window.atlasSketch && window.atlasSketch.active && window.atlasSketch.active()) return;
    if (window.atlasCompare && window.atlasCompare.active && window.atlasCompare.active()) return;
    if (window.atlasProfile && window.atlasProfile.click && window.atlasProfile.click(e)) return;
    if (window.atlasMeasure && window.atlasMeasure.click && window.atlasMeasure.click(e)) return;
    const text = e.lngLat.lat.toFixed(5) + ', ' + e.lngLat.lng.toFixed(5);
    const cl = clusterAt(e.point);
    if (cl) {
      clearSel();
      closeFeaturePopup();
      zoomToCluster(cl);
      return;
    }
    if (openInfoPopup(e)) return;
    clearSel();
    closeFeaturePopup();
    const box = document.createElement('div');
    box.appendChild(coordLine(text));
    selPopup = new maplibregl.Popup({ maxWidth: '260px', className: 'coord-popup' }).setLngLat(e.lngLat).setDOMContent(box).addTo(map);
    selPopup.on('close', () => { if (selPopup) selPopup = null; });
  });
  map.on('mousemove', e => {
    if (window.atlasSketch && window.atlasSketch.active && window.atlasSketch.active()) {
      map.getCanvas().style.cursor = window.atlasSketch.tool && window.atlasSketch.tool() === 'erase' ? 'cell' : 'crosshair';
      return;
    }
    if (window.atlasMeasure && window.atlasMeasure.active && window.atlasMeasure.active()) {
      map.getCanvas().style.cursor = window.atlasMeasure.finished() ? '' : 'crosshair';
      return;
    }
    if (window.atlasProfile && window.atlasProfile.active && window.atlasProfile.active()) {
      map.getCanvas().style.cursor = 'crosshair';
      return;
    }
    map.getCanvas().style.cursor = hasClickTarget(e.point) ? 'pointer' : '';
  });
  map.on('load', () => {
    applyBasemap();
    if (typeof initAtlasEqazyna === 'function') initAtlasEqazyna(map, { onUpdate: () => { syncList(); renderLegend(); }, coordLine });
    if (typeof initAtlasProcess === 'function') initAtlasProcess(map, { onUpdate: () => { syncList(); renderLegend(); } });
    if (typeof initAtlasGeo200 === 'function') initAtlasGeo200(map, { onUpdate: () => { syncList(); renderLegend(); } });
    const SPEC = (HASH && HASH.special) ? HASH.special : (SAVED_VIEW && Array.isArray(SAVED_VIEW.special) ? SAVED_VIEW.special : null);
    if (SPEC) {
      const has = k => SPEC.includes(k);
      if (has('eq') && window.atlasEqazyna && window.atlasEqazyna.setOn) window.atlasEqazyna.setOn(true);
      ['open', 'auction', 'pugfn'].forEach(id => {
        if (has('pr:' + id) && window.atlasProcess && window.atlasProcess.setOn) window.atlasProcess.setOn(id, true);
      });
      if (has('geo200') && window.atlasGeo200 && window.atlasGeo200.setOn) window.atlasGeo200.setOn(true);
    }
    ensureSelLayers();
    try { if (localStorage.getItem(OV_STORE) === null) localStorage.setItem(OV_STORE, JSON.stringify([...ovOn])); } catch (e) {}
    mainsOn.forEach(id => addMain(id));
    ovOn.forEach(id => addOverlay(id));
    if (fig1bOn) setFig1b(true);
    if (itmOn) setItm(true);
    syncButtons(); syncList(); renderLegend();
    const toolsBox = $('measure-box');
    if (toolsBox) toolsBox.hidden = false;
    map.on('moveend', queueHash);
    queueHash();
    setTimeout(() => { const a = document.querySelector('.maplibregl-ctrl-attrib'); if (a) a.classList.remove('maplibregl-compact-show'); if (window.atlasMeasure && window.atlasMeasure.place) window.atlasMeasure.place(); }, 300);
  });

  function setMapBtnLabel(el, label) {
    if (!el) return;
    const keep = Array.from(el.querySelectorAll('.ov-box, .ov-load'));
    el.textContent = '';
    keep.forEach(n => el.appendChild(n));
    el.appendChild(document.createTextNode(label));
  }
  function relabelAtlas() {
    applySiteChrome();
    document.querySelectorAll('#panel section.group').forEach(sec => {
      const gid = sec.getAttribute('data-gid');
      const gname = sec.getAttribute('data-gname');
      const h3 = sec.querySelector('h3');
      if (!h3) return;
      const g = (cfg.groups || []).find(x => (gid && x.id === gid) || (!gid && x.name === gname));
      if (g) h3.textContent = pickName(g, 'name');
    });
    document.querySelectorAll('#panel .map-btn[data-id]').forEach(btn => {
      const id = btn.getAttribute('data-id');
      const m = all[id] || ovs[id];
      if (m) setMapBtnLabel(btn, pickName(m, 'title'));
    });
    setMapBtnLabel($('geo200-toggle'), t('layer.geo200'));
    setMapBtnLabel($('process-open-toggle'), t('layer.openApply'));
    setMapBtnLabel($('process-auction-toggle'), t('layer.atAuction'));
    setMapBtnLabel($('eqazyna-toggle'), t('layer.licenses'));
    setMapBtnLabel($('process-pugfn-toggle'), t('layer.pugfn'));
    setMapBtnLabel($('itm-toggle'), t('layer.itm'));
    setMapBtnLabel($('fig1b-toggle'), t('layer.orocline'));
    const panel = $('panel');
    const open = panel && !panel.classList.contains('closed');
    const lb = $('layers-btn');
    if (lb) lb.textContent = open ? t('panel.hideMaps') : t('panel.maps');
    const lg = $('legend');
    const lt = $('legend-toggle');
    if (lt && lg) lt.textContent = lg.classList.contains('min') ? t('legend.title') : t('legend.hide');
    const mb = $('measure-btn');
    if (mb) { mb.title = t('tool.measure'); mb.setAttribute('aria-label', t('tool.measure')); }
    const mdist = $('measure-dist');
    if (mdist) { mdist.title = t('tool.distance'); mdist.setAttribute('aria-label', t('tool.distance')); }
    const marea = $('measure-area');
    if (marea) { marea.title = t('tool.area'); marea.setAttribute('aria-label', t('tool.area')); }
    const db = $('measure-done'); if (db) db.textContent = t('tool.done');
    const cb = $('measure-clear'); if (cb) cb.textContent = t('tool.clear');
    const gb = $('grid-toggle');
    if (gb) { gb.title = t('tool.grid'); gb.setAttribute('aria-label', t('tool.grid')); }
    const skb = $('sketch-btn');
    if (skb) { skb.title = t('tool.sketch'); skb.setAttribute('aria-label', t('tool.sketch')); }
    if (window.atlasProfile && window.atlasProfile.relabel) window.atlasProfile.relabel();
    if (window.atlasBookmarks && window.atlasBookmarks.relabel) window.atlasBookmarks.relabel();
    if (window.atlasGps && window.atlasGps.relabel) window.atlasGps.relabel();
    const cbn = $('compare-btn');
    if (cbn) { cbn.title = t('tool.compare'); cbn.setAttribute('aria-label', t('tool.compare')); }
    const bar = $('sketch-bar');
    if (bar) {
      const keys = { pencil: 'tool.pencil', erase: 'tool.eraser', thin: 'tool.thin', thick: 'tool.thick', undo: 'tool.undo', clear: 'tool.clear' };
      bar.querySelectorAll('[data-tool], [data-width], [data-act]').forEach(b => {
        const k = keys[b.getAttribute('data-tool') || b.getAttribute('data-width') || b.getAttribute('data-act')];
        if (k) { b.title = t(k); b.setAttribute('aria-label', t(k)); }
      });
      [['#dc2626', 'color.red'], ['#1c1917', 'color.black'], ['#1d4ed8', 'color.blue'], ['#eab308', 'color.yellow']].forEach(pair => {
        bar.querySelectorAll('[data-colour="' + pair[0] + '"]').forEach(b => {
          b.title = t(pair[1]); b.setAttribute('aria-label', t(pair[1]));
        });
      });
    }
    const copy = document.querySelector('#copy-link, .copy-link, button.share-copy');
    if (copy && copy.textContent !== t('panel.copied')) copy.textContent = t('panel.copyLink');
    const ccopy = document.querySelector('.coord-copy');
    if (ccopy && ccopy.textContent !== t('panel.copied') && ccopy.textContent !== t('panel.copyFailed')) ccopy.textContent = t('panel.copy');
    syncList();
    renderActive();
    renderLegend();
    if (typeof gridOn !== 'undefined' && gridOn) gridUpdate();
    if (window.atlasMeasure && window.atlasMeasure.redraw) window.atlasMeasure.redraw();
  }
  if (I18N.onChange) I18N.onChange(relabelAtlas);

})();
