"""Scan-only georeferencing + XYZ tiles for Extra collection Soviet map scans.
Four labelled/nomenclature frame corners (TL,TR,BL,BR) -> perspective (homography) fit in a sheet-centred
Lambert conformal conic on the Krassovsky ellipsoid; datum EPSG:4284 (Pulkovo 1942) assumed, shifted to WGS84
with pyproj's default EPSG:4284->EPSG:4326 operation (same as existing site sheets). Output clipped to the sheet
frame and the repository Kazakhstan border (Baikonur included). No colour segmentation."""
import json,math,os,sys,re,numpy as np,cv2
from pyproj import Transformer,CRS
from shapely.geometry import shape,box,mapping
from shapely.ops import transform as gtrans
from shapely.prepared import prep
from rasterio.features import rasterize
from affine import Affine
from PIL import Image
Image.MAX_IMAGE_PIXELS=None;cv2.setNumThreads(2)
ROM={'I':1,'V':5,'X':10}
def roman(s):
    v=0
    for i,c in enumerate(s):
        x=ROM[c]; v+= -x if i+1<len(s) and ROM[s[i+1]]>x else x
    return v
def nomen(sheet):
    s=sheet.replace('К','K').replace('М','M').replace('Л','L')
    m=re.match(r'([K-N])-(\d+)-(.+)$',s)
    L,z,q=m.group(1),int(m.group(2)),m.group(3)
    lat0={'K':40,'L':44,'M':48,'N':52}[L];lon0=(z-31)*6
    if q in 'АБВГ':
        i='АБВГ'.index(q);w=lon0+3*(i%2);s_=lat0+4-2*(i//2)-2
        return w,w+3,s_,s_+2,500000
    n=roman(q)-1;r,c=n//6,n%6
    w=lon0+c;n_=lat0+4-r*(2/3)
    return w,w+1,n_-2/3,n_,200000
g=json.load(open('gcp.json'));meta=json.load(open('meta.json'))
B=json.load(open(sys.argv[2] if len(sys.argv)>2 else '/workspace/geologykz-layers/docs/data/kazakhstan_border.geojson'))
geom=shape(B['geometry'] if 'geometry' in B else B['features'][0]['geometry'])
to3857=Transformer.from_crs(4326,3857,always_xy=True);from3857=Transformer.from_crs(3857,4326,always_xy=True)
w2p=Transformer.from_crs(4326,4284,always_xy=True);p2w=Transformer.from_crs(4284,4326,always_xy=True)
country=gtrans(to3857.transform,geom);pc=prep(country)
O=math.pi*6378137
def run(pid,outroot='out'):
    G=g[pid];M=meta[pid];sid=M['id']
    if 'll' in G: (W_,N_),(E_,_),(_,S_),_=G['ll'];W_,E_,S_,N_=G['ll'][0][0],G['ll'][1][0],G['ll'][2][1],G['ll'][0][1];scale=1000000
    else: W_,E_,S_,N_,scale=nomen(G['sheet'])
    ll=np.array([[W_,N_],[E_,N_],[W_,S_],[E_,S_]],float);px=np.array(G['px'],float)
    lat1=S_+(N_-S_)/6;lat2=N_-(N_-S_)/6;lon0=(W_+E_)/2
    fit=CRS.from_proj4(f'+proj=lcc +lat_1={lat1} +lat_2={lat2} +lat_0={(S_+N_)/2} +lon_0={lon0} +ellps=krass +units=m +no_defs')
    p2f=Transformer.from_crs(4284,fit,always_xy=True)
    fx,fy=p2f.transform(ll[:,0],ll[:,1]);F=np.stack([fx,fy],-1)
    H=cv2.getPerspectiveTransform(F.astype(np.float32),px.astype(np.float32))
    # diagnostics: affine residual (frame non-affinity), edge-length ratio check
    A=np.c_[F,np.ones(4)];coef,_,_,_=np.linalg.lstsq(A,px,rcond=None);aff_res=np.linalg.norm(A@coef-px,axis=1)
    top=np.linalg.norm(px[1]-px[0]);bot=np.linalg.norm(px[3]-px[2]);ftop=np.linalg.norm(F[1]-F[0]);fbot=np.linalg.norm(F[3]-F[2])
    left=np.linalg.norm(px[2]-px[0]);right=np.linalg.norm(px[3]-px[1]);fl=np.linalg.norm(F[2]-F[0]);fr=np.linalg.norm(F[3]-F[1])
    mpp=float(np.mean([ftop/top,fbot/bot,fl/left,fr/right]))
    diag=dict(top_bottom_ratio_measured=round(top/bot,4),top_bottom_ratio_expected=round(ftop/fbot,4),
        left_right_scale_ratio=round((left/fl)/(right/fr),4),height_width_scale_ratio=round(((left+right)/(fl+fr))/((top+bot)/(ftop+fbot)),4),
        affine_misfit_max_px=round(float(aff_res.max()),1),metres_per_source_px=round(mpp,1))
    # frame polygon in Pulkovo lon/lat (dense edges), to WGS84 then 3857
    t=np.linspace(0,1,60)
    ring=[(W_+(E_-W_)*a,N_) for a in t]+[(E_,N_-(N_-S_)*a) for a in t]+[(E_-(E_-W_)*a,S_) for a in t]+[(W_,S_+(N_-S_)*a) for a in t]
    rx,ry=p2w.transform([p[0] for p in ring],[p[1] for p in ring]);mx,my=to3857.transform(rx,ry)
    from shapely.geometry import Polygon
    frame=Polygon(list(zip(mx,my)));clip=frame.intersection(country)
    if clip.is_empty: return dict(id=sid,skipped='no Kazakhstan overlap')
    kz_frac=clip.area/frame.area
    src=cv2.imread('src/'+pid+'.jpg',cv2.IMREAD_COLOR);pyr=[src]
    while min(pyr[-1].shape[:2])>600: pyr.append(cv2.pyrDown(pyr[-1]))
    latc=(S_+N_)/2;zmax=int(min(12,max(10,math.floor(math.log2(156543.03*math.cos(math.radians(latc))/(mpp*0.85))))))
    zmin=7;dest=f'{outroot}/{sid}';tiles=0;nbytes=0
    xmin,ymin,xmax,ymax=clip.bounds
    for z in range(zmin,zmax+1):
        ts=2*O/2**z;mres=ts/256
        lev=max(0,min(len(pyr)-1,int(math.floor(math.log2(max(1,(mres/math.cos(math.radians(latc)))/mpp))))))
        im=pyr[lev];f=2**lev
        x0=math.floor((xmin+O)/ts);x1=math.floor((xmax+O)/ts);y0=math.floor((O-ymax)/ts);y1=math.floor((O-ymin)/ts)
        for tx in range(x0,x1+1):
            for ty in range(y0,y1+1):
                bx=box(tx*ts-O,O-(ty+1)*ts,(tx+1)*ts-O,O-ty*ts)
                if not clip.intersects(bx):continue
                part=clip.intersection(bx)
                T=Affine(mres,0,tx*ts-O,0,-mres,O-ty*ts)
                mask=rasterize([(mapping(part),1)],out_shape=(256,256),transform=T,dtype=np.uint8)
                if not mask.any():continue
                c=(np.arange(256)+.5)*mres;XX,YY=np.meshgrid(tx*ts-O+c,O-ty*ts-c)
                lo,la=from3857.transform(XX,YY);lo,la=w2p.transform(lo,la);ax,ay=p2f.transform(lo,la)
                P=cv2.perspectiveTransform(np.stack([ax,ay],-1).reshape(-1,1,2).astype(np.float64),H).reshape(256,256,2)/f
                rgb=cv2.remap(im,P[...,0].astype(np.float32),P[...,1].astype(np.float32),cv2.INTER_LINEAR,borderMode=cv2.BORDER_CONSTANT,borderValue=0)
                a=(mask*255).astype(np.uint8)
                rgba=np.dstack([rgb[...,::-1],a])
                p=f'{dest}/tiles/{z}/{tx}/{ty}.webp';os.makedirs(os.path.dirname(p),exist_ok=True)
                Image.fromarray(rgba,'RGBA').save(p,quality=int(M.get('quality',76)),method=4)
                tiles+=1;nbytes+=os.path.getsize(p)
    # validation preview in lon/lat with border + NE hydrography
    vb=clip.bounds;lo0,la0=from3857.transform(vb[0],vb[1]);lo1,la1=from3857.transform(vb[2],vb[3])
    wv=1100;hv=int(wv*(la1-la0)/((lo1-lo0)*math.cos(math.radians(latc))))
    LX,LY=np.meshgrid(np.linspace(lo0,lo1,wv),np.linspace(la1,la0,hv));plo,pla=w2p.transform(LX,LY);ax,ay=p2f.transform(plo,pla)
    lev=min(len(pyr)-1,max(0,int(math.log2(max(1,(lo1-lo0)*111000*math.cos(math.radians(latc))/wv/mpp)))));f=2**lev
    P=cv2.perspectiveTransform(np.stack([ax,ay],-1).reshape(-1,1,2),H).reshape(hv,wv,2)/f
    v=cv2.remap(pyr[lev],P[...,0].astype(np.float32),P[...,1].astype(np.float32),cv2.INTER_LINEAR,borderMode=cv2.BORDER_CONSTANT,borderValue=(255,255,255))
    def draw(gj,col,th):
        for ft in gj:
            gm=ft['geometry'];
            if gm is None:continue
            cs=gm['coordinates'];tp=gm['type']
            lines=[cs] if tp=='LineString' else cs if tp in('MultiLineString','Polygon') else [r for p in cs for r in p]
            for ln in lines:
                a=np.array(ln)[:,:2]
                if a[:,0].max()<lo0 or a[:,0].min()>lo1 or a[:,1].max()<la0 or a[:,1].min()>la1:continue
                q=np.stack([(a[:,0]-lo0)/(lo1-lo0)*wv,(la1-a[:,1])/(la1-la0)*hv],-1).astype(np.int32)
                cv2.polylines(v,[q],False,col,th)
    draw(NE['rivers'],(255,0,0),1);draw(NE['lakes'],(255,255,0),1);draw(NE['coast'],(0,128,255),1)
    draw([{'geometry':mapping(geom)}],(0,0,255),2)
    cv2.imwrite(f'val/{pid}_{sid}.jpg',v,[cv2.IMWRITE_JPEG_QUALITY,80])
    cx,cy=to3857.transform(*p2w.transform(ll[:,0],ll[:,1]));wll=np.stack(p2w.transform(ll[:,0],ll[:,1]),-1)
    return dict(id=sid,pid=pid,sheet=G['sheet'],scale=scale,extent_pulkovo=[W_,S_,E_,N_],corner_px=G['px'],
        corners_wgs84=wll.round(6).tolist(),fit_crs=fit.to_proj4(),homography=H.tolist(),diagnostics=diag,kz_fraction=round(kz_frac,3),
        bounds=[list(from3857.transform(xmin,ymin)),list(from3857.transform(xmax,ymax))],minzoom=zmin,maxzoom=zmax,tiles=tiles,tile_bytes=nbytes)
NE={}
def loadne():
    for k,f in [('rivers','rivers_lake_centerlines'),('lakes','lakes'),('coast','coastline')]:
        d=json.load(open(f'ne/{f}.geojson'))['features'];NE[k]=[x for x in d if x['geometry'] and box(44,38,90,57).intersects(shape(x['geometry']))]
if __name__=='__main__':
    loadne();res={}
    for pid in sys.argv[1].split(','):
        r=run(pid);res[pid]=r;print(json.dumps({k:r.get(k) for k in ['id','sheet','diagnostics','kz_fraction','maxzoom','tiles','tile_bytes','skipped']}),flush=True)
        json.dump(r,open(f'out/{pid}.report.json','w'),indent=1)
