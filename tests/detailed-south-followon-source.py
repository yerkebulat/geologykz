"""Source/processing-dependent QA for the South follow-on sheets; originals stay outside git."""
import sys,json,hashlib
from pathlib import Path
import numpy as np
from affine import Affine
from pyproj import Transformer
from shapely.geometry import Polygon
root=Path(__file__).resolve().parents[1];src,work=map(Path,sys.argv[1:]);C=json.load(open(root/'tools/detailed-maps/south-followon-config.json'));L=json.load(open(root/'docs/data/detailed/alma/legend.json'));assert len(L)==178 and C['reuse_legend'] and C['ink_filter']=='median_only' and C['water_rgb'] is None
T=Transformer.from_crs(4284,3857,always_xy=True)
def design(U):
 a,b=U[:,0],U[:,1];return np.stack([a*0+1,a,b,a*a,a*b,b*b],-1)
checks=[[(500,1000,'water'),(1300,2000,'water'),(1900,2100,'water'),(1470,1325,'geology'),(1560,1470,'geology'),(170,940,'geology'),(3000,2500,'geology'),(1700,3800,'unmapped')],[(2581,1227,'dark'),(1000,1000,'geology'),(1000,3000,'geology')],[(2400,800,'water'),(2600,1500,'water'),(2700,1900,'water'),(2260,1360,'geology'),(2280,1290,'geology'),(2450,1450,'geology'),(1900,1030,'geology'),(3300,1100,'geology')],[(1000,1000,'geology'),(3000,2700,'geology')]]
for s,samples in zip(C['sheets'],checks):
 d=root/'docs/data/detailed'/s['id'];p=json.load(open(d/'provenance.json'));assert hashlib.sha256((src/s['file']).read_bytes()).hexdigest()==p['source_sha256'];assert p['native_unmapped_polygons']==s.get('native_unmapped_polygons',[]);assert all(Polygon(a).is_valid for a in s.get('native_unmapped_polygons',[]))
 for key in ['native_water_regions','native_water_interiors','native_water_exclusions']:
  assert p.get(key,[])==s.get(key,[]);assert all(Polygon(a).is_valid for a in s.get(key,[]))
 assert p['ink_filter']=='median_only' and p['water_sample_rgb'] is None
 m=json.load(open(d/'manifest.json'))['sheets'][0];assert m['legendPages']==C['legend_pages'];assert all((root/'docs'/v).is_file() for v in m['legendPages']);assert m['dates']==dict(scan_printed=1979,catalog=1979)
 im=np.load(work/s['id']/'scan.npy');cls=np.load(work/s['id']/'classes.npy');R=json.load(open(work/s['id']/'render.json'));A=Affine(*R['transform']);CT=A*Affine.scale(R['width']/cls.shape[1],R['height']/cls.shape[0]);G=np.array(s['gcps'],float);x,y=T.transform(G[:,2],G[:,3]);XY=np.stack([x,y],-1);origin=XY.mean(0);coef=np.linalg.lstsq(design((XY-origin)/100000),G[:,:2],rcond=None)[0]
 def at(M):
  col,row=(~CT)*M;sc,sr=(~A)*M;return int(cls[int(row),int(col)]),int(im[int(sr),int(sc),3])
 def locate(target):
  u=np.array([0.,0.])
  for _ in range(12):
   out=design(u[None,:])[0]@coef;r=out-target;eps=1e-5;J=np.stack([(design((u+np.eye(2)[k]*eps)[None,:])[0]@coef-out)/eps for k in [0,1]],-1);u-=np.linalg.solve(J,r)
  return at(origin+u*100000)
 for x,y,kind in samples:
  k,alpha=locate([x,y]);print(s['id'],[x,y],kind,'class',k,'scanAlpha',alpha)
  if kind=='water':assert k==len(L) and alpha>250
  elif kind in ['geology','dark']:
   assert 0<=k<len(L) and alpha>250
   if kind=='dark':assert np.mean(L[k]['rgb'])<85
  else:assert k<0 and alpha==0
 if s['id'] in ['south-l41v','south-l43v']:
  cx,cy=(800,1800) if s['id']=='south-l41v' else (2400,800)
  vals=[locate([cx+dx,cy+dy])[0]==len(L) for dx in range(-80,81,16) for dy in range(-60,61,12)];fraction=sum(vals)/len(vals);assert fraction>.98;print('PASS actual deep source-water patch fraction',fraction)
  # Mapped island interiors must not become water because their green paint resembles the lake.
  for poly in s['native_water_exclusions']:
   P=Polygon(poly).buffer(-8);minx,miny,maxx,maxy=P.bounds;targets=[]
   from shapely.geometry import Point
   for x in np.arange(minx,maxx,10):
    for y in np.arange(miny,maxy,10):
     if P.contains(Point(x,y)):targets.append([x,y])
   assert targets
   fraction=sum(0<=locate(q)[0]<len(L) for q in targets)/len(targets);assert fraction>.98;print('PASS native mapped-island interior retained fraction',fraction,'samples',len(targets))
print('PASS historic source-water cores in Scan/excluded Colors, true mapped islands/pale/black geology retained, native dates/rights/legend paths, source hashes. No guessed modern shoreline or geology fill.')
