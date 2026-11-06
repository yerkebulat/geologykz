"""Source/processing-dependent QA for the remaining East sheets; originals stay outside git."""
import sys,json,hashlib
from pathlib import Path
import numpy as np
from affine import Affine
from pyproj import Transformer
from shapely.geometry import Polygon
root=Path(__file__).resolve().parents[1];src,work=map(Path,sys.argv[1:]);C=json.load(open(root/'tools/detailed-maps/east-completion-config.json'));L=json.load(open(root/'docs/data/detailed/east1976/legend.json'));assert len(L)==160 and C['reuse_legend'] and C['ink_filter']=='median_only' and C['water_rgb'] is None
T=Transformer.from_crs(4284,3857,always_xy=True)
def design(U):
 a,b=U[:,0],U[:,1];return np.stack([a*0+1,a,b,a*a,a*b,b*b],-1)
checks=[[(3400,4050,'water'),(600,5850,'water'),(1100,2830,'geology'),(4000,1200,'unmapped'),(4500,5000,'unmapped'),(4200,4920,'unmapped')],[(1200,1100,'water'),(1000,1500,'geology'),(4000,3000,'unmapped'),(900,3330,'unmapped')]]
for s,samples in zip(C['sheets'],checks):
 d=root/'docs/data/detailed'/s['id'];p=json.load(open(d/'provenance.json'));assert hashlib.sha256((src/s['file']).read_bytes()).hexdigest()==p['source_sha256'];assert p['native_unmapped_polygons']==s['native_unmapped_polygons'];assert all(Polygon(a).is_valid for a in s['native_unmapped_polygons'])
 im=np.load(work/s['id']/'scan.npy');cls=np.load(work/s['id']/'classes.npy');R=json.load(open(work/s['id']/'render.json'));A=Affine(*R['transform']);CT=A*Affine.scale(R['width']/cls.shape[1],R['height']/cls.shape[0]);G=np.array(s['gcps'],float);x,y=T.transform(G[:,2],G[:,3]);XY=np.stack([x,y],-1);origin=XY.mean(0);coef=np.linalg.lstsq(design((XY-origin)/100000),G[:,:2],rcond=None)[0]
 def locate(target):
  u=np.array([0.,0.])
  for _ in range(12):
   out=design(u[None,:])[0]@coef;r=out-target;eps=1e-5;J=np.stack([(design((u+np.eye(2)[k]*eps)[None,:])[0]@coef-out)/eps for k in [0,1]],-1);u-=np.linalg.solve(J,r)
  M=origin+u*100000;col,row=(~CT)*M;sc,sr=(~A)*M;return int(cls[int(row),int(col)]),int(im[int(sr),int(sc),3])
 for x,y,kind in samples:
  k,alpha=locate([x,y]);print(s['id'],[x,y],kind,'class',k,'scanAlpha',alpha)
  if kind=='water':assert k==len(L) and alpha>250
  elif kind=='geology':assert 0<=k<len(L) and alpha>250
  else:assert k<0 and alpha==0
 # A labelled-water interior patch, not the whole shoreline: ink must not masquerade as geological islands.
 cx,cy=(3400,4050) if s['id']=='east-m45v' else (1200,1100)
 vals=[locate([cx+dx,cy+dy])[0]==len(L) for dx in range(-70,71,14) for dy in range(-50,51,10)];fraction=sum(vals)/len(vals);assert fraction>.90;print('source water interior classified fraction',fraction)
print('PASS actual lake water retained in Scan/excluded from Colors; native pale mapped peninsula retained; foreign/unmapped paper excluded; no global pale/black inpainting.')
