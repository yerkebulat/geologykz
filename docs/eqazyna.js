/* Solid-mineral licenses and contracts via the kzgeology-eqazyna relay. Off by default. */
(function () {
  const CREDIT = 'Source: <a href="https://minerals.e-qazyna.kz/ru/contracts-map" target="_blank" rel="noopener">Unified Subsoil Use Platform, minerals.e-qazyna.kz</a>';
  const esc = (s) => String(s == null || s === "" ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const cfg = () => window.EQAZYNA_CONFIG || {};
  const worker = () => String(cfg().workerUrl || "").replace(/\/+$/, "");

  function renderLegend(meta) {
    const root = document.getElementById("eqazyna-legend");
    if (!root || !meta || !meta.layers) return;
    root.innerHTML = "";
    meta.layers.forEach((l) => {
      const row = document.createElement("div");
      row.className = "legend-item";
      row.innerHTML = '<span class="swatch" style="background:' + esc(l.color) + '"></span><span class="meta">' + esc(l.label) + "</span>";
      root.appendChild(row);
    });
  }

  function popupHtml(items, loading, err) {
    const rows = (items || []).map((it) => {
      const links = [];
      if (it.locUrl) links.push('<a href="' + esc(it.locUrl) + '" target="_blank" rel="noopener">Official registry</a>');
      if (it.applicantUrl) links.push('<a href="' + esc(it.applicantUrl) + '" target="_blank" rel="noopener">Holder record</a>');
      return (
        '<div class="eqazyna-item">' +
        '<div class="eqazyna-head"><span class="popup-swatch" style="background:' + esc(it.color || "#888") + '"></span><strong>' +
        esc(it.title || it.company || "Unknown holder") + "</strong></div>" +
        (it.label ? "<div>" + esc(it.label) + "</div>" : "") +
        (it.number ? "<div>Number: " + esc(it.number) + "</div>" : "") +
        (it.status ? "<div>Status: " + esc(it.status) + "</div>" : "") +
        (it.issued ? "<div>Issued: " + esc(it.issued) + "</div>" : "") +
        (it.workType ? "<div>Operation: " + esc(it.workType) + "</div>" : "") +
        (links.length ? '<div class="eqazyna-links">' + links.join(" · ") + "</div>" : "") +
        "</div>"
      );
    }).join("");
    return (
      '<div class="eqazyna-pop"><div class="eqazyna-body">' +
      (err ? '<p class="eqazyna-err">' + esc(err) + "</p>" : "") +
      (loading && !rows ? "<p>Loading details…</p>" : "") +
      (rows || (!loading && !err ? "<p>No attributes for this block.</p>" : "")) +
      '<p class="eqazyna-credit">' + CREDIT + "</p></div></div>"
    );
  }

  window.addEventListener("geologykz:load", function (ev) {
    const map = ev.detail;
    const tg = document.getElementById("eqazyna-toggle");
    const status = document.getElementById("eqazyna-status");
    if (!tg || !map) return;

    const EMPTY = { type: "FeatureCollection", features: [] };
    map.addSource("eqazyna", {
      type: "geojson",
      data: EMPTY,
      generateId: true,
      promoteId: "id",
      attribution: "Unified Subsoil Use Platform, minerals.e-qazyna.kz"
    });
    map.addLayer({
      id: "eqazyna-fill",
      type: "fill",
      source: "eqazyna",
      layout: { visibility: "none" },
      paint: {
        "fill-color": ["coalesce", ["get", "color"], "#1d6fa8"],
        "fill-opacity": ["case", ["==", ["get", "group"], "revoked"], 0.2, 0.35]
      }
    });
    map.addLayer({
      id: "eqazyna-line",
      type: "line",
      source: "eqazyna",
      layout: { visibility: "none" },
      paint: {
        "line-color": ["coalesce", ["get", "color"], "#1d6fa8"],
        "line-width": ["case", ["boolean", ["feature-state", "hover"], false], 2, 0.9],
        "line-opacity": 0.9
      }
    });

    function raise() {
      if (map.getLayer("eqazyna-fill")) map.moveLayer("eqazyna-fill");
      if (map.getLayer("eqazyna-line")) map.moveLayer("eqazyna-line");
    }
    raise();

    let loaded = null, hover = null, popup = null;

    function setStatus(text, show) {
      if (!status) return;
      status.hidden = !show;
      status.textContent = text || "";
    }

    function visible(on) {
      ["eqazyna-fill", "eqazyna-line"].forEach((id) => map.setLayoutProperty(id, "visibility", on ? "visible" : "none"));
      if (on) raise();
    }

    function load() {
      if (loaded) return loaded;
      const base = worker();
      if (!base) {
        setStatus("Relay URL is missing.", true);
        return Promise.reject(new Error("missing worker url"));
      }
      setStatus("Loading licenses…", true);
      loaded = Promise.all([
        fetch(base + "/").then((r) => r.json()),
        fetch(base + "/layers").then((r) => {
          if (!r.ok) throw new Error("HTTP " + r.status);
          return r.json();
        })
      ]).then(([meta, fc]) => {
        renderLegend(meta);
        map.getSource("eqazyna").setData(fc);
        const n = (fc.features || []).length;
        const counts = (fc.metadata && fc.metadata.counts) || {};
        const parts = Object.keys(counts).length ? " · " + Object.values(counts).reduce((a, b) => a + b, 0) + " blocks" : " · " + n + " blocks";
        setStatus((n ? n + " blocks" : "No blocks") + " from e-qazyna" + (fc.metadata && fc.metadata.fetchedAt ? "" : "") + ".", true);
        return fc;
      }).catch((err) => {
        loaded = null;
        console.error("e-qazyna layer failed", err);
        setStatus("Could not load licenses. Try again, or open the official map.", true);
        throw err;
      });
      return loaded;
    }

    function set() {
      const on = tg.checked;
      visible(on);
      if (on) load();
      else if (popup) { popup.remove(); popup = null; }
    }

    tg.addEventListener("change", set);
    if (tg.checked) set();

    map.on("mousemove", "eqazyna-fill", (e) => {
      const f = e.features && e.features[0];
      if (!f) return;
      if (hover !== null) map.setFeatureState({ source: "eqazyna", id: hover }, { hover: false });
      hover = f.id;
      map.setFeatureState({ source: "eqazyna", id: hover }, { hover: true });
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "eqazyna-fill", () => {
      if (hover !== null) map.setFeatureState({ source: "eqazyna", id: hover }, { hover: false });
      hover = null;
      map.getCanvas().style.cursor = "";
    });

    map.on("click", "eqazyna-fill", (e) => {
      if (window.geologykzDetailed?.hitUnits(e.point)) return;
      const hits = e.features || [];
      if (!hits.length) return;
      const seed = hits.map((f) => ({
        id: f.properties.id || f.id,
        type: f.properties.type,
        label: f.properties.label,
        color: f.properties.color,
        title: f.properties.label,
        group: f.properties.group
      }));
      if (popup) popup.remove();
      popup = new maplibregl.Popup({ maxWidth: "320px" }).setLngLat(e.lngLat).setHTML(popupHtml(seed, true)).addTo(map);
      const base = worker();
      const q = base + "/click?lng=" + encodeURIComponent(e.lngLat.lng) + "&lat=" + encodeURIComponent(e.lngLat.lat);
      fetch(q).then((r) => {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      }).then((data) => {
        if (!popup) return;
        const items = data.features && data.features.length ? data.features : seed;
        const body = popup.getElement()?.querySelector(".eqazyna-body");
        const tmp = document.createElement("div");
        tmp.innerHTML = popupHtml(items, false);
        if (body) body.replaceWith(tmp.querySelector(".eqazyna-body"));
        else popup.setHTML(popupHtml(items, false));
      }).catch((err) => {
        console.error("e-qazyna click failed", err);
        if (!popup) return;
        const body = popup.getElement()?.querySelector(".eqazyna-body");
        const tmp = document.createElement("div");
        tmp.innerHTML = popupHtml(seed, false, "Details could not be loaded.");
        if (body) body.replaceWith(tmp.querySelector(".eqazyna-body"));
      });
    });

    window.geologykzEqazyna = {
      hit: (point) => !!(tg.checked && map.getLayer("eqazyna-fill") && map.queryRenderedFeatures(point, { layers: ["eqazyna-fill"] }).length),
      show: () => { tg.checked = true; set(); return load(); }
    };
  });
})();
