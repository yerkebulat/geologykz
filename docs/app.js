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

    map.on("load", function () {
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
