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
const L = (id, type, extra) => ({ id, type, ...(extra || {}) });
const B = (id, type, sl) => L(id, type, { "source-layer": sl }); // base style layers come with a source-layer
const basemap = [L("background", "background"), B("water", "fill", "water"), B("highway_minor", "line", "transportation"), B("boundary_3", "line", "boundary"), B("boundary_2", "line", "boundary"), B("label_city", "symbol", "place"), B("label_country_1", "symbol", "place")];
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

// Future layers: no placement needed. Band comes from the layer type, a catalog "band", or layer metadata.
const m2 = fakeMap(basemap.concat([
  L("atlas-ov-new-points", "circle"), L("atlas-ov-new-heat", "heatmap"), L("atlas-ov-new-lines", "line"), L("atlas-ov-new-fill", "fill"),
  L("atlas-ov-new-raster", "raster"), L("atlas-ov-new-ol", "line"), L("atlas-ov-new-text", "symbol"),
  L("donated-xyz-line", "line"), L("donated-xyz-pts", "circle"),
  L("atlas-ov-forced-line", "fill"), L("atlas-ov-forced-point", "line", { metadata: { "atlas:band": "point" } }), L("atlas-ov-catband", "raster")
]));
const c2 = { rank: () => -1, band: (id) => (id === "atlas-ov-forced-line" ? "line" : id === "atlas-ov-catband" ? "point" : null) };
LO.apply(m2, c2);
["atlas-ov-new-fill", "atlas-ov-new-raster"].forEach((u) => above(m2, "atlas-ov-new-ol", u));
["atlas-ov-new-ol"].forEach(() => above(m2, "atlas-ov-new-lines", "atlas-ov-new-ol"));
above(m2, "boundary_2", "atlas-ov-new-raster");
above(m2, "atlas-ov-new-lines", "atlas-ov-new-ol");
above(m2, "donated-xyz-line", "atlas-ov-new-ol");
["atlas-ov-new-points", "atlas-ov-new-heat", "donated-xyz-pts", "atlas-ov-forced-point", "atlas-ov-catband"].forEach((p) => {
  ["atlas-ov-new-lines", "atlas-ov-forced-line", "boundary_2", "atlas-ov-new-fill"].forEach((l) => above(m2, p, l));
  above(m2, "label_city", p);
});
above(m2, "atlas-ov-forced-line", "atlas-ov-new-ol"); // catalog override: a fill drawn in the line band
above(m2, "atlas-ov-new-text", "atlas-ov-new-points"); // our own symbol layers count as labels
above(m2, "label_city", "atlas-ov-new-text"); // base place labels stay above ours
assert.strictEqual(LO.apply(m2, c2), 0);

console.log("PASS layer order bands");
