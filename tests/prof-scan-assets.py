import json,pathlib,re
root=pathlib.Path(__file__).resolve().parents[1];docs=root/'docs';html=(docs/'index.html').read_text()
ids=re.findall(r'<option value="(prof-[^"]+)" data-group="(prof-[^"]+)"',html);assert len(ids)==44 and len({i for i,_ in ids})==44
assert len(json.load(open(docs/'detailed-sheets.json'))['sheets'])==29
for sid,g in ids:
    d=docs/'data/detailed'/sid;s=json.load(open(d/'manifest.json'))['sheets'][0];G=json.load(open(d/'georef.json'))
    assert s['id']==sid and s['group']==g and s['scanOnly'] and 'units' not in s and 'legend' not in s
    t=list((d/'tiles').rglob('*.webp'));assert len(t)==G['tiles']>0 and sum(p.stat().st_size for p in t)==G['tile_bytes']
    assert not any(f.suffix.lower() in ['.jpg','.tif','.png','.npy'] for f in d.rglob('*'))
    (x,y),(X,Y)=s['bounds'];assert 46<x<X<88 and 40<y<Y<56
    assert G['diagnostics']['affine_misfit_max_px']<60 and len(G['source_sha256'])==64
    txt=json.dumps(s)+(d/'RIGHTS.md').read_text();assert '\u2014' not in txt and 'xperimental' not in txt and 'drive.google' not in txt
print('PASS 44 professor scan-only sheets: manifests, tiles match georef, no originals, no em dashes.')
