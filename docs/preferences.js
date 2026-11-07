/* Versioned, validated local choices. Storage is optional; source Details never auto-open. */
(function(){
 const key='geologykz-ui-v2',checks=['detail-all-200k','detail-all-500k','detail-show','detail-coverage','geo-toggle','kz15m-toggle','kz-toggle','base-toggle'],ranges=['detail-opacity','geo-opacity','kz15m-opacity'];
 const defaults={version:2,checks:Object.fromEntries(checks.map(id=>[id,['detail-all-500k','detail-coverage','kz-toggle','base-toggle'].includes(id)])),ranges:{'detail-opacity':1,'geo-opacity':.7,'kz15m-opacity':.85},sheet:'m43xxxi',mode:'colors',nationalMode:'scan',base:'light'};
 let saved;try{saved=JSON.parse(localStorage.getItem(key));}catch(e){}
 function valid(s){return s&&s.version===2&&checks.every(id=>typeof s.checks?.[id]==='boolean')&&ranges.every(id=>typeof s.ranges?.[id]==='number'&&Number.isFinite(s.ranges[id])&&s.ranges[id]>=0&&s.ranges[id]<=1)&&[...document.getElementById('detail-sheet').options].some(o=>o.value===s.sheet)&&['scan','colors'].includes(s.mode)&&['scan','colors'].includes(s.nationalMode)&&['light','dark','satellite','hybrid','terrain','topo','otm'].includes(s.base);}
 const state=valid(saved)?saved:defaults;
 checks.forEach(id=>document.getElementById(id).checked=state.checks[id]);ranges.forEach(id=>document.getElementById(id).value=state.ranges[id]);document.getElementById('detail-sheet').value=state.sheet;
 function save(){try{const value={version:2,checks:Object.fromEntries(checks.map(id=>[id,document.getElementById(id).checked])),ranges:Object.fromEntries(ranges.map(id=>[id,+document.getElementById(id).value])),sheet:document.getElementById('detail-sheet').value,mode:document.getElementById('detail-colors').getAttribute('aria-checked')==='true'?'colors':'scan',nationalMode:document.querySelector('#kz15m-mode [aria-checked="true"]').dataset.mode,base:document.querySelector('#basemap-switch [aria-checked="true"]').dataset.base};localStorage.setItem(key,JSON.stringify(value));}catch(e){/* Private/blocked/quota storage: keep this visit usable. */}}
 window.geologykzPreferences={mode:state.mode,save};
 ['change','input','click'].forEach(type=>document.getElementById('layer-panel').addEventListener(type,save));
 document.getElementById('map-help').addEventListener('click',()=>{const b=document.getElementById('map-help'),p=document.getElementById('map-help-text');p.hidden=!p.hidden;b.setAttribute('aria-expanded',String(!p.hidden));});
 window.addEventListener('geologykz:load',()=>queueMicrotask(()=>{window.geologykzKz15m?.mode(state.nationalMode);window.geologykzSetBasemap?.(state.base);document.getElementById('base-toggle').dispatchEvent(new Event('change'));}));
})();
