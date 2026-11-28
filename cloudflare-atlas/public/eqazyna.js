/* Solid-mineral licenses and contracts via the kzgeology-eqazyna relay. On by default. */
(function () {
  function creditHtml() {
    return t('kv.source') + ': <a href="https://minerals.e-qazyna.kz/ru/contracts-map" target="_blank" rel="noopener">Unified Subsoil Use Platform, minerals.e-qazyna.kz</a>';
  }
  function t(key, vars) { return (window.atlasI18n && window.atlasI18n.t) ? window.atlasI18n.t(key, vars) : key; }
  const esc = (s) => String(s == null || s === "" ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const cfg = () => window.EQAZYNA_CONFIG || {};
  const worker = () => String(cfg().workerUrl || "").replace(/\/+$/, "");

  const SHORT_KEY = {
    "Exploration license": "lic.exploration",
    "Extraction license": "lic.extraction",
    "Exploration and extraction license": "lic.explExtract",
    "Exploration contract": "lic.explContract",
    "Extraction contract": "lic.extContract",
    "Exploration and extraction contract": "lic.bothContract",
    "Revoked exploration license": "lic.revoked"
  };
  function shortLabel(label) {
    return SHORT_KEY[label] ? t(SHORT_KEY[label]) : (label || "");
  }
  function licenseNext(it) {
    if (it.group === "revoked") return t("lic.revokedNote");
    return t("lic.notOpen");
  }
  function popupHtml(items, loading, err) {
    const rows = (items || []).map((it) => {
      const links = [];
      if (it.locUrl) links.push('<a href="' + esc(it.locUrl) + '" target="_blank" rel="noopener">' + t('lic.official') + '</a>');
      if (it.applicantUrl) links.push('<a href="' + esc(it.applicantUrl) + '" target="_blank" rel="noopener">' + t('lic.holder') + '</a>');
      const label = shortLabel(it.label);
      return (
        '<div class="eqazyna-item">' +
        '<div class="eqazyna-head"><span class="popup-swatch" style="background:' + esc(it.color || "#888") + '"></span><strong>' +
        esc(it.title || it.company || t("lic.unknown")) + "</strong></div>" +
        (label ? "<div>" + esc(label) + "</div>" : "") +
        '<p class="process-next">' + esc(licenseNext(it)) + "</p>" +
        (it.number ? "<div>" + t("kv.number") + ": " + esc(it.number) + "</div>" : "") +
        (it.status ? "<div>" + t("kv.status") + ": " + esc(it.status) + "</div>" : "") +
        (it.issued ? "<div>" + t("kv.issued") + ": " + esc(it.issued) + "</div>" : "") +
        (links.length ? '<div class="eqazyna-links">' + links.join(" · ") + "</div>" : "") +
        "</div>"
      );
    }).join("");
    return (
      '<div class="eqazyna-pop"><div class="eqazyna-body">' +
      (err ? '<p class="eqazyna-err">' + esc(err) + "</p>" : "") +
      (loading && !rows ? "<p>" + t("loading.details") + "</p>" : "") +
      (loading && rows ? '<p class="eqazyna-loading">' + t('loading.details') + '</p>' : "") +
      (rows || (!loading && !err ? "<p>" + t("loading.noAttrs") + "</p>" : "")) +
      '<p class="eqazyna-credit">' + creditHtml() + "</p></div></div>"
    );
  }

  function legendRows(meta) {
    if (!meta || !meta.layers) return "";
    return meta.layers.map((l) =>
      '<div class="lg-row"><span class="sw" style="background:' + esc(l.color) + '"></span><span>' + esc(shortLabel(l.label)) + "</span></div>"
    ).join("");
  }

  window.initAtlasEqazyna = function (map, hooks) {
    const tg = document.getElementById("eqazyna-toggle");
    const status = document.getElementById("eqazyna-status");
    const legend = document.getElementById("eqazyna-legend");
    if (!tg || !map) return;

    const hooksSafe = hooks || {};
    const EMPTY = { type: "FeatureCollection", features: [] };
    if (!map.getSource("eqazyna")) {
      map.addSource("eqazyna", {
        type: "geojson",
        data: EMPTY,
        promoteId: "id",
        attribution: "Unified Subsoil Use Platform, minerals.e-qazyna.kz"
      });
    }

    function firstSymbolId() {
      const layers = map.getStyle().layers || [];
      const l = layers.find((x) => x.type === "symbol");
      return l && l.id;
    }

    // Park license fill+outline just under basemap labels, and above every
    // atlas overlay and main-map layer, regardless of the order they were added.
    function beforeId() {
      return firstSymbolId();
    }

    function addLayers() {
      const before = beforeId();
      if (!map.getLayer("eqazyna-fill")) {
        map.addLayer({
          id: "eqazyna-fill",
          type: "fill",
          source: "eqazyna",
          layout: { visibility: "none" },
          paint: {
            "fill-color": ["coalesce", ["get", "color"], "#1d6fa8"],
            "fill-opacity": ["case", ["==", ["get", "group"], "revoked"], 0.3, 0.55]
          }
        }, before);
      }
      // White casing under the colored outline so block edges stay readable
      // over dark faults and busy lithology.
      if (!map.getLayer("eqazyna-casing")) {
        map.addLayer({
          id: "eqazyna-casing",
          type: "line",
          source: "eqazyna",
          layout: { visibility: "none" },
          paint: {
            "line-color": "#ffffff",
            "line-width": ["interpolate", ["linear"], ["zoom"], 4, 1.6, 9, 3.2],
            "line-opacity": 0.85
          }
        }, before);
      }
      if (!map.getLayer("eqazyna-line")) {
        map.addLayer({
          id: "eqazyna-line",
          type: "line",
          source: "eqazyna",
          layout: { visibility: "none" },
          paint: {
            "line-color": ["coalesce", ["get", "color"], "#1d6fa8"],
            "line-width": ["interpolate", ["linear"], ["zoom"],
              4, ["case", ["boolean", ["feature-state", "hover"], false], 2.2, 0.9],
              9, ["case", ["boolean", ["feature-state", "hover"], false], 3, 1.8]],
            "line-opacity": 1
          }
        }, before);
      }
      syncOrder();
    }

    const LIC_IDS = ["eqazyna-fill", "eqazyna-casing", "eqazyna-line"];
    const isSel = (id) => id.startsWith("atlas-sel-");

    // True when licenses already sit directly under the basemap labels, with
    // only the click-selection highlight between them and the labels.
    function inOrder() {
      const layers = map.getStyle().layers || [];
      const ids = layers.map((l) => l.id);
      const pos = LIC_IDS.map((id) => ids.indexOf(id));
      if (pos.some((p) => p < 0)) return true;
      if (!(pos[0] < pos[1] && pos[1] < pos[2])) return false;
      for (let i = pos[0] + 1; i < layers.length; i++) {
        const l = layers[i];
        if (LIC_IDS.includes(l.id) || isSel(l.id) || l.type === "symbol") continue;
        return false;
      }
      // No data layer may hide among the labels either.
      return !layers.slice(pos[2] + 1).some((l) => l.id.startsWith("atlas-") && !isSel(l.id));
    }

    // Licenses go on top of every data layer (lithology, faults, deposits,
    // main atlas maps, any overlay added later), under basemap labels only.
    function syncOrder() {
      if (LIC_IDS.some((id) => !map.getLayer(id))) return;
      if (inOrder()) return;
      const before = beforeId();
      try {
        const layers = map.getStyle().layers || [];
        const idx = before ? layers.findIndex((l) => l.id === before) : layers.length;
        // Pull data layers that were added above the labels back under them.
        if (idx >= 0) {
          layers.slice(idx).filter((l) => l.type !== "symbol" && !LIC_IDS.includes(l.id) && !isSel(l.id)).forEach((l) => {
            map.moveLayer(l.id, before);
          });
        }
        LIC_IDS.forEach((id) => map.moveLayer(id, before));
        if (window.atlasRaiseSel) window.atlasRaiseSel();
      } catch (e) {}
    }

    const EQ_STORE = "atlas-eqazyna-v2";
    let loaded = null, hover = null, popup = null, meta = null, on = true, loading = false;
    try {
      const s = localStorage.getItem(EQ_STORE);
      if (s !== null) on = s === "1";
    } catch (e) {}

    function setStatus(text, show) {
      if (!status) return;
      status.hidden = !show;
      status.textContent = text || "";
    }

    function renderPanelLegend() {
      if (hooksSafe.onUpdate) hooksSafe.onUpdate();
    }

    function visible(show) {
      let vis = show ? "visible" : "none";
      if (show && window.atlasLayerVisible && !window.atlasLayerVisible("eq")) vis = "none";
      LIC_IDS.forEach((id) => {
        if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", vis);
      });
    }

    function syncToggle() {
      tg.classList.toggle("on", on);
      tg.setAttribute("aria-pressed", on);
    }

    let doneText = "";
    function load() {
      if (loaded) { if (doneText) setStatus(doneText, true); return loaded; }
      const base = worker();
      if (!base) {
        setStatus(t("loading.relayMissing"), true);
        return Promise.reject(new Error("missing worker url"));
      }
      setStatus(t("loading.licenses"), true);
      loading = true;
      if (hooksSafe.onUpdate) hooksSafe.onUpdate();
      loaded = Promise.all([
        fetch(base + "/").then((r) => r.json()),
        fetch(base + "/layers").then((r) => {
          if (!r.ok) throw new Error("HTTP " + r.status);
          return r.json();
        })
      ]).then(([info, fc]) => {
        meta = info;
        renderPanelLegend();
        map.getSource("eqazyna").setData(fc);
        doneText = "";
        if (on) setStatus("", false);
        loading = false;
        if (hooksSafe.onUpdate) hooksSafe.onUpdate();
        return fc;
      }).catch((err) => {
        loaded = null;
        loading = false;
        console.error("e-qazyna layer failed", err);
        setStatus(t("loading.licensesFail"), true);
        if (hooksSafe.onUpdate) hooksSafe.onUpdate();
        throw err;
      });
      return loaded;
    }

    function set(next) {
      on = !!next;
      try { localStorage.setItem(EQ_STORE, on ? "1" : "0"); } catch (e) {}
      syncToggle();
      visible(on);
      renderPanelLegend();
      if (on) {
        syncOrder();
        load();
      }
      else {
        if (popup) { popup.remove(); popup = null; }
        setStatus("", false);
      }
      if (hooksSafe.onUpdate) hooksSafe.onUpdate();
    }

    addLayers();
    // Safety net: any layer added or moved later (lazy overlays, main maps,
    // basemap changes) triggers styledata; restore licenses on top if needed.
    let pending = false;
    map.on("styledata", () => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => { pending = false; syncOrder(); });
    });
    tg.addEventListener("click", (e) => { e.stopPropagation(); set(!on); });
    syncToggle();
    if (on) set(true);

    map.on("mousemove", "eqazyna-fill", (e) => {
      const f = e.features && e.features[0];
      if (!f) return;
      if (hover !== null) map.setFeatureState({ source: "eqazyna", id: hover }, { hover: false });
      hover = f.id;
      map.setFeatureState({ source: "eqazyna", id: hover }, { hover: true });
    });
    map.on("mouseleave", "eqazyna-fill", () => {
      if (hover !== null) map.setFeatureState({ source: "eqazyna", id: hover }, { hover: false });
      hover = null;
    });

    function licenseHits(point) {
      if (!on || !map.getLayer("eqazyna-fill")) return [];
      const fs = map.queryRenderedFeatures(point, { layers: ["eqazyna-fill"] });
      const seen = new Set(), out = [];
      fs.forEach((f) => {
        const id = String((f.properties && f.properties.id) || f.id || "");
        if (seen.has(id)) return;
        seen.add(id);
        out.push(f);
      });
      return out;
    }

    window.atlasEqazyna = {
      isOn: () => on,
      hit: (point) => licenseHits(point).length > 0,
      hits: (point) => licenseHits(point),
      popupHtml,
      clickDetails: (lngLat) => {
        const base = worker();
        const q = base + "/click?lng=" + encodeURIComponent(lngLat.lng) + "&lat=" + encodeURIComponent(lngLat.lat);
        return fetch(q).then((r) => {
          if (!r.ok) throw new Error("HTTP " + r.status);
          return r.json();
        }).then((data) => (data.features && data.features.length ? data.features : []));
      },
      closePopup: () => { if (popup) { popup.remove(); popup = null; } },
      syncOrder,
      legendHtml: () => {
        if (!on || !meta) return "";
        return '<div class="lg-map">' + t('layer.licenses') + '</div>' + legendRows(meta);
      },
      layers: () => (on ? LIC_IDS.filter((id) => map.getLayer(id)) : []),
      setOn: set,
      isLoading: () => !!loading,
      stack: () => (map.getStyle().layers || []).map((l) => ({ id: l.id, type: l.type }))
    };
  };
})();
