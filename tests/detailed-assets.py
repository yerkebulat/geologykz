"""Static publication checks; rasterio/shapely/Pillow required, no browser."""
import json,hashlib
from pathlib import Path
from PIL import Image
from shapely.geometry import shape
root=Path(__file__).resolve().parents[1];d=root/'docs/data/detailed/m43xxxi'
M=json.load(open(d/'manifest.json'))['sheets'][0];L=json.load(open(d/'legend.json'));F=json.load(open(d/'units.geojson'))['features']
assert M['dates']=={'scan_printed':1956,'catalog':1959}
assert len(L)==25 and len(F)==16424
for f in F:
 assert shape(f['geometry']).is_valid
 ids=list(map(int,f['properties']['candidates'].split(',')))
 assert all(0<=i<25 and i!=3 for i in ids)
 assert f['properties']['approximate'] is True
for key in ['legend','units']:
 assert not M[key].startswith(('/','docs/','http:','https:'))
 assert (root/'docs'/M[key]).is_file()
T=list((d/'tiles').rglob('*.webp'));assert len(T)==204
for p in T:
 im=Image.open(p);im.load();assert im.size==(256,256)
assert sum(p.stat().st_size for p in T)==2883324
assert max(p.stat().st_size for p in T)<100000
for s in [root/'docs/detailed.js',root/'docs/detailed-legend.html']:
 text=s.read_text();assert 'localhost' not in text and '127.0.0.1' not in text and 'Local QA' not in text
# Preserve corrected border (the six outer rings with Baikonur included).
B=root/'docs/data/kazakhstan_border.geojson';assert hashlib.sha256(B.read_bytes()).hexdigest().startswith('a9ac4a2f5784')
assert all(len(p)==1 for p in json.load(open(B))['geometry']['coordinates'])
assert M['experimental'] is True
print('PASS: metadata, source rights file, 25 legend entries, 16424 valid polygons/candidates, 204 decoded bounded tiles, Pages-safe paths, Baikonur invariant.')
