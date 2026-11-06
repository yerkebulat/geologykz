"""Native shared-legend batch builder. Inputs remain outside git.
Usage: python family.py CONFIG SOURCE_DIR WORK_DIR OUTPUT_DIR BORDER_GEOJSON
No SAM, nearest-neighbor geology fill, or interpreted/unique unit claims.
"""
import sys,json,math,hashlib,os
from pathlib import Path
import cv2,numpy as np
from PIL import Image
from affine import Affine
from pyproj import Transformer
from shapely.geometry import shape,mapping
from shapely import make_valid
from shapely.ops import transform as geom_transform
from rasterio.features import rasterize,shapes
from rasterio.warp import reproject,Resampling
cfgpath,S,W,O,B=map(Path,sys.argv[1:]);C=json.load(open(cfgpath));W.mkdir(parents=True,exist_ok=True)
def dump(a,p):p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(a,ensure_ascii=False,indent=2))
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def native_palette(im,box):
 x,y,w,h=box;pad=min(10,h//5);p=cv2.medianBlur(im[y+pad:y+h-pad,x+pad:x+w-pad],5).reshape(-1,3);p=p[p.mean(1)>=np.percentile(p.mean(1),35)];return np.median(p,0)[::-1].astype(int).tolist()
L=[];family=O/C['family'];family.mkdir(parents=True,exist_ok=True)
for plate in C['legend_plates']:
 im=cv2.imread(str(S/plate['file']));bs=plate['boxes']
 for box in bs:
  x,y,w,h=box;matrix=plate['number']==3 and y>3750
  if C.get('legend_layout')=='central':
   if plate['number']<4:
    col=x//1800+1;rows=sorted([b for b in bs if abs(b[0]-x)<100],key=lambda b:b[1]);row=rows.index(box)+1
    ny=rows[row][1]-8 if row<len(rows) else im.shape[0]-180
    crop=im[max(y-8,0):ny,max(x-12,0):min(x+1750,im.shape[1]-80)];ref=f"Central native legend plate {plate['number']}, column {col}, entry {row}"
   else:
    # Exact native column heading, left geological-type description, and cell with its original code below.
    crop=np.full((1050,1400,3),250,np.uint8);head=im[2820:3410,x-8:x+w+8];label=im[max(y-140,0):y+200,100:920];cell=im[max(y-8,0):y+200,x-8:x+w+8]
    crop[:head.shape[0],:head.shape[1]]=head;crop[650:650+label.shape[0],:label.shape[1]]=label;crop[650:650+cell.shape[0],1000:1000+cell.shape[1]]=cell
    ref=f"Central native intrusion matrix, source cell x{x} y{y}"
  elif not matrix:
   col=round((x-(480 if plate['number']==2 else 540))/1835)+1;rows=[b for b in bs if abs(b[0]-x)<100 and (plate['number']!=3 or b[1]<3100)];rows.sort(key=lambda b:b[1]);row=rows.index(box)+1
   ny=rows[row][1]-8 if row<len(rows) else min(y+450,im.shape[0]-200)
   crop=im[y-8:ny,max(x-12,0):min(x+1790,im.shape[1]-90)];ref=f"East legend sheet {plate['number']-1}, column {col}, entry {row}"
  else:
   crop=np.full((900,1300,3),250,np.uint8);head=im[3130:3760,x-8:x+w+8];label=im[y-15:y+h+15,370:1320];cell=im[y-8:y+h+8,x-8:x+w+8]
   crop[:head.shape[0],:head.shape[1]]=head;crop[670:670+label.shape[0],:label.shape[1]]=label;crop[670:670+cell.shape[0],1050:1050+cell.shape[1]]=cell;ref=f"East intrusion matrix, source cell x{x} y{y}"
  i=len(L);p=family/f'legend/entry-{i}.webp';p.parent.mkdir(exist_ok=True);Image.fromarray(cv2.cvtColor(crop,cv2.COLOR_BGR2RGB)).save(p,quality=84)
  L.append(dict(id=i,code=ref,ru='Исторические обозначения и описания сохранены в фрагменте оригинальной легенды.',en='Native shared-legend reference, not a unique or transcribed geological unit. Consult the source excerpt.',age='Not transcribed; native legend only',rgb=native_palette(im,box),section_only=False,image=f'data/detailed/{C["family"]}/legend/entry-{i}.webp',legend_plate=plate['number'],native_box=box))
full_plates=C.get('full_legend_plates',[dict(number=p,file=f'east_legend_{p}.jpg') for p in [1,2,3]])
for plate in full_plates:
 p=plate['number'];im=Image.open(S/plate['file']);im.thumbnail((2400,2400));im.save(family/f'plate-{p}.webp',quality=84)
pal=cv2.cvtColor(np.array([[u['rgb'] for u in L]],np.uint8),cv2.COLOR_RGB2LAB)[0].astype(float)
for i,u in enumerate(L):u['similar_swatch_ids']=[j for j in range(len(L)) if j!=i and np.linalg.norm(pal[i]-pal[j])<12]
dump(L,family/'legend.json')
rights='Source rights remain with authors/rightsholders; no open redistribution license established. Native scans, excerpts and source-derived vectors are excluded from any repository software license. Hosting on Geokniga is not proof of an open license.'
dump(dict(sourcePage=C['legend_source'],source_files={p['file']:sha(S/p['file']) for p in full_plates},credit=C['credit'],sampled_swatches=len(L),limitations='Sampled native stratigraphic swatches and intrusion matrix cells. Not a comprehensive interpreted/transcribed legend; native labels/age descriptions remain in exact excerpts. Candidate lists are non-unique and not exhaustive.',rights=rights),family/'provenance.json');(family/'RIGHTS.md').write_text(rights+'\n'+C['legend_source']+'\n'+C['credit']+'\n')
toM=Transformer.from_crs(4326,3857,always_xy=True);fromM=Transformer.from_crs(3857,4326,always_xy=True);datum=Transformer.from_crs(4284,3857,always_xy=True);country=geom_transform(toM.transform,shape(json.load(open(B))['geometry']))
for sheet in C['sheets']:
 sid=sheet['id']
 if os.environ.get('ONLY_SHEET') and os.environ['ONLY_SHEET']!=sid:continue
 dest=O/sid;dest.mkdir(parents=True,exist_ok=True);work=W/sid;work.mkdir(exist_ok=True);G=np.array(sheet['gcps'],float);x,y=datum.transform(G[:,2],G[:,3]);XY=np.stack([x,y],-1);origin=XY.mean(0)
 def design(U):a,b=U[:,0],U[:,1];return np.stack([np.ones(len(a)),a,b,a*a,a*b,b*b],-1)
 D=design((XY-origin)/100000);coef=np.linalg.lstsq(D,G[:,:2],rcond=None)[0];err=np.linalg.norm(D@coef-G[:,:2],axis=1);loo=[]
 for i in range(len(G)):
  keep=np.arange(len(G))!=i;c=np.linalg.lstsq(D[keep],G[keep,:2],rcond=None)[0];loo.append(float(np.linalg.norm(D[i]@c-G[i,:2])))
 report=dict(method='Quadratic inverse remap from manually read labelled native graticule/neatline marks, not an image-transfer fit',gcp_columns=['pixel_x','pixel_y','lon','lat'],gcps=G.tolist(),gcp_pick_uncertainty_native_px=8,assumed_src_crs='EPSG:4284 (Pulkovo 1942), not explicitly confirmed on scan',target_crs='EPSG:3857',rms_native_px=float(np.sqrt(np.mean(err**2))),max_native_px=float(err.max()),loo_errors_px=loo,loo_max_native_px=max(loo),independent_geographic_landmarks=0,caveat='Grid-fit and leave-one-out residuals are not absolute geographic accuracy. Picks are approximate; all controls are on frame, not surveyed landmarks. Datum assumption, paper/scanner distortion and interior alignment remain unverified. Provisional, not field-grade.')
 assert report['rms_native_px']<10 and max(loo)<45,'Coordinate fit needs manual review'
 dump(report,dest/'georef.json');print(sid,'RMS',report['rms_native_px'],'LOO',max(loo),flush=True)
 xmin,xmax=x.min(),x.max();ymin,ymax=y.min(),y.max();res=110.;width=math.ceil((xmax-xmin)/res);height=math.ceil((ymax-ymin)/res);T=Affine(res,0,xmin,0,-res,ymax)
 xx,yy=np.meshgrid(xmin+(np.arange(width)+.5)*res,ymax-(np.arange(height)+.5)*res);P=design(np.stack([(xx-origin[0])/100000,(yy-origin[1])/100000],-1).reshape(-1,2))@coef
 raw=cv2.imread(str(S/sheet['file']));rgba=cv2.cvtColor(raw,cv2.COLOR_BGR2RGBA)
 # Controls are ordered TL,TR,BL,BR,top midpoint,bottom midpoint,left midpoint,right midpoint, then any extra labelled controls.
 mask=np.zeros(raw.shape[:2],np.uint8);order=[0,4,1,7,3,5,2,6];frame=G[order,:2].copy();center=frame.mean(0);frame+=(center-frame)/np.linalg.norm(center-frame,axis=1)[:,None]*8
 cv2.fillPoly(mask,[frame.astype('int32')],255);rgba[:,:,3]=mask
 im=cv2.remap(rgba,P[:,0].reshape(height,width).astype('float32'),P[:,1].reshape(height,width).astype('float32'),cv2.INTER_LINEAR,borderMode=cv2.BORDER_CONSTANT,borderValue=0);im[:,:,3]*=rasterize([(mapping(country),1)],out_shape=(height,width),transform=T).astype(np.uint8)
 np.save(work/'scan.npy',im);dump(dict(transform=list(T)[:6],width=width,height=height),work/'render.json')
 # Coarser color grid (~140m ground at50N); Scan retains higher source sampling.
 ci=cv2.resize(im,(width//2,height//2),interpolation=cv2.INTER_AREA);CT=T*Affine.scale(width/ci.shape[1],height/ci.shape[0]);alpha=ci[:,:,3]>250;rgb=ci[:,:,:3];dark=(cv2.cvtColor(rgb,cv2.COLOR_RGB2GRAY)<85).astype('uint8')
 # Central has real black/green mafic lithologies: never inpaint them as text.
 filtered=rgb if C.get('ink_filter')=='median_only' else cv2.inpaint(rgb,dark,3,cv2.INPAINT_TELEA)
 sm=cv2.medianBlur(filtered,7);sm=cv2.bilateralFilter(sm,9,25,9);lab=cv2.cvtColor(sm,cv2.COLOR_RGB2LAB).astype('float32')
 # Native labelled-water samples, per-sheet override for the paler Bukhtarma reservoir scan.
 water_rgb=sheet.get('water_rgb',C.get('water_rgb'))
 # No unsourced global white/blue exclusion: those are actual Central legend units.
 palette=pal if water_rgb is None else np.vstack([pal,cv2.cvtColor(np.array([[water_rgb]],np.uint8),cv2.COLOR_RGB2LAB)[0,0]])
 dist=np.full(alpha.shape,np.inf,np.float32);cls=np.full(alpha.shape,-1,np.int16)
 for k,p in enumerate(palette):
  dd=((lab-p)**2*np.array([.3,1,1],np.float32)).sum(-1);better=dd<dist;dist[better]=dd[better];cls[better]=k
 cls[~alpha]=-1;best=np.full_like(cls,-1);count=np.zeros(alpha.shape,np.float32)
 for k in np.unique(cls):
  if k<0:continue
  c=cv2.boxFilter((cls==k).astype('float32'),-1,(7,7),normalize=False);better=c>count;best[better]=k;count[better]=c[better]
 cls[alpha]=best[alpha];np.save(work/'classes.npy',cls);F=[];repairs=0
 def rnd(a):return [rnd(v) for v in a] if isinstance(a[0],(list,tuple)) else [round(a[0],6),round(a[1],6)]
 for geo,k in shapes(cls,mask=(cls>=0)&(cls<len(L)),transform=CT):
  k=int(k);p=shape(geo).simplify(198,preserve_topology=True)
  if p.is_empty:continue
  p=geom_transform(fromM.transform,p);geo=mapping(p);geo['coordinates']=rnd(geo['coordinates']);q=shape(geo)
  if not q.is_valid:
   fixed=make_valid(q);assert fixed.geom_type in ['Polygon','MultiPolygon'] and abs(fixed.area-q.area)<1e-12,'Non-area-preserving topology repair requires review';geo=mapping(fixed);repairs+=1
  cand=sorted(set([k]+L[k]['similar_swatch_ids']));F.append(dict(type='Feature',geometry=geo,properties=dict(palette_index=k,color='#%02x%02x%02x'%tuple(L[k]['rgb']),candidates=','.join(map(str,cand)),approximate=True)))
 (dest/'units.geojson').write_text(json.dumps(dict(type='FeatureCollection',features=F),separators=(',',':')))
 vy,vx=np.where(im[:,:,3]>250);txmin=xmin+vx.min()*res;txmax=xmin+(vx.max()+1)*res;tymin=ymax-(vy.max()+1)*res;tymax=ymax-vy.min()*res;bounds=[*fromM.transform(txmin,tymin),*fromM.transform(txmax,tymax)]
 o=math.pi*6378137;tiles=0;total=0
 for z in range(7,12):
  ts=2*o/2**z
  for tx in range(math.floor((txmin+o)/ts),math.floor((txmax+o)/ts)+1):
   for ty in range(math.floor((o-tymax)/ts),math.floor((o-tymin)/ts)+1):
    dst=np.zeros((4,256,256),np.uint8);DT=Affine(ts/256,0,tx*ts-o,0,-ts/256,o-ty*ts);reproject(im.transpose(2,0,1),dst,src_transform=T,src_crs=3857,dst_transform=DT,dst_crs=3857,resampling=Resampling.bilinear);p=dest/f'tiles/{z}/{tx}/{ty}.webp';p.parent.mkdir(parents=True,exist_ok=True);Image.fromarray(dst.transpose(1,2,0)).save(p,quality=86,method=4);tiles+=1;total+=p.stat().st_size
  print(sid,'z',z,flush=True)
 limitations=f"Experimental color segmentation from {len(L)} sampled native shared-legend references, not transcribed or unique units. Candidate lists not exhaustive; hatches/text/water classification approximate. Provisional georeferencing, not field-grade. Scan printed {sheet['scan_printed']}; series/catalog {C.get('catalog',1976)}. "+C.get('extra_limitations','')
 s=dict(id=sid,label=sheet['label'],sourcePage=f'https://www.geokniga.org/maps/{sheet["page"]}',credit=C['credit'],units=f'data/detailed/{sid}/units.geojson',legend=f'data/detailed/{C["family"]}/legend.json',legendSource=C['legend_source'],legendPages=[f'data/detailed/{C["family"]}/plate-{p}.webp' for p in [v['number'] for v in full_plates]],bounds=[bounds[:2],bounds[2:]],rasterTiles=dict(tiles=[f'data/detailed/{sid}/tiles/{{z}}/{{x}}/{{y}}.webp'],tileSize=256,minzoom=7,maxzoom=11,bounds=bounds),dates=dict(scan_printed=sheet['scan_printed'],catalog=C.get('catalog',1976)),experimental=True,license=rights,limitations=limitations,accuracy=f"{len(G)} labelled native frame controls; internal grid-fit RMS {report['rms_native_px']:.2f}px, leave-one-out max {max(loo):.2f}px. "+report['caveat'])
 if C.get('keep_native_footer'):
  footer_box=[0,int(G[:,1].max()+40),raw.shape[1],raw.shape[0]]
  Image.fromarray(cv2.cvtColor(raw,cv2.COLOR_BGR2RGB)).crop(footer_box).save(dest/'source-notice.webp',quality=88)
  s['sourceNotice']=f'data/detailed/{sid}/source-notice.webp'
 dump(dict(sheets=[s]),dest/'manifest.json');dump(dict(water_sample_rgb=water_rgb,water_evidence=sheet.get('water_evidence',C['water_evidence']),source_file=sheet['file'],source_sha256=sha(S/sheet['file']),source_bytes=(S/sheet['file']).stat().st_size,sourcePage=s['sourcePage'],legendSource=C['legend_source'],legend_family=C['family'],credit=C['credit'],source_rights=rights,method='Actual legend-swatch Lab segmentation, not SAM. Text/hatch filtering and majority smoothing; no removed-small-region holes or nearest-neighbor geological infill. Corrected Kazakhstan border including Baikonur is unchanged.',ink_filter=C.get('ink_filter','dark_inpaint'),reproduction='tools/detailed-maps/family.py + '+cfgpath.name),dest/'provenance.json');(dest/'RIGHTS.md').write_text(rights+'\n'+s['sourcePage']+'\n'+C['legend_source']+'\n'+C['credit']+'\n')
 dump(dict(polygons=len(F),tiles=tiles,tile_bytes=total,color_pixel_mercator_m=220,scan_pixel_mercator_m=110,color_source_pixels=int(alpha.sum()),water_pixels=int(((cls==len(L))&alpha).sum()),removed_small_regions=0,area_preserving_topology_repairs=repairs),dest/'processing.json')
 # Small local previews, never git assets.
 out=np.zeros_like(ci)
 for u in L:out[cls==u['id'],:3]=u['rgb'];out[cls==u['id'],3]=255
 for name,arr in [('scan',im),('colors',out)]:p=Image.fromarray(arr);p.thumbnail((900,900));p.save(work/f'{name}-preview.png')
 print(sid,'complete',len(F),'polygons',tiles,'tiles',flush=True)
