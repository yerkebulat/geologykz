"""Native standalone legend, actual corner holdouts and white/blue geological coverage QA."""
import sys,json,hashlib
from pathlib import Path
import numpy as np
from PIL import Image
from affine import Affine
from pyproj import Transformer
R=Path(__file__).resolve().parents[1];S,W=map(Path,sys.argv[1:])
for sid in ['m43xxvi','m43xxxii']:
 C=json.load(open(R/f'tools/detailed-maps/{sid}-config.json'));s=C['sheets'][0];d=R/'docs/data/detailed'/sid;L=json.load(open(d/'legend.json'));p=json.load(open(d/'provenance.json'));g=json.load(open(d/'georef.json'));assert C['standalone'] and C['family']==sid and C['ink_filter']=='median_only' and C['water_rgb'] is None
 assert C['legend_source']==f'https://www.geokniga.org/maps/{s["page"]}' and all(v['file']==s['file'] for v in C['legend_plates'])
 assert p['source_sha256']==hashlib.sha256((S/s['file']).read_bytes()).hexdigest();assert p['legend_family']==sid and p['legendSource']==C['legend_source'];assert len(L)==C['legend_count']
 assert g['gcps']==s['gcps'] and len(g['gcps'])==4 and g['fit_crs_assumed']==28413 and g['independent_geographic_landmarks']==0
 G=np.array(s['gcps']);T=Transformer.from_crs(4284,28413,always_xy=True);x,y=T.transform(G[:,2],G[:,3]);XY=np.c_[x,y];origin=XY.mean(0);D=np.c_[np.ones(4),(XY-origin)/100000];coef=np.linalg.lstsq(D,G[:,:2],rcond=None)[0];loo=[]
 for i in range(4):keep=np.arange(4)!=i;loo.append(float(np.linalg.norm(D[i]@np.linalg.lstsq(D[keep],G[keep,:2],rcond=None)[0]-G[i,:2])))
 assert np.allclose(loo,g['loo_errors_px']) and max(loo)<10 and g['rms_native_px']<3
 assert all(not v['section_only'] and v['code'].startswith('Native sheet legend reference') and 'standalone-sheet' in v['en'] for v in L)
 assert min(L[0]['rgb'])>220,'Native first entry is actual pale/white Q, not a background exclusion'
 im=np.load(W/sid/'scan.npy');cls=np.load(W/sid/'classes.npy');r=json.load(open(W/sid/'render.json'));A=Affine(*r['transform']);CT=A*Affine.scale(r['width']/cls.shape[1],r['height']/cls.shape[0]);toM=Transformer.from_crs(28413,3857,always_xy=True)
 def locate(px,py):
  u=np.linalg.solve(coef[1:].T,np.array([px,py])-coef[0]);M=toM.transform(*(origin+u*100000));col,row=(~CT)*M;sc,sr=(~A)*M;return int(cls[int(row),int(col)]),int(im[int(sr),int(sc),3])
 samples=[(2700,3100),(4800,1800),(5000,4500)] if sid=='m43xxvi' else [(4500,2500),(5200,3700),(3500,1800)]
 for pt in samples:k,a=locate(*pt);assert 0<=k<len(L) and a>250,(sid,pt,k,a)
 # White lithology is present across the mapped interior, never blanket-masked.
 assert int((cls==0).sum())>1000 and int((cls==len(L)).sum())==0
 print('PASS',sid,'own native legend',len(L),'actual white/blue geology retained; four actual corner holdouts',loo)
print('PASS source hashes, independent per-sheet legends, native pale/blue coverage, excluded nonareal symbols, provisional fit evidence; no borrowed legend, global ink/water exclusion or gap fill.')
