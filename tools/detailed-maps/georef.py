import numpy as np,json,cv2,os
from pyproj import Transformer
from rasterio.transform import from_bounds
# Native image graticule intersections (x,y,longitude,latitude), manually read from zoomed crops
G=np.array([[2195,966,72,48+2/3],[4369,974,72.5,48+2/3],[6545,970,73,48+2/3],
[2180,3162,72,48+1/3],[4370,3168,72.5,48+1/3],[6554,3162,73,48+1/3],
[2167,5358,72,48],[4371,5368,72.5,48],[6568,5366,73,48]],float)
# Soviet map datum assumed Pulkovo 1942; not explicitly confirmed on scan.
t=Transformer.from_crs(4284,3857,always_xy=True)
x,y=t.transform(G[:,2],G[:,3]);X=np.stack([x,y],-1);origin=X.mean(0);scale=100000
U=(X-origin)/scale
def design(U):
 x,y=U[:,0],U[:,1];return np.stack([np.ones(len(x)),x,y,x*x,x*y,y*y],-1)
D=design(U);coef=np.linalg.lstsq(D,G[:,:2],rcond=None)[0];pred=D@coef
err=np.linalg.norm(pred-G[:,:2],axis=1);loo=[]
for i in range(len(G)):
 keep=np.arange(len(G))!=i;C=np.linalg.lstsq(D[keep],G[keep,:2],rcond=None)[0];loo.append(float(np.linalg.norm(D[i]@C-G[i,:2])))
print('RMS native pixel',np.sqrt(np.mean(err**2)),'max',err.max(),'LOO',loo)
# Independent center holdout with remaining 8 controls
fit=np.linalg.lstsq(D[np.arange(9)!=4],G[np.arange(9)!=4,:2],rcond=None)[0];print('center holdout',np.linalg.norm(D[4]@fit-G[4,:2]))
report={'gcp_source':'manual native scan coordinates, corners + four midpoint grid/frame intersections + centre',
'gcp_columns':['pixel_x','pixel_y','lon','lat'],'gcps':G.tolist(),'assumed_src_crs':'EPSG:4284 (not explicitly confirmed)','target_crs':'EPSG:3857','transformation':'quadratic inverse remap',
'rms_native_px':float(np.sqrt(np.mean(err**2))),'max_native_px':float(err.max()),'loo_errors_px':loo,'center_holdout_native_px':float(np.linalg.norm(D[4]@fit-G[4,:2])),
'geographic_extent_pulkovo42':[72,48,73,48+2/3],'caveat':'Residuals are grid fit, not absolute geographic accuracy. Datum assumption and manual picking are unverified.'}
json.dump(report,open('work/georef.json','w'),indent=2)
# z11-ish render at 35m / native ~17m/px for small pilot. 32m merc gives ~21m ground.
res=32.;xmin=x.min();xmax=x.max();ymin=y.min();ymax=y.max();W=int(np.ceil((xmax-xmin)/res));H=int(np.ceil((ymax-ymin)/res));
xx=xmin+(np.arange(W)+.5)*res;yy=ymax-(np.arange(H)+.5)*res;XX,YY=np.meshgrid(xx,yy)
v=np.stack([(XX-origin[0])/scale,(YY-origin[1])/scale],-1).reshape(-1,2);P=design(v)@coef
mx=P[:,0].reshape(H,W).astype('float32');my=P[:,1].reshape(H,W).astype('float32')
im=cv2.imread('sources/M-43-XXXI.jpg');rgba=cv2.cvtColor(im,cv2.COLOR_BGR2RGBA)
# All 9 points define the grid; no margins, no invented pixels. Crop inward a few px to remove frame.
mask=np.zeros(im.shape[:2],np.uint8);cv2.fillPoly(mask,[np.array([[2198,970],[6541,974],[6564,5362],[2171,5354]],np.int32)],255);rgba[:,:,3]=mask
warped=cv2.remap(rgba,mx,my,cv2.INTER_LINEAR,borderMode=cv2.BORDER_CONSTANT,borderValue=0)
# Clip to corrected current Kazakhstan border, which includes Baikonur.
import rasterio.features
from shapely.geometry import shape,mapping
from shapely.ops import transform
from pathlib import Path
border_path=os.environ.get('BORDER_GEOJSON',str(Path(__file__).resolve().parents[2]/'docs/data/kazakhstan_border.geojson'))
b=json.load(open(border_path))['geometry']
tb=Transformer.from_crs(4326,3857,always_xy=True);b=transform(tb.transform,shape(b))
T=from_bounds(xmin,ymax-H*res,xmin+W*res,ymax,W,H)
country=rasterio.features.rasterize([(mapping(b),1)],out_shape=(H,W),transform=T)
warped[:,:,3]*=country.astype(np.uint8)
cv2.imwrite('work/scan.png',cv2.cvtColor(warped,cv2.COLOR_RGBA2BGRA))
np.save('work/scan.npy',warped)
inv=Transformer.from_crs(3857,4326,always_xy=True)
json.dump({'width':W,'height':H,'transform':list(T)[:6],'bounds3857':[xmin,ymax-H*res,xmin+W*res,ymax],
'corner_lnglats':[inv.transform(a,b) for a,b in [(xmin,ymax),(xmin+W*res,ymax),(xmin+W*res,ymax-H*res),(xmin,ymax-H*res)]]},open('work/meta.json','w'))
print('rendered',W,H)
