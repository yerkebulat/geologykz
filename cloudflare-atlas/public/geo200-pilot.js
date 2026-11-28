/* Off-by-default 1:200k geological scans. Licenses stay on top. Click model unchanged.
   Scan sources are added only for sheets intersecting the viewport at zoom >= 5. */
(function () {
  function t(key, vars) { return (window.atlasI18n && window.atlasI18n.t) ? window.atlasI18n.t(key, vars) : key; }
  const STORE = "atlas-geo200-pilot-v1";
  const DATA = "data/geo200-pilot/sheets.json?v=gk6";
  const CREDIT = "Gosgeolkarta 1:200,000 geological sheets. Scans from Mail.ru and geokniga.org.";
  const SCAN_MIN_ZOOM = 5;
  const PAD_DEG = 0.6;

  function firstOverlayId(map) {
    const layers = (map.getStyle() && map.getStyle().layers) || [];
    const hit = layers.find((l) => {
      const id = l.id || "";
      return id.startsWith("eqazyna-") || id.startsWith("process-") || id.startsWith("atlas-");
    });
    return hit ? hit.id : undefined;
  }

  function currentOpacity() {
    const v = window.atlasLayerOpacity ? Number(window.atlasLayerOpacity("geo200")) : 0.85;
    return isFinite(v) ? v : 0.85;
  }

  function intersectsPadded(bounds, pad) {
    const w = bounds.getWest() - pad;
    const s = bounds.getSouth() - pad;
    const e = bounds.getEast() + pad;
    const n = bounds.getNorth() + pad;
    return function (sheet) {
      const b = sheet.bounds || [];
      if (b.length < 4) return false;
      return !(b[2] < w || b[0] > e || b[3] < s || b[1] > n);
    };
  }

  window.initAtlasGeo200 = function (map, hooks) {
    const hooksSafe = hooks || {};
    let on = false;
    let startWanted = false;
    try { startWanted = localStorage.getItem(STORE) === "1"; } catch (e) {}
    let meta = null;
    const loaded = new Set();
    const protocolReady = (function () {
      try {
        if (!window.pmtiles || !maplibregl.addProtocol) return false;
        const proto = new pmtiles.Protocol();
        maplibregl.addProtocol("pmtiles", proto.tile.bind(proto));
        return true;
      } catch (e) {
        return false;
      }
    })();

    const btn = document.getElementById("geo200-toggle");

    function setBtn(v) {
      if (!btn) return;
      btn.classList.toggle("on", v);
      btn.setAttribute("aria-pressed", v ? "true" : "false");
    }

    function visOutlines(v) {
      const value = v ? "visible" : "none";
      ["geo200-outline", "geo200-fill", "geo200-label", "geo200-label-hi"].forEach((id) => {
        if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", value);
      });
    }

    function addOutlineLayers() {
      if (!meta || !meta.sheets) return;
      const before = firstOverlayId(map);
      if (!map.getSource("geo200-outlines")) {
        map.addSource("geo200-outlines", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: meta.sheets.map((s) => ({
              type: "Feature",
              properties: { id: s.id, edition: s.edition },
              geometry: s.geometry
            }))
          }
        });
      }
      if (!map.getLayer("geo200-fill")) {
        map.addLayer({
          id: "geo200-fill",
          type: "fill",
          source: "geo200-outlines",
          maxzoom: 5,
          layout: { visibility: "none" },
          paint: { "fill-color": "#1e3a5f", "fill-opacity": 0.18 }
        }, before);
      }
      if (!map.getLayer("geo200-outline")) {
        map.addLayer({
          id: "geo200-outline",
          type: "line",
          source: "geo200-outlines",
          maxzoom: 5.2,
          layout: { visibility: "none" },
          paint: { "line-color": "#1e3a5f", "line-width": 1.6, "line-opacity": 1 }
        }, before);
      }
      if (!map.getLayer("geo200-label")) {
        map.addLayer({
          id: "geo200-label",
          type: "symbol",
          source: "geo200-outlines",
          maxzoom: 5.2,
          layout: {
            visibility: "none",
            "text-field": ["get", "id"],
            "text-size": ["interpolate", ["linear"], ["zoom"], 4, 10, 7, 12],
            "text-font": ["Noto Sans Bold"],
            "text-allow-overlap": false,
            "text-padding": 2
          },
          paint: {
            "text-color": "#0f172a",
            "text-halo-color": "#ffffff",
            "text-halo-width": 1.4
          }
        }, before);
      }
      // Scan zooms: one small nomenclature label per sheet (no frame), above the scans, below licenses.
      if (!map.getLayer("geo200-label-hi")) {
        map.addLayer({
          id: "geo200-label-hi",
          type: "symbol",
          source: "geo200-outlines",
          minzoom: 5.2,
          layout: {
            visibility: on ? "visible" : "none",
            "text-field": ["get", "id"],
            "text-size": 11,
            "text-font": ["Noto Sans Bold"],
            "text-allow-overlap": false,
            "text-padding": 4
          },
          paint: {
            "text-color": "#0f172a",
            "text-halo-color": "#ffffff",
            "text-halo-width": 1.5,
            "text-opacity": 0.9
          }
        }, before);
      }
      raiseHi();
    }

    function raiseHi() {
      if (window.atlasOrderLayers) { window.atlasOrderLayers(); return; }
      const before = firstOverlayId(map);
      ["geo200-label-hi"].forEach((id) => {
        if (map.getLayer(id)) { try { map.moveLayer(id, before); } catch (e) {} }
      });
    }

    function addScan(sheet) {
      if (!protocolReady || !sheet) return;
      const sid = "geo200-scan-" + sheet.id;
      const before = firstOverlayId(map);
      const origin = window.location.origin;
      if (!map.getSource(sid)) {
        map.addSource(sid, {
          type: "raster",
          url: "pmtiles://" + origin + sheet.url,
          tileSize: 256,
          minzoom: sheet.minzoom || SCAN_MIN_ZOOM,
          maxzoom: sheet.maxzoom || 13,
          bounds: sheet.bounds,
          attribution: (meta && meta.attribution) || CREDIT
        });
      }
      if (!map.getLayer(sid)) {
        map.addLayer({
          id: sid,
          type: "raster",
          source: sid,
          minzoom: sheet.minzoom || SCAN_MIN_ZOOM,
          layout: { visibility: on ? "visible" : "none" },
          paint: { "raster-opacity": currentOpacity(), "raster-fade-duration": 0 }
        }, before);
      } else {
        map.setLayoutProperty(sid, "visibility", on ? "visible" : "none");
      }
      loaded.add(sheet.id);
    }

    function removeScan(id) {
      const sid = "geo200-scan-" + id;
      if (map.getLayer(sid)) map.removeLayer(sid);
      if (map.getSource(sid)) map.removeSource(sid);
      loaded.delete(id);
    }

    function syncScans() {
      if (!meta || !meta.sheets) return;
      if (!on || !protocolReady || map.getZoom() < SCAN_MIN_ZOOM) {
        Array.from(loaded).forEach(removeScan);
        return;
      }
      const hit = intersectsPadded(map.getBounds(), PAD_DEG);
      const wanted = new Set();
      meta.sheets.forEach((s) => {
        if (hit(s)) wanted.add(s.id);
      });
      Array.from(loaded).forEach((id) => {
        if (!wanted.has(id)) removeScan(id);
      });
      meta.sheets.forEach((s) => {
        if (wanted.has(s.id) && !loaded.has(s.id)) addScan(s);
      });
      raiseHi();
    }

    async function load() {
      const r = await fetch(DATA, { credentials: "same-origin" });
      if (!r.ok) throw new Error("sheets " + r.status);
      meta = await r.json();
      addOutlineLayers();
      syncScans();
    }

    function setOn(v) {
      on = !!v;
      setBtn(on);
      if (!on && window.atlasLegend200) window.atlasLegend200.close();
      visOutlines(on);
      syncScans();
      try { localStorage.setItem(STORE, on ? "1" : "0"); } catch (e) {}
      if (hooksSafe.onUpdate) hooksSafe.onUpdate();
    }

    if (btn) {
      btn.addEventListener("click", () => setOn(!on));
    }
    map.on("moveend", syncScans);
    map.on("zoomend", syncScans);

    window.atlasGeo200 = {
      isOn: () => on,
      isWanted: () => on || startWanted,
      setOn: (v) => setOn(v),
      refresh: () => { syncScans(); raiseHi(); },
      bbox: function () {
        if (!meta || !meta.sheets || !meta.sheets.length) return null;
        const b = [180, 90, -180, -90];
        meta.sheets.forEach((s) => { const x = s.bounds || []; if (x.length < 4) return; b[0] = Math.min(b[0], x[0]); b[1] = Math.min(b[1], x[1]); b[2] = Math.max(b[2], x[2]); b[3] = Math.max(b[3], x[3]); });
        return b[0] < b[2] ? b : null;
      },
      legendHtml: function () {
        if (!on) return "";
        const n = meta && meta.sheets ? meta.sheets.length : 0;
        return (
          '<div class="lg-map">' + t('layer.geo200') + '</div>' +
          '<div class="lg-row"><span class="sw" style="background:#1e3a5f"></span><span>' +
          t('geo200.sheets', { n: n }) + "</span></div>" +
          '<button type="button" class="lg-open200" data-legend200>' + t('legend200.open') + '</button>'
        );
      }
    };

    load().then(() => {
      let start = false;
      try { start = localStorage.getItem(STORE) === "1"; } catch (e) {}
      startWanted = false;
      if (start) setOn(true);
      else { setBtn(false); visOutlines(false); if (hooksSafe.onUpdate) hooksSafe.onUpdate(); }
    }).catch((e) => {
      startWanted = false;
      console.warn("geo200", e);
    });
  };
})();
