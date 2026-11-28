/* Public-site SEO: robots.txt, sitemap.xml, language URLs (/ru/, /kk/), translated
   server-rendered shell, and landing pages for every public map layer and 1:200,000 sheet.
   Everything is built from the public catalog at request time. No data is stored in git. */

import { filterMaps } from "./catalog.js";

export const SITE = "https://kzgeology.com";
const LANGS = ["en", "ru", "kk"];
const OG_IMAGE = SITE + "/og.png";
const SEO_V = "3"; // bump to drop cached pages after a template change
const SPA_PATHS = ["/", "/about", "/about/made", "/sources", "/contribute", "/open-source", "/authors"];
const LOCALE = { en: "en_US", ru: "ru_RU", kk: "kk_KZ" };
const CATALOG_TTL = 5 * 60 * 1000;

const T = {
  openOnMap: { en: "Open on map", ru: "Открыть на карте", kk: "Картада ашу" },
  maps: { en: "Maps", ru: "Карты", kk: "Карталар" },
  map: { en: "Map", ru: "Карта", kk: "Карта" },
  about: { en: "About", ru: "О проекте", kk: "Жоба туралы" },
  sources: { en: "Sources", ru: "Источники", kk: "Дереккөздер" },
  mapsTitle: { en: "Maps and 1:200,000 sheets", ru: "Карты и листы 1:200 000", kk: "Карталар және 1:200 000 парақтар" },
  layers: { en: "Map layers", ru: "Слои карты", kk: "Карта қабаттары" },
  sheetsH: { en: "Geological sheets at 1:200,000", ru: "Геологические листы 1:200 000", kk: "1:200 000 геологиялық парақтар" },
  sheet: { en: "Geological sheet", ru: "Геологический лист", kk: "Геологиялық карта парағы" },
  scale: { en: "Scale", ru: "Масштаб", kk: "Масштаб" },
  edition: { en: "Edition", ru: "Издание", kk: "Басылым" },
  series: { en: "Series", ru: "Серия", kk: "Серия" },
  year: { en: "Year", ru: "Год", kk: "Жыл" },
  extent: { en: "Extent", ru: "Охват", kk: "Қамту аумағы" },
  source: { en: "Source", ru: "Источник", kk: "Дереккөз" },
  group: { en: "Group", ru: "Группа", kk: "Топ" },
  legend: { en: "Legend", ru: "Легенда", kk: "Легенда" },
  adjacent: { en: "Adjacent sheets", ru: "Соседние листы", kk: "Көрші парақтар" },
  note: { en: "Note", ru: "Примечание", kk: "Ескертпе" },
  editor: { en: "Editor", ru: "Редактор", kk: "Редактор" },
  editorName: { en: "V. F. Bespalov", ru: "В. Ф. Беспалов", kk: "В. Ф. Беспалов" },
  bespalovShort: { en: "All-Union Aerogeological Trust, 1967 (editor V. F. Bespalov)", ru: "Всесоюзный аэрогеологический трест, 1967 (редактор В. Ф. Беспалов)", kk: "Бүкілодақтық аэрогеологиялық трест, 1967 (редакторы В. Ф. Беспалов)" },
  digitized: { en: "Digitized from", ru: "Оцифровано по", kk: "Мына дереккөзден цифрланған" },
  sheetCredit: {
    en: "Gosgeolkarta 1:200,000 geological sheets. Scans from Mail.ru and geokniga.org.",
    ru: "Листы геологической карты 1:200 000 (Госгеолкарта). Сканы с Mail.ru и geokniga.org.",
    kk: "1:200 000 геологиялық карта парақтары (Мемгеолкарта). Скандар Mail.ru және geokniga.org сайттарынан.",
  },
  authorsDesc: { en: "Authors and contributors of kzgeology.", ru: "Авторы и участники проекта kzgeology.", kk: "kzgeology жобасының авторлары мен қатысушылары." },
  homeDesc: {
    en: "Free geological maps of Kazakhstan in one viewer: the 1:1.5M geological map, {n} geological sheets at 1:200,000, faults, mineral deposits, seismicity and more. No login.",
    ru: "Бесплатные геологические карты Казахстана в одном просмотрщике: геологическая карта 1:1 500 000, {n} листов 1:200 000, разломы, месторождения, сейсмичность и другое. Без входа.",
    kk: "Қазақстанның тегін геологиялық карталары бір көрсеткіште: 1:1 500 000 геологиялық карта, 1:200 000 масштабтағы {n} парақ, жарылымдар, кен орындары, сейсмикалық белсенділік және т.б. Кірусіз.",
  },
  mapsDesc: {
    en: "All {l} map layers and {n} geological sheets at 1:200,000 on kzgeology, with sources and map extents.",
    ru: "Все {l} слоёв карты и {n} геологических листов 1:200 000 на kzgeology, с источниками и охватом.",
    kk: "kzgeology сайтындағы барлық {l} карта қабаты мен 1:200 000 масштабтағы {n} геологиялық парақ, дереккөздері мен қамту аумағымен.",
  },
  sheetDesc: {
    en: "Geological sheet {id} at 1:200,000, edition {ed}{year}. Covers {ext}. Open it on the kzgeology map, the free geological map viewer for Kazakhstan.",
    ru: "Геологический лист {id} масштаба 1:200 000, издание {ed}{year}. Охват: {ext}. Откройте его на карте kzgeology, бесплатной геологической карте Казахстана.",
    kk: "{id} геологиялық карта парағы, масштабы 1:200 000, {ed}-басылым{year}. Қамту аумағы: {ext}. Оны Қазақстанның тегін геологиялық картасы kzgeology-да ашыңыз.",
  },
  layerDesc: {
    en: "{title}: a layer in the {group} group on the kzgeology map. Source: {cite}.",
    ru: "{title}: слой группы «{group}» на карте kzgeology. Источник: {cite}.",
    kk: "{title}: kzgeology картасындағы «{group}» тобының қабаты. Дереккөз: {cite}.",
  },
  sheetTitle: { en: "Geological sheet {id}, 1:200,000", ru: "Геологический лист {id}, 1:200 000", kk: "{id} геологиялық карта парағы, 1:200 000" },
  yearPart: { en: ", {y}", ru: ", {y} год", kk: ", {y} жыл" },
  extentPart: { en: " Extent: {ext}.", ru: " Охват: {ext}.", kk: " Қамту аумағы: {ext}." },
  notFound: { en: "Page not found", ru: "Страница не найдена", kk: "Бет табылмады" },
};

function tr(key, lang, vars) {
  const row = T[key];
  let s = (row && (row[lang] || row.en)) || key;
  if (vars) for (const k of Object.keys(vars)) s = s.split("{" + k + "}").join(String(vars[k]));
  return s;
}

/* ---------- small helpers ---------- */

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function ldJson(obj) {
  return '<script type="application/ld+json">' + JSON.stringify(obj).replace(/</g, "\\u003c") + "</script>";
}

function trim(s, n) {
  s = String(s || "").replace(/\s+/g, " ").trim();
  if (s.length <= n) return s;
  const cut = s.slice(0, n - 1);
  const sp = cut.lastIndexOf(" ");
  return (sp > n * 0.6 ? cut.slice(0, sp) : cut).replace(/[ ,;:.]+$/, "") + "…";
}

function prefix(lang) {
  return lang === "en" ? "" : "/" + lang;
}

function localPath(lang, rest) {
  if (rest === "/") return lang === "en" ? "/" : "/" + lang + "/";
  return prefix(lang) + rest;
}

function absUrl(lang, rest) {
  return SITE + localPath(lang, rest);
}

function pick(obj, field, lang) {
  if (!obj) return "";
  if (lang === "ru" && obj[field + "_ru"]) return obj[field + "_ru"];
  if (lang === "kk" && obj[field + "_kk"]) return obj[field + "_kk"];
  return obj[field] || "";
}

function fmtDeg(n) {
  return Number(n).toFixed(2);
}

function extentText(b, lang) {
  if (!Array.isArray(b) || b.length < 4) return "";
  const [w, s, e, n] = b.map(Number);
  if (![w, s, e, n].every(Number.isFinite)) return "";
  if (lang === "ru") return `${fmtDeg(s)}–${fmtDeg(n)}° с. ш., ${fmtDeg(w)}–${fmtDeg(e)}° в. д.`;
  if (lang === "kk") return `${fmtDeg(s)}–${fmtDeg(n)}° с. е., ${fmtDeg(w)}–${fmtDeg(e)}° ш. б.`;
  return `${fmtDeg(s)}–${fmtDeg(n)}° N, ${fmtDeg(w)}–${fmtDeg(e)}° E`;
}

function zoomFor(b) {
  const [w, s, e, n] = b.map(Number);
  const dlon = Math.max(e - w, 0.01);
  const dlat = Math.max(n - s, 0.01);
  const lat = (s + n) / 2;
  const zl = Math.log2(1406 / dlon);
  const zt = Math.log2((843.75 * Math.cos((lat * Math.PI) / 180)) / dlat);
  const z = Math.min(zl, zt) - 0.5;
  return Math.round(Math.max(3, Math.min(12, z)) * 10) / 10;
}

function viewHash(b) {
  if (Array.isArray(b) && b.length >= 4 && b.every((x) => Number.isFinite(Number(x)))) {
    const [w, s, e, n] = b.map(Number);
    return `map=${zoomFor(b)}/${((s + n) / 2).toFixed(4)}/${((w + e) / 2).toFixed(4)}`;
  }
  return "map=4.4/48.5/67.0";
}

function slugOk(s) {
  return /^[a-z0-9][a-z0-9_-]{0,80}$/.test(s);
}

/* ---------- i18n table (parsed from the same i18n.js the browser loads) ---------- */

let STR_MEMO = null;

async function loadStrings(env, origin) {
  if (STR_MEMO) return STR_MEMO;
  const out = {};
  try {
    const res = await env.ASSETS.fetch(new Request(origin + "/i18n.js"));
    const src = await res.text();
    const re = /^\s*"([^"]+)":\s*\{\s*en:\s*("(?:[^"\\]|\\.)*"),\s*kk:\s*("(?:[^"\\]|\\.)*"),\s*ru:\s*("(?:[^"\\]|\\.)*")\s*\}/gm;
    let m;
    while ((m = re.exec(src))) {
      try {
        out[m[1]] = { en: JSON.parse(m[2]), kk: JSON.parse(m[3]), ru: JSON.parse(m[4]) };
      } catch (e) {}
    }
  } catch (e) {}
  if (Object.keys(out).length > 50) STR_MEMO = out;
  return out;
}

function sv(S, key, lang) {
  const r = S && S[key];
  return r ? r[lang] || r.en || "" : "";
}

/* ---------- catalog (public only) ---------- */

let CAT = null;
let SHEETS = null;

async function loadCatalog(env) {
  if (CAT && Date.now() - CAT.at < CATALOG_TTL) return CAT;
  const obj = await env.TILES.get("public/maps.json");
  if (!obj) return CAT || { at: Date.now(), maps: [], byId: {}, groups: [], uploaded: null };
  let data;
  try {
    data = filterMaps(JSON.parse(await obj.text()));
  } catch (e) {
    return CAT || { at: Date.now(), maps: [], byId: {}, groups: [], uploaded: null };
  }
  const maps = [];
  const byId = {};
  const groups = [];
  for (const g of data.groups || []) {
    const gm = [];
    for (const m of g.maps || []) {
      if (!m || !m.id || !slugOk(String(m.id).toLowerCase())) continue;
      const row = { ...m, _group: g };
      maps.push(row);
      gm.push(row);
      byId[String(m.id).toLowerCase()] = row;
    }
    groups.push({ g, maps: gm });
  }
  CAT = { at: Date.now(), maps, byId, groups, uploaded: obj.uploaded ? new Date(obj.uploaded).toISOString().slice(0, 10) : null };
  return CAT;
}

async function loadSheets(env) {
  if (SHEETS && Date.now() - SHEETS.at < CATALOG_TTL) return SHEETS;
  const obj = await env.TILES.get("public/data/geo200-pilot/sheets.json");
  if (!obj) return SHEETS || { at: Date.now(), list: [], bySlug: {}, uploaded: null, attribution: "" };
  let d;
  try {
    d = JSON.parse(await obj.text());
  } catch (e) {
    return SHEETS || { at: Date.now(), list: [], bySlug: {}, uploaded: null, attribution: "" };
  }
  const list = [];
  const bySlug = {};
  for (const s of d.sheets || []) {
    const slug = String(s.id || "").toLowerCase();
    if (!slugOk(slug) || !Array.isArray(s.bounds) || s.bounds.length < 4) continue;
    const row = { id: s.id, slug, edition: s.edition, series: s.series, bounds: s.bounds, year: s.year || null, source: s.source || null };
    list.push(row);
    bySlug[slug] = row;
  }
  list.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  SHEETS = { at: Date.now(), list, bySlug, uploaded: obj.uploaded ? new Date(obj.uploaded).toISOString().slice(0, 10) : null, attribution: d.attribution || "" };
  return SHEETS;
}

/* ---------- shared head tags ---------- */

function headTags({ lang, title, desc, rest, ogType, extra }) {
  const url = absUrl(lang, rest);
  let h = "";
  h += `<meta name="description" content="${esc(desc)}">`;
  h += `<link rel="canonical" href="${esc(url)}">`;
  for (const l of LANGS) h += `<link rel="alternate" hreflang="${l}" href="${esc(absUrl(l, rest))}">`;
  h += `<link rel="alternate" hreflang="x-default" href="${esc(absUrl("en", rest))}">`;
  h += `<meta property="og:site_name" content="kzgeology">`;
  h += `<meta property="og:type" content="${ogType || "website"}">`;
  h += `<meta property="og:title" content="${esc(title)}">`;
  h += `<meta property="og:description" content="${esc(desc)}">`;
  h += `<meta property="og:url" content="${esc(url)}">`;
  h += `<meta property="og:image" content="${OG_IMAGE}">`;
  h += `<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">`;
  h += `<meta property="og:locale" content="${LOCALE[lang]}">`;
  for (const l of LANGS) if (l !== lang) h += `<meta property="og:locale:alternate" content="${LOCALE[l]}">`;
  h += `<meta name="twitter:card" content="summary_large_image">`;
  h += `<meta name="twitter:title" content="${esc(title)}">`;
  h += `<meta name="twitter:description" content="${esc(desc)}">`;
  h += `<meta name="twitter:image" content="${OG_IMAGE}">`;
  h += extra || "";
  return h;
}

const PUBLISHER = { "@type": "Organization", name: "kzgeology", url: SITE + "/" };

/* ---------- server-rendered SPA shell (home and About pages) ---------- */

function spaMeta(rest, lang, S, sheetCount) {
  const sub = sv(S, "sub.maps", lang) || "Geological maps of Kazakhstan";
  const pageKey = { "/about": "about.h1", "/about/made": "made.h1", "/sources": "src.h1", "/contribute": "contrib.h1", "/open-source": "code.h1", "/authors": "authors.h1" }[rest];
  if (rest === "/") {
    const title = "kzgeology · " + sub;
    const desc = tr("homeDesc", lang, { n: sheetCount || 487 });
    return {
      title,
      desc,
      type: "website",
      ld: [{ "@context": "https://schema.org", "@type": "WebSite", name: "kzgeology", url: SITE + "/", description: desc, inLanguage: LANGS, publisher: PUBLISHER }],
    };
  }
  const h1 = sv(S, pageKey, lang) || pageKey;
  const title = h1 + " · kzgeology";
  const descKey = { "/about": "about.lead", "/about/made": "made.body", "/sources": "src.lead", "/contribute": "contrib.lead", "/open-source": "code.lead" }[rest];
  const desc = descKey ? trim(sv(S, descKey, lang), 200) : tr("authorsDesc", lang);
  const url = absUrl(lang, rest);
  return {
    title,
    desc,
    type: "website",
    ld: [
      {
        "@context": "https://schema.org",
        "@type": rest === "/about" ? "AboutPage" : "WebPage",
        name: title,
        description: desc,
        url,
        inLanguage: lang,
        isPartOf: { "@type": "WebSite", name: "kzgeology", url: SITE + "/" },
      },
    ],
  };
}

const SPA_LINKS = new Set(["/", "/about", "/about/made", "/sources", "/contribute", "/open-source", "/authors", "/maps"]);

async function renderSpa(env, request, rest, lang, ctxInfo) {
  const origin = new URL(request.url).origin;
  const S = await loadStrings(env, origin);
  const sh = await loadSheets(env).catch(() => null);
  const meta = spaMeta(rest, lang, S, sh && sh.list.length);
  const asset = await env.ASSETS.fetch(new Request(new URL("/", request.url)));
  const extra = meta.ld.map(ldJson).join("");
  const head = headTags({ lang, title: meta.title, desc: meta.desc, rest, ogType: meta.type, extra });
  const t = (key) => sv(S, key, lang);
  let rw = new HTMLRewriter()
    .on("html", {
      element(el) {
        el.setAttribute("lang", lang);
        el.setAttribute("data-ssr-title", meta.title);
        el.setAttribute("data-ssr-path", rest);
      },
    })
    .on("title", { element(el) { el.setInnerContent(meta.title); } })
    .on("head", { element(el) { el.append(head, { html: true }); } });
  if (lang !== "en") {
    rw = rw
      .on("[data-i18n]", {
        element(el) {
          const v = t(el.getAttribute("data-i18n"));
          if (!v) return;
          const attr = el.getAttribute("data-i18n-attr");
          if (attr) el.setAttribute(attr, v);
          else el.setInnerContent(v);
        },
      })
      .on("[data-i18n-html]", { element(el) { const v = t(el.getAttribute("data-i18n-html")); if (v) el.setInnerContent(v, { html: true }); } })
      .on("[data-i18n-aria]", { element(el) { const v = t(el.getAttribute("data-i18n-aria")); if (v) el.setAttribute("aria-label", v); } })
      .on("[data-i18n-title]", { element(el) { const v = t(el.getAttribute("data-i18n-title")); if (v) el.setAttribute("title", v); } })
      .on("[data-i18n-placeholder]", { element(el) { const v = t(el.getAttribute("data-i18n-placeholder")); if (v) el.setAttribute("placeholder", v); } })
      .on(".lang-switch [data-lang]", { element(el) { el.setAttribute("aria-pressed", String(el.getAttribute("data-lang") === lang)); } })
      .on('a[href^="/"]', {
        element(el) {
          const href = el.getAttribute("href") || "";
          const path = href.split("#")[0].split("?")[0];
          if (SPA_LINKS.has(path) && !href.startsWith("//")) el.setAttribute("href", prefix(lang) + (path === "/" ? "/" : href));
        },
      });
  } else {
    rw = rw.on(".lang-switch [data-lang]", { element(el) { el.setAttribute("aria-pressed", String(el.getAttribute("data-lang") === "en")); } });
  }
  return rw.transform(asset);
}

/* ---------- landing pages ---------- */

function page({ lang, rest, title, desc, ld, body, noindex }) {
  const head = headTags({ lang, title, desc, rest, ogType: "website", extra: (ld || []).map(ldJson).join("") });
  const switcher = LANGS.map((l) => {
    const label = { en: "EN", kk: "ҚАЗ", ru: "РУ" }[l];
    return l === lang
      ? `<span aria-current="true">${label}</span>`
      : `<a href="${esc(localPath(l, rest))}" hreflang="${l}" lang="${l}">${label}</a>`;
  }).join('<span class="sp-dot" aria-hidden="true">·</span>');
  const p = prefix(lang);
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
${noindex ? '<meta name="robots" content="noindex">' : ""}
<link rel="icon" href="/favicon.ico?v=bm1" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png?v=bm1">
<link rel="apple-touch-icon" href="/apple-touch-icon.png?v=bm1">
<link rel="preload" href="/fonts/source-serif-pro-semibold.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/seo.css?v=1">
${head}
</head>
<body>
<header class="sp-top">
<a class="sp-brand" href="${p}/">kzgeology</a>
<nav class="sp-nav" aria-label="${esc(tr("map", lang))}">
<a href="${p}/">${esc(tr("map", lang))}</a>
<a href="${p}/maps">${esc(tr("maps", lang))}</a>
<a href="${p}/about">${esc(tr("about", lang))}</a>
</nav>
<div class="sp-lang" role="group" aria-label="Language">${switcher}</div>
</header>
<main class="sp">
${body}
</main>
<footer class="sp-foot"><a href="${p}/sources">${esc(tr("sources", lang))}</a><a href="${p}/about">${esc(tr("about", lang))}</a><a href="${p}/authors">${{ en: "Authors", ru: "Авторы", kk: "Авторлар" }[lang]}</a></footer>
</body>
</html>`;
}

function crumbs(lang, items) {
  // items: [{name, rest}] last item has no link
  const p = prefix(lang);
  const html = items
    .map((it, i) => (i < items.length - 1 ? `<a href="${esc(it.rest === "/" ? p + "/" : p + it.rest)}">${esc(it.name)}</a>` : `<span>${esc(it.name)}</span>`))
    .join('<span class="sp-sep" aria-hidden="true">/</span>');
  const ld = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => {
      const e = { "@type": "ListItem", position: i + 1, name: it.name };
      if (it.url) e.item = it.url;
      return e;
    }),
  };
  return { html: `<nav class="sp-crumb" aria-label="Breadcrumb">${html}</nav>`, ld };
}

function facts(rows) {
  const r = rows.filter((x) => x[1] !== "" && x[1] != null);
  return '<dl class="sp-facts">' + r.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${v}</dd></div>`).join("") + "</dl>";
}

function sheetPage(sheet, lang, sheets) {
  const rest = "/sheets/" + sheet.slug;
  const ext = extentText(sheet.bounds, lang);
  const year = sheet.year ? tr("yearPart", lang, { y: sheet.year }) : "";
  const title = tr("sheetTitle", lang, { id: sheet.id });
  const desc = tr("sheetDesc", lang, { id: sheet.id, ed: sheet.edition, year, ext: ext.replace(/\.$/, "") });
  const credit = lang === "en" && sheets.attribution ? sheets.attribution : tr("sheetCredit", lang);
  const [w, s, e, n] = sheet.bounds;
  const deep = `${prefix(lang)}/#${viewHash(sheet.bounds)}&l=geo200&ov=`;
  const near = sheets.list
    .filter((o) => o.slug !== sheet.slug && o.bounds[0] <= e + 0.02 && o.bounds[2] >= w - 0.02 && o.bounds[1] <= n + 0.02 && o.bounds[3] >= s - 0.02)
    .slice(0, 12);
  const cr = crumbs(lang, [
    { name: "kzgeology", rest: "/", url: absUrl(lang, "/") },
    { name: tr("maps", lang), rest: "/maps", url: absUrl(lang, "/maps") },
    { name: sheet.id, rest },
  ]);
  const body =
    cr.html +
    `<h1>${esc(title)}</h1>` +
    `<p class="sp-lede">${esc(desc)}</p>` +
    facts([
      [tr("scale", lang), "1:200,000"],
      [tr("edition", lang), esc(sheet.edition)],
      [tr("series", lang), esc(sheet.series)],
      [tr("year", lang), sheet.year ? esc(sheet.year) : ""],
      [tr("extent", lang), esc(ext)],
      [tr("source", lang), esc(credit)],
    ]) +
    `<p><a class="sp-cta" href="${esc(deep)}">${esc(tr("openOnMap", lang))}</a></p>` +
    (near.length
      ? `<h2>${esc(tr("adjacent", lang))}</h2><ul class="sp-chips">` + near.map((o) => `<li><a href="${esc(prefix(lang) + "/sheets/" + o.slug)}">${esc(o.id)}</a></li>`).join("") + "</ul>"
      : "");
  const sheetLd = {
    "@context": "https://schema.org",
    "@type": "Map",
    name: title,
    description: desc,
    url: absUrl(lang, rest),
    inLanguage: lang,
    spatialCoverage: { "@type": "Place", geo: { "@type": "GeoShape", box: `${s} ${w} ${n} ${e}` } },
    isPartOf: { "@type": "CollectionPage", name: tr("mapsTitle", lang), url: absUrl(lang, "/maps") },
    publisher: PUBLISHER,
    isAccessibleForFree: true,
    citation: credit,
  };
  if (sheet.year) sheetLd.datePublished = String(sheet.year);
  return page({ lang, rest, title: title + " · kzgeology", desc, ld: [sheetLd, cr.ld], body });
}

const BESPALOV = {
  name: "Geological map of the Kazakh Soviet Socialist Republic and adjacent territories of the union republics",
  editor: "V. F. Bespalov",
  publisher: "All-Union Aerogeological Trust",
  year: "1967",
  scale: "1:1,500,000",
};

function layerPage(m, lang, S) {
  const rest = "/maps/" + String(m.id).toLowerCase();
  const gname = pick(m._group, "name", lang);
  const title = pick(m, "title", lang) || m.id;
  const bespalov = m.cite === "Prof. Bespalov";
  const citeText = bespalov
    ? `${tr("digitized", lang)}: ${sv(S, "about.cap1967", lang) || BESPALOV.name + ", " + BESPALOV.scale + ". " + BESPALOV.publisher + ", " + BESPALOV.year + "."} ${tr("editor", lang)}: ${tr("editorName", lang)}.`
    : m.cite || "";
  const citeShort = bespalov ? tr("bespalovShort", lang) : String(m.cite || "").replace(/[ .]+$/, "");
  const ext = extentText(m.bbox, lang);
  const desc = trim(tr("layerDesc", lang, { title, group: gname, cite: citeShort }) + (ext ? tr("extentPart", lang, { ext: ext.replace(/\.$/, "") }) : ""), 260);
  const hash = viewHash(m.bbox) + (m.overlay ? "&ov=" + encodeURIComponent(m.id) : "&m=" + encodeURIComponent(m.id) + "&ov=");
  const deep = `${prefix(lang)}/#${hash}`;
  const legend = (m.legend || []).filter((x) => x && (x.l || x.l_ru || x.l_kk));
  const shown = legend.slice(0, 80);
  const note = pick(m, "legendNote", lang);
  const cr = crumbs(lang, [
    { name: "kzgeology", rest: "/", url: absUrl(lang, "/") },
    { name: tr("maps", lang), rest: "/maps", url: absUrl(lang, "/maps") },
    { name: title, rest },
  ]);
  let body =
    cr.html +
    `<h1>${esc(title)}</h1>` +
    `<p class="sp-lede">${esc(desc)}</p>` +
    facts([
      [tr("group", lang), esc(gname)],
      [tr("extent", lang), esc(ext)],
      [tr("source", lang), esc(citeText)],
    ]) +
    `<p><a class="sp-cta" href="${esc(deep)}">${esc(tr("openOnMap", lang))}</a></p>`;
  if (note) body += `<p class="sp-note">${esc(note)}</p>`;
  if (shown.length) {
    body += `<h2>${esc(tr("legend", lang))}</h2><ul class="sp-legend">`;
    for (const x of shown) {
      const label = lang === "ru" && x.l_ru ? x.l_ru : lang === "kk" && x.l_kk ? x.l_kk : x.l;
      const c = /^#[0-9a-fA-F]{3,8}$/.test(x.c || "") ? x.c : "#999";
      body += `<li><span class="sp-sw" style="background:${c}"></span><span>${esc(label)}</span></li>`;
    }
    body += "</ul>";
  }
  const ld = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: title,
    description: desc,
    url: absUrl(lang, rest),
    inLanguage: lang,
    isAccessibleForFree: true,
    publisher: PUBLISHER,
    includedInDataCatalog: { "@type": "DataCatalog", name: "kzgeology", url: absUrl(lang, "/maps") },
    isPartOf: { "@type": "DataCatalog", name: "kzgeology", url: absUrl(lang, "/maps") },
    keywords: ["geology", "Kazakhstan", gname].filter(Boolean),
  };
  if (m.cite) ld.citation = bespalov ? `${BESPALOV.publisher}, ${BESPALOV.year}. ${BESPALOV.name}. Scale ${BESPALOV.scale}. Editor: ${BESPALOV.editor}.` : m.cite;
  if (bespalov) {
    ld.isBasedOn = {
      "@type": "Map",
      name: BESPALOV.name,
      description: "Scale " + BESPALOV.scale,
      datePublished: BESPALOV.year,
      editor: { "@type": "Person", name: BESPALOV.editor },
      publisher: { "@type": "Organization", name: BESPALOV.publisher },
    };
  }
  if (Array.isArray(m.bbox) && m.bbox.length >= 4) {
    const [w, s, e, n] = m.bbox;
    ld.spatialCoverage = { "@type": "Place", geo: { "@type": "GeoShape", box: `${s} ${w} ${n} ${e}` } };
  }
  return page({ lang, rest, title: title + " · kzgeology", desc, ld: [ld, cr.ld], body });
}

function zoneOf(id) {
  return String(id).split("_")[0].split("-").slice(0, 2).join("-");
}

function indexPage(lang, cat, sheets) {
  const rest = "/maps";
  const title = tr("mapsTitle", lang);
  const desc = tr("mapsDesc", lang, { l: cat.maps.length, n: sheets.list.length });
  const p = prefix(lang);
  const cr = crumbs(lang, [
    { name: "kzgeology", rest: "/", url: absUrl(lang, "/") },
    { name: tr("maps", lang), rest },
  ]);
  let body = cr.html + `<h1>${esc(title)}</h1><p class="sp-lede">${esc(desc)}</p>`;
  body += `<h2>${esc(tr("layers", lang))}</h2>`;
  for (const g of cat.groups) {
    if (!g.maps.length) continue;
    body += `<h3>${esc(pick(g.g, "name", lang))}</h3><ul class="sp-list">`;
    for (const m of g.maps) {
      body += `<li><a href="${esc(p + "/maps/" + String(m.id).toLowerCase())}">${esc(pick(m, "title", lang))}</a></li>`;
    }
    body += "</ul>";
  }
  body += `<h2>${esc(tr("sheetsH", lang))}</h2>`;
  const zones = new Map();
  for (const s of sheets.list) {
    const z = zoneOf(s.id);
    if (!zones.has(z)) zones.set(z, []);
    zones.get(z).push(s);
  }
  for (const [z, list] of zones) {
    body += `<h3>${esc(z)}</h3><ul class="sp-chips">` + list.map((s) => `<li><a href="${esc(p + "/sheets/" + s.slug)}">${esc(s.id)}</a></li>`).join("") + "</ul>";
  }
  const ld = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: title,
    description: desc,
    url: absUrl(lang, rest),
    inLanguage: lang,
    isPartOf: { "@type": "WebSite", name: "kzgeology", url: SITE + "/" },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: cat.maps.length,
      itemListElement: cat.maps.map((m, i) => ({ "@type": "ListItem", position: i + 1, name: pick(m, "title", lang), url: absUrl(lang, "/maps/" + String(m.id).toLowerCase()) })),
    },
  };
  return page({ lang, rest, title: title + " · kzgeology", desc, ld: [ld, cr.ld], body });
}

function notFoundPage(lang) {
  const t = tr("notFound", lang);
  const body = `<h1>${esc(t)}</h1><p><a class="sp-cta" href="${prefix(lang)}/maps">${esc(tr("maps", lang))}</a></p>`;
  return page({ lang, rest: "/maps", title: t + " · kzgeology", desc: t, ld: [], body, noindex: true });
}

/* ---------- sitemap and robots ---------- */

function sitemapAll(rest, lastmod) {
  // One <url> per language version, each listing all alternates.
  let x = "";
  for (const l of LANGS) {
    x += "<url><loc>" + esc(absUrl(l, rest)) + "</loc>";
    if (lastmod) x += "<lastmod>" + lastmod + "</lastmod>";
    for (const a of LANGS) x += `<xhtml:link rel="alternate" hreflang="${a}" href="${esc(absUrl(a, rest))}"/>`;
    x += `<xhtml:link rel="alternate" hreflang="x-default" href="${esc(absUrl("en", rest))}"/></url>`;
  }
  return x;
}

async function buildSitemap(env) {
  const cat = await loadCatalog(env);
  const sheets = await loadSheets(env);
  let x = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">';
  for (const rest of SPA_PATHS) x += sitemapAll(rest, null);
  x += sitemapAll("/maps", cat.uploaded);
  for (const m of cat.maps) x += sitemapAll("/maps/" + String(m.id).toLowerCase(), cat.uploaded);
  for (const s of sheets.list) x += sitemapAll("/sheets/" + s.slug, sheets.uploaded);
  x += "</urlset>\n";
  return { xml: x, urls: (SPA_PATHS.length + 1 + cat.maps.length + sheets.list.length) * LANGS.length };
}

export function robotsBody(indexable) {
  if (!indexable) return "User-agent: *\nDisallow: /\n";
  return [
    "User-agent: *",
    "Allow: /",
    "Disallow: /data/",
    "Disallow: /tiles/",
    "Disallow: /maps.json",
    "Disallow: /__auth/",
    "Disallow: /__donate",
    "Disallow: /inbox",
    "Disallow: /docs/",
    "Disallow: /*?lang=",
    "",
    "Sitemap: " + SITE + "/sitemap.xml",
    "",
  ].join("\n");
}

/* ---------- routing ---------- */

export function splitLang(path) {
  const m = /^\/(ru|kk)(\/.*)?$/.exec(path);
  if (m) return { lang: m[1], rest: m[2] || "", prefixed: true };
  return { lang: "en", rest: path, prefixed: false };
}

function htmlHeaders(extra) {
  return {
    "Content-Type": "text/html; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "same-origin",
    "X-Frame-Options": "DENY",
    ...extra,
  };
}

function redirect(location, status = 301) {
  return new Response(null, { status, headers: { Location: location, "Cache-Control": "public, max-age=3600", "X-Content-Type-Options": "nosniff" } });
}

async function cachedHtml(request, ctx, key, build, status = 200) {
  const cache = caches.default;
  const ck = new Request("https://seo-cache.invalid/" + SEO_V + "/" + key);
  let hit = null;
  try { hit = await cache.match(ck); } catch (e) {}
  let body;
  if (hit) {
    body = await hit.text();
  } else {
    body = await build();
    if (status === 200) {
      const rec = new Response(body, { headers: { "Cache-Control": "public, max-age=3600" } });
      try { ctx && ctx.waitUntil ? ctx.waitUntil(cache.put(ck, rec)) : await cache.put(ck, rec); } catch (e) {}
    }
  }
  const headers = htmlHeaders({ "Cache-Control": status === 200 ? "public, max-age=300, s-maxage=3600" : "no-store" });
  return new Response(request.method === "HEAD" ? null : body, { status, headers });
}

/* Returns a Response when the SEO layer handles the request, else null. Public site only. */
export async function seoRoute(request, env, ctx, path) {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const url = new URL(request.url);

  if (path === "/sitemap.xml") {
    const cache = caches.default;
    const ck = new Request("https://seo-cache.invalid/" + SEO_V + "/sitemap");
    let xml = null;
    try { const hit = await cache.match(ck); if (hit) xml = await hit.text(); } catch (e) {}
    if (!xml) {
      xml = (await buildSitemap(env)).xml;
      const rec = new Response(xml, { headers: { "Cache-Control": "public, max-age=3600" } });
      try { ctx && ctx.waitUntil ? ctx.waitUntil(cache.put(ck, rec)) : await cache.put(ck, rec); } catch (e) {}
    }
    return new Response(request.method === "HEAD" ? null : xml, {
      headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=300, s-maxage=3600", "X-Content-Type-Options": "nosniff" },
    });
  }

  const { lang, rest: rawRest, prefixed } = splitLang(path);
  if (prefixed && rawRest === "") return redirect(`/${lang}/${url.search}`);
  let rest = rawRest;

  // ?lang= on a public page: send to the language URL
  if (!prefixed || rest === "/" || SPA_PATHS.includes(rest)) {
    const q = url.searchParams.get("lang");
    if (q && (SPA_PATHS.includes(rest) || rest === "/")) {
      const want = q.toLowerCase().slice(0, 2) === "kz" ? "kk" : q.toLowerCase().slice(0, 2);
      if (LANGS.includes(want)) {
        const sp = new URLSearchParams(url.search);
        sp.delete("lang");
        const qs = sp.toString();
        return redirect(localPath(want, rest) + (qs ? "?" + qs : ""), 301);
      }
    }
  }

  // trailing slash on our own pages
  if (rest.length > 1 && rest.endsWith("/")) {
    const bare = rest.replace(/\/+$/, "");
    if (SPA_PATHS.includes(bare) || /^\/(maps|sheets)(\/|$)/.test(bare)) return redirect((prefixed ? "/" + lang : "") + bare + url.search);
  }

  if (SPA_PATHS.includes(rest)) {
    if (!prefixed) return null; // English pages are served by the main handler through renderSpa
    return renderSpa(env, request, rest, lang);
  }

  if (rest === "/maps") {
    return cachedHtml(request, ctx, `${lang}/maps`, async () => indexPage(lang, await loadCatalog(env), await loadSheets(env)));
  }

  const mm = /^\/maps\/([^/]+)$/.exec(rest);
  if (mm) {
    const id = mm[1];
    if (id !== id.toLowerCase()) return redirect((prefixed ? "/" + lang : "") + "/maps/" + id.toLowerCase());
    const cat = await loadCatalog(env);
    const m = cat.byId[id];
    if (!m) return new Response(request.method === "HEAD" ? null : notFoundPage(lang), { status: 404, headers: htmlHeaders({ "Cache-Control": "no-store", "X-Robots-Tag": "noindex" }) });
    const S = await loadStrings(env, url.origin);
    return cachedHtml(request, ctx, `${lang}/maps/${id}`, async () => layerPage(m, lang, S));
  }

  const sm = /^\/sheets\/([^/]+)$/.exec(rest);
  if (sm) {
    const id = sm[1];
    if (id !== id.toLowerCase()) return redirect((prefixed ? "/" + lang : "") + "/sheets/" + id.toLowerCase());
    const sheets = await loadSheets(env);
    const s = sheets.bySlug[id];
    if (!s) return new Response(request.method === "HEAD" ? null : notFoundPage(lang), { status: 404, headers: htmlHeaders({ "Cache-Control": "no-store", "X-Robots-Tag": "noindex" }) });
    return cachedHtml(request, ctx, `${lang}/sheets/${id}`, async () => sheetPage(s, lang, sheets));
  }

  if (prefixed) {
    return new Response(request.method === "HEAD" ? null : notFoundPage(lang), { status: 404, headers: htmlHeaders({ "Cache-Control": "no-store", "X-Robots-Tag": "noindex" }) });
  }
  return null;
}

export { renderSpa, SPA_PATHS };
