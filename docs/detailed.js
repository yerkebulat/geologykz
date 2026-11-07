/* Optional experimental sheets. Groups and selection form a deduplicated union.
 * Only enabled mode assets; two sheet jobs at a time; no retained vector cache. */
(function () {
  const esc=s=>String(s||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  window.addEventListener('geologykz:load',e=>{
    const map=e.detail,el=id=>document.getElementById('detail-'+id),show=el('show'),select=el('sheet'),opacity=el('opacity'),status=el('status'),link=el('legend');
    const groups=[['200k','1:200,000'],['500k','1:500,000']],records=new Map(),manifests=new Map(),legends=new Map();
    let mode=window.geologykzPreferences?.mode||'scan',wanted=new Set(),active=0,waiters=[],fitIntent=0,popup,popupSheet;
    const assetURL=p=>new URL(p,document.baseURI).href.replace(/%7B/gi,'{').replace(/%7D/gi,'}');
    const names=id=>({raster:'detail-'+id+'-raster',units:'detail-'+id+'-units',fill:'detail-'+id+'-fill',line:'detail-'+id+'-line'});
    function closePopup(){if(popup)popup.remove();popup=null;popupSheet=null;}
    function drop(r){
      const n=names(r.id);r.version++;if(r.controller)r.controller.abort();r.loaded=null;r.failed=false;r.hover=null;
      if(popupSheet===r.id)closePopup();
      [n.line,n.fill,n.raster].forEach(id=>{if(map.getLayer(id))map.removeLayer(id);});
      [n.units,n.raster].forEach(id=>{if(map.getSource(id))map.removeSource(id);});map.getCanvas().style.cursor='';
    }
    function paint(r){const n=names(r.id);if(map.getLayer(n.raster))map.setPaintProperty(n.raster,'raster-opacity',+opacity.value);if(map.getLayer(n.fill))map.setPaintProperty(n.fill,'fill-opacity',+opacity.value);}
    function report(){
      const loaded=[...wanted].filter(id=>records.get(id)?.loaded===mode).length,failed=[...wanted].filter(id=>records.get(id)?.failed).length;
      status.textContent=wanted.size?loaded+'/'+wanted.size+' sheets ready · '+(mode==='scan'?'Scan':'Colors')+(failed?' · '+failed+' failed; toggle to retry.':''):'Detailed maps hidden';
      const count=wanted.size+Number(document.getElementById('geo-toggle').checked)+Number(document.getElementById('kz15m-toggle').checked);document.getElementById('enabled-count').textContent=count+' maps enabled';
    }
    function register(r){
      const n=names(r.id),valid=()=>wanted.has(r.id)&&r.loaded==='colors'&&mode==='colors';
      map.on('mousemove',n.fill,ev=>{if(!valid()||!ev.features.length)return;if(r.hover!==null)map.setFeatureState({source:n.units,id:r.hover},{hover:false});r.hover=ev.features[0].id;map.setFeatureState({source:n.units,id:r.hover},{hover:true});map.getCanvas().style.cursor='pointer';});
      map.on('mouseleave',n.fill,()=>{if(map.getSource(n.units)&&r.hover!==null)map.setFeatureState({source:n.units,id:r.hover},{hover:false});r.hover=null;map.getCanvas().style.cursor='';});
      map.on('click',n.fill,ev=>{
        if(!valid()||!ev.features.length)return;const s=r.sheet,L=r.legend,ids=String(ev.features[0].properties.candidates).split(',').map(Number),units=ids.map(i=>L[i]).filter(Boolean);
        const body=units.slice(0,12).map(u=>'<b>'+esc(u.code)+'</b> '+(/^(Native |Not transcribed)/.test(u.en)?'':esc(u.en)+'<br>'+esc(u.ru))+(String(u.age).startsWith('Not transcribed')?'':'<br>Age: '+esc(u.age))+(u.image?'<br><a href="'+esc(assetURL(u.image))+'" target="_blank" rel="noopener">Native legend excerpt</a>':'')).join('<hr>');
        const more=units.length>12?'<p>'+units.length+' similar swatches. First12 shown; see full legend.</p>':'';closePopup();popupSheet=r.id;
        popup=new maplibregl.Popup({maxWidth:'360px'}).setLngLat(ev.lngLat).setHTML('<div style="max-height:45vh;overflow:auto"><strong>Candidate units</strong><br>'+body+more+'<details><summary>Sheet details &amp; native legend</summary><p>'+esc(s.label)+'</p><a href="'+esc(assetURL('detailed-legend.html?sheet='+encodeURIComponent(r.id)))+'" target="_blank" rel="noopener">Native legend</a><p>Scan '+esc(s.dates.scan_printed)+' / catalog '+esc(s.dates.catalog)+'</p><a href="'+esc(s.sourcePage)+'" target="_blank" rel="noopener">Source</a></details></div>').addTo(map);
      });
    }
    async function json(path,signal){const res=await fetch(assetURL(path),{signal});if(!res.ok&&res.status)throw new Error('HTTP '+res.status);return res.json();}
    function pump(){
      for(const id of wanted){
        if(active>=2)break;let r=records.get(id);if(!r){r={id,version:0,hover:null};records.set(id,r);register(r);}
        if(r.pending||r.loaded===mode||r.failed)continue;
        const version=r.version,kind=mode;r.target=kind;r.controller=new AbortController();const signal=r.controller.signal;
        const valid=()=>wanted.has(id)&&mode===kind&&r.version===version&&!signal.aborted;
        active++;r.pending=true;
        r.task=(async()=>{
          r.manifestTask=manifests.has(id)?Promise.resolve(manifests.get(id)):json('data/detailed/'+id+'/manifest.json',signal).then(man=>{const s=man.sheets.find(s=>s.id===id);if(!s)throw new Error('Sheet missing from manifest');manifests.set(id,s);return s;});
          const s=await r.manifestTask;if(!valid())return;r.sheet=s;const n=names(id);
          if(kind==='scan'){
            const raster=s.rasterTiles;if(!raster||raster.tileSize!==256)throw new Error('Missing256px raster tile manifest');
            map.addSource(n.raster,{type:'raster',...raster,tiles:raster.tiles.map(assetURL),attribution:s.credit});
            map.addLayer({id:n.raster,type:'raster',source:n.raster,paint:{'raster-opacity':+opacity.value,'raster-fade-duration':0}},'kz-line');
          }else{
            const [L,fc]=await Promise.all([legends.has(s.legend)?Promise.resolve(legends.get(s.legend)):json(s.legend,signal),json(s.units,signal)]);if(!valid())return;legends.set(s.legend,L);r.legend=L;
            map.addSource(n.units,{type:'geojson',data:fc,generateId:true});
            map.addLayer({id:n.fill,type:'fill',source:n.units,paint:{'fill-color':['get','color'],'fill-opacity':+opacity.value}},'kz-line');
            map.addLayer({id:n.line,type:'line',source:n.units,paint:{'line-color':'#222','line-width':['case',['boolean',['feature-state','hover'],false],2,0]}},'kz-line');
          }
          r.loaded=kind;
        })().catch(err=>{if(valid()){drop(r);r.failed=true;console.error('Detailed sheet '+id,err);}}).finally(()=>{r.pending=false;active--;report();pump();});
      }
      if(active===0){const w=waiters;waiters=[];w.forEach(resolve=>resolve());}
    }
    function sync(){
      const next=new Set();if(show.checked)next.add(select.value);
      for(const [group,prefix] of groups)if(el('all-'+group).checked)for(const o of select.options)if(o.textContent.startsWith(prefix))next.add(o.value);
      wanted=next;
      for(const r of records.values())if(!wanted.has(r.id)||r.target!==mode){drop(r);r.target=mode;}else paint(r);
      ['scan','colors'].forEach(m=>{el(m).classList.toggle('active',mode===m);el(m).setAttribute('aria-checked',String(mode===m));});
      report();pump();
    }
    function load(){sync();return active?new Promise(resolve=>waiters.push(resolve)):Promise.resolve();}
    function changed(){fitIntent++;for(const r of records.values())r.failed=false;sync();window.geologykzPreferences?.save();}
    show.addEventListener('change',changed);groups.forEach(([g])=>el('all-'+g).addEventListener('change',changed));
    function legendLink(){link.href='detailed-legend.html?sheet='+encodeURIComponent(select.value);information();}
    async function information(){if(!document.getElementById('detailed-details').open)return;const id=select.value;try{const s=manifests.get(id)||await json('data/detailed/'+id+'/manifest.json').then(m=>m.sheets.find(s=>s.id===id));if(id!==select.value)return;const box=document.getElementById('detail-information');box.textContent=[s.label,'Scan '+s.dates.scan_printed+'; catalog '+s.dates.catalog,s.credit,s.accuracy,s.limitations,s.license].filter(Boolean).join('\n\n');const a=document.createElement('a');a.href=s.sourcePage;a.target='_blank';a.rel='noopener';a.textContent='Original source';box.appendChild(a);}catch(e){document.getElementById('detail-information').textContent='Source information unavailable; try again.';}}
    document.getElementById('detailed-details').addEventListener('toggle',information);
    select.addEventListener('change',()=>{legendLink();changed();});
    ['scan','colors'].forEach(m=>el(m).addEventListener('click',()=>{mode=m;changed();}));
    opacity.addEventListener('input',()=>{for(const r of records.values())paint(r);});
    el('fit').addEventListener('click',async()=>{const ticket=++fitIntent,id=select.value;show.checked=true;sync();window.geologykzPreferences?.save();try{const r=records.get(id),s=manifests.get(id)||await(r?.manifestTask&&!r.controller.signal.aborted?r.manifestTask:json('data/detailed/'+id+'/manifest.json').then(man=>{const found=man.sheets.find(s=>s.id===id);if(!found)throw new Error('Sheet missing from manifest');manifests.set(id,found);return found;}));if(s&&show.checked&&id===select.value&&ticket===fitIntent){map.fitBounds(s.bounds,{padding:window.innerWidth<600?40:120,duration:0});window.geologykzSetLayersOpen(false);}}catch(err){/* Scheduler reports errors; canceled fits do not navigate. */}});
    map.on('error',ev=>{if(ev.sourceId&&ev.sourceId.startsWith('detail-')&&ev.sourceId.endsWith('-raster'))status.textContent='Scan tile error: '+(ev.error&&ev.error.message||'unknown');});
    legendLink();
    window.geologykzDetailed={load,show:()=>{show.checked=true;window.geologykzPreferences?.save();return load();},setMode:m=>{if(!['scan','colors'].includes(m))throw new Error('Invalid mode');mode=m;changed();return load();}};
    const hitUnits=point=>{const layers=[...records.values()].filter(r=>r.loaded==='colors'&&wanted.has(r.id)).map(r=>names(r.id).fill);return !!(layers.length&&map.queryRenderedFeatures?.(point,{layers}).length);};
    window.geologykzDetailed.hitUnits=hitUnits;
    let index;
    const indexReady=json('detailed-sheets.json').then(v=>{index=v;const features=v.sheets.map(s=>{const [[x,y],[X,Y]]=s.bounds;return {type:'Feature',properties:{id:s.id,label:s.label},geometry:{type:'Polygon',coordinates:[[[x,y],[X,y],[X,Y],[x,Y],[x,y]]]}};});map.addSource('sheet-coverage',{type:'geojson',data:{type:'FeatureCollection',features}});map.addLayer({id:'sheet-coverage-fill',type:'fill',source:'sheet-coverage',paint:{'fill-opacity':0}});map.addLayer({id:'sheet-coverage-line',type:'line',source:'sheet-coverage',paint:{'line-color':'#467776','line-width':1,'line-dasharray':[4,3]}});coverage();}).catch(()=>{status.textContent='Sheet outlines unavailable; use the sheet list.';});
    function coverage(){for(const id of ['sheet-coverage-line','sheet-coverage-fill'])if(map.getLayer(id))map.setLayoutProperty(id,'visibility',el('coverage').checked?'visible':'none');}
    el('coverage').addEventListener('change',coverage);
    map.on('click','sheet-coverage-fill',ev=>{if(!el('coverage').checked||!ev.features?.length||hitUnits(ev.point))return;const others=['geo-fill','kz15m-fill'].filter(id=>map.getLayer(id)&&map.getLayoutProperty(id,'visibility')!=='none');if(others.length&&map.queryRenderedFeatures?.(ev.point,{layers:others}).length)return;select.value=ev.features[0].properties.id;show.checked=true;legendLink();changed();});
    document.getElementById('maps-hide-all').addEventListener('click',()=>{show.checked=false;groups.forEach(([g])=>el('all-'+g).checked=false);for(const id of ['geo-toggle','kz15m-toggle']){const b=document.getElementById(id);b.checked=false;b.dispatchEvent(new Event('change'));}closePopup();changed();});
    ['geo-toggle','kz15m-toggle'].forEach(id=>document.getElementById(id).addEventListener('change',report));
    document.getElementById('maps-fit-all').addEventListener('click',async()=>{await indexReady;if(!index)return;const bounds=index.sheets.filter(s=>wanted.has(s.id)).map(s=>s.bounds);if(document.getElementById('geo-toggle').checked)bounds.push(index.globalBounds);if(document.getElementById('kz15m-toggle').checked)bounds.push(index.national);if(!bounds.length){status.textContent='No maps enabled. Choose a category first.';return;}const b=[[Math.min(...bounds.map(b=>b[0][0])),Math.min(...bounds.map(b=>b[0][1]))],[Math.max(...bounds.map(b=>b[1][0])),Math.max(...bounds.map(b=>b[1][1]))]];map.fitBounds(b,{padding:window.innerWidth<600?40:120,duration:0});window.geologykzSetLayersOpen(false);});
    sync();
  });
})();
