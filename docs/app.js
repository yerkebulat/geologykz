// geologykz v1 — map + progress tracker. No build step.
(function () {
  // ---------- Map ----------
  if (window.pmtiles && window.maplibregl) {
    const protocol = new pmtiles.Protocol();
    maplibregl.addProtocol("pmtiles", protocol.tile);
  }

  let map;
  try {
    map = new maplibregl.Map({
      container: "mapview",
      style: "https://tiles.openfreemap.org/styles/positron",
      center: [67, 48],
      zoom: 4,
      attributionControl: { compact: true },
      cooperativeGestures: true
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new maplibregl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true }, trackUserLocation: true, showUserLocation: true, showAccuracyCircle: true
    }), "top-right");

    map.on("load", function () {
      // Preview layer: Zhezkazgan region geology polygons (from user-supplied KMZ, Orr and Associates 2006).
      map.addSource("zhez", { type: "geojson", data: "data/zhezkazgan_geology.geojson", attribution: "Zhezkazgan geology KMZ (Orr and Associates, 2006)" });
      map.addLayer({ id: "zhez-fill", type: "fill", source: "zhez",
        paint: { "fill-color": ["get", "color"], "fill-opacity": 0.7 } });
      map.addLayer({ id: "zhez-line", type: "line", source: "zhez",
        paint: { "line-color": "#57534e", "line-width": 0.3, "line-opacity": 0.7 } });
      map.on("click", "zhez-fill", function (e) {
        const p = (e.features[0] || {}).properties || {};
        const esc = (s) => String(s || "—").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
        new maplibregl.Popup({ maxWidth: "280px" }).setLngLat(e.lngLat)
          .setHTML(`<strong>${esc(p.map_code)}</strong><br><span class="mono">${esc([p.age_3, p.age_4, p.age_5].filter(Boolean).join(" · "))}</span><br>${esc(p.descriptio)}<br>${esc(p.rock_type)}`)
          .addTo(map);
      });
      map.on("mouseenter", "zhez-fill", () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", "zhez-fill", () => (map.getCanvas().style.cursor = ""));
      const tg = document.getElementById("zhez-toggle"), op = document.getElementById("zhez-opacity");
      if (tg) tg.addEventListener("change", () => ["zhez-fill", "zhez-line"].forEach((id) => map.setLayoutProperty(id, "visibility", tg.checked ? "visible" : "none")));
      // Satellite basemap (Esri World Imagery), hidden by default, beneath geology.
      map.addSource("sat", { type: "raster", tileSize: 256, maxzoom: 19,
        tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
        attribution: "Esri, Maxar, Earthstar Geographics" });
      map.addLayer({ id: "sat", type: "raster", source: "sat", layout: { visibility: "none" } }, "zhez-fill");
      const sat = document.getElementById("sat-toggle");
      if (sat) sat.addEventListener("change", () => map.setLayoutProperty("sat", "visibility", sat.checked ? "visible" : "none"));
      if (op) op.addEventListener("input", () => { map.setPaintProperty("zhez-fill", "fill-opacity", +op.value); map.setPaintProperty("zhez-line", "line-opacity", +op.value); });

      // Geology layer placeholder — uncomment when data/geology.pmtiles is published.
      /*
      map.addSource("geology", {
        type: "vector",
        url: "pmtiles://data/geology.pmtiles", // relative to site root
        attribution: "Геологическая карта Казахской ССР 1:500 000; scans: geokniga.org"
      });
      map.addLayer({
        id: "units-fill", type: "fill", source: "geology", "source-layer": "units",
        paint: { "fill-color": ["coalesce", ["get", "color"], "#cccccc"], "fill-opacity": 0.7 }
      });
      map.addLayer({
        id: "units-line", type: "line", source: "geology", "source-layer": "units",
        paint: { "line-color": "#57534e", "line-width": 0.3 }
      });
      map.addLayer({
        id: "faults", type: "line", source: "geology", "source-layer": "faults",
        paint: { "line-color": "#b91c1c", "line-width": 1.2 }
      });
      map.on("click", "units-fill", onUnitClick);
      map.on("mouseenter", "units-fill", () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", "units-fill", () => (map.getCanvas().style.cursor = ""));
      */
    });
  } catch (e) {
    console.warn("Map failed to load:", e);
  }

  // Stub: popup for a clicked geological unit (name, age, lithology).
  function onUnitClick(e) {
    const f = e.features && e.features[0];
    if (!f) return;
    const p = f.properties || {};
    const esc = (s) => String(s ?? "—").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    new maplibregl.Popup({ maxWidth: "280px" })
      .setLngLat(e.lngLat)
      .setHTML(`<strong>${esc(p.name)}</strong><br><span class="mono">Age: ${esc(p.age)}</span><br>${esc(p.lithology)}`)
      .addTo(map);
  }
  window.geologykzOnUnitClick = onUnitClick;

  // ---------- Progress ----------
  const LABEL = { not_started: "Not started", in_progress: "In progress", done: "Done" };
  fetch("sheets.json")
    .then((r) => r.json())
    .then(render)
    .catch((e) => {
      console.warn("sheets.json failed:", e);
      document.getElementById("series").textContent = "Could not load sheet list.";
    });

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function render(data) {
    const root = document.getElementById("series");
    let total = 0, done = 0;
    data.series.forEach((s) => {
      const box = el("div", "series");
      const h = el("h3", null, s.name);
      h.appendChild(el("span", "chip", s.sheets.length + " sheets"));
      box.appendChild(h);
      const grid = el("div", "sheets");
      s.sheets.forEach((sh) => {
        total++;
        if (sh.status === "done") done++;
        const a = el("a", "card sheet");
        a.href = "https://www.geokniga.org/maps/" + sh.geokniga;
        a.target = "_blank"; a.rel = "noopener";
        a.appendChild(el("div", "code", sh.id));
        a.appendChild(el("div", "place", sh.place));
        const b = el("span", "badge s-" + sh.status + (sh.status === "in_progress" ? " shimmer" : ""), LABEL[sh.status] || sh.status);
        a.appendChild(b);
        grid.appendChild(a);
      });
      box.appendChild(grid);
      root.appendChild(box);
    });
    const pct = total ? Math.round((done / total) * 100) : 0;
    document.getElementById("pcount").textContent = done + " / " + total + " sheets done";
    document.getElementById("ppct").textContent = pct + "%";
    requestAnimationFrame(() => (document.getElementById("pfill").style.width = pct + "%"));
    if (data.note) document.getElementById("sheetnote").textContent = "Note: " + data.note + ".";
  }
})();
