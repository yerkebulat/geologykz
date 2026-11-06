/* Optional experimental detailed geological sheets, lazily loaded from a per-sheet manifest. */
(function () {
  const esc = s => String(s || '').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  window.addEventListener('geologykz:load', e => {
    const map=e.detail,show=document.getElementById('detail-show'),opacity=document.getElementById('detail-opacity'),status=document.getElementById('detail-status');
    let mode='scan',sheet,legend,loaded,hover=null,ready=false,fitIntent=0;
    const assetURL = p => new URL(p, document.baseURI).href.replace(/%7B/gi,'{').replace(/%7D/gi,'}');
    function update() {
      document.getElementById('detail-scan').classList.toggle('active',mode==='scan');
      document.getElementById('detail-colors').classList.toggle('active',mode==='colors');
      document.getElementById('detail-scan').setAttribute('aria-checked',mode==='scan'?'true':'false');
      document.getElementById('detail-colors').setAttribute('aria-checked',mode==='colors'?'true':'false');
      if (!ready) return;
      map.setLayoutProperty('detail-raster','visibility',show.checked && mode==='scan'?'visible':'none');
      map.setLayoutProperty('detail-fill','visibility',show.checked?'visible':'none');
      map.setLayoutProperty('detail-line','visibility',show.checked?'visible':'none');
      map.setPaintProperty('detail-raster','raster-opacity',+opacity.value);
      map.setPaintProperty('detail-fill','fill-opacity',mode==='colors'?+opacity.value:0);
    }
    async function load() {
      if (loaded) return loaded;
      status.textContent='Loading detailed sheet...';
      loaded=(async()=>{
        const man=await fetch(assetURL('data/detailed/m43xxxi/manifest.json'), {cache:'no-cache'}).then(r=>r.json());sheet=man.sheets[0];
        const [L,fc]=await Promise.all([fetch(assetURL(sheet.legend)).then(r=>r.json()),fetch(assetURL(sheet.units)).then(r=>r.json())]);legend=L;
        const raster = sheet.rasterTiles;
        if (!raster || raster.tileSize !== 256) throw new Error('Missing 256px raster tile manifest');
        map.addSource('detail-raster',{type:'raster',...raster,tiles:raster.tiles.map(assetURL),attribution:sheet.credit});
        map.addSource('detail-units',{type:'geojson',data:fc,generateId:true});
        map.addLayer({id:'detail-raster',type:'raster',source:'detail-raster',paint:{'raster-opacity':+opacity.value,'raster-fade-duration':0},layout:{visibility:'none'}},'kz-line');
        map.addLayer({id:'detail-fill',type:'fill',source:'detail-units',paint:{'fill-color':['get','color'],'fill-opacity':0},layout:{visibility:'none'}},'kz-line');
        map.addLayer({id:'detail-line',type:'line',source:'detail-units',paint:{'line-color':'#222','line-width':['case',['boolean',['feature-state','hover'],false],2,0]},layout:{visibility:'none'}},'kz-line');
        map.on('mousemove','detail-fill',ev=>{if(hover!==null)map.setFeatureState({source:'detail-units',id:hover},{hover:false});hover=ev.features[0].id;map.setFeatureState({source:'detail-units',id:hover},{hover:true});map.getCanvas().style.cursor='pointer';});
        map.on('mouseleave','detail-fill',()=>{if(hover!==null)map.setFeatureState({source:'detail-units',id:hover},{hover:false});hover=null;map.getCanvas().style.cursor='';});
        map.on('click','detail-fill',ev=>{
          const p=ev.features[0].properties,ids=String(p.candidates).split(',').map(Number);
          const units=ids.map(i=>legend[i]).filter(Boolean),title=units.length>1?'Experimental color match, candidates:':'Experimental color match:';
          const body=units.map(u=>'<b>'+esc(u.code)+'</b> '+esc(u.en)+'<br>'+esc(u.ru)+'<br>Age: '+esc(u.age)).join('<hr>');
          new maplibregl.Popup({maxWidth:'360px'}).setLngLat(ev.lngLat).setHTML('<strong>'+title+'</strong><br>'+body+'<br><small>'+esc(sheet.label)+'; scan 1956 / catalog 1959. Approximate color segmentation; provisional georeferencing, not surveyed boundaries. Scan via <a href="https://www.geokniga.org/maps/44362" target="_blank" rel="noopener">Geokniga</a>.</small>').addTo(map);
        });
        ready=true;
        status.textContent='Experimental: '+fc.features.length+' polygons. White Q3-4 is mapped geology. Similar colors list candidates; georeferencing provisional.';update();
      })().catch(e=>{loaded=null;status.textContent='Detailed map load failed: '+e.message;console.error(e);throw e;});
      return loaded;
    }
    show.addEventListener('change',()=>{if(!show.checked)fitIntent++;update();if(show.checked)load().then(update).catch(()=>{});});
    ['scan','colors'].forEach(m=>document.getElementById('detail-'+m).addEventListener('click',()=>{mode=m;update();}));
    opacity.addEventListener('input',update);
    document.getElementById('detail-fit').addEventListener('click',async()=>{const ticket=++fitIntent;show.checked=true;try {await load();update();if(show.checked && ticket===fitIntent){map.fitBounds(sheet.bounds,{padding:window.innerWidth<600?40:120,duration:0});window.geologykzSetLayersOpen(false);}}catch(e){/* status is set by load */}});
    map.on('error',ev=>{if(ev.sourceId==='detail-raster') status.textContent='Scan tile error: '+(ev.error && ev.error.message || 'unknown');});
    window.geologykzDetailed={load,show:async()=>{show.checked=true;await load();update();},setMode:m=>{if(m!=='scan' && m!=='colors')throw new Error('Invalid mode');mode=m;update();}};
  });
})();
