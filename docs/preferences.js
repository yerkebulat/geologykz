/* Versioned, validated local choices. Storage is optional; Info details never auto-open. */
(function () {
  const key = "geologykz-ui-v6", prev5 = "geologykz-ui-v5", prev4 = "geologykz-ui-v4", prev3 = "geologykz-ui-v3";
  const checks = ["detail-toggle", "geo-toggle", "kz15m-toggle", "kz-toggle", "base-toggle", "eqazyna-toggle"];
  const ranges = ["detail-opacity", "geo-opacity", "kz15m-opacity"];
  const on = ["geo-toggle", "kz15m-toggle", "kz-toggle", "base-toggle"];
  const SATS = ["eox", "esri", "maptiler"];
  const BASES = ["light", "dark", "satellite", "hybrid", "terrain", "topo", "otm"];
  const defaults = {
    version: 6,
    checks: Object.fromEntries(checks.map((id) => [id, on.includes(id)])),
    ranges: { "detail-opacity": 1, "geo-opacity": 0.7, "kz15m-opacity": 0.85 },
    nationalMode: "colors",
    base: "light",
    satellite: "eox"
  };

  function valid(s, list, ver, opts) {
    opts = opts || {};
    if (!s || s.version !== ver) return false;
    if (!list.every((id) => typeof s.checks?.[id] === "boolean")) return false;
    if (!ranges.every((id) => typeof s.ranges?.[id] === "number" && Number.isFinite(s.ranges[id]) && s.ranges[id] >= 0 && s.ranges[id] <= 1)) return false;
    if (!["scan", "colors"].includes(s.nationalMode) || !BASES.includes(s.base)) return false;
    if (opts.satellite && !SATS.includes(s.satellite)) return false;
    return true;
  }
  function toV6(old, eqazynaOn) {
    return {
      version: 6,
      checks: {
        "detail-toggle": !!old.checks["detail-toggle"],
        "geo-toggle": !!old.checks["geo-toggle"],
        "kz15m-toggle": !!old.checks["kz15m-toggle"],
        "kz-toggle": !!old.checks["kz-toggle"],
        "base-toggle": !!old.checks["base-toggle"],
        "eqazyna-toggle": !!eqazynaOn
      },
      ranges: {
        "detail-opacity": old.ranges["detail-opacity"],
        "geo-opacity": old.ranges["geo-opacity"],
        "kz15m-opacity": old.ranges["kz15m-opacity"]
      },
      nationalMode: old.nationalMode,
      base: old.base,
      satellite: SATS.includes(old.satellite) ? old.satellite : "eox"
    };
  }
  function fromLegacy(old) {
    const anyDetail = !!(old.checks["detail-toggle"] || old.checks["detail-all-200k"] || old.checks["detail-all-500k"] || old.checks["detail-show"]);
    return toV6({
      checks: {
        "detail-toggle": anyDetail,
        "geo-toggle": old.checks["geo-toggle"],
        "kz15m-toggle": old.checks["kz15m-toggle"],
        "kz-toggle": old.checks["kz-toggle"],
        "base-toggle": old.checks["base-toggle"]
      },
      ranges: old.ranges,
      nationalMode: old.nationalMode,
      base: old.base,
      satellite: old.satellite
    }, false);
  }
  function migrate(s) {
    if (valid(s, checks, 6, { satellite: true })) return s;
    function read(k) {
      try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; }
    }
    let old = s;
    if (!valid(old, checks, 5, { satellite: true })) old = read(prev5);
    // Keep other v5 choices, but always start e-qazyna off. A saved true may be
    // from an earlier visit or test, not a deliberate choice on this panel.
    if (valid(old, checks, 5, { satellite: true })) return toV6(old, false);
    const v4checks = ["detail-all-200k", "detail-all-500k", "detail-show", "detail-coverage", "geo-toggle", "kz15m-toggle", "kz-toggle", "base-toggle", "eqazyna-toggle"];
    const v3checks = v4checks.filter((id) => id !== "eqazyna-toggle");
    old = read(prev4);
    if (valid(old, v4checks, 4)) return fromLegacy(old);
    old = read(prev3);
    if (valid(old, v3checks, 3)) {
      old = { ...old, checks: { ...old.checks, "eqazyna-toggle": false } };
      return fromLegacy(old);
    }
    return defaults;
  }

  let saved;
  try { saved = JSON.parse(localStorage.getItem(key)); } catch (e) {}
  const state = migrate(saved);
  checks.forEach((id) => { document.getElementById(id).checked = state.checks[id]; });
  ranges.forEach((id) => { document.getElementById(id).value = state.ranges[id]; });

  function save() {
    try {
      const value = {
        version: 6,
        checks: Object.fromEntries(checks.map((id) => [id, document.getElementById(id).checked])),
        ranges: Object.fromEntries(ranges.map((id) => [id, +document.getElementById(id).value])),
        nationalMode: document.querySelector('#kz15m-mode [aria-checked="true"]').dataset.mode,
        base: document.querySelector('#basemap-switch [aria-checked="true"]')?.dataset.base || "light",
        satellite: window.geologykzGetSatellite?.() || state.satellite || "eox"
      };
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) { /* Private/blocked/quota storage: keep this visit usable. */ }
  }
  window.geologykzPreferences = { save, satellite: state.satellite, nationalMode: state.nationalMode, base: state.base };
  ["change", "input", "click"].forEach((type) => document.getElementById("layer-panel").addEventListener(type, save));
  document.getElementById("map-help").addEventListener("click", () => {
    const b = document.getElementById("map-help"), p = document.getElementById("map-help-text");
    p.hidden = !p.hidden;
    b.setAttribute("aria-expanded", String(!p.hidden));
  });
  window.addEventListener("geologykz:load", () => queueMicrotask(() => {
    window.geologykzSetSatellite?.(state.satellite);
    window.geologykzKz15m?.mode(state.nationalMode);
    window.geologykzSetBasemap?.(state.base);
    document.getElementById("base-toggle").dispatchEvent(new Event("change"));
  }));
})();
