"""Source-dependent Central QA: run with original-source-dir and processing-work-dir.
Original images/intermediates must remain outside git. No geological labels inferred.
"""
import sys,json,hashlib
from pathlib import Path
import cv2,numpy as np
from affine import Affine
from pyproj import Transformer
root=Path(__file__).resolve().parents[1];src,work=map(Path,sys.argv[1:]);C=json.load(open(root/'tools/detailed-maps/central1978-config.json'));L=json.load(open(root/'docs/data/detailed/central1978/legend.json'))
assert C['ink_filter']=='median_only' and C['water_rgb'] is None
assert sum(np.mean(v['rgb'])<45 for v in L)>=7 and any(min(v['rgb'])>240 for v in L)
T=Transformer.from_crs(4284,3857,always_xy=True)
def design(U):
 a,b=U[:,0],U[:,1];return np.stack([a*0+1,a,b,a*a,a*b,b*b],-1)
evidence=[]
for s,target,kind in [(C['sheets'][0],[1700,4900],'pale mapped unit'),(C['sheets'][1],[3125,1625],'black-green mafic source area')]:
 d=root/'docs/data/detailed'/s['id'];prov=json.load(open(d/'provenance.json'));assert prov['source_sha256']==hashlib.sha256((src/s['file']).read_bytes()).hexdigest();assert prov['water_sample_rgb'] is None and prov['ink_filter']=='median_only'
 im=np.load(work/s['id']/'scan.npy');cls=np.load(work/s['id']/'classes.npy');alpha=cv2.resize(im,(cls.shape[1],cls.shape[0]),interpolation=cv2.INTER_AREA)[:,:,3]>250
 assert np.all(cls[alpha]>=0) and np.all(cls[alpha]<len(L)), 'No synthetic water/white holes or discarded geology'
 G=np.array(s['gcps'],float);x,y=T.transform(G[:,2],G[:,3]);XY=np.stack([x,y],-1);origin=XY.mean(0);coef=np.linalg.lstsq(design((XY-origin)/100000),G[:,:2],rcond=None)[0];u=np.array([0.,0.])
 for _ in range(12):
  out=design(u[None,:])[0]@coef;r=out-target;eps=1e-5;J=np.stack([(design((u+np.eye(2)[k]*eps)[None,:])[0]@coef-out)/eps for k in [0,1]],-1);u-=np.linalg.solve(J,r)
 assert np.linalg.norm(design(u[None,:])[0]@coef-target)<.01
 R=json.load(open(work/s['id']/'render.json'));A=Affine(*R['transform'])*Affine.scale(R['width']/cls.shape[1],R['height']/cls.shape[0]);col,row=(~A)*(origin+u*100000);row,col=int(row),int(col);k=int(cls[row,col]);assert k>=0
 rgb=L[k]['rgb'];raw=cv2.cvtColor(cv2.imread(str(src/s['file'])),cv2.COLOR_BGR2RGB);tx,ty=target;sample=np.median(raw[ty-5:ty+6,tx-5:tx+6].reshape(-1,3),0).tolist()
 if s['id']=='central-l42b':assert np.mean(rgb)<60 and np.mean(sample)<70
 else:assert np.mean(rgb)>215 and np.mean(sample)>215
 evidence.append(dict(sheet=s['id'],source_pixel=target,source_rgb_median=sample,classified_palette_id=k,classified_rgb=rgb,kind=kind))
print(json.dumps(evidence,indent=2));print('PASS true native dark/pale geology retained; no unsourced global white/blue water exclusion; originals match provenance.')
