(function(){
 'use strict';
 const T=window.InsightsCopy.text,M=window.InsightsModel,guide=window.PolicyGuide;
 const host=document.getElementById('insights-root'),main=document.getElementById('insights-view'),feedback=document.getElementById('insights-status'),refreshButton=document.getElementById('insights-refresh');
 const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const tx=(s,...args)=>e(T(s,...args)),tr=s=>e(window.DashboardI18n?.t(s??'')??s);
 const labels={trends:'Findings & Trends',evidence:'Data & Evidence',policies:'Policies, MOUs & Amendments',updates:'Updates'};
 const feeds={
  regional:['regional-statistics.json','Canadian domestic exports','series'],
  us:['us-trade-statistics.json','U.S. goods trade','partners'],
  investment:['us-investment-statistics.json','U.S. direct investment','series'],
  canadian:['evidence-records.json','Canada','records'],
  american:['us-trade-evidence.json','United States','records'],
  daily:['policy-updates.json','Daily Updates','changes'],
  weekly:['weekly-updates.json','Weekly briefings','issues']
 };
 const regions=['Canada','Newfoundland and Labrador','Prince Edward Island','Nova Scotia','New Brunswick','Quebec','Ontario','Manitoba','Saskatchewan','Alberta','British Columbia','Yukon','Northwest Territories','Nunavut'];
 const rels={'Canada-USA':'Canada–U.S.','Canada-China':'Canada–China','USA-China':'U.S.–China'};
 const sets={canada:{region:'Canada',topic:'all',partner:'United States',year:'latest'},us:{partner:'China',measure:'imports',year:'latest'},investment:{partner:'China',direction:'outward',measure:'stock',year:'latest'}};
 const datasetLabels={canada:'Canadian domestic exports',us:'U.S. goods trade',investment:'U.S. direct investment'};
 const data={},state={dataset:'canada',topic:'all',relationship:'all',kind:'all',set:'all',query:'',page:0};
 const lang=()=>window.DashboardI18n?.language||'en';
 const locale=()=>window.DashboardI18n?.locale||'en-CA';
 const number=(n,options={})=>new Intl.NumberFormat(locale(),{maximumFractionDigits:1,...options}).format(n);
 const signed=n=>number(n,{signDisplay:'exceptZero'});
 const percent=(n,sign=false)=>number(n/100,{style:'percent',signDisplay:sign?'exceptZero':'auto'});
 const money=(n,unit,compact=false,sign=false)=>{
  if(n===null)return T('Not available');
  if(compact&&unit==='USD million'){n*=1000000;unit='USD';}
  return number(n,{notation:compact?'compact':'standard',maximumFractionDigits:compact?2:3,signDisplay:sign?'exceptZero':'auto'})+' '+T(unit);
 };
 const compact=(n,unit,sign=false)=>money(n,unit,true,sign);
 const prettyDate=d=>String(d||'').slice(0,10)||T('Not available');
 const period=(r,year)=>r.n?year+'-01'+(r.n===1?'':' – '+year+'-'+String(r.n).padStart(2,'0')):year;
 const currentView=()=>Object.hasOwn(labels,location.hash.slice(1))?location.hash.slice(1):'trends';
 const navURL=(route='home')=>'./?lang='+encodeURIComponent(lang())+'#'+route;
 const url=s=>{try{const u=new URL(s);return u.protocol==='https:'&&!u.username&&!u.password?u.href:'';}catch{return '';}};
 function source(s,label){const href=url(s);return href?`<a href="${e(href)}" target="_blank" rel="noopener noreferrer">${tx(label)} <span aria-hidden="true">↗</span></a>`:'';}
 function jump(route,label){return `<a href="${e(navURL(route))}" target="_blank" rel="noopener noreferrer">${tx(label)} <span aria-hidden="true">↗</span></a>`;}
 function select(key,label,options,value,trend=false){
  return `<label for="insight-${key}"><span>${tx(label)}</span><select id="insight-${key}" data-insight-filter="${key}" ${trend?'data-insight-trend':''}>${options.map(([k,l])=>`<option value="${e(k)}" ${k===value?'selected':''}>${tx(l)}</option>`).join('')}</select></label>`;
 }
 const options=values=>values.map(x=>[x,x]);
 const chartColours=['#006b75','#936015'];
 function plot(r){
  const finite=[...r.values,...(r.previous||[])].filter(Number.isFinite);
  if(!finite.length)return `<p class="insight-muted">${tx('No observations to plot')}</p>`;
  const min=Math.min(0,...finite),max=Math.max(0,...finite),range=max-min||1;
  const x=i=>r.values.length>1?84+i*590/(r.values.length-1):380;
  const y=v=>190-(v-min)/range*167;
  const axis=Array.from({length:5},(_,i)=>min+range*i/4).map(v=>`<line x1="84" y1="${y(v)}" x2="674" y2="${y(v)}" class="insight-gridline"/><text x="73" y="${y(v)+4}" text-anchor="end">${e(number(v,{notation:'compact'}))}</text>`).join('');
  const lines=[r.values,...(r.previous?[r.previous]:[])].map((values,i)=>{
   let last=false;
   const path=values.map((v,j)=>{if(v===null){last=false;return '';}const d=(last?'L':'M')+x(j).toFixed(2)+' '+y(v).toFixed(2);last=true;return d;}).join(' ');
   const dots=values.map((v,j)=>v===null?'':`<circle cx="${x(j)}" cy="${y(v)}" r="3" fill="${chartColours[i]}"/>`).join('');
   return `<path d="${path}" fill="none" stroke="${chartColours[i]}" stroke-width="3" ${i?'stroke-dasharray="6 5"':''}/>${dots}`;
  }).join('');
  const dates=r.labels.map((l,i)=>r.labels.length>8&&i%2&&i!==r.labels.length-1?'':`<text x="${x(i)}" y="210" text-anchor="middle">${e(r.n?l.slice(5):l)}</text>`).join('');
  return `<figure class="insight-chart"><figcaption>${tx(r.n?'Monthly comparison':'Annual observations')} · ${tx(r.unit)}</figcaption><svg viewBox="0 0 710 225" role="img" aria-label="${tx('Trend chart')}">${axis}${lines}${dates}</svg>
  <p class="insight-legend"><span>${e(r.n?r.year:T('Annual observations'))}</span>${r.previous?`<span>${Number(r.year)-1}</span>`:''}</p>
  <p class="insight-muted">${tx('Missing observations appear as gaps.')}</p>
  <details data-insight-detail="exact-values"><summary>${tx('Show exact values')}</summary><div class="insight-table-scroll"><table><thead><tr><th scope="col">${tx('Reference period')}</th><th scope="col">${tx('Reported value')}</th>${r.previous?`<th scope="col">${tx('Same period a year earlier')}</th>`:''}</tr></thead><tbody>${r.labels.map((label,i)=>`<tr><th scope="row">${e(label)}</th><td>${e(money(r.values[i],r.unit))}</td>${r.previous?`<td>${e(money(r.previous[i],r.unit))}</td>`:''}</tr>`).join('')}</tbody></table></div></details></figure>`;
 }
 function interpret(r,ds,s){
  let change=T('No complete, comparable value is available for this selection. Missing or suppressed values are not zero.');
  if(r.change!==null){
   const previous=period(r,String(Number(r.year)-1)),size=r.percent===null?compact(Math.abs(r.change),r.unit):percent(Math.abs(r.percent));
   if(ds==='us'&&s.measure==='balance')change=T('The trade balance moved from {0} to {1}. Read the sign: a negative balance means imports exceeded exports.',compact(r.prior,r.unit),compact(r.current,r.unit));
   else if(r.change===0)change=T('The value was unchanged from {0}.',previous);
   else change=T(r.change>0?'The value rose by {0} compared with {1}.':'The value fell by {0} compared with {1}.',size,previous);
   if(r.percent!==null&&r.change!==0)change+=' '+T('That is a change of {0} in nominal value.',compact(r.change,r.unit,true));
  }
  if(r.share!==null&&r.share!==undefined){
   change+=' '+T('The destination accounted for {0} of this product group’s exports to all destinations.',percent(r.share));
   if(r.shareChange!==null&&r.shareChange!==0)change+=' '+T('That share changed by {0} percentage points.',signed(r.shareChange));
  }
  const why={canada:'This shows how much the selected region and product group rely on a market. A shift in share can change exposure even if the value of exports rises.',us:'U.S. imports show purchases from the selected partner; U.S. exports show sales to it. Compare product coverage and Canadian exports before inferring a change in competition or demand.',investment:'A position measures accumulated investment, transactions measure net flows, and income measures returns on investment. Each can move differently, so compare the same measure over time.'};
  if(ds==='canada'&&s.partner==='All countries')why.canada='All-destination exports show the scale of the selected region’s product sales abroad. Compare individual destinations to see whether demand is becoming more concentrated or diversified.';
  const limit={canada:'These are current-dollar goods values. Changes can reflect prices, exchange rates or product mix; they do not measure export volume, jobs or the effect of a policy.',us:'These nominal U.S. goods figures are not seasonally adjusted. They do not measure Canadian jobs, value added or policy effects.',investment:'BEA assigns investment by immediate counterpart or foreign parent. The data do not identify ultimate ownership, completed projects or job creation.'};
  return `<dl class="insight-reading"><div><dt>${tx('What changed?')}</dt><dd>${e(change)}</dd></div><div><dt>${tx('Why does it matter to Canada?')}</dt><dd>${tx(why[ds])}</dd></div><div><dt>${tx('What remains uncertain?')}</dt><dd>${tx(limit[ds])}</dd></div></dl>`;
 }
 function trends(){
  const ds=state.dataset,s=sets[ds],r=ds==='canada'?M.canada(data.regional,s):ds==='us'?M.us(data.us,s):M.investment(data.investment,s);
  const partner=ds==='canada'?['United States','China','All countries']:['China','Canada'];
  const fields=[select('dataset','Data series',Object.entries(datasetLabels),ds,true)];
  if(ds==='canada')fields.push(select('region','Province / territory',options(regions),s.region,true),select('topic','Topic',Object.entries(window.RegionalTradeModel.groups),s.topic,true));
  if(ds==='investment')fields.push(select('direction','Direction',[['outward','U.S. investment abroad'],['inward','Foreign investment in the U.S.']],s.direction,true));
  fields.push(select('partner',ds==='canada'?'Destination':'Trading partner',options(partner),s.partner,true));
  if(ds!=='canada')fields.push(select('measure','Evidence measure',ds==='us'?[['imports','Imports'],['exports','Exports'],['balance','Trade balance']]:[['stock','Investment position'],['financial_flow','Net financial transactions'],['affiliate_income','Investment income']],s.measure,true));
  fields.push(select('year','Reporting year',[['latest','Latest available period'],...options(r?.available||[])],s.year,true));
  const controls=`<div class="insight-filters">${fields.join('')}</div>`;
  if(!r)return controls+`<p class="insight-muted">${tx('No complete, comparable value is available for this selection. Missing or suppressed values are not zero.')}</p>`;
  const tiles=[['Selected period',compact(r.current,r.unit),period(r,r.year)],['Same period a year earlier',compact(r.prior,r.unit),period(r,String(Number(r.year)-1))],
   ['Change from prior period',r.change===null?T('Comparable total unavailable'):r.percent!==null?percent(r.percent,true):compact(r.change,r.unit,true),r.change!==null&&r.percent!==null?compact(r.change,r.unit,true):'']];
  if(r.share!==null&&r.share!==undefined)tiles.push(['Share of all destinations',percent(r.share),r.shareChange===null?'':T('That share changed by {0} percentage points.',signed(r.shareChange))]);
  return controls+`<section class="insight-panel"><div class="insight-section-title"><h2>${tx(datasetLabels[ds])}</h2><p class="insight-muted">${tx('Latest in source')}: ${e(r.dataThrough||T('Not available'))} · ${tx('Source retrieved')}: ${e(prettyDate(r.checked))} · ${tr(r.status||'')}</p></div><dl class="insight-metrics">${tiles.map(([l,v,n])=>`<div><dt>${tx(l)}</dt><dd>${e(v)}</dd>${n?`<dd class="insight-meta">${e(n)}</dd>`:''}</div>`).join('')}</dl>
  ${interpret(r,ds,s)}${plot(r)}<p class="insight-muted">${tr(r.basis)}</p><div class="insight-links">${source(r.source,'Original data source')}${ds==='canada'?jump('canada-implications','Check regional evidence'):jump('us-trade','Check U.S. trade and policy')}</div></section>`;
 }


 function record(r){
  const described=window.PolicyNarrative?.describe({...r,unreviewed:r.kind==='update'})||{};
  const why=r.why||described.why||'',regional=described.regions||'';
  const field=(key,value)=>value?`<div><dt>${tx(key)}</dt><dd>${tr(value)}</dd></div>`:'';
  const status=r.status||r.stage&&({'in_force':'In force',signed:'Signed'})[r.stage]||window.USTradeModel.kinds[r.measurementType]||window.ImpactModel?.kinds[r.measurementType]||r.measurementType||r.stage||'';
  const dates=[field(r.dates,r.date),field('Reference period',r.period),field('Geography',r.geography),field('Sources reviewed',r.reviewedAt),field('Effective date',r.effectiveDate),field(r.id==='policy-china-market-access'?'Original expiry in the November 3 snapshot':'Recorded expiry',r.expiryDate),field('Recorded extension',r.through)];
  const extension=r.id==='policy-china-market-access'?`<p class="insight-muted">${tr(guide.labels.originalExpiry)}</p>`:'';
  const related=r.id.startsWith('us-')?jump('us-trade?view=evidence&query='+encodeURIComponent(r.title),'Check U.S. trade and policy'):jump('evidence-methods','Evidence & Methods');
  const reading=`<dl class="insight-record-reading">${field('What changed?',r.summary||described.changed)}${field('Why does it matter to Canada?',why)}${field('How could Canada and its provinces be affected?',regional)}${field('What remains uncertain?',r.limitation||r.attribution)}</dl>`;
  return `<details class="insight-record" data-insight-detail="${e(r.id)}"><summary><span class="insight-meta">${tx(M.labels[r.kind])} · ${tr(r.set)} · ${e(prettyDate(r.date))}</span><strong>${tr(r.title)}</strong>${status?`<span class="insight-badge">${tr(status)}</span>`:''}</summary><div class="insight-record-body">
  ${r.kind==='update'?`<p class="insight-caution">${tx('The monitor detected a source change. A detection is not a verified legal amendment or a measured economic result.')}</p>`:''}
  ${r.value!==undefined&&r.value!==null?`<p class="insight-value">${e(number(r.value,{maximumFractionDigits:3}))} ${tr(r.unit)}</p>`:''}
  ${reading}<dl class="insight-dates">${dates.join('')}</dl>${extension}
  ${r.publicationDate?`<p class="insight-meta">${tx('Source publication')}: ${e(r.publicationDate)}</p>`:''}
  <ul class="insight-sources">${r.sources.map(s=>`<li>${source(s.url,s.publisher)}</li>`).join('')}</ul>${r.kind==='update'?'':related}</div></details>`;
 }
 function weekly(){
  const issues=data.weekly?.issues||[];
  return `<section class="insight-panel"><h2>${tx('Weekly briefings')}</h2>${issues.map(issue=>`<details class="insight-record" data-insight-detail="${e(issue.id)}"><summary><span class="insight-meta">${tx('Published')}: ${e(prettyDate(issue.publishedAt))}</span><strong>${tr(issue.title)}</strong></summary><div class="insight-record-body"><p>${tr(issue.lead)}</p><p class="insight-meta">${tx('Observation window')}: ${e(prettyDate(issue.windowStart))} – ${e(prettyDate(issue.windowEnd))}</p>
  ${[...(issue.observations||[]),...(issue.reviewed||[])].map(r=>`<details><summary>${tr(r.title)}${r.baseline?' · '+tx('Baseline observation'):''}</summary><dl class="insight-record-reading">${Object.entries(r.story||{}).map(([key,value])=>`<div><dt>${tx(({changed:'What changed?',why:'Why does it matter to Canada?',regions:'How could Canada and its provinces be affected?'})[key]||key)}</dt><dd>${tr(value)}</dd></div>`).join('')}</dl><p>${[...(r.sources||[]),...(r.url?[{url:r.url,title:'Open original source'}]:[])].map(s=>source(s.url,s.title)).join(' · ')}</p></details>`).join('')}
  ${(issue.statisticalUpdates||[]).map(r=>`<p>${source(r.url,r.title)} · ${e((r.periods||[]).join(', '))}<br>${tr(r.note)}</p>`).join('')}
  <p>${tr(issue.watch)}</p>${jump('weekly-updates?issue='+encodeURIComponent(issue.id),'Review the complete edition')}</div></details>`).join('')||`<p>${tx('Not available')}</p>`}</section>`;
 }
 function register(view){
  const all=M.records(data,window.PolicyResearchRegister,window.EXPLORER_INVENTORY),rows=M.filter(all,{...state,view},s=>window.DashboardI18n.t(s));
  const kinds=view==='policies'?['policy','memo','amendment']:view==='updates'?['update']:Object.keys(M.labels).filter(k=>k!=='update');
  const fields=[
   select('topic','Topic',[['all','All topics'],...(window.EXPLORER_CATALOG?.topics||[]).map(t=>[t.id,t.name])],state.topic),
   select('relationship','Relationship',[['all','All relationships'],...Object.entries(rels)],state.relationship)
  ];
  if(view!=='updates')fields.push(select('kind','Record type',[['all','All record types'],...kinds.map(k=>[k,M.labels[k]])],state.kind),select('set','Source collection',[['all','All source collections'],...options([...new Set(all.filter(r=>view==='policies'?['policy','memo','amendment'].includes(r.kind):r.kind!=='update').map(r=>r.set))])],state.set));
  const count=10,pages=Math.ceil(rows.length/count);state.page=Math.min(state.page,Math.max(0,pages-1));
  const shown=rows.slice(state.page*count,(state.page+1)*count);
  const info=rows.length?T('Showing {0}–{1} of {2} records',state.page*count+1,state.page*count+shown.length,rows.length):T('No records match this selection.');
  const note=view==='policies'?'Signing, implementation and economic outcomes are separate. Check the effective date, product coverage and original instrument before applying a measure.':view==='updates'?'The monitor detected a source change. A detection is not a verified legal amendment or a measured economic result.':'Read reviewed figures, independent research and historical records with their original units and dates.';
  const status=view==='updates'?`<p class="insight-meta">${tx('Latest source check')}: ${e(prettyDate(data.daily?.lastAttempt))} · ${tr(data.daily?.lastRunStatus||'Not available')}<br>${tx('Last successful source check')}: ${e(prettyDate(data.daily?.lastSuccessfulRun))} · ${tx('Source errors')}: ${e(data.daily?.sourceFailures?.length??T('Not available'))}</p>`:'';
  return `<h2>${tx(labels[view])}</h2><p>${tx(note)}</p>${status}<div class="insight-filters">${fields.join('')}</div><form id="insight-search" class="insight-search"><label class="sr-only" for="insight-query">${tx('Search titles, findings or dates')}</label><input id="insight-query" type="search" value="${e(state.query)}" placeholder="${tx('Search titles, findings or dates')}"><button type="submit">${tx('Search')}</button></form><p role="status">${e(info)}</p>
  <div>${shown.map(record).join('')}</div>${pages>1?`<nav class="insight-pagination" aria-label="${tx('Pagination')}"><button type="button" data-insight-page="-1" ${state.page===0?'disabled':''}>${tx('Previous')}</button><span>${state.page+1} / ${pages}</span><button type="button" data-insight-page="1" ${state.page+1>=pages?'disabled':''}>${tx('Next')}</button></nav>`:''}
  ${view==='updates'?weekly():''}`;
 }
 function render(){
  const open=new Set(Array.from(main.querySelectorAll('details[data-insight-detail][open]'),n=>n.dataset.insightDetail));
  const view=currentView();
  document.getElementById('insights-title').textContent=T('Findings & Trends');
  document.getElementById('insights-intro').textContent=T('Explore the numbers, then check the policies and sources behind them.');
  document.getElementById('insights-full').href=navURL('home');
  document.getElementById('insights-full').textContent=T('Open dashboard')+' ↗';
  document.getElementById('insights-nav').innerHTML=Object.entries(labels).map(([id,label])=>`<a href="#${id}" ${view===id?'aria-current="page"':''}>${tx(label)}</a>`).join('');
  const navHeight=document.getElementById('insights-nav').getBoundingClientRect?.().height;
  if(Number.isFinite(navHeight))document.documentElement?.style?.setProperty('--insights-nav-height',Math.ceil(navHeight)+'px');
  main.innerHTML=view==='trends'?trends():register(view);
  for(const el of main.querySelectorAll('details[data-insight-detail]'))if(open.has(el.dataset.insightDetail))el.open=true;
  document.getElementById('insights-files').innerHTML=`<summary>${tx('Published data files')}</summary><ul>${Object.values(feeds).map(([file,label])=>`<li><a href="${e(file)}" target="_blank" rel="noopener" download>${tx(label)} · ${tx('Download JSON')}</a></li>`).join('')}</ul>`;
  document.title=T('Findings & Trends')+' | Canada–U.S.–China';
  feedback.textContent=!loaded?T('Loading published data…'):failures.length?T('Some feeds did not load. Where available, the last loaded figures remain visible.')+' '+failures.map(x=>T(x)).join(' · '):T('Published feeds loaded');
 }
 let busy=false,loaded=false,failures=[];
 async function refresh(){
  if(busy)return;busy=true;refreshButton.disabled=true;refreshButton.textContent=T('Refreshing…');
  const names=Object.keys(feeds);
  const results=await Promise.allSettled(names.map(async key=>{
   const [file,,array]=feeds[key],r=await fetch(file,{cache:'no-store',signal:AbortSignal.timeout(20000)});
   if(!r.ok)throw Error(file);const d=await r.json();
   if(!Array.isArray(d[array]))throw Error(file);return d;
  }));
  failures=[];
  results.forEach((r,i)=>{const key=names[i];if(r.status==='fulfilled')data[key]=r.value;else failures.push(feeds[key][1]);});
  feedback.textContent=failures.length?T('Some feeds did not load. Where available, the last loaded figures remain visible.')+' '+failures.map(T).join(' · '):T('Published feeds loaded');
  loaded=true;busy=false;refreshButton.disabled=false;refreshButton.textContent=T('Refresh data');
  const query=document.getElementById('insight-query');if(query)state.query=query.value;
  render();
 }
 host.addEventListener('change',ev=>{
  const control=ev.target.closest('[data-insight-filter]');if(!control)return;
  const key=control.dataset.insightFilter;
  if(control.hasAttribute('data-insight-trend')){
   if(key==='dataset')state.dataset=control.value;
   else sets[state.dataset][key]=control.value;
  }else{state[key]=control.value;state.page=0;}
  render();document.getElementById(control.id)?.focus({preventScroll:true});
 });
 host.addEventListener('submit',ev=>{if(ev.target.id!=='insight-search')return;ev.preventDefault();state.query=document.getElementById('insight-query').value;state.page=0;render();document.getElementById('insight-query')?.focus({preventScroll:true});});
 host.addEventListener('click',ev=>{const b=ev.target.closest('[data-insight-page]');if(!b)return;state.page+=Number(b.dataset.insightPage);render();document.getElementById('insights-nav').scrollIntoView({block:'start'});});
 refreshButton.addEventListener('click',refresh);
 window.addEventListener('hashchange',()=>{state.page=0;state.kind='all';state.set='all';render();main.focus({preventScroll:true});main.scrollIntoView({block:'start'});});
 window.addEventListener('dashboard-language-changed',()=>{render();refreshButton.textContent=T(busy?'Refreshing…':'Refresh data');});
 window.addEventListener('message',ev=>{
  if(ev.source!==window.parent||ev.origin!==location.origin||ev.data?.type!=='policy-insights-language')return;
  window.DashboardI18n.setLanguage(ev.data.language);
 });
 const parentOrigin=new URL(document.referrer||location.href).origin;
 const size=()=>{if(window.parent!==window){try{window.parent.postMessage({type:'policy-insights-size',height:document.body.scrollHeight},parentOrigin==='null'?'*':parentOrigin);}catch{}}};
 if(window.ResizeObserver)new ResizeObserver(size).observe(document.body);
 setInterval(()=>{if(!document.hidden)refresh();},5*60*1000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
 render();refresh();
})();

