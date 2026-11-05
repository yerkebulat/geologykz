// geologykz: interactive geological map of Kazakhstan (Macrostrat data, CC-BY 4.0)
(function () {
  const KZ_BOUNDS = [
    [46.5, 40.6],
    [87.3, 55.45]
  ];
  const ATTR = 'Geologic map data &copy; <a href="https://macrostrat.org" target="_blank" rel="noopener">Macrostrat</a>, CC-BY 4.0. Sources: Chorlton, L.B. 2007, Generalized Geology of the World, GSC Open File 5529, doi:10.4095/223767; Asch, K. 2003, IGME 5000 International Geological Map of Europe 1:5M, BGR. Clipped to Kazakhstan and simplified.';
  const SRC = { 147: "IGME 5000 (Asch 2003, BGR)", 154: "Generalized Geology of the World (Chorlton 2007, GSC)" };

  function esc(s) {
    return String(s == null || s === "" ? "-" : s).replace(/[&<>"]/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])
    );
  }
  function ageText(p) {
    let t = p.b_int_name && p.t_int_name && p.b_int_name !== p.t_int_name
      ? p.b_int_name + " to " + p.t_int_name
      : p.best_int_name || p.b_int_name || p.t_int_name || "";
    if (p.b_age != null && p.t_age != null) t += " (" + (+p.b_age).toFixed(0) + " to " + (+p.t_age).toFixed(0) + " Ma)";
    return t;
  }
  function popupHtml(p) {
    return (
      `<strong>${esc(p.name)}</strong>` +
      `<br><span class="mono">${esc(ageText(p))}</span>` +
      `<br>Lithology: ${esc(p.lith)}` +
      (p.descrip ? `<br>${esc(p.descrip)}` : "") +
      `<br><small>Source: ${esc(SRC[p.source_id] || p.source_id)}, via Macrostrat</small>`
    );
  }

  function renderLegend(fc) {
    const root = document.getElementById("geo-legend");
    const count = document.getElementById("geo-count");
    const units = {};
    fc.features.forEach((f) => {
      const p = f.properties;
      const key = (p.name || "") + "|" + (p.color || "");
      if (!units[key]) units[key] = { p: p, n: 0, src: new Set() };
      units[key].n++;
      units[key].src.add(p.source_id);
    });
    const list = Object.values(units).sort(
      (a, b) => (a.p.t_age || 0) - (b.p.t_age || 0) || (a.p.b_age || 0) - (b.p.b_age || 0)
    );
    if (count) count.textContent = list.length + " units, " + fc.features.length + " polygons";
    root.innerHTML = "";
    list.forEach((u) => {
      const row = document.createElement("div");
      row.className = "legend-item";
      row.innerHTML =
        `<span class="swatch" style="background:${esc(u.p.color || "#ccc")}"></span>` +
        `<span class="code">${u.n}</span>` +
        `<span class="meta"><strong>${esc(u.p.name)}</strong>${esc(ageText(u.p))}${
          u.p.lith ? " · " + esc(u.p.lith) : ""
        } · ${Array.from(u.src).map((s) => s === 147 ? "IGME 5000" : "GGW").join(", ")}</span>`;
      root.appendChild(row);
    });
  }

  const COLOR_BY_AGE = [
    "step", ["coalesce", ["get", "t_age"], 0],
    "#F9F97F", 2.58, "#FFE619", 23.03, "#FD9A52", 66, "#7FC64E", 145, "#34B2C9",
    201.3, "#812B92", 251.9, "#F04028", 298.9, "#67A599", 358.9, "#CB8C37",
    419.2, "#B3E1B6", 443.8, "#009270", 485.4, "#7FA056", 541, "#F73563"
  ];

  function initMap() {
    const mapRoot = document.getElementById("map");
    const map = new maplibregl.Map({
      container: "mapview",
      style: "https://tiles.openfreemap.org/styles/positron",
      center: [66.9, 48.2],
      zoom: 4.2,
      attributionControl: { compact: true, customAttribution: ATTR },
      cooperativeGestures: true
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new maplibregl.FullscreenControl({ container: mapRoot }), "top-right");
    map.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
        showUserLocation: true,
        showAccuracyCircle: true
      }),
      "top-right"
    );
    const pad =
      window.innerWidth < 600
        ? { top: 120, bottom: 200, left: 16, right: 16 }
        : { top: 100, bottom: 40, left: 48, right: 48 };
    map.fitBounds(KZ_BOUNDS, { padding: pad, duration: 0, maxZoom: 5.4 });

    map.on("load", function () {
      map.addSource("geo", { type: "geojson", data: "data/kazakhstan_macrostrat.geojson" });
      map.addSource("kz", { type: "geojson", data: "data/kazakhstan_border.geojson" });
      map.addLayer({
        id: "geo-fill",
        type: "fill",
        source: "geo",
        paint: {
          "fill-color": ["case", ["has", "color"], ["get", "color"], COLOR_BY_AGE],
          "fill-opacity": 0.7
        }
      });
      map.addLayer({
        id: "geo-line",
        type: "line",
        source: "geo",
        paint: { "line-color": "#57534e", "line-width": 0.25, "line-opacity": 0.55 }
      });
      map.addLayer({
        id: "kz-line",
        type: "line",
        source: "kz",
        paint: { "line-color": "#1c1917", "line-width": 1.6, "line-opacity": 0.9 }
      });

        // Raster underlays (below geology) + reference overlays (above geology).
      // Light = OpenFreeMap positron style only. Hybrid ≈ Google Satellite Hybrid look via Esri (no Google tiles).
      const UNDERLAYS = {
        satellite: {
          tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
          attribution: "Esri, Maxar, Earthstar Geographics",
          maxzoom: 19
        },
        terrain: {
          tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}"],
          attribution: "Esri, USGS",
          maxzoom: 13
        },
        topo: {
          tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}"],
          attribution: "Esri, USGS, NOAA, TomTom",
          maxzoom: 19
        },
        otm: {
          tiles: ["https://tile.opentopomap.org/{z}/{x}/{y}.png"],
          attribution: "OpenTopoMap (CC-BY-SA), OpenStreetMap contributors",
          maxzoom: 17
        },
        dark: {
          tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"],
          attribution: "Esri, HERE, Garmin",
          maxzoom: 16
        }
      };
      const BASEMAPS = {
        light: { under: null, overlays: [] },
        satellite: { under: "satellite", overlays: ["labels"] },
        hybrid: { under: "satellite", overlays: ["labels", "transport"] },
        terrain: { under: "terrain", overlays: ["labels"] },
        topo: { under: "topo", overlays: [] },
        otm: { under: "otm", overlays: ["labels"] },
        dark: { under: "dark", overlays: ["labels"] }
      };
      Object.keys(UNDERLAYS).forEach((id) => {
        const cfg = UNDERLAYS[id];
        map.addSource("base-" + id, {
          type: "raster",
          tileSize: 256,
          maxzoom: cfg.maxzoom,
          tiles: cfg.tiles,
          attribution: cfg.attribution
        });
        map.addLayer(
          {
            id: "base-" + id,
            type: "raster",
            source: "base-" + id,
            layout: { visibility: "none" },
            paint: { "raster-opacity": 1 }
          },
          "geo-fill"
        );
      });
        map.addSource("base-labels", {
        type: "raster",
        tileSize: 256,
        maxzoom: 16,
        tiles: [
          "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
        ],
        attribution: "Esri"
      });
      map.addSource("base-transport", {
        type: "raster",
        tileSize: 256,
        maxzoom: 19,
        tiles: [
          "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}"
        ],
        attribution: "Esri"
      });


        map.addLayer({
        id: "base-labels",
        type: "raster",
        source: "base-labels",
        layout: { visibility: "none" },
        paint: { "raster-opacity": 0.95 }
      });
      map.addLayer({
        id: "base-transport",
        type: "raster",
        source: "base-transport",
        layout: { visibility: "none" },
        paint: { "raster-opacity": 0.9 }
      });


      map.on("click", "geo-fill", function (e) {
        if (map.getLayer("kz15m-fill") && map.getLayoutProperty("kz15m-fill", "visibility") === "visible" &&
            map.queryRenderedFeatures(e.point, { layers: ["kz15m-fill"] }).length) return;
        const p = (e.features[0] || {}).properties || {};
        new maplibregl.Popup({ maxWidth: "300px" }).setLngLat(e.lngLat).setHTML(popupHtml(p)).addTo(map);
      });
      map.on("mouseenter", "geo-fill", () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", "geo-fill", () => (map.getCanvas().style.cursor = ""));

        function setBasemap(name) {
        const cfg = BASEMAPS[name] || BASEMAPS.light;
        const key = BASEMAPS[name] ? name : "light";
        Object.keys(UNDERLAYS).forEach((id) => {
          map.setLayoutProperty(
            "base-" + id,
            "visibility",
            cfg.under === id ? "visible" : "none"
          );
        });
        ["labels", "transport"].forEach((ov) => {
          map.setLayoutProperty(
            "base-" + ov,
            "visibility",
            cfg.overlays.indexOf(ov) >= 0 ? "visible" : "none"
          );
        });
        const sw = document.getElementById("basemap-switch");
        if (sw) {
          sw.querySelectorAll("button").forEach((btn) => {
            const on = btn.getAttribute("data-base") === key;
            btn.classList.toggle("active", on);
            btn.setAttribute("aria-checked", on ? "true" : "false");
          });
        }
      }


      const tg = document.getElementById("geo-toggle");
      const op = document.getElementById("geo-opacity");
      const btg = document.getElementById("kz-toggle");
      const baseSwitch = document.getElementById("basemap-switch");
      if (tg)
        tg.addEventListener("change", () =>
          ["geo-fill", "geo-line"].forEach((id) =>
            map.setLayoutProperty(id, "visibility", tg.checked ? "visible" : "none")
          )
        );
      if (btg)
        btg.addEventListener("change", () =>
          map.setLayoutProperty("kz-line", "visibility", btg.checked ? "visible" : "none")
        );
      if (op)
        op.addEventListener("input", () => {
          map.setPaintProperty("geo-fill", "fill-opacity", +op.value);
          map.setPaintProperty("geo-line", "line-opacity", +op.value);
        });
      if (baseSwitch)
        baseSwitch.addEventListener("click", (e) => {
          const btn = e.target.closest("button[data-base]");
          if (btn) setBasemap(btn.getAttribute("data-base"));
        });

      setBasemap("light");
      window.geologykzSetBasemap = setBasemap;
      window.geologykzMap = map;
      window.dispatchEvent(new CustomEvent("geologykz:load", { detail: map }));
      const resize = () => map.resize();
      document.addEventListener("fullscreenchange", resize);
      document.addEventListener("webkitfullscreenchange", resize);
    });
  }

  initMap();
  fetch("data/kazakhstan_macrostrat.geojson")
    .then((r) => r.json())
    .then(renderLegend)
    .catch((e) => console.warn("legend failed:", e));
})();
