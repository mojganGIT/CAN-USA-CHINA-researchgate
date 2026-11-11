(function(){
 'use strict';
 const B=window.BilateralModel,T=window.BilateralCopy.text,E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const tx=(s,...args)=>E(T(s,...args)),tr=s=>E(window.DashboardI18n?.t(s??'')??s);
 const root=document.getElementById('root'),data={};
 let state=null,promise=null,loaded=false,failures=[],busy=false;
 const files={canadian:['evidence-records.json','records'],american:['us-trade-evidence.json','records'],regional:['regional-statistics.json','series'],us:['us-trade-statistics.json','partners'],investment:['us-investment-statistics.json','series'],daily:['policy-updates.json','changes']};
 const fieldNames={shipments:'Realized shipments / business',supply_chain:'Canadian supply-chain participation',investment:'Completed investment',tariffs:'Applied tariffs / access',employment:'Employment'};
 const statuses={in_force:'In force',signed:'Signed',proposed:'Proposed',announced:'Announced',meeting_held:'Meeting held',published_framework:'Framework published',implemented_decision:'Decision implemented',review_outcome:'Review outcome recorded',historical:'Historical measure'};
 const safe=s=>{try{const u=new URL(s);return u.protocol==='https:'&&!u.username&&!u.password?u.href:'';}catch{return '';}};
 const number=n=>new Intl.NumberFormat(window.DashboardI18n?.locale||'en-CA',{maximumFractionDigits:3}).format(n);
 const compact=(n,currency)=>n===null||n===undefined?T('Not available'):new Intl.NumberFormat(window.DashboardI18n?.locale||'en-CA',{style:'currency',currency,notation:'compact',maximumFractionDigits:2}).format(n);
 const month=m=>String(m).padStart(2,'0');
 const target=(view='overview',extra={})=>B.target(state.pair,view,extra);
 const anchor=(view,label,extra={},cls='')=>`<a href="#${E(target(view,extra))}" data-hub="${E(target(view,extra))}" ${cls?'class="'+cls+'"':''}>${tx(label)} <span aria-hidden="true">→</span></a>`;
 function all(){return B.records(data,window.PolicyResearchRegister,window.EXPLORER_INVENTORY,window.EXPLORER_CATALOG,window.InsightsModel);}
 function matched(options){return B.filter(all(),{...state,query:window.DashboardI18n?.searchQuery(state.query)||state.query},options);}
 function original(url,title){
  const u=safe(url);return u?`<a href="${E(u)}" target="_blank" rel="noopener noreferrer">${tr(title)} ↗</a>`:tr(title);
 }
 function record(r){
  const description=window.PolicyNarrative?.describe({...r,unreviewed:r.kind==='update'})||{};
  const sourceMap=new Map([...Object.values(data.canadian?.sources||{}),...Object.values(data.american?.sources||{})].map(s=>[s.url,s]));
  const field=(key,value)=>value?`<div><dt>${tx(key)}</dt><dd>${tr(value)}</dd></div>`:'';
  const linked=(r.recordIds||[]).map(id=>all().find(x=>x.id==='ca-'+id)).filter(x=>x&&(x.relationships.includes(state.pair.relationship)||!x.relationships.length));
  const status=r.kind==='historical'?'Historical inventory':statuses[r.stage]||r.status||window.ImpactModel.kinds[r.measurementType]||window.USTradeModel.kinds[r.measurementType]||r.kind;
  return `<details class="bilateral-record" data-bilateral-record="${E(r.id)}"><summary><span class="bilateral-meta">${E(r.date||r.period||'')} · ${tx(r.set||'Research notes')}</span><strong>${tr(r.title)}</strong><span class="bilateral-badge">${tx(status)}</span>${Number.isFinite(r.value)?`<span class="bilateral-value">${E(number(r.value))} ${tr(r.unit)}</span>`:''}</summary><div class="bilateral-record-body">
  ${r.kind==='update'?`<p class="bilateral-caution">${tx('Unreviewed source observation')} · ${tx('Historical labels and years are retained. A source-page change is not automatically a legal amendment.')}</p>`:''}
  <dl class="bilateral-reading">${field('What changed?',r.summary||description.changed)}${field('Why does it matter to Canada?',r.why||description.why)}${field('How could Canada and its provinces be affected?',description.regions)}${field('What remains uncertain?',r.limitation||r.attribution||(r.kind==='historical'?'The original inventory label is retained; it is not a new verification of current law. Check the source for amendments, implementation and exceptions.':''))}</dl>
  <dl class="bilateral-dates">${field(r.dates||'Record date',r.date)}${field('Reference period',r.period)}${field('Geography',r.geography)}${field('Effective date',r.effectiveDate)}${field('Recorded expiry',r.expiryDate||r.through)}${field('Sources reviewed',r.reviewedAt)}${field('Date type',r.dateType?.replaceAll('_',' '))}${r.kind==='historical'?field('Original inventory label',r.status):''}</dl>
  ${r.id==='policy-china-market-access'?`<p class="bilateral-meta">${tr(window.PolicyGuide.labels.originalExpiry)}</p>`:''}
  <ul class="bilateral-sources">${r.sources.map(s=>{const meta=sourceMap.get(s.url);return `<li>${original(s.url,s.publisher)}${meta?.publicationLabel?`<br><span class="bilateral-meta">${tx('Source publication')}: ${tr(meta.publicationLabel)}</span>`:''}</li>`;}).join('')}</ul>${linked.length?`<details class="bilateral-linked"><summary>${tx('Linked outcome evidence')} (${linked.length})</summary><p class="bilateral-meta">${tx('Linked observations can predate the policy or cover a different geography; links are not causal claims.')}</p>${linked.map(record).join('')}</details>`:''}</div></details>`;
 }
 function filters({search=false}={}){
  const topics=window.EXPLORER_CATALOG.topics;
  const select=(key,label,rows)=>`<label for="bilateral-${key}">${tx(label)}<select id="bilateral-${key}" data-bilateral-filter="${key}">${rows.map(([v,l])=>`<option value="${E(v)}" ${state[key]===v?'selected':''}>${tx(l)}</option>`).join('')}</select></label>`;
  return `<div class="bilateral-filters">${select('topic','Topic',[['all','All topics'],...topics.map(t=>[t.id,t.name])])}${select('year','Reference year',[['all','All years: 2018–2026'],...Array.from({length:9},(_,i)=>[String(2026-i),String(2026-i)])])}${search?`<form id="bilateral-search"><label class="sr-only" for="bilateral-query">${tx('Search')}</label><input id="bilateral-query" type="search" value="${E(state.query)}" placeholder="${tx('Search titles, findings or dates')}"><button type="submit">${tx('Search')}</button></form>`:''}</div>`;
 }
 function topicCards(){
  return `<div class="bilateral-topic-grid">${window.EXPLORER_CATALOG.topics.map((t,i)=>anchor('compare',t.name,{topic:t.id},'bilateral-topic')).join('')}</div>`;
 }
 function statCards(){
  const cards=[],year=state.year==='all'?'2026':state.year;
  if(state.pair.canadian&&data.regional){
   const partner=state.pair.relationship==='Canada-China'?'China':'United States';
   const r=window.RegionalTradeModel.snapshot(data.regional,{region:'CA',topic:state.topic,relationship:state.pair.relationship,period:year},data.canadian?.regions||{});
   const p=r.partners.find(p=>p.partner===partner);
   cards.push({title:T('Canadian domestic exports to {0}',T(partner)),value:compact(p.current,'CAD'),period:year+'-01 – '+year+'-'+month(r.month),change:p.change,unit:'CAD',url:data.regional.url,note:(r.contextOnly?T('All-merchandise context; this topic is not separately measured in this trade table.')+' ':'')+data.regional.basis});
  }
  if(state.pair.id!=='canada-china'&&data.us){
   const r=window.USTradeModel.goods(data.us,state.pair.partner,year);
   if(r)cards.push({title:T('U.S. goods imports from {0}',T(state.pair.partner)),value:compact(r.imports*1e6,'USD'),period:year+'-01 – '+year+'-'+month(r.month),change:r.prior?window.USTradeModel.growth(r.imports,r.prior.imports):null,url:data.us.partners.find(p=>p.id===state.pair.partner).url,note:data.us.basis});
  }
  return cards.length?`<div class="bilateral-stat-grid">${cards.map(c=>`<article><h3>${E(c.title)}</h3><p class="bilateral-stat">${E(c.value)}</p><p class="bilateral-meta">${E(c.period)} · ${E(c.unit||'USD')}</p>${c.change!==null?`<p>${E(number(c.change))}% · ${tx('Same months a year earlier')}</p>`:''}<details><summary>${tx('Source and measurement')}</summary><p class="bilateral-meta">${tr(c.note)}</p>${original(c.url,'Open original source')}</details></article>`).join('')}</div>`:'';
 }
 function overview(){
  const story=state.pair.id==='canada-china'?'Market access, sourcing and security choices connect Canadian firms to Chinese buyers and suppliers. The balance differs by sector and province, so commercial openings and security constraints need to be examined together.':state.pair.id==='us-china'?'U.S.–China competition and negotiation can change the markets, inputs and rules facing Canadian firms. The evidence below concerns that bilateral relationship; Canadian implications are interpretation unless independently measured.':'Canada and the U.S. share production networks, energy trade and continental security arrangements. Integration supports Canadian activity but also exposes firms and provinces to American demand and policy decisions.';
  const policies=matched({policy:true}).slice(0,4),updates=matched().filter(r=>r.kind==='update').slice(0,3);
  return `<section data-no-translate><dl class="bilateral-intro"><div><dt>${tx('Canada’s policy question')}</dt><dd>${tx(story)}</dd></div><div><dt>${tx('How to use the comparison')}</dt><dd>${tx('Start with one of the eight topics, follow the timeline and open the source. Compare the same product, period and unit; use the maps to examine regional exposure rather than infer local jobs from national figures.')}</dd></div><div><dt>${tx('What changed across the period?')}</dt><dd>${tx('Tariffs, screening decisions, security measures and renewed dialogues have changed at different times since 2018. The timeline distinguishes the instrument’s event date, effective date and available outcome evidence.')}</dd></div></dl>
  ${filters()}${statCards()}<h3>${tx('Eight topic comparisons')}</h3>${topicCards()}<div class="bilateral-section-title"><h3>${tx('Latest reviewed milestones')}</h3>${anchor('policy','Policy Tracker')}</div>${policies.map(record).join('')}
  <h3>${tx('Latest daily observations for this relationship')}</h3>${updates.map(record).join('')||`<p class="bilateral-meta">${tx('No new monitored observations match this relationship. This does not establish that no policy changed.')}</p>`}</section>`;
 }
 function contexts(){
  const rows=matched({context:true});
  return rows.length?`<details class="bilateral-context"><summary>${tx('All-market Canadian context — not a bilateral allocation')} (${rows.length})</summary>${rows.map(record).join('')}</details>`:'';
 }
 function compare(){
  const catalog=window.EXPLORER_CATALOG,topics=catalog.topics.filter(t=>state.topic==='all'||t.id===state.topic),index=catalog.relationships.indexOf(state.pair.relationship);
  const rows=matched().filter(r=>r.kind!=='update');
  return `<section data-no-translate>${filters()}<p>${tx('Select a topic to read its subtopics and matched evidence.')}</p>${topicCards()}
  ${topics.map(t=>{
   const records=rows.filter(r=>r.topics.includes(t.id)),ca=data.canadian?.assessments.find(r=>r.id===t.id),us=data.american?.assessments.find(r=>r.id===t.id);
   const summary=records.find(r=>r.summary)?.summary;
   return `<section class="bilateral-topic-section"><h3>${tx(t.name)}</h3>${summary?`<p>${tr(summary)}</p>`:''}${state.pair.canadian&&ca?.status==='pending'?`<p class="bilateral-meta">${tr(ca.limitation)}</p>`:''}
   <details class="bilateral-subtopics" ${state.topic!=='all'?'open':''}><summary>${tx('Subtopics and mechanisms')}</summary>${t.issues.map(issue=>{const link=issue.links[index];return `<article><h4>${tr(issue.title)}</h4><dl class="bilateral-reading"><div><dt>${tx('What is the connection?')}</dt><dd>${tr(link.connection)}</dd></div><div><dt>${tx('Why does it matter to Canada?')}</dt><dd>${tr(issue.why)}</dd></div><div><dt>${tx('What remains uncertain?')}</dt><dd>${tr(issue.uncertainty)}</dd></div></dl>${anchor('relationship','Relationship Tracker',{topic:t.id,issue:issue.id})}</article>`;}).join('')}</details>
   <h4>${tx('Five evidence tests')}</h4><p class="bilateral-meta">${tx('Open the underlying records to check units, geography and reference periods. The tests are not combined into a score.')}</p>
   ${Object.entries(fieldNames).map(([metric,label])=>{const found=records.filter(r=>r.metric===metric);return `<details class="bilateral-test"><summary>${tx(label)} · ${found.length}</summary>${found.length?found.map(record).join(''):`<p>${tx('No directly matched record was established for this selection. This is an evidence gap, not zero impact.')}</p>`}</details>`;}).join('')}
   <details class="bilateral-topic-evidence"><summary>${tx('Reviewed sources and historical inventory')} (${records.length})</summary>${records.map(record).join('')||`<p>${tx('No records match these filters.')}</p>`}</details></section>`;
  }).join('')}${state.pair.canadian?contexts():''}</section>`;
 }


 function timeline(){
  const rows=matched({policy:true});
  return `<section data-no-translate>${filters({search:true})}<p>${tx('Signing, implementation and economic outcomes are separate. Check the effective date, product coverage and original instrument before applying a measure.')}</p><p class="bilateral-meta">${rows.length} · ${tx('Period-specific source records')}</p><div class="bilateral-timeline">${rows.map(record).join('')||`<p>${tx('No records match these filters.')}</p>`}</div></section>`;
 }
 function evidence(){
  const rows=matched().filter(r=>r.kind!=='update'),size=15,pages=Math.max(1,Math.ceil(rows.length/size));
  state.page=Math.min(state.page,pages-1);
  const slice=rows.slice(state.page*size,(state.page+1)*size),methods=state.pair.id==='canada-china'?data.canadian?.methods||[]:state.pair.id==='us-china'?data.american?.methods||[]:[...(data.canadian?.methods||[]),...(data.american?.methods||[])];
  const dates=(data.regional?.series||[]).flatMap(s=>(s.points||[]).map(p=>p.period.slice(0,7))).sort();
  return `<section data-no-translate>${filters({search:true})}<details class="bilateral-methods"><summary>${tx('Evidence & Methods')}</summary><ul>${[...new Set(methods)].map(m=>`<li>${tr(m)}</li>`).join('')}</ul><p>${tx('Source text and data retain their publication language and measurement definitions.')}</p><p class="bilateral-meta">${tx('Canadian provincial series: {0} to {1}. U.S. goods series: 2018 to the latest published period.',dates[0]||'—',dates.at(-1)||'—')}</p><p class="bilateral-meta">${tx('Statistical series and policy timelines have different coverage. Use the original dates; missing historical data is not filled with estimates.')}</p></details>
  <p role="status">${rows.length?tx('Showing {0}–{1} of {2} records',state.page*size+1,state.page*size+slice.length,rows.length):tx('No records match these filters.')}</p>${slice.map(record).join('')}
  ${pages>1?`<nav class="bilateral-pagination" aria-label="${tx('Pagination')}"><button type="button" data-bilateral-page="-1" ${state.page===0?'disabled':''}>${tx('Previous')}</button><span>${state.page+1} / ${pages}</span><button type="button" data-bilateral-page="1" ${state.page+1>=pages?'disabled':''}>${tx('Next')}</button></nav>`:''}
  ${state.pair.canadian?contexts():''}</section>`;
 }
 function products(){
  const rows=matched({policy:true});
  return `<section data-no-translate>${filters()}<p>${tx('Historical labels and years are retained. A source-page change is not automatically a legal amendment.')}</p><div class="bilateral-products">${window.EXPLORER_CATALOG.topics.filter(t=>state.topic==='all'||t.id===state.topic).map(t=>`<section><h3>${tr(t.name)}</h3>${rows.filter(r=>r.topics.includes(t.id)).map(record).join('')||`<p class="bilateral-meta">${tx('No records match these filters.')}</p>`}</section>`).join('')}</div></section>`;
 }
 function trendFrame(){
  const language=window.DashboardI18n?.language||'en',src='insights.html?'+new URLSearchParams({lang:language,relationship:state.pair.relationship});
  return `<section data-no-translate><p>${tx('Statistical series and policy timelines have different coverage. Use the original dates; missing historical data is not filled with estimates.')}</p><p><a id="insight-frame-open" href="${E(src)}" target="_blank" rel="noopener noreferrer">${tx('Open the full findings view')} ↗</a></p><iframe id="policy-insights-frame" class="policy-insights-frame" src="${E(src)}" title="${tx(state.pair.title)} — ${tx('Findings & Trends')}" width="100%" height="1100" loading="lazy"></iframe></section>`;
 }
 function render(){
  if(!state||location.hash.slice(1).split('?')[0]!==state.pair.id)return;
  const view=state.view,open=new Set(Array.from(root.querySelectorAll?.('details[data-bilateral-record][open]')||[],n=>n.dataset.bilateralRecord));
  root.innerHTML=`<div class="wrap bilateral-shell"><header class="bilateral-heading" data-no-translate><p class="hub-eyebrow">2018–2026</p><h2>${tx(state.pair.title)}</h2><p>${tx('Follow the evidence from 2018–2026. Each dataset keeps its own reference period; an announcement is separate from implementation and measured results.')}</p></header>
  <nav class="bilateral-subnav" aria-label="${tx('Relationship sections')}" data-no-translate>${[...B.views,...B.mapViews(state.pair.id)].map(([id,label])=>`<a href="#${E(target(id,{topic:state.topic,year:state.year}))}" data-hub="${E(target(id,{topic:state.topic,year:state.year}))}" ${view===id?'aria-current="page"':''}>${tx(label)}</a>`).join('')}</nav>
  <p class="bilateral-meta" data-no-translate>${tx('Only records linked to this relationship appear here. All-market Canadian context is available separately and is never allocated to a bilateral partner.')}</p>
  ${failures.length?`<p class="bilateral-caution" role="status" data-no-translate>${tx('Some published datasets could not be refreshed. Previously loaded data and research notes remain available.')}</p>`:!loaded?`<p class="bilateral-meta" role="status" data-no-translate>${tx('Sources are still loading; published research notes remain available.')}</p>`:''}
  <div id="bilateral-body">${view==='overview'?overview():view==='compare'?compare():view==='policy'?timeline():view==='evidence'?evidence():view==='products'?products():view==='trends'?trendFrame():''}</div></div>`;
  for(const n of root.querySelectorAll?.('details[data-bilateral-record]')||[])if(open.has(n.dataset.bilateralRecord))n.open=true;
  if(view==='map')window.CanadaImpact.mount('overview','bilateral-body');
  if(view==='states')window.USStates.mount('bilateral-body',{partner:state.pair.partner,lockedPartner:state.pair.partner});
  if(view==='relationship')window.showExplorer();
  if(view==='trends')document.getElementById('policy-insights-frame')?.addEventListener('load',()=>{
   const f=document.getElementById('policy-insights-frame');f?.contentWindow?.postMessage({type:'policy-insights-language',language:window.DashboardI18n?.language||'en'},location.origin);
  });
 }
 async function load(){
  if(busy)return;busy=true;
  const keys=Object.keys(files),results=await Promise.allSettled(keys.map(async key=>{
   const [path,array]=files[key],r=await fetch(path,{cache:'no-store',signal:AbortSignal.timeout(20000)});
   if(!r.ok)throw Error(path);const d=await r.json();if(!Array.isArray(d[array]))throw Error(path);return d;
  }));
  failures=[];for(let i=0;i<keys.length;i++){if(results[i].status==='fulfilled')data[keys[i]]=results[i].value;else failures.push(keys[i]);}
  loaded=true;busy=false;render();
 }
 function show(id){
  state=B.normalize(id,Object.fromEntries(new URLSearchParams(location.hash.split('?')[1]||'')));
  render();if(!promise)promise=load();
 }
 function set(key,value){
  state=B.normalize(state.pair.id,{...state,[key]:value,page:0});
  history.replaceState(null,'','#'+target(state.view,{topic:state.topic,year:state.year,query:state.query,page:state.page}));render();
  document.getElementById('bilateral-'+key)?.focus({preventScroll:true});
 }
 document.addEventListener('change',ev=>{const el=ev.target.closest('[data-bilateral-filter]');if(el&&state)set(el.dataset.bilateralFilter,el.value);});
 document.addEventListener('submit',ev=>{if(ev.target.id!=='bilateral-search'||!state)return;ev.preventDefault();set('query',document.getElementById('bilateral-query').value);});
 document.addEventListener('click',ev=>{const el=ev.target.closest('[data-bilateral-page]');if(el&&state){state.page=Math.max(0,state.page+Number(el.dataset.bilateralPage));render();document.getElementById('bilateral-search')?.scrollIntoView({block:'start'});}});
 window.addEventListener('dashboard-language-changed',()=>{if(state)render();});
 window.addEventListener('policy-updates-loaded',()=>{if(state&&location.hash.startsWith('#'+state.pair.id))promise=load();});
 window.BilateralHub={show,render,get active(){return state?{...state.pair,view:state.view}:null;},clear(){state=null;},get ready(){return promise;},target:(view,extra)=>state?target(view,extra):'home',get state(){return state&&{...state};}};
})();

