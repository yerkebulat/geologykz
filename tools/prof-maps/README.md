# Professor's collection: scan-only sheets

Soviet geological sheets from a professor's shared collection ("Kazakhstan maps"), published as georeferenced scans with no color classification.

- `gcp.json`: four frame-corner pixels per scan (TL, TR, BL, BR), read by hand from zoomed crops. Corners sit on the inner neatline.
- `meta.json`: sheet id, type group, title and source file name.
- `scanonly.py`: nomenclature to Pulkovo 1942 corners, converted to WGS84 (pyproj default EPSG:4284 to 4326), projective fit in a sheet-centred LCC on Krassovsky, 256 px WebP tiles clipped to the frame and the Kazakhstan border.
- `publish.py`: copies tiles and writes `manifest.json`, `georef.json` and `RIGHTS.md` per sheet under `docs/data/detailed/prof-*`.

Original scans are not committed. M-43-В (torn, no readable corner labels) was skipped. Duplicates of sheets already on the site were not reprocessed.
