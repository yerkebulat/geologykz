const fs=require('fs'),assert=require('assert'),{JSDOM}=require('jsdom');
const root=require('path').join(__dirname,'../docs/');
function env(){
 const d=new JSDOM(fs.readFileSync(root+'index.html','utf8'),{runScripts:'outside-only',url:'https://yerkebulat.github.io/geologykz/'}),w=d.window;
 let release;const gate=new Promise(r=>release=r),req=[],layers={},sources={},state={fits:0,closed:0};
 w.fetch=async p=>{req.push(p);if(String(p).includes('manifest'))await gate;let path=new URL(p,w.document.baseURI).pathname.replace(/^\/geologykz\//,'');return {json:async()=>JSON.parse(fs.readFileSync(root+path,'utf8'))}};
 w.maplibregl={Popup:function(){return{setLngLat(){return this},setHTML(){return this},addTo(){return this}}}};
 const map={getLayer:id=>layers[id],addSource:(id,s)=>{assert(!sources[id]);sources[id]=s},addLayer:l=>{assert(!layers[l.id]);layers[l.id]=l},setLayoutProperty:(id,k,v)=>layers[id].layout[k]=v,getLayoutProperty:(id,k)=>layers[id].layout[k],setPaintProperty:(id,k,v)=>layers[id].paint[k]=v,on(){},fitBounds(){state.fits++}};
 w.geologykzSetLayersOpen=()=>state.closed++;w.eval(fs.readFileSync(root+'detailed.js','utf8'));w.dispatchEvent(new w.CustomEvent('geologykz:load',{detail:map}));
 const check=v=>{w.document.getElementById('detail-show').checked=v;w.document.getElementById('detail-show').dispatchEvent(new w.Event('change'));};
 return {w,release,req,layers,sources,state,check};
}
(async()=>{
 const a=env();assert.equal(a.req.length,0);let loading=a.w.geologykzDetailed.show();a.w.geologykzDetailed.setMode('colors');a.check(false);a.release();await loading;
 assert.equal(a.layers['detail-fill'].layout.visibility,'none');assert.equal(a.layers['detail-raster'].layout.visibility,'none');assert.equal(a.sources['detail-raster'].type,'raster');
 assert(a.sources['detail-raster'].tiles[0].includes('{z}/{x}/{y}'));assert.equal(a.sources['detail-raster'].maxzoom,12);assert.equal(a.sources['detail-raster'].tileSize,256);
 await a.w.geologykzDetailed.show();assert.equal(a.layers['detail-fill'].layout.visibility,'visible');assert.equal(a.layers['detail-fill'].paint['fill-opacity'],1);assert.equal(a.layers['detail-raster'].layout.visibility,'none');
 a.w.geologykzDetailed.setMode('scan');assert.equal(a.layers['detail-raster'].layout.visibility,'visible');assert.equal(a.layers['detail-fill'].paint['fill-opacity'],0);
 const slider=a.w.document.getElementById('detail-opacity');slider.value='.4';slider.dispatchEvent(new a.w.Event('input'));assert.equal(a.layers['detail-raster'].paint['raster-opacity'],.4);
 a.w.geologykzDetailed.setMode('colors');assert.equal(a.layers['detail-fill'].paint['fill-opacity'],.4);a.check(false);a.check(true);await a.w.geologykzDetailed.load();assert.equal(a.req.length,3);
 const b=env();b.w.document.getElementById('detail-fit').click();b.check(false);b.w.geologykzDetailed.setMode('colors');b.release();await b.w.geologykzDetailed.load();assert.equal(b.state.fits,0);assert.equal(b.state.closed,0);assert.equal(b.layers['detail-raster'].layout.visibility,'none');
 const c=env();let p=c.w.geologykzDetailed.show(),q=c.w.geologykzDetailed.show();c.w.geologykzDetailed.setMode('colors');c.w.geologykzDetailed.setMode('scan');c.release();await Promise.all([p,q]);assert.equal(c.req.length,3);assert.equal(c.layers['detail-raster'].layout.visibility,'visible');assert.equal(c.layers['detail-fill'].paint['fill-opacity'],0);
 console.log('PASS: idle no fetch; deferred enable->disable; pending mode changes; concurrent enables one load; re-enable preserves last mode; opacity; tile spec absolute templated URL; canceled fit remains off; raster/Colors exclusive.');
})().catch(e=>{console.error(e);process.exit(1)});
