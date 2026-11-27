# geologykz

Open geological maps of Kazakhstan. Live public site: [kzgeology.com](https://kzgeology.com). Password-gated atlas: [atlas.kzgeology.com](https://atlas.kzgeology.com). Code is this GitHub repo. Map data is not.

This file is for editors working from GitHub (for example OpenCode on a laptop) who do not have Cloudflare access. You can change the site shell and Worker code; a push to `main` deploys it. You cannot upload tiles, edit the live catalog, or touch secrets.

## What is live

The production app is **`cloudflare-atlas/`**. One codebase, two Workers, switched by the Wrangler var `SITE_MODE`:

- `public` (`kzgeology-public`) serves kzgeology.com and www.kzgeology.com. No login. Paleogeographic and palinspastic maps are stripped from the catalog.
- `atlas` (`kzgeology-atlas-app`) serves atlas.kzgeology.com. Same UI, behind a PBKDF2 password cookie, including those paleo maps.

Work in `cloudflare-atlas/` unless you have a specific reason not to.

Ignore or treat as legacy (old GitHub Pages site, processing notes, leftover tests). Do not deploy these, and do not add new live data to them:

- `docs/` (old Pages site, including large scanned-sheet assets)
- `data/`, `tools/`, `tests/`, `worker/`
- the root `README.md` (it describes the old Macrostrat Pages site)

## Deploy

Push to `main`. Cloudflare Workers Builds, with root **`/cloudflare-atlas`**, then runs:

- Public: `npx wrangler deploy` (Worker `kzgeology-public`)
- Atlas: `npx wrangler deploy --env atlas` (Worker `kzgeology-atlas-app`)

Do not pass `--env atlas` on the public hook. After a push, confirm both GitHub commit checks are green: `Workers Builds: kzgeology-public` and `Workers Builds: kzgeology-atlas-app`.

Prefer a branch for anything non-trivial, or keep commits small. A docs-only change at the repo root is safe to land on `main`. Deploy publishes the Worker and the `cloudflare-atlas/public/` shell only. It does not change R2 data.

## Repo layout (production)

```
cloudflare-atlas/
  wrangler.jsonc          # Worker names, SITE_MODE, asset bindings, routes
  src/index.js            # Worker: auth, R2 proxy, donate, About SPA routes
  public/                 # Static shell (HTML, CSS, JS, fonts, favicons)
    index.html            # Map page and all About HTML
    about.js              # About SPA routing
    app.js                # Map, layer list, legend
    style.css
    eqazyna.js            # Active licenses
    process-layers.js     # Open to apply, At auction, PUGFN
    geo200-pilot.js       # 1:200,000 geological sheets
    donate.js
    game.html, strata.html, driller.html
  scripts/upload-data.mjs # Owner-only R2 upload (needs Wrangler / Cloudflare)
```

## Worker routes (enough to edit safely)

`src/index.js` is the gate in front of static assets and R2. `wrangler.jsonc` lists `run_worker_first` paths (`/`, `/*.html`, `/data/*`, `/tiles/*`, `/maps.json`, `/__auth/*`, `/__donate`, About routes, and a few others). Paths not on that list (favicons, CSS, JS) are served as assets and are public even on the atlas.

- **`/maps.json`**, **`/data/*`**, **`/tiles/*`**: proxied from the private R2 bucket `kzgeology-atlas-tiles` (binding `TILES`). Rate-limited. `Origin` / `Referer` must be a host in `ALLOWED_HOSTS`. Atlas requires a valid session, except the public site catalog is already filtered. Paleo keys (`data/paleo-maps-*`) are atlas-only (403 otherwise). Raw `.tif`, `.tiff`, `.kmz`, `.kml`, `.pdf` and `/docs/*` are always 404. 1:200k PMTiles are only served under `/tiles/200k/<file>.pmtiles` or `.json`.
- **`/config.js`**: public, tiny, sets `window.ATLAS_SITE.mode` and the Turnstile site key.
- **Atlas login**: `ATLAS_PASSWORD_HASH` is a dashboard secret (format `pbkdf2$iterations$salt$hash`). Cookie `atlas_session` is an HMAC of the expiry. `POST /__auth/login` and `/__auth/logout`. Unauthenticated HTML gets the login page (401). Unauthenticated data and tile requests get 401.
- **`POST /__donate`**: map upload. Referer check, size cap (95 MB), rate limit (4 per hour per IP), Turnstile (`TURNSTILE_SECRET`), rights checkbox, then the file and `metadata.json` go to R2 under `inbox/`. Email notification uses the `SEND_EMAIL` binding. Donated files are not public; `/inbox` is 404. On atlas, donate still requires a session.

Do not rename Wrangler bindings or secret names (`TILES`, `ASSETS`, `SEND_EMAIL`, `SITE_MODE`, `ALLOWED_HOSTS`, `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET`, `ATLAS_PASSWORD_HASH`, `DONATE_NOTIFY`) without the owner.

## Where data lives

Data is **never** in git. That includes tiles, PMTiles, GeoJSON, scans, PDFs, and both `maps.json` files. The `cloudflare-atlas/public/` folder is the shell only.

Private R2 bucket: `kzgeology-atlas-tiles`.

| Prefix | What |
| --- | --- |
| `public/maps.json` | Catalog for the public site |
| `public/data/` | Public processed layers |
| `atlas/maps.json` | Full atlas catalog (includes paleo groups) |
| `paleo/` | Atlas-only paleo layers (`paleo/data/paleo-maps-...`) |
| `200k/` | 1:200,000 PMTiles (not uploaded by `upload-data.mjs`) |
| `usgs/` | USGS report-map PMTiles (not uploaded by `upload-data.mjs`) |
| `inbox/` | Donate uploads (private) |

## How to add a layer

The live catalog is not in this repository. The front end fetches `/maps.json` and renders `groups[]`. Each group has `id`, `name`, and `maps[]`. Each map typically has `id`, `title`, `file` (usually `data/...`), `kind` (`fill`, `line`, or `point`), optional `overlay`, `legend`, `cluster`, and `themes`. Group ids used in the UI include `geology`, `mining`, and `other`.

To publish a new catalog layer the owner must:

1. Prepare processed assets (vector JSON, webp rasters, or PMTiles). Do not serve raw TIFF, KMZ, or PDF.
2. Upload to the prefixes above (`cloudflare-atlas/scripts/upload-data.mjs`, which needs Wrangler logged into Cloudflare).
3. Update `public/maps.json` and/or `atlas/maps.json` in R2. If the layer should appear on the public site, it has to go in the public catalog and must not be a paleo path. `/maps.json` is cached for about five minutes.

**OpenCode can** change the shell and Worker, including About copy, CSS, hardcoded front-end layers, and route logic, then push to GitHub.

**OpenCode cannot** upload to R2, edit the live `maps.json`, set or read secrets, or use the Cloudflare dashboard. Ask the owner to publish data and catalog changes.

Some layers are wired in JavaScript, not only in `maps.json`: Geological maps 1:200k (`geo200-pilot.js` plus `/tiles/200k/`), Active licenses (`eqazyna.js`), Open to apply / At auction / PUGFN (`process-layers.js`), Kazakhstan orocline (`Li et al. 2018` in `app.js`), and the ITM layer in `app.js`. Changing those is a code change; changing a catalog-only overlay is a data change.

## Front end

- The map page and every About page are the same `index.html`. `about.js` is a History-API SPA: `/about`, `/about/made`, `/sources`, `/contribute`, `/open-source`, `/authors`, plus `#support` for the sponsor block. New About routes also need `isSitePage()` in `src/index.js` and the `run_worker_first` lists in `wrangler.jsonc`.
- Static files are cached. After you change `style.css`, `about.js`, `app.js`, or the other versioned scripts, bump the `?v=` query on the matching `<link>` or `<script>` in `index.html` (and other HTML pages if they reference the file).
- MapLibre GL JS is pinned to **5.24.1** from unpkg, UMD build (`maplibre-gl.js` and `maplibre-gl.css`). **Do not upgrade to 6.x.** 6.x has no UMD bundle and already broke the site.
- Default overlays when a visitor has no saved state: `mineral-kz-lithology`, `mineral-kz-faults`, `mineral-kz-deposits`.
- Mini-games live at `/game.html`, `/strata.html`, `/driller.html`.

## Local dev

From `cloudflare-atlas/`, after `npm install`:

```bash
npx wrangler dev
npx wrangler dev --env atlas
```

The shell will load. Map tiles and `/maps.json` often will not, unless the machine has Wrangler auth and R2 bindings. That is expected. You can still edit HTML, CSS, and JS, then push and verify on the live site. Do not put secrets in the repo; `.dev.vars` and `.secret` are gitignored.

## Content and style

- Sentence-case headings (example: `Geological maps 1:200k`, not `Geological Maps 1:200K`).
- No em dashes.
- Minimal UI. No helper or meta text, no filler subheads, no “changelog” or implementation trivia on the public pages.
- Short citations, like `Li et al. 2018`.
- Never write the word CERCAMS, in the UI, in comments, or in commits.
- The 1:1,500,000 geological map (and its fault and mineral-deposit layers) is credited to All-Union Aerogeological Trust, 1967, editor V. F. Bespalov. Keep that wording.
- Paleogeographic and palinspastic maps are atlas-only.
- Serve processed tiles and vectors only, never raw TIFF, KMZ, or PDF.
- [nedra.kz](https://nedra.kz/map/) is a text link in Sources only. Do not scrape, embed, or republish Nedra maps.

## Hard rules

- Never commit secrets: `.secret`, passwords, `ATLAS_PASSWORD_HASH`, the Turnstile secret, API tokens, cookies, or `.dev.vars`. Never print them, not even in a terminal log or a PR comment.
- The Turnstile *site* key is a public var in `wrangler.jsonc`. The Turnstile *secret* is not, and must stay in the dashboard.
- Do not change Wrangler binding or secret names without the owner.
- Never add tiles, PMTiles, GeoJSON, scans, PDFs, or `maps.json` to git.
- Test in a branch, or keep commits small. After a push to `main`, check that the Workers Builds commit statuses are green.
