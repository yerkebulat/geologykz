"""Source/processing-dependent QA for the South L44 and Frunze sheets; originals stay outside git."""
import sys,json,hashlib
from pathlib import Path
import numpy as np
from affine import Affine
from pyproj import Transformer
from shapely.geometry import Polygon
root=Path(__file__).resolve().parents[1];src,work=map(Path,sys.argv[1:]);C=json.load(open(root/'tools/detailed-maps/south-l44-config.json'));L=json.load(open(root/'docs/data/detailed/alma/legend.json'));assert len(L)==178 and C['reuse_legend'] and C['ink_filter']=='median_only' and C['water_rgb'] is None
T=Transformer.from_crs(4284,3857,always_xy=True)
def design(U):
 a,b=U[:,0],U[:,1];return np.stack([a*0+1,a,b,a*a,a*b,b*b],-1)
checks=[[(750,3000,'water'),(3550,2850,'water'),(910,2853,'geology'),(1180,2750,'geology'),(3420,2730,'geology'),(2500,1800,'geology')],[(800,3400,'water'),(800,3750,'water'),(3550,450,'water'),(1050,3520,'geology'),(1155,3635,'geology'),(1188,3658,'geology'),(3500,3000,'unmapped'),(1800,2000,'geology')],[(1000,1000,'geology'),(1800,3000,'geology'),(3500,3000,'unmapped')],[(1000,1500,'geology'),(3600,600,'geology'),(1500,2600,'geology'),(3000,3000,'unmapped')]]
for s,samples in zip(C['sheets'],checks):
 d=root/'docs/data/detailed'/s['id'];p=json.load(open(d/'provenance.json'));assert hashlib.sha256((src/s['file']).read_bytes()).hexdigest()==p['source_sha256'];assert p['native_unmapped_polygons']==s.get('native_unmapped_polygons',[]);assert all(Polygon(a).is_valid for a in s.get('native_unmapped_polygons',[]))
 for key in ['native_water_regions','native_water_interiors','native_water_exclusions']:
  assert p.get(key,[])==s.get(key,[]);assert all(Polygon(a).is_valid for a in s.get(key,[]))
 assert json.load(open(d/'georef.json'))['gcp_pick_uncertainty_native_px']==20
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
 if s['id'] in ['south-l44a','south-l44b']:
  cx,cy=(900,3000) if s['id']=='south-l44a' else (800,3750)
  vals=[locate([cx+dx,cy+dy])[0]==len(L) for dx in range(-70,71,14) for dy in range(-50,51,10)];fraction=sum(vals)/len(vals);assert fraction>.98;print('PASS actual native open-water patch',fraction)
 if s.get('native_unmapped_paper_only'):
  import cv2
  raw=cv2.medianBlur(cv2.imread(str(src/s['file'])),9);bad=(raw.max(2).astype(int)-raw.min(2).astype(int)>35)&(raw.mean(2)<225);roi=np.zeros(raw.shape[:2],np.uint8)
  for poly in s['native_unmapped_polygons']:cv2.fillPoly(roi,[np.array(poly,np.int32)],255)
  mask=np.load(work/s['id']/'native-unmapped.npy')>0;coarse_loss=int((bad&(roi>0)).sum());refined_loss=int((bad&mask).sum());assert mask.sum()>1000000;assert refined_loss/mask.sum()<.0001;assert refined_loss<coarse_loss*.02
  assert p['native_unmapped_paper_only'];print('PASS source-paper refinement avoids colored-geology clipping',coarse_loss,'->',refined_loss,'remaining source-ink/edge pixels')
print('PASS source lakes and actual mapped islands, pale/black/blue geology, actual blank paper gaps, native dates/rights/sourcehash/sharedlegend paths; no global white/blue/dark removal or geology infill.')
