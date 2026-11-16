/**
 * Public relay for the official Minerals (e-qazyna) subsoil-use map.
 * Proxies only allowlisted solid-mineral (TPI) license/contract layers
 * and the click attribute API. Reprojects EPSG:4284 to EPSG:4326.
 * No secrets.
 */

import { pulkovoToWgs84, wgs84ToPulkovo, transformFeatureCollection } from "./datum.js";

const ORIGIN = "https://minerals.e-qazyna.kz";
const ORIGIN_LAYERS = ORIGIN + "/ru/contracts-map-layers";
const ORIGIN_CLICK = ORIGIN + "/ru/contracts-map-click";
const UA = "kzgeology-eqazyna-relay/1.0 (+https://kzgeology.com)";
const CACHE_TTL_S = 12 * 3600; // 12 hours
const CLICK_CACHE_TTL_S = 5 * 60;
const ORIGIN_TIMEOUT_MS = 20000;
const ORIGIN_GAP_MS = 350;
const LAYER_CACHE_NAME = "eqazyna-layers-v1";

// Prefer current "system" register layers; add the revoked-exploration
// legacy layer, which the system set does not include. Skip other legacy
// TPI layers to avoid drawing the same block twice.
export const LAYERS = [
  { type: "С_ТпиЛицензияНаРазведку", group: "license", kind: "exploration", label: "Exploration license", color: "#1d6fa8" },
  { type: "С_ТпиЛицензияНаДобычу", group: "license", kind: "extraction", label: "Extraction license", color: "#0f766e" },
  { type: "С_ТпиЛицензияНаРазведкуИДобычу", group: "license", kind: "combined", label: "Exploration and extraction license", color: "#5b4cdb" },
  { type: "С_ТпиКонтрактНаРазведку", group: "contract", kind: "exploration", label: "Exploration contract", color: "#c2410c" },
  { type: "С_ТпиКонтрактНаДобычу", group: "contract", kind: "extraction", label: "Extraction contract", color: "#9f1239" },
  { type: "С_ТпиКонтрактНаРазведкуИДобычу", group: "contract", kind: "combined", label: "Exploration and extraction contract", color: "#7c2d12" },
  { type: "ТПИ_Лицензия_Разведка_Отозван", group: "revoked", kind: "revoked-exploration", label: "Revoked exploration license", color: "#6b7280" }
];

const LAYER_BY_TYPE = Object.fromEntries(LAYERS.map((l) => [l.type, l]));
const ALLOWED_TYPES = new Set(LAYERS.map((l) => l.type));

const FIXED_ORIGINS = new Set(["https://kzgeology.com", "https://www.kzgeology.com"]);
const LOCALHOST_RE = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

const KZ_LNG = [45, 90];
const KZ_LAT = [39, 57];

const inflight = new Map();

export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") return cors(request, new Response(null, { status: 204 }));
    if (request.method !== "GET" && request.method !== "HEAD") {
      return cors(request, json({ error: "method not allowed" }, 405));
    }
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";
    try {
      if (path === "/") return cors(request, health());
      if (path === "/layers") {
        if (!rateOk(request, "layers", 30)) return cors(request, json({ error: "rate limited" }, 429));
        return cors(request, await handleLayers(url, ctx));
      }
      if (path === "/click") {
        if (!rateOk(request, "click", 60)) return cors(request, json({ error: "rate limited" }, 429));
        return cors(request, await handleClick(url, ctx));
      }
      return cors(request, json({ error: "not found" }, 404));
    } catch (err) {
      console.log(JSON.stringify({ level: "error", path, message: String(err && err.message ? err.message : err) }));
      return cors(request, json({ error: "relay failed" }, 502));
    }
  }
};

function health() {
  return json({
    service: "kzgeology-eqazyna",
    ok: true,
    source: ORIGIN + "/ru/contracts-map",
    crs: { in: "EPSG:4284", out: "EPSG:4326", operation: "EPSG:15865" },
    layers: LAYERS.map(({ type, group, kind, label, color }) => ({ type, group, kind, label, color })),
    note: "Solid-mineral (TPI) licenses and contracts. System register layers plus revoked exploration licenses."
  });
}

async function handleLayers(url, ctx) {
  const type = url.searchParams.get("type");
  if (type) {
    if (!ALLOWED_TYPES.has(type)) return json({ error: "layer type not allowed" }, 400);
    return cachedResponse("layer:" + type, CACHE_TTL_S, ctx, () => buildOneLayer(type));
  }
  return cachedResponse("layer:all", CACHE_TTL_S, ctx, () => buildAllLayers());
}

async function buildOneLayer(type) {
  const raw = await fetchOriginLayer(type);
  const meta = LAYER_BY_TYPE[type];
  const shifted = transformFeatureCollection(raw, pulkovoToWgs84);
  shifted.features = shifted.features.map((f) => annotate(f, meta));
  return collectionBody(shifted, { types: [type], count: shifted.features.length });
}

async function buildAllLayers() {
  const all = [];
  const counts = {};
  for (let i = 0; i < LAYERS.length; i++) {
    if (i) await sleep(ORIGIN_GAP_MS);
    const meta = LAYERS[i];
    const raw = await fetchOriginLayer(meta.type);
    const shifted = transformFeatureCollection(raw, pulkovoToWgs84);
    counts[meta.type] = shifted.features.length;
    for (const f of shifted.features) all.push(annotate(f, meta));
  }
  return collectionBody({ type: "FeatureCollection", features: all }, { types: LAYERS.map((l) => l.type), count: all.length, counts });
}

function annotate(f, meta) {
  return {
    type: "Feature",
    id: f.id,
    properties: {
      id: f.id,
      type: meta.type,
      group: meta.group,
      kind: meta.kind,
      label: meta.label,
      color: meta.color
    },
    geometry: f.geometry
  };
}

function collectionBody(fc, extra) {
  const body = {
    type: "FeatureCollection",
    name: "tpi-subsoil-use",
    metadata: {
      source: ORIGIN + "/ru/contracts-map",
      attribution: "Unified Subsoil Use Platform, minerals.e-qazyna.kz",
      crs: "EPSG:4326",
      datum: "EPSG:4284 to EPSG:4326 via EPSG:15865 (Kazakhstan, Pulkovo 1942 to WGS 84)",
      fetchedAt: new Date().toISOString(),
      ...extra
    },
    features: fc.features
  };
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=" + CACHE_TTL_S,
      "X-CRS": "EPSG:4326"
    }
  });
}

async function fetchOriginLayer(type) {
  return coalesced("origin-layer:" + type, async () => {
    const url = ORIGIN_LAYERS + "?type=" + encodeURIComponent(type);
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json", "User-Agent": UA, Referer: ORIGIN + "/ru/contracts-map" },
      signal: AbortSignal.timeout(ORIGIN_TIMEOUT_MS)
    });
    if (!res.ok) throw new Error("origin layer " + type + " HTTP " + res.status);
    const text = await res.text();
    if (!text || text.charAt(0) === "<") throw new Error("origin layer " + type + " not JSON");
    const data = JSON.parse(text);
    if (!data || data.type !== "FeatureCollection") throw new Error("origin layer " + type + " is not a FeatureCollection");
    return data;
  });
}

async function handleClick(url, ctx) {
  const parsed = parseClickPoint(url.searchParams);
  if (parsed.error) return json({ error: parsed.error }, 400);
  const { lon, lat } = parsed;
  const key = "click:" + lon.toFixed(5) + "," + lat.toFixed(5);
  return cachedResponse(key, CLICK_CACHE_TTL_S, ctx, () => fetchClick(lon, lat));
}

function parseClickPoint(params) {
  let lon = num(params.get("lng") ?? params.get("lon") ?? params.get("x4326"));
  let lat = num(params.get("lat") ?? params.get("y4326"));
  if (lon == null || lat == null) {
    const x = num(params.get("x4284")), y = num(params.get("y4284"));
    if (x == null || y == null) return { error: "lng and lat (EPSG:4326) are required" };
    [lon, lat] = pulkovoToWgs84(x, y);
  }
  if (lon < KZ_LNG[0] || lon > KZ_LNG[1] || lat < KZ_LAT[0] || lat > KZ_LAT[1]) {
    return { error: "point is outside the supported area" };
  }
  return { lon, lat };
}

async function fetchClick(lon, lat) {
  const [x4284, y4284] = wgs84ToPulkovo(lon, lat);
  const q = new URL(ORIGIN_CLICK);
  q.searchParams.set("x4284", String(x4284));
  q.searchParams.set("y4284", String(y4284));
  q.searchParams.set("search", "");
  for (const layer of LAYERS) q.searchParams.append("layers", layer.type);
  const res = await fetch(q, {
    method: "GET",
    headers: { Accept: "application/json", "User-Agent": UA, Referer: ORIGIN + "/ru/contracts-map" },
    signal: AbortSignal.timeout(ORIGIN_TIMEOUT_MS)
  });
  if (!res.ok) throw new Error("origin click HTTP " + res.status);
  const raw = await res.json();
  const items = (Array.isArray(raw) ? raw : []).filter((it) => it && ALLOWED_TYPES.has(it.type)).map(normalizeClickItem);
  return json({
    features: items,
    crs: "EPSG:4326",
    query: { lng: lon, lat },
    source: ORIGIN + "/ru/contracts-map"
  });
}

function normalizeClickItem(it) {
  const meta = LAYER_BY_TYPE[it.type] || {};
  const model = it.model || {};
  return {
    id: it.id,
    type: it.type,
    group: meta.group,
    kind: meta.kind,
    label: meta.label,
    color: meta.color,
    title: str(it.title) || str(model["Компания"]) || "Unknown holder",
    company: str(model["Компания"]) || str(it.title),
    number: str(model["НомерКонтракта"]),
    issued: str(model["ДатаВыдачи"]),
    workType: str(model["ВидРаботы"]) || meta.label,
    status: str(it.status),
    locUrl: absUrl(it.locUrl),
    applicantUrl: absUrl(it.applicantUrl)
  };
}

function absUrl(path) {
  const s = str(path);
  if (!s) return null;
  if (s.startsWith("https://minerals.e-qazyna.kz/") && !s.includes("\\")) return s.split("#")[0];
  if (s.startsWith("/") && /^\/(ru|en|kz)\//.test(s) && !s.includes("\\")) {
    return ORIGIN + s.split("#")[0];
  }
  return null;
}

function str(v) {
  if (v == null) return "";
  return String(v).trim();
}

function num(v) {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": status && status >= 400 ? "no-store" : "public, max-age=60"
    }
  });
}

function allowedOrigin(origin) {
  return FIXED_ORIGINS.has(origin) || LOCALHOST_RE.test(origin);
}

function cors(request, response) {
  const origin = request.headers.get("Origin") || "";
  const headers = new Headers(response.headers);
  if (allowedOrigin(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Vary", "Origin");
  }
  headers.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type");
  headers.set("Access-Control-Max-Age", "86400");
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function coalesced(key, fn) {
  if (inflight.has(key)) return inflight.get(key);
  const p = Promise.resolve().then(fn).finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

async function cachedResponse(key, ttl, ctx, builder) {
  const cache = await caches.open(LAYER_CACHE_NAME);
  const cacheReq = new Request("https://kzgeology-eqazyna.cache/" + encodeURIComponent(key));
  const hit = await cache.match(cacheReq);
  if (hit) return hit;
  const res = await coalesced("build:" + key, builder);
  if (res.ok) {
    const stored = new Response(res.body, res);
    stored.headers.set("Cache-Control", "public, max-age=" + ttl);
    ctx.waitUntil(cache.put(cacheReq, stored.clone()));
    return stored;
  }
  return res;
}

const hits = new Map();
function rateOk(request, route, perMin) {
  const ip = request.headers.get("CF-Connecting-IP") || "local";
  const bucket = Math.floor(Date.now() / 60000);
  const key = route + ":" + ip + ":" + bucket;
  const n = (hits.get(key) || 0) + 1;
  hits.set(key, n);
  if (hits.size > 2000) {
    for (const k of hits.keys()) {
      if (!k.endsWith(":" + bucket) && !k.endsWith(":" + (bucket - 1))) hits.delete(k);
    }
  }
  return n <= perMin;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
