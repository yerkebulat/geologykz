/* Persistent highlight for the feature the user just clicked. No deposit/occurrence points exist on this map. */
(function () {
  const SRC = "geologykz-sel";
  const IDS = ["geologykz-sel-fill", "geologykz-sel-line", "geologykz-sel-line-inner"];
  const EMPTY = { type: "FeatureCollection", features: [] };

  window.addEventListener("geologykz:load", function (ev) {
    const map = ev.detail;
    if (!map) return;
    if (!map.getSource(SRC)) map.addSource(SRC, { type: "geojson", data: EMPTY });

    function firstSymbol() {
      const l = (map.getStyle().layers || []).find((x) => x.type === "symbol");
      return l && l.id;
    }
    function raise() {
      // Licenses are raised to the top of the stack; keep the highlight above them.
      IDS.forEach((id) => {
        if (!map.getLayer(id)) return;
        try { map.moveLayer(id); } catch (e) {}
      });
    }
    function add() {
      const before = firstSymbol();
      if (!map.getLayer("geologykz-sel-fill")) {
        map.addLayer({
          id: "geologykz-sel-fill",
          type: "fill",
          source: SRC,
          filter: ["match", ["geometry-type"], ["Polygon", "MultiPolygon"], true, false],
          paint: { "fill-color": "#111111", "fill-opacity": 0.08 }
        }, before);
      }
      if (!map.getLayer("geologykz-sel-line")) {
        map.addLayer({
          id: "geologykz-sel-line",
          type: "line",
          source: SRC,
          paint: {
            "line-color": "#ffffff",
            "line-width": ["interpolate", ["linear"], ["zoom"], 4, 3, 10, 6],
            "line-opacity": 0.95
          }
        }, before);
      }
      if (!map.getLayer("geologykz-sel-line-inner")) {
        map.addLayer({
          id: "geologykz-sel-line-inner",
          type: "line",
          source: SRC,
          paint: {
            "line-color": "#111111",
            "line-width": ["interpolate", ["linear"], ["zoom"], 4, 1.4, 10, 2.4]
          }
        }, before);
      }
      raise();
    }
    add();

    let marked = false;
    function set(feature) {
      if (!feature || !feature.geometry) { clear(); return; }
      add();
      marked = true;
      map.getSource(SRC).setData({
        type: "FeatureCollection",
        features: [{ type: "Feature", geometry: feature.geometry, properties: feature.properties || {} }]
      });
      raise();
    }
    function clear() {
      marked = false;
      if (map.getSource(SRC)) map.getSource(SRC).setData(EMPTY);
    }
    function count() {
      const src = map.getSource(SRC);
      const data = src && src._data;
      return data && data.features ? data.features.length : 0;
    }

    map.on("click", () => {
      setTimeout(() => { if (!marked) clear(); marked = false; }, 0);
    });

    window.geologykzSelect = { set, clear, raise, count, source: SRC };
  });
})();
