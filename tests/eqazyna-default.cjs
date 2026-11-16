const fs = require("fs"), assert = require("assert"), { JSDOM } = require("jsdom");
const root = require("path").join(__dirname, "../docs/");

function boot(storageKey, storageVal) {
  const d = new JSDOM(fs.readFileSync(root + "index.html", "utf8"), { runScripts: "outside-only", url: "https://kzgeology.com/" });
  const w = d.window;
  if (storageKey) w.localStorage.setItem(storageKey, storageVal);
  w.eval(fs.readFileSync(root + "eqazyna-config.js", "utf8"));
  w.eval(fs.readFileSync(root + "preferences.js", "utf8"));
  const req = [];
  w.fetch = async (url) => {
    req.push(String(url));
    return { ok: true, json: async () => ({ type: "FeatureCollection", features: [], layers: [], metadata: { counts: {} } }) };
  };
  const layers = {}, sources = {};
  const map = {
    addSource: (id, s) => { sources[id] = Object.assign({ setData() {} }, s); },
    addLayer: (l) => { layers[l.id] = l; },
    getSource: (id) => sources[id],
    getLayer: (id) => layers[id],
    setLayoutProperty: (id, k, v) => ((layers[id].layout ||= {})[k] = v),
    getLayoutProperty: (id, k) => layers[id]?.layout?.[k],
    setFeatureState() {},
    getCanvas: () => ({ style: {} }),
    queryRenderedFeatures: () => [],
    on() {}
  };
  w.eval(fs.readFileSync(root + "eqazyna.js", "utf8"));
  w.dispatchEvent(new w.CustomEvent("geologykz:load", { detail: map }));
  return { w, req, layers, sources };
}

(function () {
  const fresh = boot();
  assert(fresh.w.document.getElementById("kz15m-toggle").checked);
  assert(fresh.w.document.getElementById("geo-toggle").checked);
  assert(!fresh.w.document.getElementById("detail-toggle").checked);
  assert(!fresh.w.document.getElementById("eqazyna-toggle").checked);
  assert.equal(fresh.layers["eqazyna-fill"].layout.visibility, "none");
  assert.equal(fresh.req.length, 0);
  assert(!fresh.w.localStorage.getItem("geologykz-ui-v6"));

  const v5 = boot("geologykz-ui-v5", JSON.stringify({
    version: 5,
    checks: { "detail-toggle": false, "geo-toggle": true, "kz15m-toggle": true, "kz-toggle": true, "base-toggle": true, "eqazyna-toggle": true },
    ranges: { "detail-opacity": 1, "geo-opacity": 0.7, "kz15m-opacity": 0.85 },
    nationalMode: "colors",
    base: "light",
    satellite: "eox"
  }));
  assert(!v5.w.document.getElementById("eqazyna-toggle").checked);
  assert(v5.w.document.getElementById("geo-toggle").checked);
  assert(v5.w.document.getElementById("kz15m-toggle").checked);
  assert.equal(v5.req.length, 0);

  const tg = v5.w.document.getElementById("eqazyna-toggle");
  tg.checked = true;
  tg.dispatchEvent(new v5.w.Event("change"));
  assert(v5.req.some((u) => u.includes("yerkebulantazabek.workers.dev")));
  assert.equal(v5.layers["eqazyna-fill"].layout.visibility, "visible");

  console.log("PASS e-qazyna default off; no worker fetch until the toggle is checked; v5 on-flag is not kept.");
})();
