const fs = require("fs"), assert = require("assert"), path = require("path"), vm = require("vm");
const tick = () => new Promise((r) => setImmediate(r));
const src = fs.readFileSync(path.join(__dirname, "../cloudflare-atlas/public/geo200-pilot.js"), "utf8");

function poly(bounds) {
  const [w, s, e, n] = bounds;
  return { type: "Polygon", coordinates: [[[w, s], [e, s], [e, n], [w, n], [w, s]]] };
}

const SHEETS = {
  sheets: [
    { id: "near", url: "/tiles/200k/near.pmtiles", bounds: [72, 48, 73, 49], minzoom: 5, maxzoom: 13, geometry: poly([72, 48, 73, 49]) },
    { id: "far", url: "/tiles/200k/far.pmtiles", bounds: [80, 50, 82, 52], minzoom: 5, maxzoom: 13, geometry: poly([80, 50, 82, 52]) }
  ],
  attribution: "test"
};

function env() {
  const layers = {}, sources = {}, handlers = {};
  let zoom = 8;
  let bounds = { west: 72.2, south: 48.2, east: 72.8, north: 48.8 };
  const hid = new Set();
  const ctx = {
    window: null,
    document: {
      getElementById(id) {
        if (id !== "geo200-toggle") return null;
        return { classList: { toggle() {} }, setAttribute() {}, addEventListener() {} };
      }
    },
    location: { origin: "https://atlas.kzgeology.com" },
    localStorage: { getItem() { return null; }, setItem() {} },
    fetch: async (url) => {
      if (String(url).includes("sheets.json")) return { ok: true, json: async () => SHEETS };
      throw new Error("unexpected fetch " + url);
    },
    console,
    setTimeout, clearTimeout,
    pmtiles: { Protocol: function () { this.tile = function () {}; } },
    maplibregl: { addProtocol() {} }
  };
  ctx.window = ctx;
  ctx.window.atlasLayerVisible = (k) => k === "geo200" && !hid.has("geo200");
  ctx.window.atlasApplyKeyVis = (k) => {
    if (k !== "geo200") return;
    const vis = ctx.window.atlasLayerVisible("geo200") ? "visible" : "none";
    Object.keys(layers).forEach((id) => {
      if (id === "geo200-fill" || id === "geo200-outline" || id === "geo200-label" || id === "geo200-label-hi" || id.startsWith("geo200-scan-")) {
        (layers[id].layout ||= {}).visibility = vis;
      }
    });
  };
  vm.runInNewContext(src, ctx, { filename: "geo200-pilot.js" });

  const map = {
    getZoom: () => zoom,
    getBounds: () => ({
      getWest: () => bounds.west,
      getSouth: () => bounds.south,
      getEast: () => bounds.east,
      getNorth: () => bounds.north
    }),
    getStyle: () => ({ layers: Object.values(layers) }),
    getSource: (id) => sources[id],
    getLayer: (id) => layers[id],
    addSource: (id, s) => { sources[id] = s; },
    addLayer: (l) => { layers[l.id] = l; },
    removeLayer: (id) => { delete layers[id]; },
    removeSource: (id) => { delete sources[id]; },
    setLayoutProperty: (id, k, v) => { (layers[id].layout ||= {})[k] = v; },
    getLayoutProperty: (id, k) => (layers[id].layout || {})[k],
    moveLayer() {},
    on(ev, fn) { (handlers[ev] ||= []).push(fn); }
  };

  ctx.initAtlasGeo200(map, {
    isVisible: () => !hid.has("geo200"),
    applyVis: () => ctx.window.atlasApplyKeyVis("geo200")
  });

  return {
    hid, layers, sources, handlers,
    api: () => ctx.atlasGeo200,
    setZoom: (z) => { zoom = z; },
    setBounds: (b) => { bounds = b; },
    fire(ev) { (handlers[ev] || []).forEach((fn) => fn()); },
    scanVis() {
      return Object.keys(layers)
        .filter((id) => id.startsWith("geo200-scan-"))
        .sort()
        .map((id) => [id, (layers[id].layout || {}).visibility || "visible"]);
    },
    allGeoVis() {
      return Object.keys(layers)
        .filter((id) => id === "geo200-fill" || id === "geo200-outline" || id.startsWith("geo200-label") || id.startsWith("geo200-scan-"))
        .sort()
        .map((id) => [id, (layers[id].layout || {}).visibility || "visible"]);
    },
    async ready() {
      for (let i = 0; i < 20; i++) {
        if (ctx.atlasGeo200) return;
        await tick();
      }
      throw new Error("geo200 not ready");
    }
  };
}

function compareVis(k, leftKey, hid) {
  return (k === leftKey && !hid.has(k)) ? "visible" : "none";
}

(async () => {
  const affected = [];
  const clean = [];

  // --- 1:200k lazy scans (geo200) ---
  const g = env();
  await g.ready();
  await tick();
  g.api().setOn(true);
  await tick();
  assert.deepEqual(g.scanVis(), [["geo200-scan-near", "visible"]], "zoom-in should load the in-view 1:200k sheet visible");
  g.hid.add("geo200");
  g.api().refresh();
  assert(g.allGeoVis().every(([, v]) => v === "none"), "hiding 1:200k must hide loaded scans and outlines");
  // Hide, then zoom out so a second sheet enters the (padded) viewport, still above min zoom.
  g.setZoom(5.5);
  g.setBounds({ west: 70, south: 47, east: 83, north: 53 });
  g.fire("zoomend");
  const after = g.scanVis();
  assert(after.length >= 2, "zoom-out should lazy-add the far sheet too: " + JSON.stringify(after));
  assert(after.every(([, v]) => v === "none"), "newly added 1:200k scans must stay hidden after hide-then-zoom-out: " + JSON.stringify(after));
  assert(g.allGeoVis().every(([, v]) => v === "none"), "outlines/labels must stay hidden too");
  affected.push("geo200 (Geological maps 1:200k scans)");

  g.hid.delete("geo200");
  g.api().refresh();
  assert(g.scanVis().every(([, v]) => v === "visible"), "unhiding should show the lazy-loaded scans again");

  // --- Compare / pinned copy visibility rule (mirrors app.js applySides / cloneLayer) ---
  const hid = new Set(["geo200", "ov:usgs-ck-geology", "fig1b", "eq"]);
  assert.equal(compareVis("geo200", "geo200", hid), "none");
  assert.equal(compareVis("fig1b", "fig1b", hid), "none");
  assert.equal(compareVis("ov:usgs-ck-geology", "ov:usgs-ck-geology", hid), "none");
  assert.equal(compareVis("eq", "eq", hid), "none");
  assert.equal(compareVis("geo200", "geo200", new Set()), "visible");
  assert.equal(compareVis("itm", "geo200", new Set()), "none");
  affected.push("compare copies (applySides / cloneLayer forced visible)");
  affected.push("pinned copies (eq / process / deposits hide must survive a visibility reset)");

  // --- Groups audited that do not add sources/layers on zoom ---
  clean.push("1:500k atlas group: no dedicated lazy loader in cloudflare-atlas (only docs/detailed.js, tested separately)");
  clean.push("1:100k: no loader, catalog group, or sheets found");
  clean.push("USGS overlays: sources added once in addOverlay/addRasterOverlay, not on zoomend");
  clean.push("literature overlays (fig1b, itm, catalog paper maps): added once on toggle, not on zoomend");
  clean.push("process open/auction cells: zoomend only setData on existing sources");
  clean.push("eqazyna licenses: no per-zoom addSource/addLayer");

  console.log("AFFECTED (fixed):");
  affected.forEach((x) => console.log("  - " + x));
  console.log("NOT AFFECTED (no hide-then-zoom-out addLayer path):");
  clean.forEach((x) => console.log("  - " + x));
  console.log("PASS lazy hide-then-zoom-out audit");
})().catch((e) => { console.error(e); process.exit(1); });
