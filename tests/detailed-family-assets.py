"""One lean local family check, including every geometry and bounded XYZ cell."""
import json,math,sys,hashlib,re
from pathlib import Path
from PIL import Image
from shapely.geometry import shape,Point
from shapely.prepared import prep
root=Path(__file__).resolve().parents[1];docs=root/'docs';C=json.load(open(root/'tools/detailed-maps'/ (sys.argv[1] if len(sys.argv)>1 else 'east1976-config.json')))
fam=docs/'data/detailed'/C['family'];L=json.load(open(fam/'legend.json'));assert len(L)==(C['legend_count'] if C.get('reuse_legend') else sum(len(p['boxes']) for p in C['legend_plates']))
for u in L:
 assert u['id']>=0 and u['age']=='Not transcribed; native legend only' and not u['section_only']
 assert (docs/u['image']).is_file();Image.open(docs/u['image']).verify()
 assert all(0<=i<len(L) for i in u['similar_swatch_ids'])
Bpath=docs/'data/kazakhstan_border.geojson';assert hashlib.sha256(Bpath.read_bytes()).hexdigest().startswith('a9ac4a2f5784');border=shape(json.load(open(Bpath))['geometry']);assert border.contains(Point(63.32,45.62));near=prep(border.buffer(.003))
for s in C['sheets']:
 d=docs/'data/detailed'/s['id'];m=json.load(open(d/'manifest.json'))['sheets'][0];g=json.load(open(d/'georef.json'));p=json.load(open(d/'processing.json'));fc=json.load(open(d/'units.geojson'))['features'];b=m['rasterTiles']['bounds'];r=m['rasterTiles']
 assert m['id']==s['id'] and m['dates']=={'scan_printed':s['scan_printed'],'catalog':C.get('catalog',1976)} and m['experimental']
 if C.get('keep_native_footer'):assert (docs/m['sourceNotice']).is_file();Image.open(docs/m['sourceNotice']).verify()
 assert m['legend']==f'data/detailed/{C["family"]}/legend.json' and (C.get('standalone') or not (d/'legend').exists())
 assert len(g['gcps'])>=(4 if C.get('standalone') else 8) and g['independent_geographic_landmarks']==0 and len(g['loo_errors_px'])==len(g['gcps'])
 assert g['rms_native_px']<10 and g['loo_max_native_px']<45
 assert len(fc)==p['polygons'] and p['removed_small_regions']==0 and len(fc)>1000
 assert (d/'units.geojson').stat().st_size<11000000
 for f in fc:
  geo=shape(f['geometry']);assert geo.is_valid and not geo.is_empty and near.contains(geo.representative_point())
  u=f['properties'];assert u['approximate'] is True and re.fullmatch('#[0-9a-f]{6}',u['color'])
  ids=list(map(int,u['candidates'].split(',')));assert u['palette_index'] in ids and all(0<=i<len(L) for i in ids)
 tiles=list((d/'tiles').rglob('*.webp'));assert len(tiles)==p['tiles'] and sum(t.stat().st_size for t in tiles)==p['tile_bytes']
 assert r['tileSize']==256 and r['minzoom']==7 and r['maxzoom']==C.get('maxzoom',11)
 for t in tiles:
  im=Image.open(t);im.load();assert im.size==(256,256) and t.stat().st_size<100000
 for z in range(7,C.get('maxzoom',11)+1):
  def xx(lon):return math.floor((lon+180)/360*2**z)
  def yy(lat):return math.floor((1-math.asinh(math.tan(math.radians(lat)))/math.pi)/2*2**z)
  for x in range(xx(b[0]),xx(b[2])+1):
   for y in range(yy(b[3]),yy(b[1])+1):assert (d/f'tiles/{z}/{x}/{y}.webp').is_file()
 for key in ['units','legend']:
  assert not m[key].startswith(('/','http:','https:')) and (docs/m[key]).is_file()
 assert (d/'RIGHTS.md').is_file() and (d/'provenance.json').is_file()
 assert s['id'] in (docs/'index.html').read_text() and s['id'] in (docs/'detailed-legend.html').read_text()
 print('PASS',s['id'],len(fc),'valid candidate-aware polygons;',len(tiles),'256px bounded tiles; native controls, shared legend, rights and Pages-safe paths.')
assert not any(f.suffix.lower() in ['.jpg','.tif','.png','.npy'] for name in [C['family']]+[s['id'] for s in C['sheets']] for f in (docs/'data/detailed'/name).rglob('*'))
print('PASS shared native legend stored once;',len(L),'actual sampled swatches; Baikonur border invariant; no original scans/intermediates in data.')
