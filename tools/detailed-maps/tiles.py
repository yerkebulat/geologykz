"""Bounded XYZ raster pilot: z7..12, 256px WebP tiles, all cells within sheet bbox.
Uses the unchanged georeferenced RGBA array. No geology or alpha infill.
"""
import os,json,math,numpy as np
from PIL import Image
from affine import Affine
from rasterio.warp import reproject,Resampling
m=json.load(open('work/meta.json'));im=np.load('work/scan.npy').transpose(2,0,1);srcT=Affine(*m['transform']);R=6378137.;o=math.pi*R
xmin,ymin,xmax,ymax=m['bounds3857'];out=os.environ.get('DETAILED_OUTPUT','build/data/detailed/m43xxxi')+'/tiles';rows=[]
for z in range(7,13):
 ts=2*o/(2**z);x0=math.floor((xmin+o)/ts);x1=math.floor((xmax+o)/ts);y0=math.floor((o-ymax)/ts);y1=math.floor((o-ymin)/ts)
 for x in range(x0,x1+1):
  for y in range(y0,y1+1):
   dst=np.zeros((4,256,256),np.uint8);T=Affine(ts/256,0,x*ts-o,0,-ts/256,o-y*ts)
   reproject(im,dst,src_transform=srcT,src_crs='EPSG:3857',dst_transform=T,dst_crs='EPSG:3857',resampling=Resampling.bilinear)
   p=f'{out}/{z}/{x}/{y}.webp';os.makedirs(os.path.dirname(p),exist_ok=True);Image.fromarray(dst.transpose(1,2,0)).save(p,quality=86,method=5)
   rows.append({'z':z,'x':x,'y':y,'path':p,'bytes':os.path.getsize(p)})
 print(z,(x1-x0+1)*(y1-y0+1),flush=True)
json.dump(rows,open('work/tile_inventory.json','w'));print('tiles',len(rows),'bytes',sum(t['bytes'] for t in rows))
# Export rounded source-derived polygons, legend and recorded controls beside tiles.
import shutil
from pathlib import Path
root=Path(__file__).resolve().parents[2];dest=Path(out).parent
D=json.load(open('work/units.geojson'))
def rnd(a):return [rnd(v) for v in a] if isinstance(a[0],list) else [round(a[0],6),round(a[1],6)]
for f in D['features']:f['geometry']['coordinates']=rnd(f['geometry']['coordinates'])
json.dump(D,open(dest/'units.geojson','w'),separators=(',',':'))
for f in ['legend.json','georef.json']:shutil.copy('work/'+f,dest/f)
M=json.load(open(root/'docs/data/detailed/m43xxxi/manifest.json'))
s=M['sheets'][0];s['coordinates']=m['corner_lnglats']
s['rasterTiles']['bounds']=[s['coordinates'][0][0],s['coordinates'][2][1],s['coordinates'][1][0],s['coordinates'][0][1]]
json.dump(M,open(dest/'manifest.json','w'),ensure_ascii=False,indent=2)
