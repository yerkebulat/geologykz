"""Static publication checks for the first 1:200,000 scan; rasterio not required."""
import json, hashlib
from pathlib import Path
from PIL import Image
root = Path(__file__).resolve().parents[1]
d = root / "docs/data/detailed/m43xxxi"
M = json.load(open(d / "manifest.json"))["sheets"][0]
assert M["dates"] == {"scan_printed": 1956, "catalog": 1959}
assert "units" not in M and "legend" not in M
assert not (d / "units.geojson").exists() and not (d / "legend.json").exists()
assert M["rasterTiles"]["tileSize"] == 256
T = list((d / "tiles").rglob("*.webp"))
assert len(T) == 204
for p in T:
    im = Image.open(p); im.load(); assert im.size == (256, 256)
assert sum(p.stat().st_size for p in T) == 2883324
assert max(p.stat().st_size for p in T) < 100000
text = (root / "docs/detailed.js").read_text()
assert "localhost" not in text and "127.0.0.1" not in text and "Local QA" not in text
B = root / "docs/data/kazakhstan_border.geojson"
assert hashlib.sha256(B.read_bytes()).hexdigest().startswith("a9ac4a2f5784")
assert all(len(p) == 1 for p in json.load(open(B))["geometry"]["coordinates"])
print("PASS: 200k scan tiles and rights preserved; Colors polygons/legend removed; Baikonur invariant.")
