# Detailed maps batch 2

Sources downloaded to `/workspace/kzdetail/sources`, original JPEGs and native shared legend retained there, not committed. Batch intermediate arrays and supplied TIFF under `/workspace/kzdetail/batch2`. No Orr inputs. Palette segmentation only, not SAM, not interpreted geological boundaries, no missing-geology or nearest-neighbor fill. Do not treat candidate references as unique or exhaustive identifications. Small classified regions are retained, rather than removed to transparent holes. Blue water is an approximate competing palette class; hatches, linework and text may leave artifacts. Source white/pale lithologic units are classified, not globally discarded.

## M-44-XV, 1:200,000, 1964

- Scan: https://www.geokniga.org/maps/42215 ; `M-44-XV.jpg`, 8261 x 7200, 4,613,922 bytes. East Kazakhstan Geological Administration, editor M. G. Khisamutdinov.
- Supplement: https://www.geokniga.org/maps/additional/m-44-xvgeologicheskayakarta.tif . 2615 x 1744, EPSG:4326, native affine bounds 79.999,50.0,80.999,50.667. **No readable numeric geographic labels were found on JPEG frame.** Do not claim manually read geographic GCPs. Geokniga's supplied georeferencing is used provisionally, not independently verified.
- Native JPEG cropped x2130,y880,w4270,h4410 and rescaled to 1300 x 1340. Supplement rescaled to same dimensions to remove lon/lat pixel anisotropy. OpenCV SIFT (5000 features), BF k2 ratio <0.7, RANSAC homography (3px): 1556 matches, 1475 inliers. Registration maps supplementary TIFF to original native scan. Held-out every fifth inlier: 299 pairs, RMS1.105 / max2.514 *matching-resolution* pixels. These measure feature transfer, not geographic correctness, and inliers were selected with the full set. Stored homography/crop in `m44xv-registration.json`, embedded in sheet georef.json.
- Historic legend transcribed from 17 actual source swatches, native excerpts provided as authority. Q and Pg3³ explicitly cross-section only and excluded. N superscripts and intrusive phase notation provisional; do not overinterpret them. Similar pale Quaternary and red intrusion colors deliberately share candidates.
- Render 48m Web Mercator pixels, z7–12 256px XYZ. At ~50N this is ~31m ground sampling, NOT a stated positional accuracy.

## K-43-Б Alma-Ata, 1:500,000, 1979

- Scan https://www.geokniga.org/maps/2561 ; `K-43-B.jpg`, 4110 x 4436, 5,018,541 bytes. Catalog Aerogeologiya; editors Bespalov/Kostenko. Shared South Kazakhstan legend https://www.geokniga.org/maps/2550 : three original JPEG plates (4116x4019,4120x4008,4158x4062), retained locally.
- Sixteen manually read geographic neatline control points at labelled 75–78E,42–44N (including 30-minute longitude and 43N marks), quadratic inverse fit in assumed Pulkovo1942. RMS4.642 native pixels, max8.336; leave-one-out max15.681px. Rough native sampling ~60m ground, so internal fit is several hundred meters and worst holdout approaches 1km. This is provisional, not an independently surveyed alignment. Controls and all residuals are published, not hidden behind a bounding-box-only fit.
- Actual shared legend retained as native **image references**, not invented code/age transcriptions: 73 swatches on plate1,42 on plate2,63 intrusion-matrix cells. 178 sampled swatches are not a comprehensive interpreted legend. Every entry has a native cropped source excerpt, and compressed full plates give context. Intrusion excerpts combine actual age column, composition row and color cell. Hatches and matrix repeated colors prevent unique identifications. Candidate IDs are source-reference IDs only. Entries/ages must not be treated as transcribed geological unit labels.
- Scan 110m Web Mercator sampling, z7–11 tiles. Colors uses a 2x area-averaged classification grid (~220m Mercator/~160m ground), deliberately coarser than Scan to bound mobile vector transfer; no gap filling. Source-country clipping removes the southern Kyrgyz/outside-Kazakhstan area. Display/tile bounds follow the actual clipped source extent, not the blank southern half. Lakes compete as blue water, rather than being filled with neighboring geology.

## Reproduction / rights

Activate the existing Python geo environment (numpy/OpenCV/Pillow/rasterio/shapely/pyproj). Download exact original sources above and supplementary TIFF as WORK/m44xv/source.tif. Run:

```
python tools/detailed-maps/batch2.py SOURCE_DIR WORK_DIR docs/data/detailed docs/data/kazakhstan_border.geojson
```

The source JPEG and shared-legend filenames are documented above and in the script. The existing corrected country border is invariant. Published provenance contains original hashes. Originals, TIFF, arrays and previews never enter git. Tests cover JSON, valid geometries, all candidate ranges, exclusions, native excerpt assets, all bounded XYZ cells, decoded tile sizes and unchanged Baikonur border. Runtime tests cover rapid pending sheet changes and latest checkbox/mode wins.

Source hosting is NOT proof of open licensing. Original author/rightsholder rights and Geokniga familiarisation notice remain applicable. No open redistribution license has been established. These source-derived scans, swatches and vectors are **not included in any repository software license**. Source links and rights notices accompany each sheet; no blanket public-domain/open-license claim.

East M44A/M44В remain downloaded/deferred: their separate large shared legend needs its own verified swatch/reference configuration and GCPs. No suitable 1:100k geological unit sheet was established; downloaded Kalba was a situation/mineral-license map and is excluded.
