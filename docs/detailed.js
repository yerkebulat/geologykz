/* Detailed sheet scans. One toggle, scans only, load sheets in the current view. */
(function () {
  const MIN_ZOOM = 6.5;
  const MAX_ACTIVE = 12;
  const CONCURRENCY = 2;
  const SCALE_RANK = { "1:1,000,000": 0, "1:500,000": 1, "1:200,000": 2 };
  const esc = (s) => String(s == null || s === "" ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  window.addEventListener("geologykz:load", function (ev) {
    const map = ev.detail;
    const tg = document.getElementById("detail-toggle");
    const opacity = document.getElementById("detail-opacity");
    const status = document.getElementById("detail-status");
    if (!tg || !map) return;

    const records = new Map();
    let index = null, active = 0, waiters = [], popup = null, moving = false;

    const assetURL = (p) => new URL(p, document.baseURI).href.replace(/%7B/gi, "{").replace(/%7D/gi, "}");
    const srcId = (id) => "detail-" + id + "-raster";
    const area = (s) => {
      const [[x, y], [X, Y]] = s.bounds;
      return Math.max(0, X - x) * Math.max(0, Y - y);
    };
    function closePopup() {
      if (popup) popup.remove();
      popup = null;
    }
    function drop(id) {
      const r = records.get(id);
      if (!r) return;
      r.version++;
      if (r.controller) r.controller.abort();
      const n = srcId(id);
      if (map.getLayer(n)) map.removeLayer(n);
      if (map.getSource(n)) map.removeSource(n);
      records.delete(id);
    }
    function paint(id) {
      const n = srcId(id);
      if (map.getLayer(n)) map.setPaintProperty(n, "raster-opacity", +opacity.value);
    }
    function viewBox() {
      const b = map.getBounds();
      return [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()];
    }
    function intersects(s, box) {
      const [[x, y], [X, Y]] = s.bounds;
      return x <= box[2] && X >= box[0] && y <= box[3] && Y >= box[1];
    }
    function countLine() {
      if (!index) return "";
      const counts = {};
      index.sheets.forEach((s) => { counts[s.scale] = (counts[s.scale] || 0) + 1; });
      const order = ["1:200,000", "1:500,000", "1:1,000,000"];
      const parts = order.filter((k) => counts[k]).map((k) => counts[k] + " at " + k);
      Object.keys(counts).filter((k) => !order.includes(k)).forEach((k) => parts.push(counts[k] + " at " + k));
      return index.sheets.length + " scans: " + parts.join(" · ");
    }
    function report() {
      if (!status) return;
      const n = index ? index.sheets.length : 0;
      const counts = countLine();
      if (!tg.checked) {
        status.textContent = counts;
        recount();
        return;
      }
      const z = map.getZoom ? map.getZoom() : 0;
      if (z < MIN_ZOOM) {
        status.textContent = counts + ". Zoom in to load sheets.";
        recount();
        return;
      }
      const wanted = wantedIds();
      const ready = wanted.filter((id) => records.get(id) && records.get(id).loaded).length;
      const failed = wanted.filter((id) => records.get(id) && records.get(id).failed).length;
      let text = counts + ". " + ready + "/" + wanted.length + " in view";
      if (active) text += " · loading…";
      if (failed) text += " · " + failed + " failed";
      status.textContent = text;
      recount();
    }
    function recount() {
      const el = document.getElementById("enabled-count");
      if (!el) return;
      const n =
        Number(tg.checked) +
        Number(document.getElementById("geo-toggle").checked) +
        Number(document.getElementById("kz15m-toggle").checked) +
        Number(document.getElementById("eqazyna-toggle").checked);
      el.textContent = n + " maps enabled";
    }
    function wantedIds() {
      if (!tg.checked || !index) return [];
      const z = map.getZoom ? map.getZoom() : 0;
      if (z < MIN_ZOOM) return [];
      const box = viewBox();
      const inView = index.sheets.filter((s) => {
        const minz = (s.rasterTiles && s.rasterTiles.minzoom) || 7;
        return z + 0.25 >= minz && intersects(s, box);
      });
      inView.sort((a, b) => {
        const ra = SCALE_RANK[a.scale] ?? 1, rb = SCALE_RANK[b.scale] ?? 1;
        if (z >= 9 && ra !== rb) return rb - ra;
        return area(a) - area(b);
      });
      return inView.slice(0, MAX_ACTIVE).map((s) => s.id);
    }
    function beforeId(scale) {
      const rank = SCALE_RANK[scale] ?? 1;
      const style = map.getStyle && map.getStyle();
      const layers = (style && style.layers) || [];
      for (const layer of layers) {
        if (!layer.id.startsWith("detail-") || !layer.id.endsWith("-raster")) continue;
        const id = layer.id.slice("detail-".length, -"-raster".length);
        const s = index.byId.get(id);
        if (s && (SCALE_RANK[s.scale] ?? 1) > rank) return layer.id;
      }
      return "kz-line";
    }
    function pump() {
      const wanted = new Set(wantedIds());
      for (const id of [...records.keys()]) if (!wanted.has(id) && !records.get(id).pending) drop(id);
      for (const id of wanted) {
        if (active >= CONCURRENCY) break;
        let r = records.get(id);
        if (r && (r.pending || r.loaded || r.failed)) continue;
        const sheet = index.byId.get(id);
        if (!sheet) continue;
        if (!r) { r = { id, version: 0 }; records.set(id, r); }
        const version = r.version;
        r.controller = new AbortController();
        const signal = r.controller.signal;
        const valid = () => tg.checked && records.get(id) === r && r.version === version && !signal.aborted;
        active++;
        r.pending = true;
        const n = srcId(id);
        Promise.resolve()
          .then(() => {
            if (!valid()) return;
            const raster = sheet.rasterTiles;
            map.addSource(n, {
              type: "raster",
              ...raster,
              tiles: raster.tiles.map(assetURL),
              attribution: sheet.credit
            });
            map.addLayer(
              {
                id: n,
                type: "raster",
                source: n,
                paint: { "raster-opacity": +opacity.value, "raster-fade-duration": 0 }
              },
              beforeId(sheet.scale)
            );
            r.loaded = true;
          })
          .catch((err) => {
            if (valid()) {
              drop(id);
              records.set(id, { id, version: 0, failed: true });
              console.error("Detailed sheet " + id, err);
            }
          })
          .finally(() => {
            if (records.get(id) === r) r.pending = false;
            active--;
            report();
            pump();
            if (active === 0) {
              const w = waiters;
              waiters = [];
              w.forEach((fn) => fn());
            }
          });
      }
      if (active === 0 && !wanted.size) {
        const w = waiters;
        waiters = [];
        w.forEach((fn) => fn());
      }
    }
    function sync() {
      if (!tg.checked) {
        closePopup();
        for (const id of [...records.keys()]) drop(id);
      }
      report();
      pump();
    }
    function load() {
      sync();
      return active ? new Promise((resolve) => waiters.push(resolve)) : Promise.resolve();
    }
    function changed() {
      for (const r of records.values()) r.failed = false;
      sync();
      window.geologykzPreferences?.save();
    }

    tg.addEventListener("change", changed);
    opacity.addEventListener("input", () => {
      for (const id of records.keys()) paint(id);
      window.geologykzPreferences?.save();
    });
    map.on("move", () => { moving = true; });
    map.on("moveend", () => { moving = false; if (tg.checked) sync(); });
    map.on("zoomend", () => { if (tg.checked) sync(); });
    map.on("error", (ev) => {
      if (ev.sourceId && ev.sourceId.startsWith("detail-") && ev.sourceId.endsWith("-raster") && status) {
        status.textContent = "Scan tile error: " + ((ev.error && ev.error.message) || "unknown");
      }
    });

    const inside = (pt, ring) => {
      let c = false;
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi, yi] = ring[i], [xj, yj] = ring[j];
        if (yi > pt[1] !== yj > pt[1] && pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi) c = !c;
      }
      return c;
    };
    function hitsAt(lngLat) {
      if (!tg.checked || !index) return [];
      const p = [lngLat.lng ?? lngLat[0], lngLat.lat ?? lngLat[1]];
      return index.sheets.filter((s) => records.get(s.id)?.loaded && inside(p, s.coordinates));
    }
    function showPopup(lngLat, sheets) {
      if (!sheets.length) return false;
      closePopup();
      const items = sheets
        .map((s) => {
          const extra = [s.mapType, s.scale, s.year].filter(Boolean).join(", ");
          return "<li><strong>" + esc(s.label) + "</strong>" + (extra ? " · " + esc(extra) : "") + "</li>";
        })
        .join("");
      const det = sheets
        .map((s) => {
          const src = s.sourcePage
            ? '<p><a href="' + esc(s.sourcePage) + '" target="_blank" rel="noopener">Original source</a></p>'
            : "";
          return "<p>" + esc(s.label) + "</p><p>" + esc(s.credit) + "</p>" + src;
        })
        .join("");
      popup = new maplibregl.Popup({ maxWidth: "320px" })
        .setLngLat(lngLat)
        .setHTML('<div style="max-height:45vh;overflow:auto"><p>Sheet scan</p><ul class="candidate-list">' + items + '</ul><details><summary>Details</summary>' + det + "</details></div>")
        .addTo(map);
      if (window.geologykzSelect && sheets[0] && sheets[0].coordinates) {
        const ring = sheets[0].coordinates.map((pt) => [pt[0], pt[1]]);
        if (ring.length && (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1])) ring.push(ring[0]);
        window.geologykzSelect.set({ type: "Feature", geometry: { type: "Polygon", coordinates: [ring] }, properties: { label: sheets[0].label } });
      }
      return true;
    }

    window.geologykzDetailed = {
      load,
      show: () => {
        tg.checked = true;
        window.geologykzPreferences?.save();
        return load();
      },
      hitUnits: () => false,
      profPopup: (lngLat) => showPopup(lngLat, hitsAt(lngLat))
    };

    map.on("click", (e) => {
      if (window.geologykzEqazyna?.hit(e.point)) return;
      if (map.getLayer("kz15m-fill") && map.getLayoutProperty("kz15m-fill", "visibility") === "visible" &&
          map.queryRenderedFeatures(e.point, { layers: ["kz15m-fill"] }).length) return;
      if (map.getLayer("geo-fill") && map.getLayoutProperty("geo-fill", "visibility") === "visible" &&
          map.queryRenderedFeatures(e.point, { layers: ["geo-fill"] }).length) return;
      showPopup(e.lngLat, hitsAt(e.lngLat));
    });

    document.getElementById("maps-hide-all").addEventListener("click", () => {
      tg.checked = false;
      for (const id of ["geo-toggle", "kz15m-toggle", "eqazyna-toggle"]) {
        const b = document.getElementById(id);
        if (b && b.checked) {
          b.checked = false;
          b.dispatchEvent(new Event("change"));
        }
      }
      closePopup();
      changed();
    });
    ["geo-toggle", "kz15m-toggle", "eqazyna-toggle"].forEach((id) =>
      document.getElementById(id).addEventListener("change", report)
    );
    document.getElementById("maps-fit-all").addEventListener("click", () => {
      if (!index) return;
      const bounds = [];
      if (tg.checked) index.sheets.forEach((s) => bounds.push(s.bounds));
      if (document.getElementById("geo-toggle").checked) bounds.push(index.globalBounds);
      if (document.getElementById("kz15m-toggle").checked) bounds.push(index.national);
      if (document.getElementById("eqazyna-toggle").checked) bounds.push(index.globalBounds || index.national);
      if (!bounds.length) {
        status.textContent = "No maps enabled.";
        return;
      }
      const b = [
        [Math.min(...bounds.map((x) => x[0][0])), Math.min(...bounds.map((x) => x[0][1]))],
        [Math.max(...bounds.map((x) => x[1][0])), Math.max(...bounds.map((x) => x[1][1]))]
      ];
      map.fitBounds(b, { padding: window.innerWidth < 600 ? 40 : 120, duration: 0 });
      window.geologykzSetLayersOpen(false);
    });

    fetch(assetURL("detailed-sheets.json"))
      .then((r) => {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then((v) => {
        index = v;
        index.byId = new Map(v.sheets.map((s) => [s.id, s]));
        sync();
      })
      .catch((err) => {
        console.error("detailed-sheets.json", err);
        if (status) status.textContent = "Detailed map list unavailable.";
      });
  });
})();
