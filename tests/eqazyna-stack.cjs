const fs = require("fs"), assert = require("assert"), { JSDOM } = require("jsdom");
const root = require("path").join(__dirname, "../docs/");

function boot() {
  const d = new JSDOM(fs.readFileSync(root + "index.html", "utf8"), { runScripts: "outside-only", url: "https://kzgeology.com/" });
  const w = d.window;
  w.eval(fs.readFileSync(root + "eqazyna-config.js", "utf8"));
  w.eval(fs.readFileSync(root + "preferences.js", "utf8"));
  w.fetch = async () => ({ ok: true, json: async () => ({ type: "FeatureCollection", features: [], layers: [], metadata: { counts: {} } }) });
  const order = [];
  const layers = {}, sources = {}, addedWith = {};
  const map = {
    addSource: (id, s) => { sources[id] = Object.assign({ setData() {} }, s); },
    addLayer: (l, beforeId) => {
      addedWith[l.id] = beforeId;
      layers[l.id] = l;
      if (beforeId && order.indexOf(beforeId) >= 0) order.splice(order.indexOf(beforeId), 0, l.id);
      else order.push(l.id);
    },
    moveLayer: (id, beforeId) => {
      const i = order.indexOf(id);
      if (i >= 0) order.splice(i, 1);
      if (beforeId && order.indexOf(beforeId) >= 0) order.splice(order.indexOf(beforeId), 0, id);
      else order.push(id);
    },
    getSource: (id) => sources[id],
    getLayer: (id) => layers[id],
    setLayoutProperty: (id, k, v) => ((layers[id].layout ||= {})[k] = v),
    getLayoutProperty: (id, k) => layers[id]?.layout?.[k],
    setFeatureState() {},
    getCanvas: () => ({ style: {} }),
    queryRenderedFeatures: () => [],
    getStyle: () => ({ layers: order.map((id) => layers[id]) }),
    on() {}
  };
  ["geo-fill", "geo-line", "kz15m-raster", "kz15m-fill", "kz15m-hover", "kz-line", "base-labels", "base-transport"].forEach((id) => {
    map.addLayer({ id, type: "fill", layout: { visibility: "visible" } });
  });
  w.eval(fs.readFileSync(root + "eqazyna.js", "utf8"));
  w.dispatchEvent(new w.CustomEvent("geologykz:load", { detail: map }));
  return { w, map, order, addedWith, layers };
}

(function () {
  const { w, map, order, addedWith } = boot();
  assert.equal(addedWith["eqazyna-fill"], undefined);
  assert.equal(addedWith["eqazyna-line"], undefined);
  assert.deepEqual(order.slice(-2), ["eqazyna-fill", "eqazyna-line"]);
  assert(order.indexOf("eqazyna-fill") > order.indexOf("kz-line"));
  assert(order.indexOf("eqazyna-fill") > order.indexOf("kz15m-raster"));
  assert(order.indexOf("eqazyna-fill") > order.indexOf("geo-fill"));
  assert(order.indexOf("eqazyna-fill") > order.indexOf("base-labels"));
  assert(order.indexOf("eqazyna-line") > order.indexOf("eqazyna-fill"));

  map.addLayer({ id: "detail-m43xxxi-raster", type: "raster" }, "kz-line");
  assert(order.indexOf("detail-m43xxxi-raster") < order.indexOf("eqazyna-fill"));
  assert(order.indexOf("detail-m43xxxi-raster") < order.indexOf("kz-line"));

  map.addLayer({ id: "late-overlay", type: "raster" });
  assert(order.indexOf("late-overlay") > order.indexOf("eqazyna-line"));
  const tg = w.document.getElementById("eqazyna-toggle");
  tg.checked = true;
  tg.dispatchEvent(new w.Event("change"));
  assert.deepEqual(order.slice(-2), ["eqazyna-fill", "eqazyna-line"]);
  assert(order.indexOf("eqazyna-fill") > order.indexOf("late-overlay"));
  assert(order.indexOf("eqazyna-fill") > order.indexOf("detail-m43xxxi-raster"));

  console.log("PASS e-qazyna license layers stay on top of other overlays regardless of add order.");
})();
