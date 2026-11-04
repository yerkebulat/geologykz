## Website (GitHub Pages)

The site is plain static files (no build step).

1. Copy the site files (`index.html`, `style.css`, `app.js`, `sheets.json`) into `/docs` on the `main` branch and push.
2. On GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch**.
3. Choose branch `main`, folder `/docs`, click **Save**.
4. After a minute the site is live at https://yerkebulat.github.io/geologykz/

Update sheet status by editing `docs/sheets.json` (`not_started` / `in_progress` / `done`).
When the map is ready, put `geology.pmtiles` in `docs/data/` and uncomment the layer block in `app.js`.
(Note: GitHub Pages files are limited to 100 MB; larger PMTiles should be hosted elsewhere, e.g. a release asset or object storage with CORS + range requests.)
