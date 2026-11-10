import json,shutil,hashlib,pathlib,re
P=pathlib.Path('/workspace/profmaps');D=pathlib.Path('/workspace/geologykz-layers/docs/data/detailed')
M=json.load(open(P/'meta.json'))
GN={'geo200':'Geological 1:200,000','geo500':'Geological 1:500,000','geo1m':'Geological 1:1,000,000','mineral':'Mineral resources and forecast','hydro':'Hydrogeological'}
CREDIT="From the professor's shared collection of Soviet geological maps (Kazakhstan maps). Scan only."
LIC="Rights remain with the original authors or rightsholders. Shared with this project as a teaching collection; no open license established. These scan-derived tiles are not covered by the repository code license."
def srcpath(pid):
    return P/'src'/(pid+'.jpg')
idx=[]
for pid,m in M.items():
    if pid=='q01':continue
    r=json.load(open(P/'out'/(pid+'.report.json')));sid=m['id'];assert r['id']==sid
    scale=r['scale'];sc='1:'+format(scale,',')
    title=m['title'].split(',')[0]
    kind=title[0].upper()+title[1:]
    label=m['name']+' · '+kind+', '+sc
    d=D/sid
    if d.exists():shutil.rmtree(d)
    shutil.copytree(P/'out'/sid/'tiles',d/'tiles')
    tiles=list((d/'tiles').rglob('*.webp'))
    c=r['corners_wgs84'];coords=[c[0],c[1],c[3],c[2]]
    b=r['bounds'];yr=m['year']
    acc=f"Four frame corners read by hand from the {m['name'].split()[0]} nomenclature (Pulkovo 1942 to WGS84), projective fit. Expect errors of a few hundred metres; corner residual check {r['diagnostics']['affine_misfit_max_px']} px."
    lim="Scan only, no color classification. Clipped to the Kazakhstan border. Historic labels and boundaries are retained as printed."
    s=dict(id=sid,label=label,name=m['name'],mapType=kind,scale=sc,group='prof-'+m['group'],groupLabel=GN[m['group']],scanOnly=True,year=yr,
           credit=CREDIT,sourceFile=m['drive_name'],coordinates=coords,bounds=b,license=LIC,accuracy=acc,limitations=lim,
           rasterTiles=dict(tiles=[f'data/detailed/{sid}/tiles/{{z}}/{{x}}/{{y}}.webp'],tileSize=256,minzoom=r['minzoom'],maxzoom=r['maxzoom'],bounds=[b[0][0],b[0][1],b[1][0],b[1][1]]))
    json.dump({'sheets':[s]},open(d/'manifest.json','w'),ensure_ascii=False,indent=1)
    sp=srcpath(pid);h=hashlib.sha256(sp.read_bytes()).hexdigest()
    prov=dict(id=sid,source='professor shared collection (Google Drive folder "Kazakhstan maps")',source_file=m['drive_name'],source_bytes=sp.stat().st_size,source_sha256=h,
              nomenclature=r['sheet'],scale=scale,map_type=m['title'],year_read=yr,extent_pulkovo=r['extent_pulkovo'],corner_px_TL_TR_BL_BR=r['corner_px'],corners_wgs84=r['corners_wgs84'],
              fit_crs=r['fit_crs'],homography=r['homography'],diagnostics=r['diagnostics'],tiles=len(tiles),tile_bytes=sum(t.stat().st_size for t in tiles))
    json.dump(prov,open(d/'georef.json','w'),ensure_ascii=False,indent=1)
    open(d/'RIGHTS.md','w').write(f"# Source rights and provenance\n\nScan-derived tiles of {m['name']}, {m['title']}, {sc}{', '+yr if yr else ''}. Source: the professor's shared collection of Soviet geological maps (file `{m['drive_name']}`).\n\n{LIC} Original scans are not committed. `georef.json` records the corner control points, the fit and the source hash.\n")
    idx.append(dict(id=sid,label=label,group='prof-'+m['group'],bounds=b))
order=list(GN)
idx.sort(key=lambda s:(order.index(s['group'][5:]),s['label']))
json.dump({'groups':[['prof-'+k,v] for k,v in GN.items()],'sheets':idx},open(P/'prof-index.json','w'),ensure_ascii=False,indent=1)
from collections import Counter;print(len(idx),Counter(s['group'] for s in idx))
