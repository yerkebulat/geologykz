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
