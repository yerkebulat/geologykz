/* Layer order: the one place that decides how every map layer is stacked.

   Bands, bottom to top (BANDS below):
     basemap    base style shapes and the satellite layer
     hillshade  terrain shading
     raster     user-ordered rasters, scans and fill polygons (Active Layers drag order ranks layers inside this band)
     outline    polygon outlines, licenses, process layers
     line       line layers (faults, contacts, sections), country/admin borders
     point      point layers, deposits, stress bars
     label      place labels, sheet labels, cluster counts
     tool       measure, profile, GPS, sketch, click highlight

   How to add a layer: do nothing. Add it anywhere with map.addLayer (no beforeId needed); its band comes from its type:
     raster, fill, fill-extrusion -> raster     line -> line (id ending in -ol or -outline -> outline)
     circle, heatmap -> point                   symbol -> label        hillshade -> hillshade
   To choose another band, either
     - add "band": "line" to its catalog entry in maps.json (applies to every layer of that map), or
     - put metadata: { "atlas:band": "line" } on the layer definition, or
     - add a row to RULES below (an id pattern, an optional type, a band and an optional tier).
   Layers of one band keep their Active Layers order; tier > 0 pins a group above the rest of its band.
   After any add, move, toggle, basemap switch or compare-mode copy the order is restored by
   window.atlasLayerOrder.apply(map, ctx); app.js also runs it on every styledata event. */
(function () {
  "use strict";
  var BANDS = ["basemap", "hillshade", "raster", "outline", "line", "point", "label", "tool"];
  var ALIAS = { fill: "raster", scan: "raster", border: "line", polygon: "raster", outlines: "outline", points: "point", labels: "label", tools: "tool" };

  // Special cases by layer id. First match wins. tier: higher sits above the rest of its band.
  var RULES = [
    { re: /^atlas-(measure|sketch|profile|gps|sel)(-|$)/, band: "tool" },
    { re: /^atlas-hillshade$/, band: "hillshade" },
    { re: /^sat$/, band: "basemap" },
    { re: /^eqazyna-/, band: "outline", tier: 4 },                             // licenses
    { re: /^process-/, type: "circle", band: "point", tier: 0.5 },             // process cluster dots
    { re: /^process-/, band: "outline", tier: 3 },                             // open to apply, at auction, PUGFN
    { re: /^geo200-label/, band: "outline", tier: 2 },                         // 1:200k sheet names sit over outlines, under points
    { re: /^atlas-grid-line$/, band: "outline", tier: 1 },
    { re: /^atlas-grid-label$/, band: "outline", tier: 2 },
    { re: /^atlas-ov-mineral-kz-deposits(-|$)/, tier: 1 }                      // deposits stay on top of other points
  ];

  function bandIndex(name) {
    if (name == null) return -1;
    name = String(name).toLowerCase();
    if (ALIAS[name]) name = ALIAS[name];
    return BANDS.indexOf(name);
  }
  function byType(id, type) {
    if (type === "raster" || type === "fill" || type === "fill-extrusion") return "raster";
    if (type === "line") return /(^|-)(ol|outline)$/.test(id) ? "outline" : "line";
    if (type === "circle" || type === "heatmap") return "point";
    if (type === "symbol") return "label";
    if (type === "hillshade") return "hillshade";
    return "basemap";
  }
  // Layers that belong to the base style: they come with a source-layer, or are the background.
  function isBase(l) { return l.type === "background" || l["source-layer"] != null; }

  // Returns { band, tier } for one style layer. ctx.band(id) may return a catalog band name.
  function classify(l, ctx) {
    var id = l.id || "", type = l.type, band = -1, tier = 0, i, r;
    var meta = l.metadata && l.metadata["atlas:band"];
    if (meta != null) band = bandIndex(meta);
    if (band < 0 && ctx && ctx.band) band = bandIndex(ctx.band(id));
    if (band < 0 && ctx && ctx.isBar && ctx.isBar(id)) band = bandIndex("point");   // stress bars are lines drawn as points
    if (ctx && ctx.pinnedPoint && ctx.pinnedPoint(id)) tier = 1;
    for (i = 0; i < RULES.length; i++) {
      r = RULES[i];
      if (r.re.test(id) && (!r.type || r.type === type)) {
        if (band < 0 && r.band) band = bandIndex(r.band);
        if (r.tier != null && !tier) tier = r.tier;
        if (band >= 0 || r.tier != null) break;
      }
    }
    if (band < 0) {
      if (isBase(l) || id === "sat") {
        if (type === "symbol") return { band: bandIndex("label"), tier: 9 };           // place labels above our own labels
        if (l["source-layer"] === "boundary") return { band: bandIndex("line"), tier: -1 }; // country/admin borders
        return { band: bandIndex("basemap"), tier: 0 };
      }
      band = bandIndex(byType(id, type));
    }
    return { band: band, tier: tier };
  }

  // Desired bottom-to-top list of layer ids.
  function plan(layers, ctx) {
    var rank = ctx && ctx.rank ? ctx.rank : function () { return -1; };
    var rows = layers.map(function (l, i) {
      var c = classify(l, ctx);
      return { id: l.id, band: c.band, tier: c.tier, rank: c.tier === 0 ? rank(l.id) : 0, i: i };
    });
    rows.sort(function (a, b) { return a.band - b.band || a.tier - b.tier || a.rank - b.rank || a.i - b.i; });
    return rows.map(function (r) { return r.id; });
  }

  // Moves only what is out of place, top down. Returns the number of moves.
  function apply(map, ctx) {
    if (!map || map.__atlasOrdering) return 0;
    var style = map.getStyle && map.getStyle();
    var layers = style && style.layers;
    if (!layers || !layers.length) return 0;
    var want = plan(layers, ctx), cur = layers.map(function (l) { return l.id; }), moves = 0;
    map.__atlasOrdering = true;
    try {
      for (var i = cur.length - 1; i >= 0; i--) {
        if (cur[i] === want[i]) continue;
        cur.splice(cur.indexOf(want[i]), 1);
        cur.splice(i, 0, want[i]);
        try { map.moveLayer(want[i], i + 1 < want.length ? want[i + 1] : undefined); moves++; } catch (e) {}
      }
    } finally { map.__atlasOrdering = false; }
    return moves;
  }

  var api = { BANDS: BANDS, RULES: RULES, classify: classify, plan: plan, apply: apply };
  if (typeof window !== "undefined") window.atlasLayerOrder = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
