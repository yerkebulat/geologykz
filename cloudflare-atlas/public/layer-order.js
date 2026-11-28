/* One place that decides the draw order of every map layer.
   Bands, bottom to top:
     basemap, hillshade, user-ordered rasters/scans/fills (Active Layers order),
     polygon outlines (plus licenses and process layers), line layers and borders,
     point layers and stress bars, place labels, tool drawings.
   Callers add layers anywhere, then call window.atlasLayerOrder.apply(map, ctx). */
(function () {
  "use strict";
  var OURS = /^(atlas-|eqazyna-|process-|geo200-)/;
  var TOOL = /^atlas-(measure|sketch|profile|gps|sel)-/;
  var BAND = { BASE: 0, HILL: 1, FILL: 2, OUTLINE: 3, LINE: 4, POINT: 5, LABEL: 6, TOOL: 7 };

  // Returns { band, tier } for a style layer. Tier sorts pinned groups inside a band.
  function classify(l, ctx) {
    var id = l.id || "", type = l.type;
    if (TOOL.test(id)) return { band: BAND.TOOL, tier: 0 };
    if (id === "atlas-hillshade" || type === "hillshade") return { band: BAND.HILL, tier: 0 };
    if (!OURS.test(id)) {
      if (id === "sat" || type === "background") return { band: BAND.BASE, tier: 0 };
      if (/^boundary_/.test(id)) return { band: BAND.LINE, tier: -1 };
      if (type === "symbol") return { band: BAND.LABEL, tier: 0 };
      return { band: BAND.BASE, tier: 0 };
    }
    if (id.indexOf("eqazyna-") === 0) return { band: BAND.OUTLINE, tier: 4 };
    if (id.indexOf("process-") === 0) return { band: BAND.OUTLINE, tier: 3 };
    if (id === "geo200-outline") return { band: BAND.OUTLINE, tier: 0 };
    if (id.indexOf("geo200-label") === 0) return { band: BAND.OUTLINE, tier: 2 };
    if (id === "atlas-grid-line") return { band: BAND.OUTLINE, tier: 1 };
    if (id === "atlas-grid-label") return { band: BAND.OUTLINE, tier: 2 };
    if (ctx && ctx.isBar && ctx.isBar(id)) return { band: BAND.POINT, tier: 0 };
    var dep = ctx && ctx.pinnedPoint && ctx.pinnedPoint(id) ? 1 : 0;
    if (type === "circle" || type === "symbol") return { band: BAND.POINT, tier: dep };
    if (type === "line") return { band: /-ol$/.test(id) ? BAND.OUTLINE : BAND.LINE, tier: 0 };
    return { band: BAND.FILL, tier: 0 };
  }

  // Desired bottom-to-top list of layer ids.
  function plan(layers, ctx) {
    var rank = ctx && ctx.rank ? ctx.rank : function () { return -1; };
    var rows = layers.map(function (l, i) {
      var c = classify(l, ctx);
      return { id: l.id, band: c.band, tier: c.tier, rank: c.band >= BAND.FILL && c.tier === 0 ? rank(l.id) : 0, i: i };
    });
    rows.sort(function (a, b) {
      return a.band - b.band || a.tier - b.tier || a.rank - b.rank || a.i - b.i;
    });
    return rows.map(function (r) { return r.id; });
  }

  // Moves only what is out of place. Returns the number of moves.
  function apply(map, ctx) {
    if (!map || map.__atlasOrdering) return 0;
    var style = map.getStyle && map.getStyle();
    var layers = style && style.layers;
    if (!layers || !layers.length) return 0;
    var want = plan(layers, ctx), cur = layers.map(function (l) { return l.id; });
    var moves = 0;
    map.__atlasOrdering = true;
    try {
      for (var i = cur.length - 1; i >= 0; i--) {
        if (cur[i] === want[i]) continue;
        var from = cur.indexOf(want[i]);
        cur.splice(from, 1);
        cur.splice(i, 0, want[i]);
        try { map.moveLayer(want[i], i + 1 < want.length ? want[i + 1] : undefined); moves++; } catch (e) {}
      }
    } finally { map.__atlasOrdering = false; }
    return moves;
  }

  window.atlasLayerOrder = { BAND: BAND, classify: classify, plan: plan, apply: apply };
})();
