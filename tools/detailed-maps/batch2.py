"""Reproducible bounded batch: native M-44-XV and K-43-B scans, actual legend swatches.
Run: python batch2.py SOURCE_DIR WORK_DIR OUTPUT_DIR BORDER_PATH
Originals and intermediates remain outside the repository. See batch2-notes.md.
"""
import sys, json, math, hashlib
from pathlib import Path
import cv2, numpy as np, rasterio
from PIL import Image
from affine import Affine
from pyproj import Transformer
from shapely.geometry import shape, mapping
from shapely.ops import transform as geom_transform
from rasterio.features import rasterize, shapes
from rasterio.warp import reproject, Resampling
S,W,O,B=map(Path,sys.argv[1:]);W.mkdir(parents=True,exist_ok=True)
toM=Transformer.from_crs(4326,3857,always_xy=True);fromM=Transformer.from_crs(3857,4326,always_xy=True)
country=geom_transform(toM.transform,shape(json.load(open(B))['geometry']))
def dump(d,p):p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(d,ensure_ascii=False,indent=2))
def palette(im,box):
 x,y,w,h=box;p=cv2.medianBlur(im[y+8:y+h-8,x+8:x+w-8],5).reshape(-1,3);p=p[p.mean(1)>=np.percentile(p.mean(1),35)]
 return np.median(p,0)[::-1].astype(int).tolist()
def boxes(im,plate):
 # Native outline detection with spatial constraints; retain outer contours once.
 b=cv2.threshold(cv2.cvtColor(im,cv2.COLOR_BGR2GRAY),130,255,cv2.THRESH_BINARY_INV)[1]
 cs,_=cv2.findContours(b,cv2.RETR_LIST,cv2.CHAIN_APPROX_SIMPLE);out=[]
 for x,y,w,h in sorted([cv2.boundingRect(c) for c in cs],key=lambda b:(b[1],b[0])):
  if not(125<w<185 and 45<h<115):continue
  if plate<3 and not any(abs(x-a)<35 for a in [235,1220,2205,3190]):continue
  if plate==3 and not(y>2500 and x>700):continue
  if any(abs(x-a)<8 and abs(y-b)<12 for a,b,_,_ in out):continue
  out.append((x,y,w,h))
 return sorted(out,key=lambda b:(round((b[0]-235)/985) if plate<3 else round((b[1]-2600)/170),b[1] if plate<3 else b[0]))
def legends(sid,dest):
 L=[]
 if sid=='m44xv':
  im=cv2.imread(str(S/'M-44-XV.jpg'))
  yy=[198,354,514,679,837,997,1160,1321,1482,1644,1807,1966,2128,2286,2445,2603,2762]
  codes=['Q','QIV','QIII-IV','QIII','QII-III','QII','QI-II','N2²⁻³','N1²⁻³–N2¹⁻²pv','N1¹⁻²ar','Pg3³','Pg2³','C2bk','C1v3–nkp','γPz3l III','γPz3l I','δPz3l I']
  ru=['Четвертичные отложения нерасчлененные (только на разрезах)','Современные отложения. Суглинки, супеси, пески, галечники','Верхнечетвертичные–современные отложения. Глины, суглинки, супеси, пески, галечники','Верхнечетвертичные отложения. Супеси, суглинки, пески, галечники','Средне-верхнечетвертичные отложения. Суглинки, супеси, пески, галечники','Среднечетвертичные отложения. Лёссовидные суглинки; супеси, пески','Нижне-среднечетвертичные отложения. Галечники, пески','Средний–верхний плиоцен. Желто-бурые и сизые тонкослоистые глины, алевриты, пески, галечники','Средний миоцен, средний плиоцен. Павлодарская свита. Красноцветные и зеленовато-серые известковистые глины, пески, песчаники','Нижний–средний миоцен. Аральская свита. Зеленоцветные и пестрые загипсованные глины, пески, галечники','Верхний олигоцен. Галечники; кварцевые пески, глины зеленые, желтые, белые (только на разрезе)','Верхний эоцен. Сливные песчаники','Средний отдел. Буконьская свита. Песчаники аркозовые и туфогенные, алевролиты, глинистые сланцы, горизонты конгломератов и гравелитов','Нижний отдел. Визейский ярус, верхний подъярус–намюрский ярус. Кокпектинская свита. Полимиктовые, реже туфогенные песчаники, кремнисто-глинистые сланцы, прослои алевролитов; туфы, редко лавы порфиритов','Поздний верхнепалеозойский комплекс. Аляскитовые, биотитовые, двуслюдяные граниты; гранит-порфиры','Аляскитовые, биотитовые и биотит-роговообманковые граниты, плагиограниты; гранит-порфиры; гранодиориты; граносиениты. Жилы и тела сиенит-порфиров','Диориты, габбро, сиенито-диориты']
  for i,y in enumerate(yy):
   x=round(37-(y-198)*33/(2762-198));box=(6800+x,200+y,176,90 if i==0 else 104);nx=200+(yy[i+1] if i+1<len(yy) else 2885)
   crop=im[box[1]-8:nx-5,6800:8250];path=f'legend/entry-{i}.webp';p=dest/path;p.parent.mkdir(exist_ok=True)
   Image.fromarray(cv2.cvtColor(crop,cv2.COLOR_BGR2RGB)).save(p,quality=88)
   L.append(dict(id=i,code=codes[i],ru=ru[i],en='Historic native legend; see source excerpt.',age='Historic legend, see native description',rgb=palette(im,box),section_only=i in [0,10],image=f'data/detailed/{sid}/{path}',native_box=list(box),transcription_caveat='Intrusive phase symbols and N superscripts provisional; source excerpt is authoritative.'))
 else:
  # Shared South 1979 legend. Native excerpts, NOT invented/transcribed unit names.
  # First two plates: stratigraphic rows; plate 3: composition/age matrix only.
  for plate in [1,2,3]:
   im=cv2.imread(str(S/f'south_legend_{plate}.jpg'));bs=boxes(im,plate)
   print('South plate',plate,'swatches',len(bs),flush=True)
   for box in bs:
    x,y,w,h=box
    if plate<3:
     col=round((x-235)/985)+1;rows=[b for b in bs if abs(b[0]-x)<55];row=rows.index(box)+1
     ny=rows[row][1]-8 if row<len(rows) else min(y+350,im.shape[0]-200)
     crop=im[max(y-8,0):ny,max(x-10,0):min(x+950,im.shape[1]-40)]
     ref=f'South 1979 plate {plate}, column {col}, entry {row}'
    else:
     # Keep actual age header and composition label alongside each cell.
     crop=np.full((620,1100,3),248,np.uint8)
     head=im[2040:2490,x-5:x+w+5];label=im[max(2500,y-25):y+h+25,120:690];cell=im[y-5:y+h+5,x-5:x+w+5]
     crop[:head.shape[0],:head.shape[1]]=head;crop[460:460+min(150,label.shape[0]),:label.shape[1]]=label[:150];crop[460:460+cell.shape[0],650:650+cell.shape[1]]=cell
     ref=f'South 1979 intrusion matrix, source cell x{x} y{y}'
    i=len(L);path=f'legend/entry-{i}.webp';p=dest/path;p.parent.mkdir(exist_ok=True)
    Image.fromarray(cv2.cvtColor(crop,cv2.COLOR_BGR2RGB)).save(p,quality=86)
    L.append(dict(id=i,code=ref,ru='Исторические обозначения сохранены в фрагменте оригинальной легенды.',en='Native legend reference, not a unique geological-unit identification. Consult the source excerpt.',age='Not transcribed; native legend only',rgb=palette(im,box),section_only=False,image=f'data/detailed/{sid}/{path}',native_box=list(box),legend_plate=plate))
  # Include modest-size full plates for context; originals remain source-linked.
  for plate in [1,2,3]:
   im=Image.open(S/f'south_legend_{plate}.jpg');im.thumbnail((3000,3000));im.save(dest/f'legend/plate-{plate}.webp',quality=86)
 pal=cv2.cvtColor(np.array([[l['rgb'] for l in L]],np.uint8),cv2.COLOR_RGB2LAB)[0].astype(float)
 for i,l in enumerate(L):l['similar_swatch_ids']=[j for j in range(len(L)) if i!=j and not L[j]['section_only'] and np.linalg.norm(pal[i]-pal[j])<12]
 dump(L,dest/'legend.json');return L,pal

def render(sid):
 dest=O/sid;dest.mkdir(parents=True,exist_ok=True);work=W/sid;work.mkdir(exist_ok=True)
 raw=cv2.imread(str(S/('M-44-XV.jpg' if sid=='m44xv' else 'K-43-B.jpg')))
 if sid=='m44xv':
  with rasterio.open(W/'m44xv/source.tif') as s: bounds=s.bounds;ref=s.read().transpose(1,2,0)
  match=json.load(open(Path(__file__).with_name('m44xv-registration.json')));H0=np.array(match['H']);crop=match['native_crop'];mw,mh=match['match_size']
  xmin,ymin=toM.transform(bounds.left,bounds.bottom);xmax,ymax=toM.transform(bounds.right,bounds.top);res=48.
  def sample(X,Y):
   lon,lat=fromM.transform(X,Y);u=(lon-bounds.left)/(bounds.right-bounds.left)*mw;v=(bounds.top-lat)/(bounds.top-bounds.bottom)*mh
   p=cv2.perspectiveTransform(np.stack([u,v],-1).astype('float32').reshape(-1,1,2),H0).reshape(*X.shape,2)
   return p[...,0]*crop[2]/mw+crop[0],p[...,1]*crop[3]/mh+crop[1]
  report=dict(method='Native scan co-registered to Geokniga supplementary GeoTIFF via homography; source CRS EPSG:4326',source_geotiff='https://www.geokniga.org/maps/additional/m-44-xvgeologicheskayakarta.tif',source_bounds=list(bounds),registration=match,caveat='Native scan has no readable latitude/longitude labels at the frame. Coordinate evidence is the supplied georeferenced TIFF, not independently read GCPs. Feature holdout measures image transfer only, not geographic accuracy; original TIFF registration provenance/datum conversion unknown. Provisional.')
 else:
  # Explicit labelled degree/half-degree neatline intersections, manually picked.
  G=np.array([[171,368,75,44],[806,376,75.5,44],[1431,389,76,44],[2061,395,76.5,44],[2691,394,77,44],[3321,387,77.5,44],[3951,375,78,44],[107,3861,75,42],[772,3879,75.5,42],[1420,3891,76,42],[2058,3897,76.5,42],[2707,3898,77,42],[3362,3895,77.5,42],[4008,3892,78,42],[139,2114,75,43],[3981,2120,78,43]],float)
  t=Transformer.from_crs(4284,3857,always_xy=True);x,y=t.transform(G[:,2],G[:,3]);X=np.stack([x,y],-1);origin=X.mean(0);U=(X-origin)/100000
  def design(u):a,b=u[:,0],u[:,1];return np.stack([np.ones(len(u)),a,b,a*a,a*b,b*b],-1)
  D=design(U);C=np.linalg.lstsq(D,G[:,:2],rcond=None)[0];e=np.linalg.norm(D@C-G[:,:2],axis=1);loo=[]
  for i in range(len(G)):
   keep=np.arange(len(G))!=i;c=np.linalg.lstsq(D[keep],G[keep,:2],rcond=None)[0];loo.append(float(np.linalg.norm(D[i]@c-G[i,:2])))
  print('Alma RMS',np.sqrt(np.mean(e*e)),'max',e.max(),'LOO max',max(loo),flush=True)
  report=dict(method='Quadratic inverse remap from labelled native neatline intersections',gcps=G.tolist(),gcp_columns=['pixel_x','pixel_y','lon','lat'],assumed_src_crs='EPSG:4284, not confirmed on scan',rms_native_px=float(np.sqrt(np.mean(e*e))),max_native_px=float(e.max()),loo_errors_px=loo,caveat='Manual boundary picks, no independently surveyed landmarks. Residuals measure grid fit only. Source datum assumed, not verified; provisional georeferencing.')
  xmin,xmax=x.min(),x.max();ymin,ymax=y.min(),y.max();res=110.
  def sample(X,Y):
   p=design(np.stack([(X-origin[0])/100000,(Y-origin[1])/100000],-1).reshape(-1,2))@C
   return p[:,0].reshape(X.shape),p[:,1].reshape(X.shape)
 width=math.ceil((xmax-xmin)/res);height=math.ceil((ymax-ymin)/res);T=Affine(res,0,xmin,0,-res,ymax)
 xx,yy=np.meshgrid(xmin+(np.arange(width)+.5)*res,ymax-(np.arange(height)+.5)*res);mx,my=sample(xx,yy)
 rgba=cv2.cvtColor(raw,cv2.COLOR_BGR2RGBA)
 if sid=='alma':
  mask=np.zeros(raw.shape[:2],np.uint8);cv2.fillPoly(mask,[np.array([[174,371],[805,379],[1431,392],[2061,398],[2691,397],[3321,390],[3948,378],[3978,2120],[4005,3889],[3362,3892],[2707,3895],[2058,3894],[1420,3888],[772,3876],[110,3858],[142,2114]],np.int32)],255);rgba[:,:,3]=mask
 im=cv2.remap(rgba,mx.astype('float32'),my.astype('float32'),cv2.INTER_LINEAR,borderMode=cv2.BORDER_CONSTANT,borderValue=0)
 im[:,:,3]*=rasterize([(mapping(country),1)],out_shape=(height,width),transform=T).astype(np.uint8)
 np.save(work/'scan.npy',im);dump(report,dest/'georef.json');print(sid,'render',width,height,flush=True)
 L,pal=legends(sid,dest);scan_for_colors=im if sid=='m44xv' else cv2.resize(im,(im.shape[1]//2,im.shape[0]//2),interpolation=cv2.INTER_AREA);colorT=T if sid=='m44xv' else T*Affine.scale(im.shape[1]/scan_for_colors.shape[1],im.shape[0]/scan_for_colors.shape[0]);alpha=scan_for_colors[:,:,3]>250;rgb=scan_for_colors[:,:,:3];dark=(cv2.cvtColor(rgb,cv2.COLOR_RGB2GRAY)<85).astype(np.uint8)
 sm=cv2.medianBlur(cv2.inpaint(rgb,dark,3,cv2.INPAINT_TELEA),7);sm=cv2.bilateralFilter(sm,9,25,9);lab=cv2.cvtColor(sm,cv2.COLOR_RGB2LAB).astype(np.float32)
 # Explicit blue water class competes with actual swatches; source white is NOT no-data.
 water=cv2.cvtColor(np.array([[[185,226,232]]],np.uint8),cv2.COLOR_RGB2LAB)[0,0];P=np.vstack([pal,water]);dist=np.full(alpha.shape,np.inf,np.float32);cls=np.full(alpha.shape,-1,np.int16)
 for k,p in enumerate(P):
  if k<len(L) and L[k]['section_only']:continue
  d=((lab-p)**2*np.array([.3,1,1],np.float32)).sum(-1);b=d<dist;dist[b]=d[b];cls[b]=k
 cls[~alpha]=-1;best=np.full_like(cls,-1);count=np.zeros(alpha.shape,np.float32)
 for k in np.unique(cls):
  if k<0:continue
  c=cv2.boxFilter((cls==k).astype(np.float32),-1,(7,7),normalize=False);b=c>count;best[b]=k;count[b]=c[b]
 cls[alpha]=best[alpha];np.save(work/'classes.npy',cls);F=[]
 for g,k in shapes(cls,mask=(cls>=0)&(cls<len(L)),transform=colorT):
  k=int(k);p=shape(g).simplify(res*(.9 if sid=='m44xv' else 1.8),preserve_topology=True)
  if p.is_empty:continue
  p=geom_transform(fromM.transform,p);cand=sorted(set([k]+L[k]['similar_swatch_ids']))
  F.append(dict(type='Feature',geometry=mapping(p),properties=dict(palette_index=k,color='#%02x%02x%02x'%tuple(L[k]['rgb']),candidates=','.join(map(str,cand)),approximate=True)))
 def rnd(a):return [rnd(v) for v in a] if isinstance(a[0],(list,tuple)) else [round(a[0],6),round(a[1],6)]
 for f in F:f['geometry']['coordinates']=rnd(f['geometry']['coordinates'])
 (dest/'units.geojson').write_text(json.dumps(dict(type='FeatureCollection',features=F),separators=(',',':')))
 # All 256px XYZ cells in bounded extent; no giant image source.
 o=math.pi*6378137;inventory=[];maxz=12 if sid=='m44xv' else 11
 validy,validx=np.where(im[:,:,3]>250);tilexmin=xmin+validx.min()*res;tilexmax=xmin+(validx.max()+1)*res;tileymint=ymax-(validy.max()+1)*res;tileymintop=ymax-validy.min()*res
 for z in range(7,maxz+1):
  ts=2*o/2**z
  for x in range(math.floor((tilexmin+o)/ts),math.floor((tilexmax+o)/ts)+1):
   for y in range(math.floor((o-tileymintop)/ts),math.floor((o-tileymint)/ts)+1):
    dst=np.zeros((4,256,256),np.uint8);DT=Affine(ts/256,0,x*ts-o,0,-ts/256,o-y*ts)
    reproject(im.transpose(2,0,1),dst,src_transform=T,src_crs=3857,dst_transform=DT,dst_crs=3857,resampling=Resampling.bilinear)
    p=dest/f'tiles/{z}/{x}/{y}.webp';p.parent.mkdir(parents=True,exist_ok=True);Image.fromarray(dst.transpose(1,2,0)).save(p,quality=86,method=4);inventory.append(dict(z=z,x=x,y=y,bytes=p.stat().st_size))
  print(sid,'z',z,flush=True)
 bounds=[*fromM.transform(tilexmin,tileymint),*fromM.transform(tilexmax,tileymintop)]
 sheet=dict(id=sid,label='1:200,000 M-44-XV' if sid=='m44xv' else '1:500,000 K-43-Б Alma-Ata',sourcePage='https://www.geokniga.org/maps/'+('42215' if sid=='m44xv' else '2561'),credit='East Kazakhstan Geological Administration; editor M. G. Khisamutdinov. Scan via geokniga.org.' if sid=='m44xv' else 'Kazakh SSR geological map, Alma-Ata; editors Bespalov / Kostenko; catalog Aerogeologiya. Scan and South shared legend via geokniga.org.',units=f'data/detailed/{sid}/units.geojson',legend=f'data/detailed/{sid}/legend.json',bounds=[bounds[:2],bounds[2:]],rasterTiles=dict(tiles=[f'data/detailed/{sid}/tiles/{{z}}/{{x}}/{{y}}.webp'],tileSize=256,minzoom=7,maxzoom=maxz,bounds=bounds),experimental=True,dates=dict(scan_printed=1964 if sid=='m44xv' else 1979,catalog=1964 if sid=='m44xv' else 1979),license='Source rights remain with authors/rightsholders; no open redistribution license established. Scan-derived assets excluded from repository software license.',accuracy=report['caveat'],limitations='Approximate color segmentation, not interpreted contacts. Hatches/text are not independently classified. Similar colors list candidates. Provisional georeferencing, not field-grade.'+(' Source TIFF georeferencing has no independent geographic verification.' if sid=='m44xv' else ' 178 sampled shared-legend swatches are native-image references, not transcribed or uniquely identified units. Candidate lists are not exhaustive. Consult native excerpts.'))
 if sid=='alma':sheet['legendPages']=[f'data/detailed/{sid}/legend/plate-{p}.webp' for p in [1,2,3]];sheet['legendSource']='https://www.geokniga.org/maps/2550'
 dump(dict(sheets=[sheet]),dest/'manifest.json');dump(dict(tiles=len(inventory),tile_bytes=sum(p['bytes'] for p in inventory),polygons=len(F),mapped_source_pixels=int((im[:,:,3]>250).sum()),color_source_pixels=int(alpha.sum()),color_pixel_mercator_m=48 if sid=='m44xv' else 220,water_pixels=int(((cls==len(L))&alpha).sum()),removed_small_regions=0),dest/'processing.json')
 dump(dict(sourcePage=sheet['sourcePage'],legendSource=sheet.get('legendSource',sheet['sourcePage']),source_geotiff_sha256=hashlib.sha256((W/'m44xv/source.tif').read_bytes()).hexdigest() if sid=='m44xv' else None,shared_legend_sha256={str(p):hashlib.sha256((S/f'south_legend_{p}.jpg').read_bytes()).hexdigest() for p in [1,2,3]} if sid=='alma' else None,source_sha256=hashlib.sha256((S/('M-44-XV.jpg' if sid=='m44xv' else 'K-43-B.jpg')).read_bytes()).hexdigest(),method='Legend-swatch Lab color segmentation, not SAM. No nearest-neighbor geological infill. Only opacity-positive native scan pixels inside corrected Kazakhstan country geometry. All classified small regions retained.',source_rights=sheet['license'],reproduction='tools/detailed-maps/batch2.py; see batch2-notes.md'),dest/'provenance.json')
 (dest/'RIGHTS.md').write_text('# Source-derived map data\n\n'+sheet['license']+'\n\nSource: '+sheet['sourcePage']+'\n'+('Shared native legend: https://www.geokniga.org/maps/2550\n' if sid=='alma' else '')+'Hosting on Geokniga is not evidence of an open license. Historic notices and authors remain applicable.\n')
 print(sid,'done',len(F),'polygons',len(inventory),'tiles',flush=True)
for sid in ['m44xv','alma']:render(sid)
