# kzgeology on Cloudflare Workers

One app, two Workers, same code:

- `kzgeology-public` — public site, no login, no paleogeographic / palinspastic reconstruction maps
- `kzgeology-atlas-app` — same app behind the existing password cookie, including those paleo maps

Processed map layers and 1:200,000 PMTiles live in the private R2 bucket `kzgeology-atlas-tiles`. They are not in this repository. Raw TIFF, KMZ and PDF originals are not served.

R2 key prefixes:

- `public/` — public `maps.json` and non-paleo layers
- `paleo/` — atlas-only paleo layers
- `atlas/maps.json` — full atlas catalog
- `200k/` — PMTiles

The `public/` folder in this repo is the site shell only (HTML, CSS, JS, fonts). A CI deploy from git does not need any local data files.

## Deploy

From this folder, after `npm install`:

```bash
npx wrangler deploy
npx wrangler deploy --env atlas
```

The first command updates `kzgeology-public`. The second updates `kzgeology-atlas-app`. Both read layers from R2, so they work from a clean checkout.

Workers Builds should use this `cloudflare-atlas` folder as the root, on the `main` branch:

- Public hook: `npx wrangler deploy`
- Atlas hook (a separate Workers Builds connection on `kzgeology-atlas-app`): `npx wrangler deploy --env atlas`

Do not use `--env atlas` on the public hook. Secrets stay in the dashboard, never in the repo.

To replace processed layers (not part of a normal deploy):

```bash
PUBLIC_ROOT=/path/to/public-assets ATLAS_ROOT=/path/to/atlas-assets node scripts/upload-data.mjs
```

To set the atlas password hash once:

```bash
printf '%s' "$ATLAS_PASSWORD_HASH" | npx wrangler secret put ATLAS_PASSWORD_HASH --env atlas
```

## Credits

Each map should show a short source line in the legend. A site note asks rights holders who object to contact us so the map can be removed. The 1:1,500,000 lithology, faults and deposits layer is credited to Prof. Bespalov. 1:200,000 sheets are Gosgeolkarta scans from Mail.ru and geokniga.org.
