import numpy as np,cv2,json
from legend_src import L
raw=cv2.imread('sources/M-43-XXXI.jpg');boxes=json.load(open('work/boxes.json'));legend=[]
for i,((code,ru,en,age),(x,y,w,h)) in enumerate(zip(L,boxes)):
 sub=raw[1100+y+10:1100+y+h-10,6870+x+10:6870+x+w-10]
 p=cv2.medianBlur(sub,5).reshape(-1,3);p=p[p.mean(1)>=np.percentile(p.mean(1),25)]
 b,g,r=np.median(p,0);legend.append(dict(id=i,code=code,ru=ru,en=en,age=age,rgb=[int(r),int(g),int(b)],legend_crop='work/leg%02d.png'%i,section_only=i==3))
# palette differences inform ambiguity, not arbitrarily assign near-duplicate swatches
pal=np.array([[d['rgb'] for d in legend]],np.uint8);pl=cv2.cvtColor(pal,cv2.COLOR_RGB2LAB)[0].astype(float)
for i in range(len(L)):
 near=[j for j in range(len(L)) if j!=i and j!=3 and np.linalg.norm(pl[i]-pl[j])<12]
 if near: print('ambiguous',i,[legend[j]['code'] for j in near],np.linalg.norm(pl[i]-pl[near],axis=-1).tolist())
 legend[i]['similar_swatch_ids']=near
json.dump(legend,open('work/legend.json','w'),ensure_ascii=False,indent=2)
im=np.load('work/scan.npy');rgb=im[...,:3];alpha=im[...,3]>250
# dark text/linework removed only for classification, not raster display; no missing scan filled.
g=cv2.cvtColor(rgb,cv2.COLOR_RGB2GRAY);dark=(g<90).astype(np.uint8)
sm=cv2.inpaint(rgb,dark,3,cv2.INPAINT_TELEA);sm=cv2.medianBlur(sm,9);sm=cv2.bilateralFilter(sm,11,28,11)
lab=cv2.cvtColor(sm,cv2.COLOR_RGB2LAB).astype(np.float32)
# sample pale blue water, excluded from unit vectors
extra=np.array([[[202,235,235]]],np.uint8);water=cv2.cvtColor(extra,cv2.COLOR_RGB2LAB)[0,0];P=np.vstack([pl,water])
H,W=alpha.shape;dist=np.full((H,W),np.inf,np.float32);cls=np.full((H,W),-1,np.int16)
for k,p in enumerate(P):
 if k==3: continue
 d=((lab-p)**2*np.array([.3,1,1],np.float32)).sum(-1);b=d<dist;dist[b]=d[b];cls[b]=k
cls[~alpha]=-1
# Majority and small-noise cleanup. Pixel unit ~21m ground at 48 deg N.
from scipy import ndimage
best=np.full_like(cls,-1);cnt=np.zeros((H,W),np.float32)
for k in np.unique(cls):
 if k<0: continue
 c=cv2.boxFilter((cls==k).astype(np.float32),-1,(9,9),normalize=False);b=c>cnt;best[b]=k;cnt[b]=c[b]
cls[alpha]=best[alpha]
# Keep classifications inside the real scan footprint, including small regions.
# Dropping small regions created artificial transparent speckles; no no-data infilling.
np.save('work/classes.npy',cls)
# polygons with per-class candidate IDs for repeated/near-identical swatches
import rasterio.features as rf
from affine import Affine
from shapely.geometry import shape,mapping
from shapely.ops import transform
from pyproj import Transformer
M=json.load(open('work/meta.json'));T=Affine(*M['transform']);t=Transformer.from_crs(3857,4326,always_xy=True)
F=[]
for g,k in rf.shapes(cls,mask=(cls>=0)&(cls<len(L)),transform=T):
 k=int(k);p=shape(g).simplify(35,preserve_topology=True)
 if p.is_empty: continue
 p=transform(t.transform,p)
 color=legend[k]['rgb'];cand=sorted(set([k]+legend[k]['similar_swatch_ids']))
 F.append(dict(type='Feature',geometry=mapping(p),properties={'palette_index':k,'color':'#%02x%02x%02x'%tuple(color),'candidates':','.join(str(c) for c in cand),'approximate':True}))
json.dump(dict(type='FeatureCollection',features=F),open('work/units.geojson','w'),separators=(',',':'))
print('polygons',len(F))
cv2.imwrite('work/segmentation.png',cv2.cvtColor(sm,cv2.COLOR_RGB2BGR))
