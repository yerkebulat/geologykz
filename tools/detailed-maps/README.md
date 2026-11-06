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

## Central Kazakhstan shared legend batch

`central1978-config.json` reproduces the two L-42-А / L-42-Б sheets with the same family builder. Originals: Geokniga3001/3002; four shared native plates3000. Source imprint says Moscow1981, while catalog series is1978. Native authors/institutional credits remain readable in complete plates; no open license has been established. Source-derived scans/excerpts/vectors are excluded from any software license.

226 actual sampled stratigraphic and intrusion-matrix references are stored once, with exact native description/header/cell excerpts. No code/age interpretation or unique assignment is claimed. Candidates remain non-unique and non-exhaustive.

Central has REAL BLACK/green mafic units: use `ink_filter: median_only`, never global dark-pixel inpainting. Actual white/blue geological swatches also exist. No reliable source-specific spectral water class was established, so these colors are NOT globally excluded and hydrographic linework is not independently interpreted. This avoids inventing water/white gaps; it does not claim reliable water boundaries. No nearest-neighbor geology fill, no small-region holes, and unchanged country clipping including Baikonur.

Eight manually read native degree/neatline controls per map, quadratic inverse remap, native-pixel fit and leave-one-out diagnostics are saved in georef.json. Assumed Pulkovo1942 datum is not confirmed. These are internal frame-grid fits, NOT absolute geographic accuracy; interior landmarks remain independently unverified.

```sh
python tools/detailed-maps/family.py tools/detailed-maps/central1978-config.json SOURCE_DIR WORK_DIR docs/data/detailed docs/data/kazakhstan_border.geojson
python tests/detailed-family-assets.py central1978-config.json
python tests/detailed-central-source.py SOURCE_DIR WORK_DIR
```

Source-dependent test samples a real pale mapped unit and the actual black-green mafic body in Dzhambul, checks palette/alpha preservation and original SHA256 provenance. Originals and processing arrays are not repository assets. Existing selected-sheet lazy loading and all off/default controls are unchanged.

Central's per-sheet `source-notice.webp` preserves native map-footer authors, institutions and1981print notice at original resolution; the sheet Legend page links it explicitly.

## Remaining East sheets (shared legend reused unchanged)

`east-completion-config.json` adds M-45-В Zyryanovsk3190 and L-45-А Zaysan3191, Geokniga maps/3190 and maps/3191. Actual print1979, catalog series1976. `reuse_legend: true` loads existing160reference Eastlegend and skips extraction/re-encoding/provenance rewrites. Native map footer notices remain per-sheet linked source excerpts; original rights status unchanged.

Native unpainted foreign paper is NOT pale geology. Georeferencing remains confined to labelled neatline and unchanged Kazakhstan country clipping. A manual source-pixel SE painted/blank boundary trace excludes clear paper fringes that survive current-country clipping; crop coordinates and approximate20px pick uncertainty are in config. This changes source coverage, NOT international borders. Zyryanovsk source painting east of the controlled87Eneatline is conservatively not extrapolated.

Named native water (Markakol, Bukhtarma reservoir/Lake Zaysan) uses bounded review windows only, observed median9 RGB green-vs-yellow ink separation and conservative actual-water interior polygons. Interior masks prevent bathymetric letters/contours becoming false geological islands; they do not claim modern surveyed shorelines. Actual pale mapped shore peninsulas are tested and retained. No global white/blue exclusion, no dark-pixel inpainting, no nearest-neighbor geological fill, no SAM. Fine shorelines/hatches/small features remain approximate.

```sh
python tools/detailed-maps/family.py tools/detailed-maps/east-completion-config.json SOURCE_DIR WORK_DIR docs/data/detailed docs/data/kazakhstan_border.geojson
python tests/detailed-family-assets.py east-completion-config.json
python tests/detailed-east-completion-source.py SOURCE_DIR WORK_DIR
```

Eight native frame controls each; RMS3.565/5.723px and leave-one-outmax20.297/35.168px are INTERNAL grid metrics, not absolute geographic accuracy. Assumed datum, interior distortion and independent landmarks remain unverified. Source-dependent tests check actual named-water interiors, pale mapped peninsulas and foreign/paper NoData, preserving lake water in Scan.

## South 1979 four-sheet continuation

`south1979-config.json` adds L-41-Г Kzyl-Orda2565, L-42-В Chiili2570, K-42-А Turkestan2555 and K-42-Б Chimkent2556. Source native imprint/catalog both1979. Reuses all178 original Alma/South reference entries and all three plate assets from Geokniga2550 byte-for-byte; `legend_pages` overrides the historical nested plate paths. Complete per-sheet footer notices and original SHA256 remain linked. No open redistribution license established.

Reproduce with `family.py south1979-config.json /workspace/geokniga_scans WORK docs/data/detailed docs/data/kazakhstan_border.geojson`. Native controls are eight labelled frame/graticule picks per sheet; internal quadratic fit and leave-one-out errors are in georef.json. Datum is assumedEPSG4284, no independent landmarks, not absolute/field-grade accuracy. Median-only classification preserves real dark and pale units, with candidate lists rather than unique unit/age interpretations. Native cyan lake windows on Chiili and Chimkent use per-sheet documented RGB rules and conservative cores, never a global blue/white/dark mask. Chimkent source-native unpainted southeast is traced as NoData, not filled. Fine rivers, hatch/shoreline and source-border placement remain approximate.

Checks: `tests/detailed-family-assets.py south1979-config.json`; `tests/detailed-south-source.py SOURCE WORK`; existing `tests/detailed-lifecycle.cjs`. All previous layers, corrected Baikonur border, UI defaults, lazy loading and shared legend files remain unchanged. No original JPEGs/intermediates committed.

## South historic-water continuation

`south-followon-config.json` adds L-41-В Kazalinsk2566, L-42-Г Svkh.Tasty2569, L-43-В Mynaral2572 and L-43-Г Ushtobe2571, all1:500,000 with actual Moscow1979 imprints. Same178-reference native Alma/South legend retained byte-for-byte. Source-only native Aral/Balkhash regions and median9 RGB rules describe historic scan paint, never a modern shoreline. Conservative deep-water cores suppress bathymetry/lettering false islands. `native_water_exclusions` explicitly protects native mapped островАкбасты/Косарал and о.Басарал/Ортаарал; RGB alone collides with~8.9% of an eroded Bassaral mapped-island sample. Island/shore traces are approximate, not independently surveyed. Fine bays/river lines remain limitations. Median-only classification retains true black and pale geological colors with non-unique native candidate references, not guessed codes/ages or SAM.

Reproduce: same `family.py` CLI with `south-followon-config.json`; source originals remain external. Check every asset with `tests/detailed-family-assets.py south-followon-config.json`, then source samples/islands/deep-water patches with `tests/detailed-south-followon-source.py SOURCE WORK`. Grid-fit/leave-one-out errors in per-sheet georef files are not absolute accuracy; EPSG4284 remains assumed. Native footer rights notices retained; no open redistribution license established, source-derived assets excluded from software license. Runtime/defaults/border unchanged.

## South L44 / Frunze continuation

`south-l44-config.json` adds Ayaguz2573, Makanchi2574, Taldy-Kurgan2576 and Frunze2559, all1:500,000 with actual Moscow1979 native imprints. Dzerzhinskoe2575 deferred: mostly unpainted foreign sheet, much less useful painted coverage than Frunze. Same178-reference South/Alma legend and old assets unchanged. Eight labelled frame controls/black-white graticule picks each; conservative20native-pixel pick uncertainty, assumedEPSG4284, internal fit/LOO not absolute accuracy.

Actual source БАЛХАШ/оз.Уялы/АЛАКОЛЬ/озероЗАЙСАН blue paint constrained to native lake regions/windows. Conservative cores avoid actual mapped islands/peninsulas; strong source-specific blue RGB rule preserves pale/black geology. Lacustrine annotations over water remain visible in Scan; Colors deliberately omits qualified water surface, not a complete sediment interpretation. Tiny features and coast placement remain approximate. No inferred modern shorelines, unique units/ages, SAM or NNfill.

Manual foreign-paper polygons are now only contextual ROIs (`native_unmapped_paper_only`), because direct polygon clipping demonstrably removed25,776/45,057/73,985colored native pixels. Raw near-white source components must touch a300px-inset blank-paper core, then close7/fill internal road/text holes. This source-only mask reduces colored-source collisions below0.01% of paper-mask pixels without global white exclusions; actual pale/black/blue unit samples are checked. Source foreign gaps remain NoData, never invented geology. Taldy-Kurgan uses7decimal serialization to avoid one demonstrated6decimal self-intersection of an originally valid polygon, not finer map accuracy; original validity/area-repair assertions unchanged.

Check `tests/detailed-family-assets.py south-l44-config.json`, `tests/detailed-south-l44-source.py SOURCE WORK`, existingjsdomlifecycle. Original scans/intermediates remain outsidegit; native source footer/rights/provenance retained. No map open license established, all source-derived assets excluded from software license. Runtime/defaults/UIstyles/Baikonur unchanged.

## South final qualified pair (native1979)

`south-final-config.json` reuses the existing178-reference South/Alma legend byte-for-byte for K44-А Przhevalsk2562 and K42-В Yangier2558. Both have useful actual Kazakhstan painting and readable native labelled frame controls and Moscow1979 imprints. K41-Б Gory Bukuntau2552 is **deferred**, not classified: yellow/tinted source paper shifts pale lithologic colors toward the shared legend's yellows; its useful northern strip is insufficient reason to invent a correction or turn blank tinted paper into geology. Mangit2551/Tashkent2557 are lower-priority mostly foreign sheets; standalone Central12247 has torn/stained paper and unproven legend family.

Use the existing `family.py` CLI/config and `tests/detailed-family-assets.py south-final-config.json`; source QA is `tests/detailed-south-final-source.py SOURCE WORK`. Native source-paper contextual masks and connected components do not globally discard white/pale units. Yangier's **named Chardara reservoir** has a bounded source-specific cyan mask, a conservative source open-water core avoids linework speckles; no global blue filter or imposed modern shoreline; Scan preserves native structural annotations. Przhevalsk's northwest blue field carries geological/borehole/structural labels, so it is retained as an **uncertain source color candidate**, not confidently interpreted as a unique geological unit or blindly removed as blank water. Fine hydrography and underwater geology are not reconstructed.

Eight manually read labelled frame controls each, conservative20native-pixel pick uncertainty; datumEPSG4284 assumed, no independent geographic landmarks. Grid/leave-one-out fits are not absolute accuracy. Median-only classification preserves source dark/pale geology. No nearest-neighbor gap fill, SAM, new unit/age transcriptions or inferred open license. Native footer/source rights retained and source-derived assets excluded from software license. Original scans/intermediates stay external. Existing datasets/runtime/styles/defaults/Baikonur unchanged.

## Native standalone Central1:200,000 pair

`m43xxvi-config.json` adds M-43-XXVI (Geokniga44355) and `m43xxxii-config.json` adds adjacent M-43-XXXII (41099). Each uses **its own native legend**, never borrowed from a regional family:23/22 sampled areal-color references, exact native excerpts and complete compressed legend/context plates. XXVI's explicitly cross-section-only N-Q is excluded; its two-color intrusive cell is sampled separately on its two actual colored halves. XXXII's dyke line-symbol row is not an areal swatch. Additional line/hatch symbols are retained in the context plate, not falsely interpreted as unique colors. Native white/pale Q and blue geological fields remain classified; no global blue/white/ink removal, no claimed independently interpreted hydrography. Median-only classification, non-unique/not exhaustive candidates and no invented unit/age transcriptions.

Registration uses **four actually labelled native corners**, not eight invented frame midpoints or a coverage-box-only warp. An affine inverse fit in assumed Pulkovo1942/Gauss-Kruger zone13 (EPSG28413) is checked by holding out each corner against the other three. RMS2.09/1.93nativepx, max holdout8.44/7.79px; no surveyed/interior landmarks, no absolute accuracy or field-grade claim. Source projection/datum remain assumptions. Render32mMercator, Colors64mMercator, simplification57.6mMercator, XYZz7–12; these sampling settings are not accuracy claims. Existing family defaults remain110/220m,z7–11, quadratic frame fit.

Both native headings say1958. XXVI's footer approval is12June1959 and catalog1959; XXXII catalog1958 agrees with its native heading. **Printing dates are not independently established**, explicitly recorded as such rather than treating compilation/headline dates as printing dates. Original source author/approval notices retained. No open redistribution license established; all source-derived assets excluded from software license, originals/intermediates external.

Reproduce with existing `family.py CONFIG SOURCE_DIR WORK docs/data/detailed docs/data/kazakhstan_border.geojson`, separately for each config. Check each using `tests/detailed-family-assets.py CONFIG`, then `tests/detailed-central200-source.py SOURCE_DIR WORK`, and the existingjsdomlifecycle. Native source/corner/legend/notice evidence and original hashes are in provenance/config; no additional UI/runtime/default/border change.

Bounded discovery also downloaded complete M-43-XXIII (44349), but its native corner coordinate numbers are blank/absent. Deferred instead of inventing an independent geographic check from sheet nomenclature alone. Its own full legend is readable; an advertised GeoTIFF could be considered later **with independent coordinate/landmark evidence**, not silently inherited adjacent-map controls. Only two searches/three catalog pages/three originals were used.

## Qualified western1:200,000 M-40-XXXIII

`m40xxxiii-config.json` adds the complete native1:200000 geological map https://www.geokniga.org/maps/44223 (not a mineral-only map). Printed labelled extent56–57E,48°00′–48°40′N lies entirely in Kazakhstan and adds western coverage. Its own20native geological swatches/excerpts/full context are used, not borrowed from Central/South legends. Blue J2 and pale/green geological units are NOT water/background masks. Overprinted mineral symbols and fine hydrography remain in Scan, not independently classified; candidate colors are non-unique/not exhaustive, no invented unit/age transcriptions or infill.

Four actually labelled corners, affine fit in ASSUMEDPulkovo1942/Gauss-Kruger zone10 EPSG28410. RMS3.478nativepx, maxcornerholdout14.006px againstotherthree; no invented extra controls, no independent interior/surveyed landmarks or absolute/field-grade accuracy claim. Nativeheading1959; mineral information current1January1959; originalapproval9April1959. Actual printingdate not established; authors/rightsholders/notices retained, no open redistribution license established.

Reproduce with unchanged `family.py` CLI and this config; source outsidegit. Checks: `tests/detailed-family-assets.py m40xxxiii-config.json`, `tests/detailed-central200-source.py SOURCE WORK m40xxxiii`, existingjsdomlifecycle. Source checker accepts explicit sheet IDs/fitCRS; previous Central defaults/limits remain unchanged, western source has explicitly recorded4pxRMS/16pxLOOreview bounds. Existing data/runtime/styles/defaults/mobileLayers/Baikonur and builder unchanged.

Bounded source qualification attempted adjacent44358/44360 original downloads but both timed out90s (16KB/0bytes); not treated as complete originals or map-quality rejections. 44358catalog20k discrepancy remains unresolved without nativeoriginal. No retry/workaround or guessed controls. One complete western original was processed rather than forcing a sheet count. Next catalog-only lead44222(M40XXXII,1958,1:200k) still needs native scale/frame/fulllegend/rights qualification, no assumed shared palette.

## Western M-40-XXXI geological base

`m40xxxi-config.json` uses its own18 native areal-color references from Geokniga44221 (not borrowed from another sheet). Actual title is **Карта полезных ископаемых СССР**: the Scan retains mineral symbols/structural overprint, while Colors approximates its complete geological base. Native scale1:200000, readable54–55E/48–48°40′N corners. Hatching-only sediment textures, mineral symbols and hydrography are not independently classified; full native legend/context retains them. Blue Jurassic fields are geology, not globally masked as water. No verified separate source-water class; no source gaps or white/black units are invented/filled/blanket-excluded.

Native heading/catalog1957, mineral data1January1957, approval28July1957, **signed for printing24April1958**. Original authorA.A.Sokolova-Kucherova/editorA.V.Khabakov/All-UnionAerogeologicalTrust and printing credits retained. No open license established; source-derived assets remain excluded from software license. Four actually labelled corners fit affine in assumed SK42/GaussKrugerzone10 EPSG28410; fit/leave-one-out residuals are internal native-pixel diagnostics, not independent absolute accuracy. Reproduce with unchanged family.py CLI, own config/source file; source originals and evidence remain outsidegit. Tests: detailed-family-assets.py m40xxxi-config.json; detailed-central200-source.py SOURCE WORK m40xxxi; existing jsdom lifecycle.
