// Unit check of the central draw-order helper (cloudflare-atlas/public/layer-order.js) on a fake map.
const fs = require("fs"), path = require("path"), assert = require("assert"), vm = require("vm");
const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, "../cloudflare-atlas/public/layer-order.js"), "utf8"), ctx);
const LO = ctx.window.atlasLayerOrder;

function fakeMap(initial) {
  const order = initial.slice();
  return {
    order,
    getStyle: () => ({ layers: order.map((l) => ({ ...l })) }),
    moveLayer(id, before) {
      const i = order.findIndex((l) => l.id === id); const [l] = order.splice(i, 1);
      if (before === undefined) order.push(l); else order.splice(order.findIndex((x) => x.id === before), 0, l);
    }
  };
}
const L = (id, type) => ({ id, type });
const basemap = [L("background", "background"), L("water", "fill"), L("highway_minor", "line"), L("boundary_3", "line"), L("boundary_2", "line"), L("label_city", "symbol"), L("label_country_1", "symbol")];
const stackRank = { "atlas-ov-seismic": 0, "atlas-ov-glim": 1 }; // seismic below glim
const c = {
  rank: (id) => (id in stackRank ? stackRank[id] : -1),
  isBar: (id) => id.startsWith("atlas-ov-wsm"),
  pinnedPoint: (id) => id === "atlas-ov-deposits"
};
const idx = (m, id) => m.order.findIndex((l) => l.id === id);
const above = (m, a, b) => assert(idx(m, a) > idx(m, b), a + " should be above " + b);

// Worst case: everything added last, in the "wrong" order, sat below labels or above them.
const m = fakeMap(basemap.concat([
  L("atlas-ov-glim", "fill"), L("atlas-ov-glim-ol", "line"), L("atlas-ov-glim-ln", "line"),
  L("atlas-ov-seismic", "raster"),
  L("atlas-ov-faults", "line"), L("atlas-ov-quakes", "circle"), L("atlas-ov-deposits", "circle"),
  L("atlas-ov-wsm", "line"), L("atlas-ov-wsm-halo", "line"), L("atlas-ov-wsm-dot", "circle"),
  L("atlas-m-x-fl", "fill"), L("atlas-m-x-ln", "line"), L("atlas-m-x-pt", "circle"),
  L("geo200-fill", "fill"), L("geo200-outline", "line"), L("geo200-scan-a", "raster"), L("geo200-label", "symbol"),
  L("eqazyna-fill", "fill"), L("eqazyna-line", "line"), L("process-open-cells-fill", "fill"),
  L("atlas-hillshade", "hillshade"), L("sat", "raster"),
  L("atlas-measure-line", "line"), L("atlas-gps-dots", "circle"), L("atlas-profile-line", "line"), L("atlas-sketch-line", "line"), L("atlas-sel-point", "circle"),
  L("atlas-grid-line", "line")
]));
LO.apply(m, c);
const tool = ["atlas-measure-line", "atlas-gps-dots", "atlas-profile-line", "atlas-sketch-line", "atlas-sel-point"];
const pts = ["atlas-ov-quakes", "atlas-ov-deposits", "atlas-ov-wsm", "atlas-ov-wsm-halo", "atlas-ov-wsm-dot", "atlas-m-x-pt"];
const lines = ["atlas-ov-faults", "atlas-ov-glim-ln", "atlas-m-x-ln", "boundary_2", "boundary_3"];
const outl = ["atlas-ov-glim-ol", "geo200-outline", "eqazyna-fill", "eqazyna-line", "process-open-cells-fill", "atlas-grid-line"];
const user = ["atlas-ov-glim", "atlas-ov-seismic", "atlas-m-x-fl", "geo200-fill", "geo200-scan-a"];
tool.forEach((t) => ["label_city", "label_country_1"].forEach((lb) => above(m, t, lb)));
["label_city", "label_country_1"].forEach((lb) => pts.forEach((p) => above(m, lb, p)));
pts.forEach((p) => lines.forEach((l) => above(m, p, l)));
lines.forEach((l) => outl.forEach((o) => above(m, l, o)));
outl.forEach((o) => user.forEach((u) => above(m, o, u)));
user.forEach((u) => above(m, u, "atlas-hillshade"));
above(m, "atlas-hillshade", "sat");
above(m, "sat", "water");
above(m, "atlas-ov-glim", "atlas-ov-seismic"); // drag order kept inside the user band
above(m, "atlas-ov-deposits", "atlas-ov-quakes"); // pinned deposits on top of other points
above(m, "eqazyna-fill", "process-open-cells-fill"); // licenses over process layers
above(m, "atlas-ov-wsm-dot", "atlas-ov-wsm-halo");

// Idempotent: second run moves nothing.
assert.strictEqual(LO.apply(m, c), 0);

// Dragging in Active Layers swaps ranks; only the user band changes.
stackRank["atlas-ov-seismic"] = 5;
assert(LO.apply(m, c) > 0);
above(m, "atlas-ov-seismic", "atlas-ov-glim");
above(m, "atlas-ov-quakes", "atlas-ov-seismic");
above(m, "boundary_2", "atlas-ov-seismic");

// A raster enabled last lands in the user band, under points, lines, borders and tools.
m.order.push(L("atlas-ov-newraster", "raster"));
stackRank["atlas-ov-newraster"] = 9;
LO.apply(m, c);
above(m, "atlas-ov-newraster", "atlas-ov-seismic");
["atlas-ov-quakes", "atlas-ov-faults", "boundary_2", "atlas-measure-line", "atlas-gps-dots", "eqazyna-fill"].forEach((id) => above(m, id, "atlas-ov-newraster"));

// Basemap style reset puts new basemap layers below everything of ours.
m.order.unshift(L("water2", "fill"));
m.order.push(L("road_label", "symbol"));
LO.apply(m, c);
above(m, "atlas-ov-newraster", "water2");
above(m, "atlas-measure-line", "road_label");
above(m, "road_label", "atlas-ov-quakes");
console.log("PASS layer order bands");
