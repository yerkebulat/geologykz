// 1:1.5M Geological map of the Kazakh SSR (1967): raster tiles + colour-vectorised units
(function () {
  const BASE = "data/kz15m/";
  const CREDIT = "Geological map of the Kazakh SSR, 1:1,500,000 (1967). Scan via geokniga.org.";
  let manifest = null, legend = null;
  const packs = {};
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  function pack(g) {
    if (!packs[g.name]) packs[g.name] = fetch(BASE + "tiles_" + g.name + ".json").then((r) => r.json());
    return packs[g.name];
  }
  function b64(s) { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u.buffer; }
  const getManifest = () => manifest || (manifest = fetch(BASE + "tiles_manifest.json").then((r) => r.json()));
  maplibregl.addProtocol("kz15m", async (params) => {
    const [z, x, y] = params.url.replace("kz15m://", "").split("/").map(Number);
    const man = await getManifest();
    const g = man.find((m) => z >= m.minzoom && z <= m.maxzoom && x >= m.xmin && x <= m.xmax);
    if (!g) return { data: new ArrayBuffer(0) };
    const p = await pack(g);
    const t = p[z + "/" + x + "/" + y];
    return { data: t ? b64(t) : new ArrayBuffer(0) };
  });
  function popup(u) {
    return `<div class="kz15m-pop"><strong class="mono">${esc(u.code)}</strong> ${esc(u.en)}` +
      `<br><span class="ru">${esc(u.ru)}</span><br>Age: ${esc(u.age)}` +
      `<br><small>${CREDIT} Unit matched by colour, may be wrong near boundaries.</small></div>`;
  }
  function renderLegend(L, fc) {
    const n = {}; fc.features.forEach((f) => (n[f.properties.u] = (n[f.properties.u] || 0) + 1));
    document.getElementById("kz15m-count").textContent = L.length + " units, " + fc.features.length + " polygons";
    const root = document.getElementById("kz15m-legend"); root.innerHTML = "";
    L.forEach((u) => {
      const d = document.createElement("div"); d.className = "legend-item";
      d.innerHTML = `<span class="swatch" style="background:${u.hex}"></span><span class="code kz">${esc(u.code)}</span>` +
        `<span class="meta"><strong>${esc(u.en)}</strong>${esc(u.age)} · ${esc(u.ru)} · ${n[u.id] || 0} polygons</span>`;
      root.appendChild(d);
    });
  }
  window.addEventListener("geologykz:load", function (ev) {
    const map = ev.detail;
    map.addSource("kz15m-raster", { type: "raster", tiles: ["kz15m://{z}/{x}/{y}"], tileSize: 256, minzoom: 4, maxzoom: 9,
      bounds: [46, 40, 88, 56], attribution: CREDIT });
    map.addSource("kz15m-units", { type: "geojson", data: { type: "FeatureCollection", features: [] }, generateId: true });
    map.addLayer({ id: "kz15m-raster", type: "raster", source: "kz15m-raster", layout: { visibility: "none" }, paint: { "raster-opacity": 0.85 } }, "kz-line");
    map.addLayer({ id: "kz15m-fill", type: "fill", source: "kz15m-units", layout: { visibility: "none" },
      paint: { "fill-color": "#000", "fill-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 0.18, 0] } }, "kz-line");
    map.addLayer({ id: "kz15m-hover", type: "line", source: "kz15m-units", layout: { visibility: "none" },
      paint: { "line-color": "#111", "line-width": ["case", ["boolean", ["feature-state", "hover"], false], 2, 0] } }, "kz-line");
    let loaded = null;
    const load = () => loaded || (loaded = Promise.all([fetch(BASE + "legend.json").then((r) => r.json()), fetch(BASE + "units_0.geojson").then((r) => r.json()), fetch(BASE + "units_1.geojson").then((r) => r.json())])
      .then(([L, a, b]) => { const fc = { type: "FeatureCollection", features: a.features.concat(b.features) }; fc.features.forEach((f) => (f.properties.c = (L[f.properties.u] || {}).hex)); legend = L; map.getSource("kz15m-units").setData(fc); renderLegend(L, fc); }));
    const tg = document.getElementById("kz15m-toggle"), op = document.getElementById("kz15m-opacity");
    let mode = "scan";
    const fillOp = () => ["case", ["boolean", ["feature-state", "hover"], false], Math.min(1, +op.value + 0.15), mode === "colors" ? +op.value : 0];
    const set = () => {
      const on = tg.checked;
      map.setLayoutProperty("kz15m-raster", "visibility", on && mode === "scan" ? "visible" : "none");
      ["kz15m-fill", "kz15m-hover"].forEach((id) => map.setLayoutProperty(id, "visibility", on ? "visible" : "none"));
      map.setPaintProperty("kz15m-fill", "fill-color", mode === "colors" ? ["coalesce", ["get", "c"], "#ccc"] : "#000");
      map.setPaintProperty("kz15m-fill", "fill-opacity", mode === "colors" ? fillOp() : ["case", ["boolean", ["feature-state", "hover"], false], 0.18, 0]);
      if (on) load();
    };
    const modeEl = document.getElementById("kz15m-mode");
    modeEl.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-mode]"); if (!b) return;
      mode = b.getAttribute("data-mode");
      modeEl.querySelectorAll("button").forEach((x) => { const a = x === b; x.classList.toggle("active", a); x.setAttribute("aria-checked", a ? "true" : "false"); });
      set();
    });
    tg.addEventListener("change", set);
    op.addEventListener("input", () => { map.setPaintProperty("kz15m-raster", "raster-opacity", +op.value); set(); });
    document.getElementById("kz15m-card").addEventListener("toggle", load);
    let hov = null;
    map.on("mousemove", "kz15m-fill", (e) => {
      const f = e.features[0]; if (!f) return;
      if (hov !== null) map.setFeatureState({ source: "kz15m-units", id: hov }, { hover: false });
      hov = f.id; map.setFeatureState({ source: "kz15m-units", id: hov }, { hover: true });
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "kz15m-fill", () => { if (hov !== null) map.setFeatureState({ source: "kz15m-units", id: hov }, { hover: false }); hov = null; map.getCanvas().style.cursor = ""; });
    map.on("click", "kz15m-fill", (e) => {
      if (map.getLayer("detail-fill") && map.getLayoutProperty("detail-fill", "visibility") === "visible" && map.queryRenderedFeatures(e.point, { layers: ["detail-fill"] }).length) return;
      const f = e.features[0]; if (!f || !legend) return;
      new maplibregl.Popup({ maxWidth: "320px" }).setLngLat(e.lngLat).setHTML(popup(legend[f.properties.u])).addTo(map);
    });
    window.geologykzKz15m = { mode: (m) => modeEl.querySelector('[data-mode="' + m + '"]').click(), show: () => { tg.checked = true; set(); return load(); } };
  });
})();
