/* Versioned, validated local choices. Storage is optional; source Details never auto-open. */
(function(){
 const key='geologykz-ui-v4',prevKey='geologykz-ui-v3',checks=['detail-all-200k','detail-all-500k','detail-show','detail-coverage','geo-toggle','kz15m-toggle','kz-toggle','base-toggle','eqazyna-toggle'],ranges=['detail-opacity','geo-opacity','kz15m-opacity'];
 const on=['geo-toggle','kz15m-toggle','kz-toggle','base-toggle'];
 const defaults={version:4,checks:Object.fromEntries(checks.map(id=>[id,on.includes(id)])),ranges:{'detail-opacity':1,'geo-opacity':.7,'kz15m-opacity':.85},sheet:'m43xxxi',mode:'colors',nationalMode:'colors',base:'light'};
 const v3checks=checks.filter(id=>id!=='eqazyna-toggle');
 function validBase(s,list,ver){return s&&s.version===ver&&list.every(id=>typeof s.checks?.[id]==='boolean')&&ranges.every(id=>typeof s.ranges?.[id]==='number'&&Number.isFinite(s.ranges[id])&&s.ranges[id]>=0&&s.ranges[id]<=1)&&[...document.getElementById('detail-sheet').options].some(o=>o.value===s.sheet)&&['scan','colors'].includes(s.mode)&&['scan','colors'].includes(s.nationalMode)&&['light','dark','satellite','hybrid','terrain','topo','otm'].includes(s.base);}
 function migrate(s){if(validBase(s,checks,4))return s;let old=s;if(!validBase(old,v3checks,3)){try{old=JSON.parse(localStorage.getItem(prevKey));}catch(e){old=null;} } if(validBase(old,v3checks,3))return {version:4,checks:{...old.checks,'eqazyna-toggle':false},ranges:old.ranges,sheet:old.sheet,mode:old.mode,nationalMode:old.nationalMode,base:old.base};return defaults;}
 let saved;try{saved=JSON.parse(localStorage.getItem(key));}catch(e){}
 const state=migrate(saved);
 checks.forEach(id=>document.getElementById(id).checked=state.checks[id]);ranges.forEach(id=>document.getElementById(id).value=state.ranges[id]);document.getElementById('detail-sheet').value=state.sheet;
 function save(){try{const value={version:4,checks:Object.fromEntries(checks.map(id=>[id,document.getElementById(id).checked])),ranges:Object.fromEntries(ranges.map(id=>[id,+document.getElementById(id).value])),sheet:document.getElementById('detail-sheet').value,mode:document.getElementById('detail-colors').getAttribute('aria-checked')==='true'?'colors':'scan',nationalMode:document.querySelector('#kz15m-mode [aria-checked="true"]').dataset.mode,base:document.querySelector('#basemap-switch [aria-checked="true"]').dataset.base};localStorage.setItem(key,JSON.stringify(value));}catch(e){/* Private/blocked/quota storage: keep this visit usable. */}}
 window.geologykzPreferences={mode:state.mode,save};
 ['change','input','click'].forEach(type=>document.getElementById('layer-panel').addEventListener(type,save));
 document.getElementById('map-help').addEventListener('click',()=>{const b=document.getElementById('map-help'),p=document.getElementById('map-help-text');p.hidden=!p.hidden;b.setAttribute('aria-expanded',String(!p.hidden));});
 window.addEventListener('geologykz:load',()=>queueMicrotask(()=>{window.geologykzKz15m?.mode(state.nationalMode);window.geologykzSetBasemap?.(state.base);document.getElementById('base-toggle').dispatchEvent(new Event('change'));}));
})();
