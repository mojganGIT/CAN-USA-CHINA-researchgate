(function(){
 'use strict';
 const M=window.USStateModel,T=window.USStateCopy.text;
 const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const tx=(s,...args)=>E(T(s,...args));
 let data=null,geometry=null,host=null,promise=null,error='',state={state:'MI',partner:'Canada',metric:'share'},onPartnerChange=null,lockedPartner=null;
 const date=d=>String(d||'').slice(0,10)||T('Not reported in the profile');
 const number=(n,options={})=>new Intl.NumberFormat(window.DashboardI18n?.locale||'en-CA',{maximumFractionDigits:1,...options}).format(n);
 const usd=n=>n===null?T('Not reported in the profile'):new Intl.NumberFormat(window.DashboardI18n?.locale||'en-CA',{style:'currency',currency:'USD',notation:'compact',maximumFractionDigits:2}).format(n);
 const percent=n=>number(n/100,{style:'percent'});
 const selected=()=>data?.rows.find(r=>r.code===state.state);
 const numeric=(row,partner)=>row?.year===Number(state.year)?row.partners[partner].value:null;
 const share=(row,partner)=>numeric(row,partner)===null||!(row.totalExports>0)?null:numeric(row,partner)/row.totalExports*100;
 function source(row){return `<a href="${E(row.sourceURL)}" target="_blank" rel="noopener noreferrer">${tx(row.sourceStatus==='unavailable'?'USTR state data directory':'Source profile')} · USTR ↗</a>`;}
 const partners=()=>lockedPartner?[lockedPartner]:['Canada','China'];
 function select(key,label,rows){
  return `<label for="usstate-${key}">${tx(label)}<select id="usstate-${key}" data-usstate-filter="${key}" ${key==='partner'&&lockedPartner?'disabled':''}>${rows.map(([value,text])=>`<option value="${E(value)}" ${String(value)===String(state[key])?'selected':''}>${tx(text)}</option>`).join('')}</select></label>`;
 }
 function legend(){
  const labels=state.metric==='share'?['Under 5%','5% to under 15%','15% to under 30%','At least 30%']:['Under US$1 billion','US$1 billion to under US$5 billion','US$5 billion to under US$10 billion','At least US$10 billion'];
  return `<div class="usstate-legend">${[...labels,'Not reported in the profile'].map((label,i)=>`<span><i style="background:${i===4?M.missing.fill:M.colours[i]}" aria-hidden="true"></i>${tx(label)}</span>`).join('')}</div>`;
 }
 function map(){
  return `<div class="usstate-map"><svg viewBox="${E(geometry.viewBox)}" role="group" aria-label="${tx('U.S. states: export ties with Canada and China')}"><title>${tx('U.S. states: export ties with Canada and China')}</title>${geometry.shapes.map(g=>{
   const row=data.rows.find(r=>r.code===g.code),p=M.paint(row,state),value=p.value===null?T('Not reported in the profile'):state.metric==='share'?percent(p.value):usd(p.value),callout=g.label[0]!==g.centroid[0]||g.label[1]!==g.centroid[1];
   const label=g.name+' · '+T(state.partner)+' · '+value;
   return `<g role="button" tabindex="0" data-usstate="${g.code}" aria-pressed="${g.code===state.state}" aria-label="${E(label)}" class="usstate-shape ${g.code===state.state?'selected':''}"><title>${E(label)}</title><path d="${g.path}" fill="${p.fill}" fill-rule="evenodd" class="usstate-boundary"/>${callout?`<path d="M${g.centroid.join(',')}L${g.label[0]-17},${g.label[1]-5}" class="usstate-callout"/><circle cx="${g.centroid[0]}" cy="${g.centroid[1]}" r="2.3" fill="#183247"/>`:''}<text x="${g.label[0]}" y="${g.label[1]}" text-anchor="middle" fill="${callout?'#183247':p.text}">${g.code}</text></g>`;
  }).join('')}<text x="35" y="650" class="usstate-inset-label">Alaska</text><text x="280" y="650" class="usstate-inset-label">Hawaii</text></svg></div>${legend()}<p class="impact-meta">${tx('Alaska and Hawaii are shown as insets at different scales. Small northeastern states and D.C. use callouts.')}</p>`;
 }
 function industry(row){
  const sector=row.leadingManufacturingCategory||'';
  if(/transportation/.test(sector))return 'Transportation equipment is relevant to questions about vehicles, aerospace and cross-border production. The state-wide category cannot show which of these products went to Canada or China.';
  if(/computer/.test(sector))return 'Computer and electronic exports provide context for Canadian technology supply chains and competition. Product-level data and export-control rules are needed to identify a specific Canadian effect.';
  if(/food/.test(sector))return 'Food manufacturing can connect to Canadian growers and processors through sales, inputs or competition. Check product coverage and agricultural market-access rules before inferring an effect on a Canadian community.';
  if(/petroleum/.test(sector))return 'Petroleum and coal-product exports help frame questions about energy trade and processing. Canadian sourcing links, volumes and prices require separate evidence.';
  if(/metal/.test(sector))return 'Metal exports can be relevant to Canadian industrial inputs and market competition. The profile does not identify Canadian-origin content or the effect of a tariff.';
  return 'Canadian firms may supply, buy from or compete with this state’s businesses. Compare the two markets and the relevant products before drawing conclusions about Canadian opportunities or risks.';
 }
 function panel(){
  const row=selected(),value=numeric(row,state.partner);
  const connection=row.year&&String(row.year)!==String(state.year)?'Reference year differs from the selected map year.':value===null?'The profile does not report a separate value for this partner. This is an evidence gap; it does not mean the state has no trade with that market.':T('{0} reports {1} in goods exports to {2} in {3}. This records a commercial connection, not the effect of an agreement.',row.name,usd(value),T(state.partner),row.year);
  return `<section class="usstate-panel" aria-labelledby="usstate-panel-title"><p class="hub-eyebrow">${tx('Selected state')}</p><h3 id="usstate-panel-title">${E(row.name)}</h3><div class="usstate-metrics">${partners().map(partner=>{
   const value=numeric(row,partner),pct=share(row,partner);
   return `<div><h4>${tx('Goods exports to {0}',T(partner))}</h4><strong>${E(usd(value))}</strong><p>${pct===null?'':E(percent(pct))+' · '+tx('Calculated from rounded profile values.')}</p></div>`;
  }).join('')}</div><dl class="usstate-reading"><div><dt>${tx('What is the connection?')}</dt><dd>${tx(connection)}</dd></div><div><dt>${tx('Why does it matter to Canada?')}</dt><dd>${tx(industry(row))}</dd></div><div><dt>${tx('What does the evidence establish?')}</dt><dd>${row.year?tx('This is a {0} annual goods-export snapshot. The profile identifies leading markets and a manufacturing category; it is not a complete country-by-product table.',row.year):tx('No quantified profile retrieved for this jurisdiction.')}</dd></div><div><dt>${tx('What remains uncertain?')}</dt><dd>${tx('Origin-of-movement exports can differ from the place of manufacture. These figures do not establish imports, services, jobs, new investment or a causal policy effect.')}</dd></div></dl>
  <details class="usstate-source"><summary>${tx('Source and measurement')}</summary><p><strong>${tx('Total goods exports to the world')}:</strong> ${E(usd(row.year===Number(state.year)?row.totalExports:null))}</p>${row.leadingManufacturingCategory?`<p><strong>${tx('Leading manufacturing export category')}:</strong> ${tx(row.leadingManufacturingCategory)} · ${E(usd(row.leadingManufacturingValue))} (${row.year})<br>${tx('All destinations; not a bilateral sector total.')}</p>`:''}<p class="impact-meta">${tx('Profile reference year')}: ${E(row.year||'—')} · ${tx('Baseline source review')}: ${E(date(row.reviewedAt))}${row.retrievedAt?' · '+tx('Source retrieved')+': '+E(date(row.retrievedAt)):''}</p>${row.lastReadStatus==='failed'?`<p class="impact-caution">${tx('Source check failed; previously published values retained.')}</p>`:''}<p>${source(row)}</p></details>
  <div class="usstate-links"><a href="#${window.BilateralHub?.active?window.BilateralHub.target('compare'):'us-trade?view=sectors&partner=both&topic=all'}" data-hub="${window.BilateralHub?.active?window.BilateralHub.target('compare'):'us-trade?view=sectors&partner=both&topic=all'}">${tx('Read the national policy comparison')} →</a><a href="#canada-implications?relationship=Canada-USA" data-hub="canada-implications?relationship=Canada-USA">${tx('Compare Canada’s provincial exposure')} →</a></div></section>`;
 }
 function table(){
  return `<details class="usstate-register"><summary>${tx('All states: reported market connections')}</summary><div class="impact-comparison-scroll"><table class="impact-statistics"><thead><tr><th scope="col">${tx('State')}</th><th scope="col">${tx('Profile reference year')}</th>${partners().map(p=>`<th scope="col">${tx('Goods exports to {0}',T(p))}</th>`).join('')}<th scope="col">${tx('Leading manufacturing export category')}</th></tr></thead><tbody>${[...data.rows].sort((a,b)=>a.name.localeCompare(b.name)).map(r=>{
   const paint=M.paint(r,state);
   return `<tr><th scope="row"><button type="button" data-usstate="${r.code}" class="usstate-row-button"><i style="background:${paint.fill}" aria-hidden="true"></i>${E(r.name)}</button></th><td>${E(r.year||'—')}</td>${partners().map(p=>`<td>${E(usd(numeric(r,p)))}</td>`).join('')}<td>${tx(r.leadingManufacturingCategory||'Not reported in the profile')}</td></tr>`;
  }).join('')}</tbody></table></div></details>`;
 }
 function render(){
  if(!host||host.isConnected===false)return;
  if(!data||!geometry){host.innerHTML=`<p role="status">${tx(error?'The U.S. state map could not load.':'Loading U.S. state map and profiles…')}</p>${error?`<button type="button" data-usstate-retry>${tx('Retry')}</button>`:''}`;return;}
  state=M.normalize(data,{...state,...(lockedPartner?{partner:lockedPartner}:{})});
  const years=[...new Set(data.rows.map(r=>r.year).filter(Boolean))].sort((a,b)=>b-a).map(y=>[String(y),String(y)]);
  const count=data.rows.filter(r=>M.measure(r,state)!==null).length;
  const open=new Set(Array.from(host.querySelectorAll('details[open]'),el=>el.className));
  host.innerHTML=`<section class="usstate-shell" data-no-translate><div class="impact-section-title"><div><p class="hub-eyebrow">${tx('State trade map')}</p><h2>${tx('U.S. states: export ties with Canada and China')}</h2><p>${tx('Select a state to compare its reported export markets, examine its leading manufacturing category and read the implications for Canada.')}</p></div></div>
  <div class="usstate-controls">${select('state','State',data.rows.map(r=>[r.code,r.name]))}${select('partner','Trading partner',partners().map(p=>[p,p]))}${select('metric','Map layer',[['share','Approximate export market share'],['value','Reported export value']])}${select('year','Profile reference year',years)}</div>
  <p class="impact-meta">${tx('All 50 states and Washington, D.C. are selectable. Colour shows export exposure, not a policy gain or loss.')}</p><p class="impact-meta" role="status" aria-live="polite">${tx('Published values available for {0} of 51 jurisdictions for this selection. Missing values are not zero.',count)} · ${tx('Selected state')}: ${E(selected().name)}</p>
  <div class="usstate-layout"><section class="usstate-map-card">${map()}</section>${panel()}</div>${table()}
  <details class="usstate-methods"><summary>${tx('Evidence & Methods')}</summary><p>${tx('The source profiles do not provide complete imports or monthly partner figures. This map therefore shows reported annual export exposure only.')}</p><p>${tx('Calculated from rounded profile values.')} ${tx('Origin-of-movement exports can differ from the place of manufacture. These figures do not establish imports, services, jobs, new investment or a causal policy effect.')}</p><p><a href="https://www.census.gov/foreign-trade/guide/sec2.html" target="_blank" rel="noopener noreferrer">${tx('How state exports are measured')} ↗</a></p><p><a href="us-trade-statistics.json" download>${tx('Source data (JSON)')} ↓</a></p><p><a href="${E(geometry.sourceURL)}" target="_blank" rel="noopener noreferrer">${tx('Geometry: U.S. Census Bureau, 2022 generalized boundaries.')} ↗</a></p></details></section>`;
  for(const d of host.querySelectorAll('details'))if(open.has(d.className))d.open=true;
 }
 async function load(){
  error='';
  try{
   const [a,b]=await Promise.all([fetch('us-trade-statistics.json',{cache:'no-store'}),fetch('us-state-map.json',{cache:'force-cache'})]);
   if(!a.ok||!b.ok)throw Error();const national=await a.json(),map=await b.json();M.validate(national.stateTrade);
   if(map.shapes?.length!==51||new Set(map.shapes.map(r=>r.code)).size!==51||map.shapes.some(s=>!national.stateTrade.rows.some(r=>r.code===s.code)))throw Error();
   data=national.stateTrade;geometry=map;
  }catch{error='unavailable';}
  render();
 }
 function mount(target,config={}){
  host=typeof target==='string'?document.getElementById(target):target;
  lockedPartner=['Canada','China'].includes(config.lockedPartner)?config.lockedPartner:null;
  if(config.partner==='Canada'||config.partner==='China')state.partner=config.partner;
  onPartnerChange=config.onPartnerChange||null;
  render();if(!promise)promise=load();
 }
 function set(key,value,focus){
  state=M.normalize(data,{...state,[key]:value,...(lockedPartner?{partner:lockedPartner}:{})});
  if(key==='partner')onPartnerChange?.(state.partner);
  render();host.querySelector(focus)?.focus({preventScroll:true});
 }
 document.addEventListener('change',ev=>{
  const control=ev.target.closest('[data-usstate-filter]');
  if(control&&data)set(control.dataset.usstateFilter,control.value,'#'+control.id);
 });
 document.addEventListener('click',ev=>{
  if(ev.target.closest('[data-usstate-retry]')){promise=load();return;}
  const button=ev.target.closest('[data-usstate]');if(button&&data)set('state',button.dataset.usstate,(button.tagName==='BUTTON'?'button':'g')+'[data-usstate="'+button.dataset.usstate+'"]');
 });
 document.addEventListener('keydown',ev=>{
  const button=ev.target.closest('g[data-usstate]');if(button&&data&&['Enter',' '].includes(ev.key)){ev.preventDefault();set('state',button.dataset.usstate,'g[data-usstate="'+button.dataset.usstate+'"]');}
 });
 window.addEventListener('dashboard-language-changed',render);
 window.addEventListener('policy-updates-loaded',()=>{if(host?.isConnected)promise=load();});
 window.USStates={mount,render,get ready(){return promise;},get state(){return {...state};}};
})();

