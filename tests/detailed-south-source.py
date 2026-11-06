"""Source/processing-dependent QA for the South sheets; originals stay outside git."""
import sys,json,hashlib
from pathlib import Path
import numpy as np
from affine import Affine
from pyproj import Transformer
from shapely.geometry import Polygon
root=Path(__file__).resolve().parents[1];src,work=map(Path,sys.argv[1:]);C=json.load(open(root/'tools/detailed-maps/south1979-config.json'));L=json.load(open(root/'docs/data/detailed/alma/legend.json'));assert len(L)==178 and C['reuse_legend'] and C['ink_filter']=='median_only' and C['water_rgb'] is None
T=Transformer.from_crs(4284,3857,always_xy=True)
def design(U):
 a,b=U[:,0],U[:,1];return np.stack([a*0+1,a,b,a*a,a*b,b*b],-1)
checks=[[(2800,1500,'geology')],[(3000,1100,'geology'),(2238,2260,'water'),(2180,2330,'water'),(2390,2450,'geology')],[(500,2000,'geology')],[(1635,1521,'dark'),(2150,1235,'water'),(2240,1420,'water'),(1000,750,'geology'),(3500,3300,'unmapped')]]
for s,samples in zip(C['sheets'],checks):
 d=root/'docs/data/detailed'/s['id'];p=json.load(open(d/'provenance.json'));assert hashlib.sha256((src/s['file']).read_bytes()).hexdigest()==p['source_sha256'];assert p['native_unmapped_polygons']==s.get('native_unmapped_polygons',[]);assert all(Polygon(a).is_valid for a in s.get('native_unmapped_polygons',[]))
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
 if s['id']=='south-l41g':
  k,alpha=at(T.transform(63.32,45.62));assert 0<=k<len(L) and alpha>250;print('PASS Baikonur native mapped coverage retained',k,alpha)
print('PASS source lake interiors excluded only from Colors; pale/black geological units retained; source southeast paper excluded; native dates/shared legend exact; originals hash matched.')
