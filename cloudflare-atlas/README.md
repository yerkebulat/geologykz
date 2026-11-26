# kzgeology on Cloudflare Workers

One app, two Workers, same code:

- `kzgeology-public` — public site, no login, no paleogeographic / palinspastic reconstruction maps
- `kzgeology-atlas-app` — same app behind the existing password cookie, including those paleo maps

Processed map layers and 1:200,000 PMTiles live in the private R2 bucket `kzgeology-atlas-tiles`. They are not in this repository. Raw TIFF, KMZ and PDF originals are not served.

## Test links (workers.dev, phase 1)

DNS is unchanged. Live Vercel sites stay up.

- Public: https://kzgeology-public.yerkebulantazabek.workers.dev
- Atlas: https://kzgeology-atlas-app.yerkebulantazabek.workers.dev

## Deploy (manual, from this folder)

Needs Wrangler logged in to the Cloudflare account that already has the R2 bucket.

```bash
npm install
# first time, or after adding/changing processed layers:
#   DATA_ROOT=/absolute/path/to/atlas-public node scripts/upload-data.mjs
npx wrangler deploy
npx wrangler deploy --env atlas
# atlas only, once per account, value from local secret file via stdin (do not paste in chat or commit):
#   printf '%s' "$ATLAS_PASSWORD_HASH" | npx wrangler secret put ATLAS_PASSWORD_HASH --env atlas
```

Workers Builds is connected for the `main` branch, with this `cloudflare-atlas` folder as the root. Secrets stay in the dashboard, never in the repo.

## Cutover (not done in phase 1)

1. Add kzgeology.com as a Cloudflare zone (it is currently on Vercel DNS: ns1/ns2.vercel-dns.com).
2. Copy existing records first: apex and www stay pointed at Vercel; do not change nameservers until those records exist.
3. Change nameservers at the registrar to Cloudflare.
4. Attach `kzgeology.com` / `www` or keep the public site on Vercel until you are ready, then point them at `kzgeology-public`. Attach `atlas.kzgeology.com` to `kzgeology-atlas-app` as a Worker custom domain.
5. Leave the Vercel deployments in place until the Worker sites are confirmed. Rollback is pointing the records back to Vercel.

## Credits

Each map should show a short source line in the legend. A site note asks rights holders who object to contact us so the map can be removed. The 1:1,500,000 lithology, faults and deposits layer is credited to Prof. Bespalov. 1:200,000 sheets are Gosgeolkarta scans from Mail.ru and geokniga.org.
