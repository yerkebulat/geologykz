# M-43-XXXI detailed map processing

One selected first sheet only. No original JPG/TIFF or lossless intermediate goes into git. Source and rights: `docs/data/detailed/m43xxxi/provenance.json` and `RIGHTS.md`. This processing adds no grant of rights to the map.

Use a separate workspace, with Python numpy, scipy, rasterio, affine, pyproj, shapely, opencv-python-headless and Pillow (pilot: numpy2.4/rasterio1.5.2/shapely2.2/OpenCV5/Pillow13). Download `M-43-XXXI.jpg` from the URL in provenance into `sources/`; verify its SHA256. Do not use the lower-res source GeoTIFF as unexplained control evidence.

From the processing workspace:
```
mkdir -p work
cp /path/to/repo/tools/detailed-maps/m43xxxi-legend-boxes.json work/boxes.json
python /path/to/repo/tools/detailed-maps/georef.py
python /path/to/repo/tools/detailed-maps/segment.py
python /path/to/repo/tools/detailed-maps/tiles.py
```

Output: `build/data/detailed/m43xxxi/`. Override `DETAILED_OUTPUT` if needed. `BORDER_GEOJSON` optionally overrides the default current repository country boundary, which includes Baikonur. Scripts operate relative to your processing workspace, not the repository. Provenance/rights files are curated and must accompany an export.

Registration: nine manually read graticule intersections, quadratic inverse remap. Assumed EPSG:4284 to EPSG:3857; datum is not explicitly confirmed on scan. Fit RMS1.53 native pixels (~26m at17m/native pixel), max2.20px; leave-one-out1.75–8.08px. These are internal fit residuals, NOT independent absolute accuracy. Source printed scale1:200,000. Rendering32m Mercator (~21m ground), tiles256px z7–12. Parent visually checked Scan/Colors framing, controls and representative popups; independent landmark/high-zoom/mobile pilot verification remains incomplete.

Colors:25 transcribed swatches, cross-section-only Q excluded. Dark linework removal and median/majority filtering are approximate. No SAM, OCR-based identification, or nearest-neighbor missing-geology fill. Small classified patches retained rather than creating artificial holes. Near-identical colors list candidates. Historic Sn and printed uncertainty are preserved. Broad white Q3-4 is a real source unit. Water classifier is approximate. At release16,424 polygons, all valid, candidates attached. Do not claim field-grade detail.

Runtime: manifest/legend/vector loaded only after selecting sheet or zooming to it; raster tiles requested only in Scan mode. Production default remains detailed off, Macrostrat on, base on, 1967 off. URL resolution is relative to document base, including GitHub Pages `/geologykz/` subpath.

Tests:
```
node --check docs/detailed.js
# jsdom development dependency can be installed outside repo; no runtime dependency:
NODE_PATH=/path/to/jsdom/node_modules node tests/detailed-lifecycle.cjs
python tests/detailed-assets.py
```

## East Kazakhstan shared family (batch 3)

`family.py east1976-config.json SOURCE_DIR WORK_DIR OUTPUT_DIR BORDER_GEOJSON` builds four native 1:500k sheets together from the pre-downloaded `east_*.jpg` originals. Exact filenames, manually read geographic controls, actual native legend swatch boxes and source URLs are in the configuration; source hashes and fit/LOO residuals accompany every output. Reuse the corrected repository Kazakhstan border. The 160 sampled stratigraphic / intrusion-matrix swatches and their native descriptions are stored once under `data/detailed/east1976`, not duplicated for each map. Codes/ages are **native image references, not invented transcriptions**, and candidate sets are non-unique and not exhaustive. Whole native legend/context plates include the original title and credits. Prints are 1979; source catalog / series is 1976.

Scans use 110m Web Mercator pixels and bounded z7–11 XYZ; approximate Colors uses ~220m Mercator pixels (~140m ground at50N). Labelled native frame controls (12 on Semipalatinsk/Zharma,8 on Leninogorsk/Ust-Kamenogorsk) fit a quadratic inverse remap, with Pulkovo1942 assumed rather than confirmed. Fit/LOO errors measure internal grid consistency, not absolute or independently surveyed accuracy. All frame picks are approximate (recorded uncertainty8 native pixels); interior landmarks have not been independently verified. No false field-grade claims. Water exclusion is an approximate competing color sampled from the labelled Seyten lake on the Semipalatinsk original, with a separate actual Bukhtarma reservoir sample for the paler Ust-Kamenogorsk scan; hatches, text and similar lithologic colors remain limitations. No source-white global exclusion, nearest-neighbor missing-geology fill or removal of small classified regions. Native source-derived assets remain outside any software license, with no open redistribution license established.

Lean check: `python tests/detailed-family-assets.py`. Originals, arrays, source crops and visual intermediates remain in the external work directory and are never committed. Use one grouped release rather than per-sheet UI changes.
