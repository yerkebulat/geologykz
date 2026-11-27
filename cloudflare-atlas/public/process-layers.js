/* Open-to-apply, at-auction, and official PUGFN layers. All off by default. */
(function () {
  const OPEN_COLOR = "#22c55e";
  const AUCTION_COLOR = "#ea580c";
  const CREDIT = 'Source: <a href="https://minerals.e-qazyna.kz/ru/contracts-map" target="_blank" rel="noopener">e-qazyna</a>';
  const ANNOUNCE = "https://minerals.e-qazyna.kz/ru/u/reestr/announcements/view/342675818925000000";
  const APPLY = "https://minerals.e-qazyna.kz/ru/u/reestr/announcements/view/342675818925000000";
  const CODE = "https://adilet.zan.kz/rus/docs/K1700000125";
  const TAX = "https://adilet.zan.kz/rus/docs/K2500000214";
  const AUCTION_LIST = "https://minerals-u.e-qazyna.kz/ru/u/reestr/auction/tpi/objects/list";
  const STATUS_EN = {
    "Протокол подписан": "Protocol signed",
    "Произведена оплата": "Payment made",
    "Конкурс состоялся": "Auction held",
    "Объявлен": "Announced",
    "Идут торги": "Auction in progress",
    "Торги объявлены": "Auction announced"
  };
  const PUGFN_LABEL = {
    "hc-auction": "Oil and gas auction",
    "hc-national": "Oil and gas, national companies",
    "uranium": "Uranium"
  };
  const esc = (s) => String(s == null || s === "" ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  const HOW = (
    '<details class="how-apply"><summary>How to apply</summary>' +
    "<p>Apply on e-qazyna (EPN) with an EDS. First come, unless two or more applications arrive within 15 working days of publication, then auction by subscription bonus. Max 200 blocks. Subscription bonus 100 MRP = 432,500 KZT in 2026. Term 6 years + one extension up to 5. Minimum annual spend applies.</p>" +
    '<p class="how-apply-links"><a href="' + CODE + '" target="_blank" rel="noopener">Subsoil Code</a> · <a href="' + TAX + '" target="_blank" rel="noopener">Tax Code</a></p>' +
    "</details>"
  );

  function howForOpen() { return HOW; }

  const SPECS = [
    {
      id: "open",
      toggle: "process-open-toggle",
      store: "atlas-process-open-v1",
      label: "Open to apply",
      color: OPEN_COLOR,
      clusterUrl: "data/process/open-clusters.json",
      cellUrl: "data/process/open-cells.json"
    },
    {
      id: "auction",
      toggle: "process-auction-toggle",
      store: "atlas-process-auction-v1",
      label: "At auction",
      color: AUCTION_COLOR,
      clusterUrl: "data/process/auction-clusters.json",
      cellUrl: "data/process/auction-cells.json"
    }
  ];
  const PUGFN_SPEC = {
    id: "pugfn",
    toggle: "process-pugfn-toggle",
    store: "atlas-process-pugfn-v1",
    label: "PUGFN: oil, gas, uranium"
  };

  function fillPaint(color, opacity) {
    return {
      "fill-color": color,
      "fill-opacity": ["interpolate", ["linear"], ["zoom"], 3, opacity - 0.08, 8, opacity],
      "fill-outline-color": "rgba(0,0,0,0)"
    };
  }
  function linePaint(color, lowW, highW) {
    return {
      "line-color": color,
      "line-width": ["interpolate", ["linear"], ["zoom"], 3, lowW, 9, highW],
      "line-opacity": 0.95
    };
  }

  window.initAtlasProcess = function (map, hooks) {
    const hooksSafe = hooks || {};
    const EMPTY = { type: "FeatureCollection", features: [] };
    const state = { open: false, auction: false, pugfn: false };
    const loading = { open: false, auction: false, pugfn: false };
    const cache = {};
    const meta = {};
    const loaded = {};
    let cellsQueued = {};

    SPECS.forEach((s) => {
      try {
        const v = localStorage.getItem(s.store);
        if (v !== null) state[s.id] = v === "1";
      } catch (e) {}
    });
    try {
      const v = localStorage.getItem(PUGFN_SPEC.store);
      if (v !== null) state.pugfn = v === "1";
    } catch (e) {}

    function firstSymbolId() {
      const layers = map.getStyle().layers || [];
      const l = layers.find((x) => x.type === "symbol");
      return l && l.id;
    }
    function beforeLicenses() {
      if (map.getLayer("eqazyna-fill")) return "eqazyna-fill";
      return firstSymbolId();
    }

    function ensureSource(id) {
      if (!map.getSource(id)) {
        map.addSource(id, {
          type: "geojson",
          data: EMPTY,
          promoteId: "id",
          attribution: "Unified Subsoil Use Platform, minerals.e-qazyna.kz"
        });
      }
    }

    function addFillLine(id, source, color, filter, minzoom, maxzoom, isCluster) {
      const before = beforeLicenses();
      if (!map.getLayer(id + "-fill")) {
        const layer = {
          id: id + "-fill",
          type: "fill",
          source: source,
          layout: { visibility: "none" },
          paint: fillPaint(color, isCluster ? 0.62 : 0.5)
        };
        if (filter) layer.filter = filter;
        if (minzoom != null) layer.minzoom = minzoom;
        if (maxzoom != null) layer.maxzoom = maxzoom;
        map.addLayer(layer, before);
      }
      if (isCluster && !map.getLayer(id + "-casing")) {
        const casing = {
          id: id + "-casing",
          type: "line",
          source: source,
          layout: { visibility: "none" },
          paint: { "line-color": "#ffffff", "line-width": ["interpolate", ["linear"], ["zoom"], 3, 3.2, 9, 3.4], "line-opacity": 0.9 }
        };
        if (filter) casing.filter = filter;
        if (minzoom != null) casing.minzoom = minzoom;
        if (maxzoom != null) casing.maxzoom = maxzoom;
        map.addLayer(casing, before);
      }
      if (!map.getLayer(id + "-line")) {
        const layer = {
          id: id + "-line",
          type: "line",
          source: source,
          layout: { visibility: "none" },
          paint: linePaint(color, isCluster ? 1.8 : 0.5, isCluster ? 2.0 : 1.3)
        };
        if (filter) layer.filter = filter;
        if (minzoom != null) layer.minzoom = minzoom;
        if (maxzoom != null) layer.maxzoom = maxzoom;
        map.addLayer(layer, before);
      }
    }

    function addLayers() {
      SPECS.forEach((s) => {
        ensureSource("process-" + s.id + "-clusters");
        ensureSource("process-" + s.id + "-cells");
        addFillLine("process-" + s.id + "-clusters", "process-" + s.id + "-clusters", s.color, ["==", ["get", "kind"], "cluster"], null, 7.25, true);
        addFillLine("process-" + s.id + "-cells", "process-" + s.id + "-cells", s.color, ["==", ["get", "kind"], "cell"], 6.5, null, false);
        const before = beforeLicenses();
        const dotId = "process-" + s.id + "-clusters-dot";
        if (!map.getLayer(dotId)) {
          map.addLayer({
            id: dotId,
            type: "circle",
            source: "process-" + s.id + "-clusters",
            filter: ["==", ["get", "kind"], "dot"],
            maxzoom: 6.8,
            layout: { visibility: "none" },
            paint: {
              "circle-color": s.color,
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 4.4, 6, 5.5],
              "circle-stroke-color": "#ffffff",
              "circle-stroke-width": 1.2,
              "circle-opacity": 1
            }
          }, before);
        }
      });
      ensureSource("process-pugfn");
      if (!map.getLayer("process-pugfn-fill")) {
        map.addLayer({
          id: "process-pugfn-fill",
          type: "fill",
          source: "process-pugfn",
          layout: { visibility: "none" },
          paint: {
            "fill-color": ["coalesce", ["get", "color"], "#d97706"],
            "fill-opacity": ["interpolate", ["linear"], ["zoom"], 3, 0.28, 8, 0.4]
          }
        }, beforeLicenses());
      }
      if (!map.getLayer("process-pugfn-line")) {
        map.addLayer({
          id: "process-pugfn-line",
          type: "line",
          source: "process-pugfn",
          layout: { visibility: "none" },
          paint: {
            "line-color": ["coalesce", ["get", "color"], "#d97706"],
            "line-width": ["interpolate", ["linear"], ["zoom"], 3, 0.8, 9, 1.6],
            "line-opacity": 0.95
          }
        }, beforeLicenses());
      }
      placeUnderLicenses();
    }

    const PROCESS_IDS = [
      "process-open-clusters-fill", "process-open-clusters-casing", "process-open-clusters-line", "process-open-clusters-dot",
      "process-open-cells-fill", "process-open-cells-line",
      "process-auction-clusters-fill", "process-auction-clusters-casing", "process-auction-clusters-line", "process-auction-clusters-dot",
      "process-auction-cells-fill", "process-auction-cells-line",
      "process-pugfn-fill", "process-pugfn-line"
    ];

    function placeUnderLicenses() {
      const before = beforeLicenses();
      if (!before) return;
      try {
        PROCESS_IDS.forEach((id) => { if (map.getLayer(id)) map.moveLayer(id, before); });
        if (window.atlasEqazyna && window.atlasEqazyna.syncOrder) window.atlasEqazyna.syncOrder();
      } catch (e) {}
    }

    function setVisible(id, show) {
      ["-clusters-fill", "-clusters-casing", "-clusters-line", "-clusters-dot", "-cells-fill", "-cells-line"].forEach((s) => {
        const lid = "process-" + id + s;
        if (map.getLayer(lid)) map.setLayoutProperty(lid, "visibility", show ? "visible" : "none");
      });
    }

    function setPugfnVisible(show) {
      ["process-pugfn-fill", "process-pugfn-line"].forEach((id) => {
        if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", show ? "visible" : "none");
      });
    }

    function syncToggles() {
      SPECS.forEach((s) => {
        const tg = document.getElementById(s.toggle);
        if (!tg) return;
        tg.classList.toggle("on", state[s.id]);
        tg.setAttribute("aria-pressed", state[s.id]);
      });
      const tg = document.getElementById(PUGFN_SPEC.toggle);
      if (tg) {
        tg.classList.toggle("on", state.pugfn);
        tg.setAttribute("aria-pressed", state.pugfn);
      }
    }

    function setStatus(text) {
      const el = document.getElementById("process-status");
      if (!el) return;
      el.hidden = !text;
      el.textContent = text || "";
    }

    function legendRowsFor(id) {
      const rows = [];
      if (id === "open" && state.open) rows.push([OPEN_COLOR, "Open to apply · from 6 Nov 2026"]);
      if (id === "auction" && state.auction) rows.push([AUCTION_COLOR, "At auction"]);
      if (id === "pugfn" && state.pugfn) {
        rows.push(["#d97706", "Oil and gas auction"]);
        rows.push(["#b45309", "Oil and gas, national companies"]);
        rows.push(["#7c3aed", "Uranium"]);
      }
      return rows.map((r) =>
        '<div class="lg-row"><span class="sw" style="background:' + r[0] + '"></span><span>' + esc(r[1]) + "</span></div>"
      ).join("");
    }
    function renderPanelLegend() {
      if (hooksSafe.onUpdate) hooksSafe.onUpdate();
    }

    function fetchJson(url) {
      return fetch(url).then((r) => {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      });
    }

    function loadSpec(s) {
      if (loaded[s.id]) return loaded[s.id];
      setStatus("Loading " + s.label.toLowerCase() + "…");
      loading[s.id] = true;
      if (hooksSafe.onUpdate) hooksSafe.onUpdate();
      loaded[s.id] = fetchJson(s.clusterUrl).then((fc) => {
        cache[s.id + "-clusters"] = fc;
        if (fc.meta) meta[s.id] = fc.meta;
        map.getSource("process-" + s.id + "-clusters").setData(fc);
        maybeLoadCells(s);
        setStatus("");
        loading[s.id] = false;
        if (hooksSafe.onUpdate) hooksSafe.onUpdate();
        return fc;
      }).catch((err) => {
        loaded[s.id] = null;
        loading[s.id] = false;
        console.error(s.id + " layer failed", err);
        setStatus("Could not load " + s.label.toLowerCase() + ".");
        if (hooksSafe.onUpdate) hooksSafe.onUpdate();
        throw err;
      });
      return loaded[s.id];
    }

    function maybeLoadCells(s) {
      if (cellsQueued[s.id] || !state[s.id]) return;
      const z = map.getZoom();
      if (z < 6.2) return;
      cellsQueued[s.id] = true;
      fetchJson(s.cellUrl).then((fc) => {
        cache[s.id + "-cells"] = fc;
        map.getSource("process-" + s.id + "-cells").setData(fc);
      }).catch((err) => {
        cellsQueued[s.id] = false;
        console.error(s.id + " cells failed", err);
      });
    }

    function withTimeout(promise, ms) {
      return Promise.race([promise, new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);
    }
    function pugfnFromWorker() {
      const cfg = window.EQAZYNA_CONFIG || {};
      const base = String(cfg.workerUrl || "").replace(/\/+$/, "");
      if (!base) return Promise.reject(new Error("no worker"));
      return fetchJson(base + "/").then((info) => {
        if (!info || !info.pugfnLayers || !info.pugfnLayers.length) throw new Error("worker has no pugfn group");
        return fetchJson(base + "/layers?group=pugfn");
      }).then((fc) => {
        const group = fc && ((fc.metadata && fc.metadata.group) || (fc.meta && fc.meta.group) || fc.group);
        const prop = ((fc.features || [])[0] || {}).properties || {};
        const ok = group === "pugfn" || prop.group === "pugfn" || prop.stage === "pugfn";
        if (!ok) throw new Error("unexpected pugfn payload");
        return fc;
      });
    }

    function loadPugfn() {
      if (loaded.pugfn) return loaded.pugfn;
      setStatus("Loading PUGFN…");
      loading.pugfn = true;
      if (hooksSafe.onUpdate) hooksSafe.onUpdate();
      loaded.pugfn = fetchJson("data/process/pugfn.json").then((fc) => {
        cache.pugfn = fc;
        if (fc.meta) meta.pugfn = fc.meta;
        map.getSource("process-pugfn").setData(fc);
        setStatus("");
        loading.pugfn = false;
        if (hooksSafe.onUpdate) hooksSafe.onUpdate();
        withTimeout(pugfnFromWorker(), 8000).then((live) => {
          if (!state.pugfn || !live || !(live.features || []).length) return;
          cache.pugfn = live;
          if (live.metadata || live.meta) meta.pugfn = live.meta || live.metadata;
          map.getSource("process-pugfn").setData(live);
        }).catch(() => {});
        return fc;
      }).catch((err) => {
        loaded.pugfn = null;
        loading.pugfn = false;
        console.error("PUGFN layer failed", err);
        setStatus("Could not load PUGFN.");
        if (hooksSafe.onUpdate) hooksSafe.onUpdate();
        throw err;
      });
      return loaded.pugfn;
    }

    function setSpec(s, next) {
      state[s.id] = !!next;
      try { localStorage.setItem(s.store, state[s.id] ? "1" : "0"); } catch (e) {}
      syncToggles();
      setVisible(s.id, state[s.id]);
      renderPanelLegend();
      if (state[s.id]) {
        placeUnderLicenses();
        loadSpec(s);
      } else if (!state.open && !state.auction && !state.pugfn) {
        setStatus("");
      }
      if (hooksSafe.onUpdate) hooksSafe.onUpdate();
    }

    function setPugfn(next) {
      state.pugfn = !!next;
      try { localStorage.setItem(PUGFN_SPEC.store, state.pugfn ? "1" : "0"); } catch (e) {}
      syncToggles();
      setPugfnVisible(state.pugfn);
      renderPanelLegend();
      if (state.pugfn) {
        placeUnderLicenses();
        loadPugfn();
      } else if (!state.open && !state.auction && !state.pugfn) {
        setStatus("");
      }
      if (hooksSafe.onUpdate) hooksSafe.onUpdate();
    }

    addLayers();
    SPECS.forEach((s) => {
      const tg = document.getElementById(s.toggle);
      if (tg) tg.addEventListener("click", (e) => { e.stopPropagation(); setSpec(s, !state[s.id]); });
    });
    const pugTg = document.getElementById(PUGFN_SPEC.toggle);
    if (pugTg) pugTg.addEventListener("click", (e) => { e.stopPropagation(); setPugfn(!state.pugfn); });
    syncToggles();
    map.on("zoomend", () => {
      SPECS.forEach((s) => { if (state[s.id]) maybeLoadCells(s); });
    });
    let pending = false;
    map.on("styledata", () => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => { pending = false; placeUnderLicenses(); });
    });
    if (state.open) setSpec(SPECS[0], true);
    if (state.auction) setSpec(SPECS[1], true);
    if (state.pugfn) setPugfn(true);

    const FILL_IDS = [
      "process-open-cells-fill", "process-open-clusters-fill",
      "process-auction-cells-fill", "process-auction-clusters-fill",
      "process-pugfn-fill"
    ];
    const DOT_IDS = ["process-open-clusters-dot", "process-auction-clusters-dot"];

    function hits(point) {
      const ids = FILL_IDS.filter((id) => map.getLayer(id) && map.getLayoutProperty(id, "visibility") !== "none");
      const dots = DOT_IDS.filter((id) => map.getLayer(id) && map.getLayoutProperty(id, "visibility") !== "none");
      if (!ids.length && !dots.length) return [];
      const pad = 8;
      const box = [[point.x - pad, point.y - pad], [point.x + pad, point.y + pad]];
      const fs = (ids.length ? map.queryRenderedFeatures(point, { layers: ids }) : []).concat(
        dots.length ? map.queryRenderedFeatures(box, { layers: dots }) : []
      );
      const seen = new Set(), out = [];
      fs.forEach((f) => {
        const p = f.properties || {};
        const k = String((f.layer && f.layer.id) || "") + "|" + String(p.id || f.id || "");
        if (seen.has(k)) return;
        seen.add(k);
        out.push(f);
      });
      // Prefer a single cell over its cluster when both exist (zoom overlap).
      const cells = out.filter((f) => (f.properties || {}).kind === "cell");
      const rest = out.filter((f) => (f.properties || {}).kind !== "cell");
      if (cells.length) {
        const cellStages = new Set(cells.map((f) => (f.properties || {}).stage));
        return cells.concat(rest.filter((f) => !cellStages.has((f.properties || {}).stage)));
      }
      return out;
    }

    function sourceData(layerId) {
      const mapSrc = {
        "process-open-cells-fill": "process-open-cells",
        "process-open-cells-line": "process-open-cells",
        "process-open-clusters-fill": "process-open-clusters",
        "process-open-clusters-line": "process-open-clusters",
        "process-auction-cells-fill": "process-auction-cells",
        "process-auction-cells-line": "process-auction-cells",
        "process-auction-clusters-fill": "process-auction-clusters",
        "process-auction-clusters-line": "process-auction-clusters",
        "process-pugfn-fill": "process-pugfn",
        "process-pugfn-line": "process-pugfn"
      };
      const sid = mapSrc[layerId];
      if (!sid) return null;
      if (sid === "process-open-cells") return cache["open-cells"] || null;
      if (sid === "process-open-clusters") return cache["open-clusters"] || null;
      if (sid === "process-auction-cells") return cache["auction-cells"] || null;
      if (sid === "process-auction-clusters") return cache["auction-clusters"] || null;
      if (sid === "process-pugfn") return cache.pugfn || null;
      const s = map.getSource(sid);
      return (s && s._data) || null;
    }

    function popupItem(f) {
      const p = f.properties || {};
      const stage = p.stage;
      const count = Number(p.count) || 1;
      const code = p.code || p.id || "";
      let title, next, links = [];
      if (stage === "open") {
        title = "Open to apply";
        if (p.kind === "cluster" && count > 1) {
          next = count + " neighboring blocks. Zoom in to see each code. If two or more applications arrive within 15 working days of publication, the block goes to auction by subscription bonus.";
        } else {
          next = "Apply via e-qazyna with an EDS. If two or more applications arrive within 15 working days of publication, the block goes to auction by subscription bonus.";
        }
        links.push('<a href="' + ANNOUNCE + '" target="_blank" rel="noopener">Announcement</a>');
        links.push('<a href="https://minerals.e-qazyna.kz/" target="_blank" rel="noopener">e-qazyna</a>');
      } else if (stage === "auction") {
        title = "At auction";
        const st = STATUS_EN[p.status] || p.status || "Auction object";
        next = "Official status: " + st + ". See the auction object for the current stage. This is not an open first-come block.";
        if (p.objectUrl) links.push('<a href="' + esc(p.objectUrl) + '" target="_blank" rel="noopener">Auction object</a>');
        links.push('<a href="' + AUCTION_LIST + '" target="_blank" rel="noopener">Auction list</a>');
      } else {
        title = "PUGFN: oil, gas, uranium";
        next = "These areas are not open for solid-mineral (TPI) exploration licenses.";
        if (p.label || PUGFN_LABEL[p.kind]) {
          /* shown as the line under the title */
        }
        links.push('<a href="https://minerals.e-qazyna.kz/ru/contracts-map" target="_blank" rel="noopener">Official map</a>');
      }
      const color = stage === "open" ? OPEN_COLOR : stage === "auction" ? AUCTION_COLOR : (p.color || "#d97706");
      let sub = "";
      if (stage === "pugfn") sub = esc(p.label || PUGFN_LABEL[p.kind] || "");
      else if (p.kind === "cluster" && count > 1) sub = esc(code);
      else if (code) sub = esc(String(code).split(" and ")[0]);
      return (
        '<div class="eqazyna-item process-item">' +
        '<div class="eqazyna-head"><span class="popup-swatch" style="background:' + color + '"></span><strong>' + esc(title) + "</strong></div>" +
        (sub ? '<div class="pp-l">' + sub + "</div>" : "") +
        '<p class="process-next">' + esc(next) + "</p>" +
        (links.length ? '<div class="eqazyna-links">' + links.join(" · ") + "</div>" : "") +
        (stage === "open" ? howForOpen() : "") +
        "</div>"
      );
    }

    function popupHtml(fs) {
      if (!fs || !fs.length) return "";
      // Stable process order: open, auction, pugfn
      const order = { open: 0, auction: 1, pugfn: 2 };
      const items = fs.slice().sort((a, b) => (order[(a.properties || {}).stage] || 9) - (order[(b.properties || {}).stage] || 9));
      return '<div class="eqazyna-pop"><div class="process-body">' + items.map(popupItem).join("") +
        '<p class="eqazyna-credit">' + CREDIT + "</p></div></div>";
    }

    function legendHtml() {
      const parts = ["open", "auction", "pugfn"].map(legendRowsFor).filter(Boolean);
      if (!parts.length) return "";
      return '<div class="lg-map">Subsoil use</div>' + parts.join("");
    }
    function legendHtmlFor(id) { return legendRowsFor(id); }

    function anyOn() { return !!(state.open || state.auction || state.pugfn); }

    function setOn(id, next) {
      if (id === "pugfn") setPugfn(next);
      else {
        const s = SPECS.find((x) => x.id === id);
        if (s) setSpec(s, next);
      }
    }
    function layersOf(id) {
      if (!state[id]) return [];
      if (id === "pugfn") return ["process-pugfn-fill", "process-pugfn-line"].filter((lid) => map.getLayer(lid));
      return [
        "process-" + id + "-clusters-fill", "process-" + id + "-clusters-casing",
        "process-" + id + "-clusters-line", "process-" + id + "-clusters-dot",
        "process-" + id + "-cells-fill", "process-" + id + "-cells-line"
      ].filter((lid) => map.getLayer(lid));
    }
    window.atlasProcess = {
      anyOn,
      isOn: (id) => !!(id ? state[id] : anyOn()),
      setOn,
      isLoading: (id) => !!(id && loading[id]),
      layers: layersOf,
      hits,
      popupHtml,
      legendHtml,
      legendHtmlFor,
      sourceData,
      fillLayerIds: () => FILL_IDS.concat(DOT_IDS).filter((id) => map.getLayer(id) && map.getLayoutProperty(id, "visibility") !== "none"),
      placeUnderLicenses
    };
  };
})();
