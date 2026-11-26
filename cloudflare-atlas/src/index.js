/* Same app for the public site and the password-gated atlas.
   Data is served from R2 (processed layers and PMTiles only). */

const COOKIE = "atlas_session";
const MAX_AGE = 60 * 60 * 24 * 30;
const enc = new TextEncoder();

const SECURITY = {
  "Referrer-Policy": "same-origin",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
};

const NOINDEX = {
  "X-Robots-Tag": "noindex, nofollow, noarchive",
};

function isIndexable(request, isAtlas) {
  if (isAtlas) return false;
  const host = new URL(request.url).hostname.toLowerCase();
  return host === "kzgeology.com" || host === "www.kzgeology.com";
}

function baseHeaders(indexable) {
  return indexable ? { ...SECURITY } : { ...SECURITY, ...NOINDEX };
}

const TILE_RE = /^200k\/[A-Za-z0-9][A-Za-z0-9._-]*\.(pmtiles|json)$/;
const DATA_RE = /^data\/[A-Za-z0-9._/-]+$/;
const RAW_RE = /\.(tiff?|kmz|kml|pdf)$/i;
const PALEO_RE = /^data\/paleo-maps-/i;

function defaultHosts() {
  return [
    "kzgeology-public.yerkebulantazabek.workers.dev",
    "kzgeology-atlas-app.yerkebulantazabek.workers.dev",
    "kzgeology.com",
    "www.kzgeology.com",
    "atlas.kzgeology.com",
  ];
}

function allowedHosts(env) {
  const extra = String(env.ALLOWED_HOSTS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return new Set([...defaultHosts(), ...extra]);
}

function hostFromUrl(value) {
  if (!value) return null;
  try {
    return new URL(value).hostname.toLowerCase();
  } catch (e) {
    return null;
  }
}

function refererAllowed(request, env) {
  const allowed = allowedHosts(env);
  const origin = hostFromUrl(request.headers.get("origin"));
  const referer = hostFromUrl(request.headers.get("referer"));
  if (origin && !allowed.has(origin)) return false;
  if (referer && !allowed.has(referer)) return false;
  return true;
}

function b64u(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function unb64u(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    diff |= (a.charCodeAt(i % a.length) || 0) ^ (b.charCodeAt(i % b.length) || 0);
  }
  return diff === 0;
}

async function hmac(secret, msg) {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode("atlas-session-v1:" + secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(msg));
  return b64u(sig);
}

async function checkPassword(pw, stored) {
  const [alg, iter, salt, hash] = String(stored).trim().split("$");
  if (alg !== "pbkdf2" || !iter || !salt || !hash) return false;
  pw = String(pw).normalize("NFC").trim();
  const key = await crypto.subtle.importKey("raw", enc.encode(pw), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: unb64u(salt), iterations: Number(iter) },
    key,
    256
  );
  return safeEqual(b64u(bits), hash);
}

function getCookie(req, name) {
  const h = req.headers.get("cookie") || "";
  for (const part of h.split(/;\s*/)) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i) === name) return part.slice(i + 1);
  }
  return null;
}

async function validSession(req, secret) {
  if (!secret) return false;
  const v = getCookie(req, COOKIE);
  if (!v) return false;
  const [exp, sig] = v.split(".");
  if (!exp || !sig || !/^\d+$/.test(exp) || Number(exp) < Math.floor(Date.now() / 1000)) return false;
  return safeEqual(sig, await hmac(secret, exp));
}

function loginPage(msg, status = 401) {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Atlas</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#fafaf9;color:#1c1917;font:15px/1.5 Inter,system-ui,sans-serif;padding:24px;box-sizing:border-box}
.c{width:min(380px,100%);background:#fff;border:1px solid #e7e5e4;border-radius:14px;padding:32px 28px;box-shadow:0 1px 2px rgba(0,0,0,.04),0 4px 16px rgba(0,0,0,.04);text-align:center}
h1{margin:0 0 6px;font-size:26px;letter-spacing:-.02em;text-transform:uppercase}p{margin:0 0 18px;color:#78716c;font-size:14px}
form{display:flex;gap:8px}input{flex:1;min-width:0;padding:11px 14px;border:1px solid #e7e5e4;border-radius:10px;font:inherit}button{padding:11px 16px;border:0;border-radius:10px;background:#1c1917;color:#fff;font:inherit;font-weight:600;cursor:pointer}
.e{color:#b91c1c;margin:12px 0 0;font-size:13px}</style></head><body><div class="c"><h1>Atlas</h1><p>Private. Enter the password to continue.</p>
<form method="post" action="/__auth/login"><input type="password" name="password" autocomplete="current-password" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="Password" required autofocus><button type="submit">Enter</button></form>${msg ? `<p class="e">${msg}</p>` : ""}</div></body></html>`;
  return new Response(html, {
    status,
    headers: { ...SECURITY, ...NOINDEX, "Cache-Control": "private, no-store", "Content-Type": "text/html; charset=utf-8" },
  });
}

function deny(status, msg) {
  return new Response(msg, {
    status,
    headers: { ...SECURITY, ...NOINDEX, "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" },
  });
}

function isPaleoGroup(g) {
  const n = String((g && g.name) || "");
  return /^paleo\s*:/i.test(n) || /palinspastic|paleogeograph/i.test(n);
}

function isPaleoPath(pathname) {
  const p = pathname.replace(/^\/+/, "");
  return PALEO_RE.test(p);
}

function filterMaps(data) {
  if (!data || !Array.isArray(data.groups)) return data;
  return {
    ...data,
    groups: data.groups
      .filter((g) => !isPaleoGroup(g))
      .map((g) => ({
        ...g,
        maps: (g.maps || []).filter((m) => !isPaleoPath(m.file || "")),
      })),
  };
}

function contentType(key) {
  const name = String(key || "").split("?")[0].toLowerCase();
  const base = name.replace(/\/+$/, "");
  const file = base.split("/").pop() || "";
  if (name.endsWith(".html") || file === "" || file === "index" || file === "driller" || file === "game" || file === "strata") {
    return "text/html; charset=utf-8";
  }
  if (name.endsWith(".css")) return "text/css; charset=utf-8";
  if (name.endsWith(".js") || name.endsWith(".mjs")) return "text/javascript; charset=utf-8";
  if (name.endsWith(".json.gz")) return "application/json";
  if (name.endsWith(".json")) return "application/json; charset=utf-8";
  if (name.endsWith(".pmtiles")) return "application/vnd.pmtiles";
  if (name.endsWith(".webp")) return "image/webp";
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  if (name.endsWith(".svg")) return "image/svg+xml";
  if (name.endsWith(".woff2")) return "font/woff2";
  if (name.endsWith(".woff")) return "font/woff";
  if (name.endsWith(".ttf")) return "font/ttf";
  if (name.endsWith(".txt")) return "text/plain; charset=utf-8";
  return null;
}

function resolvedType(key, fallback) {
  return contentType(key) || (fallback && fallback !== "application/octet-stream" ? fallback : "application/octet-stream");
}

function cacheFor(key) {
  if (key.endsWith(".pmtiles") || /\/[^/]+\.(webp)$/.test(key)) {
    return "private, max-age=31536000, immutable";
  }
  if (key === "maps.json") return "private, max-age=300";
  return "private, max-age=86400";
}

function parseRange(header, size) {
  if (!header) return null;
  const m = /^bytes=(\d+)-(\d+)?$/.exec(header.trim());
  if (!m) return null;
  const start = Number(m[1]);
  const end = m[2] != null ? Number(m[2]) : size - 1;
  if (!Number.isFinite(start) || start < 0 || start >= size || end < start) return null;
  return { offset: start, length: Math.min(end, size - 1) - start + 1, start, end: Math.min(end, size - 1) };
}

async function rateLimit(request, env, bucket) {
  const ip = request.headers.get("cf-connecting-ip") || "0";
  const windowSec = 60;
  const limit = 180;
  const slot = Math.floor(Date.now() / 1000 / windowSec);
  const key = new Request(`https://atlas-rl.invalid/${bucket}/${ip}/${slot}`);
  try {
    const cache = caches.default;
    const hit = await cache.match(key);
    let n = 1;
    if (hit) n = Number(await hit.text()) + 1;
    const rec = new Response(String(n), {
      headers: { "Cache-Control": `max-age=${windowSec + 5}`, "Content-Type": "text/plain" },
    });
    await cache.put(key, rec);
    if (n > limit) return false;
  } catch (e) {
    return true;
  }
  return true;
}


async function readAsset(env, pathname) {
  const res = await env.ASSETS.fetch(new Request(new URL(pathname, "https://assets.local")));
  if (!res || !res.ok) return null;
  return res.text();
}

async function serveR2(env, key, request, indexable) {
  const obj = await env.TILES.head(key);
  if (!obj) return deny(404, "Not found");
  const size = obj.size;
  const range = parseRange(request.headers.get("Range"), size);
  const headers = {
    ...baseHeaders(indexable),
    "Content-Type": resolvedType(key),
    "Cache-Control": cacheFor(key),
    "Accept-Ranges": "bytes",
  };
  if (request.method === "HEAD" && !range) {
    headers["Content-Length"] = String(size);
    return new Response(null, { status: 200, headers });
  }
  const bodyObj = range
    ? await env.TILES.get(key, { range: { offset: range.offset, length: range.length } })
    : await env.TILES.get(key);
  if (!bodyObj) return deny(404, "Not found");
  if (range) {
    headers["Content-Range"] = `bytes ${range.start}-${range.end}/${size}`;
    headers["Content-Length"] = String(range.length);
    return new Response(bodyObj.body, { status: 206, headers });
  }
  headers["Content-Length"] = String(size);
  return new Response(bodyObj.body, { status: 200, headers });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const mode = env.SITE_MODE === "atlas" ? "atlas" : "public";
    const isAtlas = mode === "atlas";
    const secret = env.ATLAS_PASSWORD_HASH;
    const session = isAtlas ? await validSession(request, secret) : false;
    const indexable = isIndexable(request, isAtlas);
    const headersOut = baseHeaders(indexable);

    if (path === "/robots.txt") {
      const body = indexable ? "User-agent: *\nAllow: /\n" : "User-agent: *\nDisallow: /\n";
      return new Response(body, {
        headers: { ...headersOut, "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    if (path === "/config.js") {
      const body = `window.ATLAS_SITE=${JSON.stringify({ mode })};`;
      return new Response(body, {
        headers: { ...headersOut, "Cache-Control": "private, max-age=300", "Content-Type": "text/javascript; charset=utf-8" },
      });
    }

    if (isAtlas && path === "/__auth/login" && request.method === "POST") {
      if (!secret) return deny(503, "Atlas is not configured.");
      let pw = "";
      try {
        const ct = request.headers.get("content-type") || "";
        if (ct.includes("application/x-www-form-urlencoded")) {
          pw = new URLSearchParams(await request.text()).get("password") || "";
        } else {
          const f = await request.formData();
          pw = String(f.get("password") || "");
        }
      } catch (e) {}
      if (!pw || !(await checkPassword(pw, secret))) {
        await new Promise((r) => setTimeout(r, 800));
        return loginPage("Wrong password.");
      }
      const exp = String(Math.floor(Date.now() / 1000) + MAX_AGE);
      const token = exp + "." + (await hmac(secret, exp));
      return new Response(null, {
        status: 303,
        headers: {
          ...SECURITY,
          ...NOINDEX,
          Location: "/",
          "Cache-Control": "no-store",
          "Set-Cookie": `${COOKIE}=${token}; Path=/; Max-Age=${MAX_AGE}; HttpOnly; Secure; SameSite=Lax`,
        },
      });
    }

    if (isAtlas && path === "/__auth/logout") {
      return new Response(null, {
        status: 303,
        headers: {
          ...SECURITY,
          ...NOINDEX,
          Location: "/",
          "Cache-Control": "no-store",
          "Set-Cookie": `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`,
        },
      });
    }

    if (RAW_RE.test(path) || path.startsWith("/docs/")) {
      return deny(404, "Not found");
    }

    const wantsData =
      path === "/maps.json" || path.startsWith("/data/") || path.startsWith("/tiles/");

    if (wantsData) {
      if (!(await rateLimit(request, env, "data"))) return deny(429, "Too many requests");
      if (!refererAllowed(request, env)) return deny(403, "Forbidden");

      if (path.startsWith("/tiles/")) {
        if (isAtlas && !session) return deny(401, "Unauthorized");
        const key = path.slice("/tiles/".length).replace(/^\/+/, "");
        if (!TILE_RE.test(key)) return deny(404, "Not found");
        return serveR2(env, key, request, indexable);
      }

      if (path === "/maps.json") {
        if (isAtlas && !session) return deny(401, "Unauthorized");
        let raw = await readAsset(env, "/maps.json");
        if (raw == null) {
          const obj = await env.TILES.get("maps.json");
          if (!obj) return deny(404, "Not found");
          raw = await obj.text();
        }
        let data;
        try {
          data = JSON.parse(raw);
        } catch (e) {
          return deny(500, "Catalog error");
        }
        if (!isAtlas || !session) data = filterMaps(data);
        return new Response(JSON.stringify(data), {
          headers: {
            ...headersOut,
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": cacheFor("maps.json"),
          },
        });
      }

      if (path.startsWith("/data/")) {
        const key = path.replace(/^\/+/, "");
        if (!DATA_RE.test(key) || key.includes("..")) return deny(404, "Not found");
        if (isPaleoPath(key)) {
          if (!isAtlas || !session) return deny(403, "Forbidden");
        } else if (isAtlas && !session) {
          return deny(401, "Unauthorized");
        }
        const asset = await env.ASSETS.fetch(new Request(new URL("/" + key, "https://assets.local"), { method: request.method, headers: request.headers }));
        if (asset && asset.status === 200) {
          const headers = {
            ...headersOut,
            "Content-Type": resolvedType(key, asset.headers.get("content-type")),
            "Cache-Control": cacheFor(key),
          };
          const cl = asset.headers.get("content-length");
          if (cl) headers["Content-Length"] = cl;
          return new Response(asset.body, { status: 200, headers });
        }
        return serveR2(env, key, request, indexable);
      }
    }

    if (isAtlas && !session) {
      const accept = request.headers.get("accept") || "";
      if (request.method === "GET" && (accept.includes("text/html") || path === "/" || path.endsWith(".html"))) {
        if (!secret) return deny(503, "Atlas is not configured.");
        return loginPage("");
      }
      return deny(401, "Unauthorized");
    }

    if (request.method !== "GET" && request.method !== "HEAD") return deny(405, "Method not allowed");
    const asset = await env.ASSETS.fetch(request);
    const headers = new Headers(asset.headers);
    for (const [k, v] of Object.entries(headersOut)) headers.set(k, v);
    if (indexable) headers.delete("X-Robots-Tag");
    const typeKey = path === "/" ? "index.html" : path;
    const mapped = contentType(typeKey);
    if (mapped) headers.set("Content-Type", mapped);
    if (path === "/" || path.endsWith(".html") || path === "/driller" || path === "/game" || path === "/strata") {
      headers.set("Cache-Control", "private, max-age=0, must-revalidate");
    }
    return new Response(asset.body, { status: asset.status, headers });
  },
};
