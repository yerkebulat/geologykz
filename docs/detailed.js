/* Optional experimental detailed sheets. Only the selected sheet's assets are loaded. */
(function () {
  const esc = s => String(s || '').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  window.addEventListener('geologykz:load', e => {
    const map=e.detail,show=document.getElementById('detail-show'),opacity=document.getElementById('detail-opacity'),status=document.getElementById('detail-status'),select=document.getElementById('detail-sheet'),link=document.getElementById('detail-legend');
    let mode='scan',sheet,legend,loaded,hover=null,ready=false,fitIntent=0,epoch=0,controller,popup;
    const assetURL=p=>new URL(p,document.baseURI).href.replace(/%7B/gi,'{').replace(/%7D/gi,'}');
    function legendLink(){link.href='detailed-legend.html?sheet='+encodeURIComponent(select.value);}
    function update() {
      ['scan','colors'].forEach(m=>{const b=document.getElementById('detail-'+m);b.classList.toggle('active',mode===m);b.setAttribute('aria-checked',mode===m?'true':'false');});
      if(!ready)return;
      map.setLayoutProperty('detail-raster','visibility',show.checked && mode==='scan'?'visible':'none');
      map.setLayoutProperty('detail-fill','visibility',show.checked?'visible':'none');
      map.setLayoutProperty('detail-line','visibility',show.checked?'visible':'none');
      map.setPaintProperty('detail-raster','raster-opacity',+opacity.value);
      map.setPaintProperty('detail-fill','fill-opacity',mode==='colors'?+opacity.value:0);
    }
    function clear(){
      ready=false;hover=null;sheet=null;legend=null;loaded=null;epoch++;fitIntent++;
      if(controller)controller.abort();if(popup){popup.remove();popup=null;}
      ['detail-line','detail-fill','detail-raster'].forEach(id=>{if(map.getLayer(id))map.removeLayer(id);});
      ['detail-units','detail-raster'].forEach(id=>{if(map.getSource(id))map.removeSource(id);});
      map.getCanvas().style.cursor='';
    }
    async function load(){
      if(loaded)return loaded;
      const ticket=epoch,id=select.value;controller=new AbortController();const signal=controller.signal;
      const json=async p=>{const r=await fetch(assetURL(p),{signal});if(!r.ok && r.status)throw new Error('HTTP '+r.status);return r.json();};
      status.textContent='Loading detailed sheet...';
      loaded=(async()=>{
        const man=await json('data/detailed/'+id+'/manifest.json'),s=man.sheets.find(v=>v.id===id);
        if(ticket!==epoch)return;
        if(!s)throw new Error('Sheet missing from manifest');
        const [L,fc]=await Promise.all([json(s.legend),json(s.units)]);
        if(ticket!==epoch)return;
        const raster=s.rasterTiles;if(!raster || raster.tileSize!==256)throw new Error('Missing 256px raster tile manifest');
        sheet=s;legend=L;
        map.addSource('detail-raster',{type:'raster',...raster,tiles:raster.tiles.map(assetURL),attribution:s.credit});
        map.addSource('detail-units',{type:'geojson',data:fc,generateId:true});
        map.addLayer({id:'detail-raster',type:'raster',source:'detail-raster',paint:{'raster-opacity':+opacity.value,'raster-fade-duration':0},layout:{visibility:'none'}},'kz-line');
        map.addLayer({id:'detail-fill',type:'fill',source:'detail-units',paint:{'fill-color':['get','color'],'fill-opacity':0},layout:{visibility:'none'}},'kz-line');
        map.addLayer({id:'detail-line',type:'line',source:'detail-units',paint:{'line-color':'#222','line-width':['case',['boolean',['feature-state','hover'],false],2,0]},layout:{visibility:'none'}},'kz-line');
        ready=true;status.textContent='Experimental: '+fc.features.length+' polygons. '+s.limitations;update();
      })().catch(err=>{if(ticket===epoch){loaded=null;status.textContent='Detailed map load failed: '+err.message;console.error(err);}if(err.name!=='AbortError')throw err;});
      return loaded;
    }
    // Handlers registered once, so switching sheets cannot accumulate duplicate popups.
    map.on('mousemove','detail-fill',ev=>{if(!ready || !show.checked || !ev.features.length)return;if(hover!==null)map.setFeatureState({source:'detail-units',id:hover},{hover:false});hover=ev.features[0].id;map.setFeatureState({source:'detail-units',id:hover},{hover:true});map.getCanvas().style.cursor='pointer';});
    map.on('mouseleave','detail-fill',()=>{if(ready && hover!==null)map.setFeatureState({source:'detail-units',id:hover},{hover:false});hover=null;map.getCanvas().style.cursor='';});
    map.on('click','detail-fill',ev=>{
      if(!ready || !show.checked || !ev.features.length)return;
      const ids=String(ev.features[0].properties.candidates).split(',').map(Number),units=ids.map(i=>legend[i]).filter(Boolean);
      const body=units.slice(0,12).map(u=>'<b>'+esc(u.code)+'</b> '+esc(u.en)+'<br>'+esc(u.ru)+'<br>Age: '+esc(u.age)+(u.image?'<br><a href="'+esc(assetURL(u.image))+'" target="_blank" rel="noopener">Native legend excerpt</a>':'')).join('<hr>');
      const more=units.length>12?'<p>'+units.length+' similar swatches. First 12 shown; see full legend.</p>':'';
      if(popup)popup.remove();
      popup=new maplibregl.Popup({maxWidth:'360px'}).setLngLat(ev.lngLat).setHTML('<div style="max-height:45vh;overflow:auto"><strong>Experimental color match, candidate references:</strong><br>'+body+more+'<p><a href="'+esc(link.href)+'" target="_blank" rel="noopener">Sheet legend</a></p><small>'+esc(sheet.label)+'; scan '+esc(sheet.dates.scan_printed)+' / catalog '+esc(sheet.dates.catalog)+'. '+esc(sheet.limitations)+' Scan via <a href="'+esc(sheet.sourcePage)+'" target="_blank" rel="noopener">Geokniga</a>.</small></div>').addTo(map);
    });
    show.addEventListener('change',()=>{if(!show.checked){fitIntent++;if(popup){popup.remove();popup=null;}}update();if(show.checked)load().then(update).catch(()=>{});});
    select.addEventListener('change',()=>{clear();legendLink();status.textContent='Experimental. Approximate colors and provisional georeferencing.';if(show.checked)load().then(update).catch(()=>{});});
    ['scan','colors'].forEach(m=>document.getElementById('detail-'+m).addEventListener('click',()=>{mode=m;update();}));
    opacity.addEventListener('input',update);
    document.getElementById('detail-fit').addEventListener('click',async()=>{const ticket=++fitIntent,generation=epoch;show.checked=true;try{await load();update();if(ready && show.checked && ticket===fitIntent && generation===epoch){map.fitBounds(sheet.bounds,{padding:window.innerWidth<600?40:120,duration:0});window.geologykzSetLayersOpen(false);}}catch(err){/* load reports errors */}});
    map.on('error',ev=>{if(ev.sourceId==='detail-raster')status.textContent='Scan tile error: '+(ev.error && ev.error.message || 'unknown');});
    legendLink();
    window.geologykzDetailed={load,show:async()=>{show.checked=true;await load();update();},setMode:m=>{if(m!=='scan' && m!=='colors')throw new Error('Invalid mode');mode=m;update();}};
  });
})();
