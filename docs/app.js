// geologykz — interactive geological map showcase
(function () {
  const PASS_HASH =
    "17bc5504b14be3f22dda39f428b6b45869b9415cae36be41604ee80255cba304";
  const STORAGE_KEY = "geologykz_unlocked_v1";
  const KZ_BOUNDS = [
    [46.5, 40.6],
    [87.3, 55.45]
  ];

  function esc(s) {
    return String(s == null || s === "" ? "—" : s).replace(/[&<>"]/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])
    );
  }

  async function sha256Hex(text) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  function unlockUI() {
    document.body.classList.remove("locked");
    const lock = document.getElementById("lock");
    const site = document.getElementById("site");
    if (lock) lock.hidden = true;
    if (site) site.hidden = false;
  }

  function popupHtml(p, ageKeys) {
    const ages = ageKeys.map((k) => p[k]).filter(Boolean).join(" · ");
    return (
      `<strong>${esc(p.map_code)}</strong>` +
      `<br><span class="mono">${esc(ages)}</span>` +
      `<br>${esc(p.descriptio)}` +
      `<br>${esc(p.rock_type)}`
    );
  }

  function renderLegend(list, containerId, countId) {
    const root = document.getElementById(containerId);
    const count = document.getElementById(countId);
    if (!root) return;
    if (count) count.textContent = list.length + " units";
    root.innerHTML = "";
    const frag = document.createDocumentFragment();
    list.forEach((item) => {
      const row = document.createElement("div");
      row.className = "legend-item";
      row.innerHTML =
        `<span class="swatch" style="background:${esc(item.color)}"></span>` +
        `<span class="code">${esc(item.code)}</span>` +
        `<span class="meta"><strong>${esc(item.desc)}</strong>${esc(item.age)}${
          item.rock ? " · " + esc(item.rock) : ""
        }</span>`;
      frag.appendChild(row);
    });
    root.appendChild(frag);
  }

  function loadLegends() {
    fetch("data/legends.json")
      .then((r) => r.json())
      .then((data) => {
        renderLegend(data.zhezkazgan || [], "zhez-legend", "zhez-count");
        renderLegend(data.mangistau || [], "mang-legend", "mang-count");
      })
      .catch((e) => console.warn("legends.json failed:", e));
  }

  function initMap() {
    let map;
    try {
      const mapRoot = document.getElementById("map");
      map = new maplibregl.Map({
        container: "mapview",
        style: "https://tiles.openfreemap.org/styles/positron",
        center: [66.9, 48.2],
        zoom: 4.2,
        attributionControl: { compact: true },
        cooperativeGestures: true
      });
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
      map.addControl(
        new maplibregl.FullscreenControl({ container: mapRoot }),
        "top-right"
      );
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
        // GeoJSON sources load only after unlock (this function runs post-unlock).
        map.addSource("zhez", {
          type: "geojson",
          data: "data/zhezkazgan_geology.geojson",
          attribution: "Zhezkazgan geology (Orr and Associates, 2006)"
        });
        map.addLayer({
          id: "zhez-fill",
          type: "fill",
          source: "zhez",
          paint: { "fill-color": ["get", "color"], "fill-opacity": 0.7 }
        });
        map.addLayer({
          id: "zhez-line",
          type: "line",
          source: "zhez",
          paint: { "line-color": "#57534e", "line-width": 0.25, "line-opacity": 0.55 }
        });
        map.on("click", "zhez-fill", function (e) {
          const p = (e.features[0] || {}).properties || {};
          new maplibregl.Popup({ maxWidth: "280px" })
            .setLngLat(e.lngLat)
            .setHTML(popupHtml(p, ["age_3", "age_4", "age_5"]))
            .addTo(map);
        });
        map.on("mouseenter", "zhez-fill", () => (map.getCanvas().style.cursor = "pointer"));
        map.on("mouseleave", "zhez-fill", () => (map.getCanvas().style.cursor = ""));

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
            "zhez-fill"
          );
        });

        // Reference overlays — added after geology so names/roads stay readable.
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

        map.addSource("mang", {
          type: "geojson",
          data: "data/mangistau_lithology.geojson",
          attribution: "Mangistau lithology (Orr and Associates, 2006)"
        });
        map.addLayer({
          id: "mang-fill",
          type: "fill",
          source: "mang",
          paint: { "fill-color": ["get", "color"], "fill-opacity": 0.7 }
        });
        map.addLayer({
          id: "mang-line",
          type: "line",
          source: "mang",
          paint: { "line-color": "#57534e", "line-width": 0.25, "line-opacity": 0.55 }
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

        map.on("click", "mang-fill", function (e) {
          const p = (e.features[0] || {}).properties || {};
          new maplibregl.Popup({ maxWidth: "280px" })
            .setLngLat(e.lngLat)
            .setHTML(popupHtml(p, ["age_2", "age_3", "age_4", "age_5"]))
            .addTo(map);
        });
        map.on("mouseenter", "mang-fill", () => (map.getCanvas().style.cursor = "pointer"));
        map.on("mouseleave", "mang-fill", () => (map.getCanvas().style.cursor = ""));

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

        const zhezTg = document.getElementById("zhez-toggle");
        const zhezOp = document.getElementById("zhez-opacity");
        const mangTg = document.getElementById("mang-toggle");
        const mangOp = document.getElementById("mang-opacity");
        const baseSwitch = document.getElementById("basemap-switch");

        if (zhezTg)
          zhezTg.addEventListener("change", () =>
            ["zhez-fill", "zhez-line"].forEach((id) =>
              map.setLayoutProperty(id, "visibility", zhezTg.checked ? "visible" : "none")
            )
          );
        if (mangTg)
          mangTg.addEventListener("change", () =>
            ["mang-fill", "mang-line"].forEach((id) =>
              map.setLayoutProperty(id, "visibility", mangTg.checked ? "visible" : "none")
            )
          );
        if (baseSwitch)
          baseSwitch.addEventListener("click", (e) => {
            const btn = e.target.closest("button[data-base]");
            if (!btn) return;
            setBasemap(btn.getAttribute("data-base"));
          });
        if (zhezOp)
          zhezOp.addEventListener("input", () => {
            map.setPaintProperty("zhez-fill", "fill-opacity", +zhezOp.value);
            map.setPaintProperty("zhez-line", "line-opacity", +zhezOp.value);
          });
        if (mangOp)
          mangOp.addEventListener("input", () => {
            map.setPaintProperty("mang-fill", "fill-opacity", +mangOp.value);
            map.setPaintProperty("mang-line", "line-opacity", +mangOp.value);
          });

        setBasemap("light");
        // expose for screenshots / debugging
        window.geologykzSetBasemap = setBasemap;
        window.geologykzMap = map;

        // Resize after enter/exit fullscreen so the canvas fills the screen.
        const resize = () => map.resize();
        document.addEventListener("fullscreenchange", resize);
        document.addEventListener("webkitfullscreenchange", resize);
      });
    } catch (e) {
      console.warn("Map failed to load:", e);
    }
  }

  function startApp() {
    unlockUI();
    initMap();
    loadLegends();
  }

  // ---- Passcode gate (client-side only; not real security) ----
  const already = (() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === PASS_HASH;
    } catch (_) {
      return false;
    }
  })();

  if (already) {
    startApp();
    return;
  }

  const form = document.getElementById("lock-form");
  const input = document.getElementById("lock-input");
  const err = document.getElementById("lock-error");
  const card = document.getElementById("lock-card");
  if (input) setTimeout(() => input.focus(), 50);

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const value = (input && input.value) || "";
      const hash = await sha256Hex(value);
      if (hash === PASS_HASH) {
        try {
          localStorage.setItem(STORAGE_KEY, PASS_HASH);
        } catch (_) {}
        startApp();
        return;
      }
      if (err) err.hidden = false;
      if (card) {
        card.classList.remove("shake");
        void card.offsetWidth;
        card.classList.add("shake");
      }
      if (input) {
        input.select();
        input.focus();
      }
    });
  }
})();
