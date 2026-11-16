const fs = require("fs"), assert = require("assert"), { JSDOM } = require("jsdom");
const root = require("path").join(__dirname, "../docs/");
const tick = () => new Promise((r) => setImmediate(r));

function env({ hold = false, fresh = false, storage, blocked = false, zoom = 10, bounds } = {}) {
  const d = new JSDOM(fs.readFileSync(root + "index.html", "utf8"), { runScripts: "outside-only", url: "https://yerkebulat.github.io/geologykz/" });
  const w = d.window;
  if (!fresh || storage) {
    const checks = Object.fromEntries(
      ["detail-all-200k", "detail-all-500k", "detail-show", "detail-coverage", "geo-toggle", "kz15m-toggle", "kz-toggle", "base-toggle"].map((id) => [
        id,
        ["kz-toggle", "base-toggle"].includes(id)
      ])
    );
    const raw = storage || JSON.stringify({
          version: 3,
          checks: { ...checks, "geo-toggle": true, "kz15m-toggle": true },
          ranges: { "detail-opacity": 1, "geo-opacity": 0.7, "kz15m-opacity": 0.85 },
          sheet: "m43xxxi",
          mode: "scan",
          nationalMode: "scan",
          base: "light"
        });
    let ver = 3;
    try { ver = JSON.parse(raw).version; } catch (e) {}
    const storeKey = ver === 6 ? "geologykz-ui-v6" : ver === 5 ? "geologykz-ui-v5" : ver === 4 ? "geologykz-ui-v4" : "geologykz-ui-v3";
    w.localStorage.setItem(storeKey, raw);
  }
  if (blocked) Object.defineProperty(w, "localStorage", { get() { throw new Error("blocked"); } });
  w.eval(fs.readFileSync(root + "preferences.js", "utf8"));
  let release;
  const gate = new Promise((r) => (release = r));
  const req = [], layers = {}, sources = {};
  const state = { fits: 0, closed: 0, popups: [], handlers: {}, zoom, bounds: bounds || { west: 71.5, south: 47.8, east: 74.2, north: 49.5 } };
  if (!hold) release();
  w.fetch = async (p) => {
    const url = String(p);
    if (!url.endsWith("detailed-sheets.json")) req.push(url);
    let path = new URL(url, w.document.baseURI).pathname.replace(/^\/geologykz\//, "");
    if (path.includes("manifest")) await gate;
    if (path.endsWith("units.geojson") || path.endsWith("/legend.json")) throw new Error("should not load " + path);
    return { ok: true, json: async () => JSON.parse(fs.readFileSync(root + path, "utf8")) };
  };
  w.maplibregl = { Popup: function () { return { setLngLat() { return this; }, setHTML(s) { state.popups.push(s); return this; }, addTo() { return this; }, remove() {} }; } };
  const map = {
    getCanvas: () => ({ style: {} }),
    getZoom: () => state.zoom,
    getBounds: () => ({
      getWest: () => state.bounds.west,
      getSouth: () => state.bounds.south,
      getEast: () => state.bounds.east,
      getNorth: () => state.bounds.north
    }),
    getStyle: () => ({ layers: Object.values(layers) }),
    getSource: (id) => sources[id],
    getLayer: (id) => layers[id],
    removeLayer: (id) => { delete layers[id]; },
    removeSource: (id) => { delete sources[id]; },
    addSource: (id, s) => { assert(!sources[id], id); sources[id] = s; },
    addLayer: (l) => { assert(!layers[l.id], l.id); layers[l.id] = l; },
    setLayoutProperty: (id, k, v) => ((layers[id].layout ||= {})[k] = v),
    getLayoutProperty: (id, k) => layers[id]?.layout?.[k] || "visible",
    setPaintProperty: (id, k, v) => (layers[id].paint[k] = v),
    queryRenderedFeatures: () => [],
    on(event, a, b) {
      const handler = typeof a === "function" ? a : b;
      const key = typeof a === "string" && b ? event + ":" + a : event;
      state.handlers[key] = handler;
    },
    fitBounds() { state.fits++; }
  };
  w.geologykzSetLayersOpen = () => state.closed++;
  w.eval(fs.readFileSync(root + "detailed.js", "utf8"));
  w.dispatchEvent(new w.CustomEvent("geologykz:load", { detail: map }));
  const ready = async () => {
    for (let i = 0; i < 20; i++) {
      if (w.geologykzDetailed) return;
      await tick();
    }
  };
  return {
    w, release, req, layers, sources, state,
    api: w.geologykzDetailed,
    ids: () => Object.keys(sources).filter((id) => id.startsWith("detail-")),
    close: () => w.close(),
    ready,
    async flush() { await ready(); await this.api.load(); await tick(); }
  };
}

(async () => {
  const fresh = env({ fresh: true });
  await fresh.flush();
  assert(!fresh.w.document.getElementById("detail-toggle").checked);
  assert(fresh.w.document.getElementById("geo-toggle").checked);
  assert(fresh.w.document.getElementById("kz15m-toggle").checked);
  assert.equal(fresh.w.document.querySelector('#kz15m-mode [aria-checked="true"]').dataset.mode, "colors");
  assert.equal(fresh.w.document.querySelectorAll("details[open]").length, 0);
  assert.equal(fresh.ids().length, 0);
  assert(!fresh.w.document.getElementById("eqazyna-toggle").checked);
  assert(!fresh.w.document.getElementById("detail-toggle").checked);
  assert(fresh.w.document.getElementById("kz15m-toggle").checked);
  assert(fresh.w.document.getElementById("geo-toggle").checked);
  assert(fresh.w.document.getElementById("enabled-count").textContent.startsWith("2"));
  assert(fresh.w.document.getElementById("detail-status").textContent.includes("1:200,000"));
  assert(!fresh.w.document.getElementById("detail-all-200k"));
  assert(!fresh.w.document.getElementById("detail-sheet"));
  assert(!fresh.w.document.getElementById("detail-colors"));
  fresh.w.document.getElementById("maps-hide-all").click();
  await fresh.api.load();
  assert.equal(fresh.ids().length, 0);
  fresh.w.document.getElementById("maps-fit-all").click();
  assert.equal(fresh.state.fits, 0);
  fresh.close();

  const migrated = env({ fresh: true, storage: JSON.stringify({
    version: 4,
    checks: { "detail-all-200k": true, "detail-all-500k": false, "detail-show": false, "detail-coverage": false, "geo-toggle": true, "kz15m-toggle": true, "kz-toggle": true, "base-toggle": true, "eqazyna-toggle": false },
    ranges: { "detail-opacity": 0.4, "geo-opacity": 0.7, "kz15m-opacity": 0.85 },
    sheet: "m43xxxi",
    mode: "colors",
    nationalMode: "scan",
    base: "light"
  }) });
  await migrated.flush();
  assert(migrated.w.document.getElementById("detail-toggle").checked);
  assert.equal(+migrated.w.document.getElementById("detail-opacity").value, 0.4);
  assert(migrated.ids().includes("detail-m43xxxi-raster"));
  assert(migrated.ids().every((id) => id.endsWith("-raster")));
  assert(!migrated.req.some((p) => p.includes("units.geojson") || p.endsWith("/legend.json")));
  const raster = migrated.sources["detail-m43xxxi-raster"];
  assert.equal(raster.tileSize, 256);
  assert(raster.tiles[0].includes("{z}/{x}/{y}"));
  assert.equal(migrated.layers["detail-m43xxxi-raster"].paint["raster-opacity"], 0.4);
  assert(!migrated.w.document.getElementById("eqazyna-toggle").checked);
  migrated.close();

  const fromV5 = env({ fresh: true, storage: JSON.stringify({
    version: 5,
    checks: { "detail-toggle": true, "geo-toggle": true, "kz15m-toggle": false, "kz-toggle": true, "base-toggle": true, "eqazyna-toggle": true },
    ranges: { "detail-opacity": 0.55, "geo-opacity": 0.7, "kz15m-opacity": 0.85 },
    nationalMode: "colors",
    base: "terrain",
    satellite: "esri"
  }) });
  await fromV5.flush();
  assert(fromV5.w.document.getElementById("detail-toggle").checked);
  assert(fromV5.w.document.getElementById("geo-toggle").checked);
  assert(!fromV5.w.document.getElementById("kz15m-toggle").checked);
  assert(!fromV5.w.document.getElementById("eqazyna-toggle").checked);
  assert.equal(+fromV5.w.document.getElementById("detail-opacity").value, 0.55);
  assert.equal(fromV5.w.geologykzPreferences.base, "terrain");
  assert.equal(fromV5.w.geologykzPreferences.satellite, "esri");
  fromV5.close();

  const a = env();
  await a.flush();
  assert(!a.w.document.getElementById("detail-toggle").checked);
  await a.api.show();
  await tick();
  assert(a.w.document.getElementById("detail-toggle").checked);
  assert(a.ids().includes("detail-m43xxxi-raster"));
  assert(a.ids().length >= 1 && a.ids().length <= 12);
  a.w.document.getElementById("detail-opacity").value = ".35";
  a.w.document.getElementById("detail-opacity").dispatchEvent(new a.w.Event("input"));
  assert.equal(a.layers["detail-m43xxxi-raster"].paint["raster-opacity"], 0.35);
  a.w.document.getElementById("maps-fit-all").click();
  assert.equal(a.state.fits, 1);
  a.w.document.getElementById("maps-hide-all").click();
  await a.api.load();
  assert.equal(a.ids().length, 0);
  assert(!a.w.document.getElementById("geo-toggle").checked);

  a.state.zoom = 5;
  await a.api.show();
  await tick();
  assert.equal(a.ids().length, 0);
  assert(a.w.document.getElementById("detail-status").textContent.includes("Zoom in"));
  a.state.zoom = 10;
  if (a.state.handlers.zoomend) a.state.handlers.zoomend();
  await a.api.load();
  assert(a.ids().length >= 1);
  a.close();

  const far = env({ bounds: { west: 54, south: 47.9, east: 55.2, north: 48.8 } });
  await far.flush();
  await far.api.show();
  await tick();
  assert(far.ids().includes("detail-m40xxxi-raster"));
  assert(!far.ids().includes("detail-m43xxxi-raster"));
  assert(!far.req.some((p) => p.includes("units.geojson")));
  far.close();

  const corrupt = env({ fresh: true, storage: '{"version":2,"checks":{}}' });
  const blocked = env({ fresh: true, blocked: true });
  await Promise.all([corrupt.flush(), blocked.flush()]);
  assert(!corrupt.w.document.getElementById("detail-toggle").checked);
  assert(!blocked.w.document.getElementById("detail-toggle").checked);
  assert.equal(corrupt.ids().length, 0);
  [corrupt, blocked].forEach((v) => v.close());

  const html = fs.readFileSync(root + "index.html", "utf8");
  assert(html.includes("National geological map (1:1,500,000)"));
  assert(html.includes("Hold for more"));
  assert(html.includes("Source: Unified Subsoil Use Platform"));
  assert(!html.includes("Show all 1:200,000"));
  console.log("PASS simplified detailed maps: one toggle, scans only, lazy in-view load, v5/v4/v3 migration, e-qazyna stays off until chosen, hide/zoom, no color assets.");
})().catch((e) => { console.error(e); process.exit(1); });
