"""Lean multi-sheet asset/geometry checks, no browser required."""
import json,math
from pathlib import Path
from PIL import Image
from shapely.geometry import shape,Point
root=Path(__file__).resolve().parents[1];docs=root/'docs';base=docs/'data/detailed'
for sid in ['m44xv','alma']:
 d=base/sid;M=json.load(open(d/'manifest.json'))['sheets'][0];L=json.load(open(d/'legend.json'));F=json.load(open(d/'units.geojson'))['features'];P=json.load(open(d/'processing.json'))
 assert M['id']==sid and M['experimental'];assert len(L)==(17 if sid=='m44xv' else 178)
 assert len(F)==P['polygons'] and len(F)>1000
 for key in ['units','legend']:
  assert not M[key].startswith(('/','http:','https:'));assert (docs/M[key]).is_file()
 for l in L:
  assert (docs/l['image']).is_file();Image.open(docs/l['image']).verify()
  assert all(0<=i<len(L) and not L[i]['section_only'] for i in l['similar_swatch_ids'])
 b=M['rasterTiles']['bounds'];R=M['rasterTiles'];assert R['tileSize']==256
 tiles=list((d/'tiles').rglob('*.webp'));assert len(tiles)==P['tiles'];assert sum(p.stat().st_size for p in tiles)==P['tile_bytes']
 for t in tiles:im=Image.open(t);im.load();assert im.size==(256,256) and t.stat().st_size<100000
 for z in range(R['minzoom'],R['maxzoom']+1):
  x0=math.floor((b[0]+180)/360*2**z);x1=math.floor((b[2]+180)/360*2**z)
  def yy(lat):return math.floor((1-math.asinh(math.tan(math.radians(lat)))/math.pi)/2*2**z)
  for x in range(x0,x1+1):
   for y in range(yy(b[3]),yy(b[1])+1):assert (d/f'tiles/{z}/{x}/{y}.webp').is_file()
 for f in F:
  g=shape(f['geometry']);assert g.is_valid and not g.is_empty
  p=f['properties'];assert p['approximate'] is True and not L[p['palette_index']]['section_only']
  assert all(0<=i<len(L) and not L[i]['section_only'] for i in map(int,p['candidates'].split(',')))
  assert g.bounds[0]>=b[0]-.002 and g.bounds[2]<=b[2]+.002
 assert P['removed_small_regions']==0 and (d/'RIGHTS.md').is_file() and (d/'georef.json').is_file()
 assert (d/'units.geojson').stat().st_size<11000000
 print(f'PASS {sid}: {len(L)} native swatches, {len(F)} valid polygons, {len(tiles)} decoded/bounded tiles, candidates/images/Pages paths/coverage/rights.')
B=shape(json.load(open(docs/'data/kazakhstan_border.geojson'))['geometry']);assert B.contains(Point(63.32,45.62))
