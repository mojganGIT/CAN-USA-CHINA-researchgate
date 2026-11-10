(function(){
 'use strict';
 const root=document.getElementById('root'),navigation=document.getElementById('site-navigation');
 const D=window.POLICY_MASTER,C=window.EXPLORER_CATALOG;
 const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const guide=window.PolicyGuide,L=guide.labels;
 const primaryTabs=[['home','Home'],['compare-topics','Compare Topics'],['policy-tracker','Policy Tracker'],['us-trade',L.us],['research-search',L.search],['your-llm',L.llm],['weekly-updates',L.subscribe],['daily-updates','Daily Updates']];
 const homeMenu=[['categories',L.categories],['countries',L.countries],['comparative',L.comparative]];
 const compareMenu=[['findings-trends',L.insights],['evidence-methods','Evidence & Methods'],['relationship-explorer',L.relationship]];
 const menus={home:{label:L.homeMenu,items:homeMenu},'compare-topics':{label:L.compareMenu,items:compareMenu}};
 const tabs=[...primaryTabs,...homeMenu,...compareMenu,['executive-summary','Executive Summary'],['briefing-overview','Changes across Canada'],['canada-implications','Canada Implications Explorer'],['policy-map','Policy Product Map'],['research-tools','Research Tools']];
 const tools=homeMenu.map(([id,title],i)=>[id,String(i+1).padStart(2,'0'),title,guide.guideNotes[id]]);
 const researchTools=[
  ['executive-summary','Executive Summary','Understand the dashboard, its Canadian purpose and how to use it.'],
  ['canada-implications','Canada Implications Explorer','Open the provincial map, export statistics and regional evidence.'],
  ['policy-map','Policy Product Map','Browse policy fields across the three relationships.'],
  ['relationship-explorer',L.relationship,'Explore topic connections and their significance for Canada.'],
  ['daily-updates','Daily Updates','Inspect source observations, dates and monitoring coverage.'],
  ['research-search',L.search,'Find evidence in the curated inventory and daily source records.'],
  ['your-llm',L.llm,'Use your own model account for a cited explanation.']
 ];
 function feed(){return window.PolicyLive?.feed||{changes:[],lastRunStatus:'loading'};}
 function date(value){if(!value)return 'Not recorded yet';const d=new Date(value);return Number.isNaN(d.getTime())?'Date unavailable':new Intl.DateTimeFormat('en-CA',{dateStyle:'medium',timeStyle:'short',timeZone:'America/Toronto'}).format(d)+' ET';}
 function official(url,title){try{const u=new URL(url);return u.protocol==='https:'?`<a href="${E(u.href)}" target="_blank" rel="noopener noreferrer">${E(title)} <span aria-hidden="true">↗</span><span class="sr-only"> (new tab)</span></a>`:E(title);}catch{return E(title);}}
 function statusHTML(f=feed()){
  const stale=!!f.lastSuccessfulRun&&Date.now()-Date.parse(f.lastSuccessfulRun)>48*3600000;
  const label=stale?'Check overdue':({success:'Scan completed',partial:'Partial coverage',failed:'Latest scan failed',not_run:'First scan pending',loading:'Loading scan status',unavailable:'Status unavailable'}[f.lastRunStatus]||'Check run details');
  return `<p class="hub-eyebrow">DAILY MONITOR</p><p class="hub-status-label">${E(label)}</p><dl><dt>Last successful check</dt><dd>${E(date(f.lastSuccessfulRun))}</dd><dt>Sources read in latest run</dt><dd>${Number(f.sourcesChecked)||0}</dd><dt>Source errors</dt><dd><a href="#evidence-methods" data-hub="evidence-methods">${(f.sourceFailures||[]).length} · inspect coverage</a></dd></dl><p class="hub-small">Scheduled ${E(f.scheduleUTC||'11:17 daily')} UTC. An open dashboard checks for published results every five minutes.</p><a href="#daily-updates" data-hub="daily-updates" class="hub-inline-link">View all daily updates →</a>`;
 }
 function latestHTML(f=feed(),limit=3){
  const items=[...(f.changes||[])].sort((a,b)=>(b.detectedAt||'').localeCompare(a.detectedAt||'')).slice(0,limit);
  return `<div class="hub-section-heading"><div><p class="hub-eyebrow">CONNECTED TO THE DAILY MONITOR</p><h3>Latest developments</h3></div><a href="#daily-updates" data-hub="daily-updates">Open update history →</a></div><p class="hub-small">${f.aiEnabled?'AI extractions are labelled and linked to supporting source text.':'Source-change detection is active. Automated policy analysis needs the owner’s monitoring model and key.'} A detection date is not a policy’s effective date.</p>${items.length?`<div class="hub-news-grid">${items.map(x=>`<article class="hub-news"><p class="hub-news-meta">${E(x.ai?'Automated extraction · unreviewed':x.changeType==='source_revision'?'Source page revised':'Source first indexed')}</p><h4>${official(x.url,x.title)}</h4><p>${E(x.ai?.summary||'The monitor indexed this official source. No new policy finding or implementation outcome is inferred from indexing alone.')}</p><p class="hub-small">Detected ${E(date(x.detectedAt))}${x.publicationDate?' · Source publication '+E(x.publicationDate):''}</p><a href="#daily-updates" data-hub="daily-updates">Inspect record and provenance →</a></article>`).join('')}</div>`:'<p class="hub-empty">No daily developments have been published yet. The existing research snapshot remains available in the sections below.</p>'}`;
 }
 function homeStatusHTML(f=feed()){
  const stale=!!f.lastSuccessfulRun&&Date.now()-Date.parse(f.lastSuccessfulRun)>48*3600000;
  const label=stale?'Check overdue':({success:'Check completed',partial:'Partial coverage',failed:'Latest check failed',not_run:'First check pending',loading:'Loading status',unavailable:'Status unavailable'}[f.lastRunStatus]||'Check details');
  return `<span class="hub-monitor-label">Daily source check</span><strong>${E(label)}</strong><span>Last successful check: ${E(date(f.lastSuccessfulRun))}</span><a href="#evidence-methods" data-hub="evidence-methods">Coverage details →</a>`;
 }
 function homeLatestHTML(f=feed()){
  const items=[...(f.changes||[])].sort((a,b)=>(b.detectedAt||'').localeCompare(a.detectedAt||'')).slice(0,3);
  return `<div class="hub-section-heading"><h3 id="hub-updates-title">Latest source updates</h3><a href="#daily-updates" data-hub="daily-updates">View all updates →</a></div>${items.length?`<ul class="hub-update-list">${items.map(x=>`<li><div class="hub-update-title">${official(x.url,x.title)}</div><span class="hub-small">${E(x.ai?'AI extraction · unreviewed':x.changeType==='source_revision'?'Source page revised':'Source first indexed')} · detected ${E(date(x.detectedAt))}</span></li>`).join('')}</ul><p class="hub-small">Source observations; implementation and outcomes are assessed in the Policy Tracker.</p>`:`<p class="hub-small">${f.lastRunStatus==='loading'?'Loading the latest source observations…':'No new source observations are available. Open the Policy Tracker for the reviewed policy timeline.'}</p>`}`;
 }
 function homeHTML(){return `<div class="wrap hub-home hub-landing"><section class="hub-welcome" aria-labelledby="hub-home-title"><p class="hub-eyebrow">CANADA · UNITED STATES · CHINA</p><h2 id="hub-home-title">Explore Canada’s policy choices.</h2><p>When trade rules change, Canada’s choices change with them. Follow the evidence from national trends to provincial exposure, then compare the U.S. and China.</p><div class="hub-actions"><a href="#executive-summary" data-hub="executive-summary" class="hub-primary">Read the executive summary →</a></div></section><section aria-labelledby="hub-sections-title"><div class="hub-section-heading"><h3 id="hub-sections-title">Where would you like to start?</h3></div><div class="hub-tool-grid">${tools.map(([id,number,title,desc])=>`<a href="#${id}" data-hub="${id}" class="hub-tool"><div class="hub-tool-top"><span class="hub-tool-number" aria-hidden="true">${number}</span><span aria-hidden="true">→</span></div><h4>${E(title)}</h4><p>${E(desc)}</p></a>`).join('')}</div></section><section id="hub-latest" class="hub-update-preview" aria-labelledby="hub-updates-title">${homeLatestHTML()}</section><div class="hub-monitor-strip" id="hub-live-status" aria-label="Daily monitoring status">${homeStatusHTML()}</div></div>`;}

 function topicsHTML(standalone=true){return `${standalone?'<div class="wrap hub-home">':''}<section aria-labelledby="hub-topics-title"><div class="hub-section-heading"><div><p class="hub-eyebrow">COMPARE TOPICS</p><h3 id="hub-topics-title">Eight ways to examine the relationship.</h3></div></div><div class="hub-topics-grid">${C.topics.map((t,i)=>{const target='compare-topics?'+new URLSearchParams({topic:t.id});return `<a href="#${target}" data-hub="${target}" class="hub-topic"><span class="hub-topic-number">${String(i+1).padStart(2,'0')}</span><div><h4>${E(t.name)}</h4><p>${t.issues.map(x=>E(x.title)).join(' · ')}</p></div><span aria-hidden="true">→</span></a>`;}).join('')}</div></section>${standalone?'</div>':''}`;}
 function earlierSummaryPage(){root.innerHTML=`<div class="wrap hub-home"><div class="hub-page-heading"><p class="hub-eyebrow">BRIEFING OVERVIEW</p><h2>Executive summary</h2><p>The dated assessment and the live daily brief are shown separately so that newly indexed sources do not silently rewrite reviewed analysis.</p></div><section id="hub-latest" class="hub-latest" aria-label="Daily briefing developments">${latestHTML(feed(),5)}</section><div class="hub-core-note">Curated assessment · ${E(D.scope)}</div>${window.LegacyPolicy.summary()}</div>`;}
 function historicalEvidencePage(){const inventory=window.EXPLORER_INVENTORY;root.innerHTML=`<div class="wrap hub-home"><section class="panel"><p class="hub-eyebrow">EVIDENCE &amp; METHODS</p><h2>Sources you can inspect.</h2><p>The explorer uses ${inventory.records.length} stored source records. Their original summaries and status labels are retained. Daily observations are separate; a changed page does not prove a legal amendment, and an AI extraction remains an unreviewed interpretation.</p><div id="hub-source-health">${healthHTML()}</div><details open><summary>How the daily update works</summary><ol><li>Check registered official sources and discover a bounded set of publications.</li><li>Compare normalized document hashes and keep the detection date.</li><li>When the owner’s LLM is configured, extract findings with matching source quotations.</li><li>Publish the new update feed and display its source links, uncertainties and errors.</li></ol><p>Checks are scheduled daily and can be delayed by GitHub. Pages may be blocked, moved or outside the configured registry. Current applicability and commercial outcomes need their own evidence.</p></details><h3>Curated source inventory</h3><p class="hub-small">Historical research scope: ${E(inventory.scope)}. Expand any record to read its finding and open its source.</p><div class="hub-source-list">${inventory.records.map(r=>`<details><summary><span class="hub-source-id">${E(r.id.toUpperCase())}</span> ${E(r.title)}</summary><div><p class="hub-small">${E(r.year)} · ${E(r.relationship)} · ${E(r.field)}</p><p>${E(r.summary)}</p><p>${official(r.url,'Open '+r.source+' source')}</p><p class="hub-small">Original inventory label: ${E(r.status)}. Not a new verification.</p></div></details>`).join('')}</div></section></div>`;}
 function healthHTML(){const f=feed();return `<details class="hub-health"><summary>Latest source coverage · ${(f.sourceFailures||[]).length} errors</summary><p>Last successful check: ${E(date(f.lastSuccessfulRun))}. Latest result: ${E(f.lastRunStatus||'unknown')}.</p>${(f.sourceFailures||[]).map(x=>`<p>${official(x.url,x.url)}<br><span class="hub-small">${E(x.error)}</span></p>`).join('')||'<p>No errors have been recorded in the current status feed.</p>'}</details>`;}
 function searchPage(){window.showResearchSearch();const container=document.querySelector('#search-form')?.closest('.panel');if(container)container.insertAdjacentHTML('beforeend','<section id="hub-live-search"><h3>Search daily updates</h3><form id="daily-search-form" class="search"><label class="sr-only" for="daily-query">Search daily source updates</label><input id="daily-query" placeholder="Search latest policies, sources and amendments"><button class="btn" type="submit">Search updates</button></form><p id="daily-search-status" role="status" aria-live="polite"></p><div id="daily-search-results"></div></section>');document.getElementById('daily-search-form')?.addEventListener('submit',e=>{e.preventDefault();const raw=document.getElementById('daily-query').value;const q=(window.DashboardI18n?.searchQuery(raw)||raw).trim().toLowerCase();const rows=q?(feed().changes||[]).filter(x=>q.split(/\s+/).every(term=>[x.title,x.ai?.summary,x.source,...(x.topics||[])].join(' ').toLowerCase().includes(term))):[];document.getElementById('daily-search-status').textContent=rows.length+' matching daily source records.';document.getElementById('daily-search-results').innerHTML=rows.map(x=>`<article class="card"><h4>${official(x.url,x.title)}</h4><p>${E(x.ai?.summary||'Source observation; no automated policy finding.')}</p>${window.PolicyNarrative?.compact({...x,unreviewed:true})||''}<p class="note">Detected ${E(date(x.detectedAt))}</p></article>`).join('');});}
 function routeId(){const id=location.hash.slice(1).split('?')[0];return id||'home';}
 function updateTitle(){
  const title=tabs.find(t=>t[0]===routeId())?.[1]||'Policy Research';
  document.title=(window.DashboardI18n?.t(title)||title)+' | Canada–U.S.–China';
 }
 function updateNavigation(){
  const active=routeId();
  const legacyParents={'executive-summary':'home','briefing-overview':'home','canada-implications':'home','research-tools':'home','policy-map':'compare-topics'};
  const parent=legacyParents[active]||Object.keys(menus).find(key=>menus[key].items.some(([id])=>id===active))||active;
  const navLink=(id,label,current)=>{const target=id==='us-trade'?'us-trade?partner=China&view=overview&topic=all':id;return `<a href="#${E(target)}" data-hub="${E(target)}"${current?' aria-current="'+current+'"':''}>${E(label)}</a>`;};
  navigation.innerHTML=`<nav class="hub-main-nav" aria-label="Main dashboard navigation">${primaryTabs.map(([id,label])=>{
   const menu=menus[id];
   const top=navLink(id,label,id===active?'page':legacyParents[active]===id?'location':'');
   return menu?`<div class="hub-nav-group" ${parent===id?'data-section-active':''}>${top}<details class="hub-nav-menu"><summary aria-label="${E(menu.label)}"><span aria-hidden="true">▾</span></summary><ul>${menu.items.map(([key,title])=>`<li>${navLink(key,title,key===active?'page':'')}</li>`).join('')}</ul></details></div>`:top;
  }).join('')}</nav>`;
  updateTitle();
 }
 function closeMenus(except=null){
  for(const menu of navigation.querySelectorAll('details.hub-nav-menu[open]'))if(menu!==except)menu.open=false;
 }
 navigation.addEventListener('click',e=>{const summary=e.target.closest('.hub-nav-menu > summary');if(summary)closeMenus(summary.parentElement);});
 document.addEventListener('click',e=>{if(!e.target.closest('.hub-nav-menu'))closeMenus();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){const menu=navigation.querySelector('details.hub-nav-menu[open]');if(menu){closeMenus();menu.querySelector('summary').focus();}}});
 function researchToolsPage(){root.innerHTML=`<div class="wrap hub-home"><div class="hub-page-heading"><p class="hub-eyebrow">RESEARCH TOOLS</p><h2>Choose a research tool.</h2><p>Start with a question, follow the relationship and open its evidence. Each tool supports a different step in preparing a Canadian policy brief.</p></div><div class="hub-research-grid">${researchTools.map(([id,title,description])=>`<a class="hub-research-card" href="#${id}" data-hub="${id}"><h3>${E(title)} <span aria-hidden="true">→</span></h3><p>${E(description)}</p></a>`).join('')}</div></div>`;}
 function executiveSummaryHTML(){
  const questions=[
   ['What is this dashboard?','Canada–U.S.–China Policy Intelligence is a research dashboard for comparing economic and security relationships across eight topics, with evidence from 2018–2026.'],
   ['Why does it matter to Canada?','Changes in U.S. and Chinese demand, market access and security policy can shape Canadian opportunities and constraints. The dashboard helps users examine those connections nationally and across provinces and territories.'],
   ['What is it used for?','Use it to prepare policy briefs, compare sectors and relationships, track implemented measures and examine trends. It separates announcements, observed results and unresolved questions so comparisons stay grounded in evidence.'],
   ['Who can use it?','Policy advisors, governments, chambers of commerce, businesses, industry associations, researchers and students can use the same source-linked workspace to investigate Canadian policy questions.'],
   ['Why should users choose it?','It brings dispersed sources into one comparative view. Consistent questions, dated records and clear limits help users judge what changed, why Canada should care and which regional effects are measured or still uncertain.'],
   ['What will users find?','Users can find eight topic views, a Canada map with regional evidence, U.S. trade comparisons, policy timelines and original sources. Daily source checks, weekly briefings and optional LLM explanations of reviewed Canadian evidence support follow-up.']
  ];
  return `<div class="wrap hub-home hub-product-summary"><header class="hub-page-heading"><p class="hub-eyebrow">ABOUT THE DASHBOARD</p><h2>Executive summary</h2><p>One workspace to understand how Canada’s relationships with the United States and China shape its policy choices.</p></header><div class="hub-product-grid">${questions.map(([title,answer])=>`<section class="hub-product-question"><h3>${E(title)}</h3><p>${E(answer)}</p></section>`).join('')}</div><p class="hub-small hub-product-note">Daily monitoring detects source changes; each dataset keeps its own reference period and review status.</p><div class="hub-actions hub-product-actions"><a href="#compare-topics" data-hub="compare-topics" class="hub-primary">Compare the eight topics →</a><a href="#evidence-methods" data-hub="evidence-methods" class="hub-secondary">Inspect the evidence and methods →</a><a href="#research-tools" data-hub="research-tools" class="hub-secondary">Research Tools</a></div></div>`;
 }
 function summaryPage(){root.innerHTML=executiveSummaryHTML();}
 function insightsPage(){
  const language=window.DashboardI18n?.language||'en',src='insights.html?lang='+encodeURIComponent(language);
  const absolute=new URL(src,location.href).href;
  const markup='<iframe src="'+absolute+'" title="Canada–U.S.–China Findings and Trends" width="100%" height="1100" style="border:0" loading="lazy"></iframe>';
  root.innerHTML='<div class="wrap hub-home"><div class="hub-page-heading"><h2>'+E(L.insights)+'</h2><p>'+E(L.insightsIntro)+'</p></div><p><a id="insight-frame-open" href="'+E(src)+'" target="_blank" rel="noopener noreferrer">'+E(L.insightsOpen)+' ↗</a></p><iframe id="policy-insights-frame" class="policy-insights-frame" src="'+E(src)+'" title="'+E(L.insights)+'" width="100%" height="1100" loading="lazy"></iframe><details class="hub-health"><summary>'+E(L.insightsEmbed)+'</summary><p><label for="policy-embed-code">'+E(L.insightsEmbed)+'</label></p><textarea id="policy-embed-code" class="policy-embed-code" rows="4" readonly>'+E(markup)+'</textarea><button type="button" id="policy-embed-copy" class="impact-reset">'+E(L.insightsCopy)+'</button><p id="policy-embed-status" role="status" aria-live="polite"></p></details></div>';
  document.getElementById('policy-insights-frame')?.addEventListener('load',syncInsightsLanguage);
  document.getElementById('policy-embed-copy')?.addEventListener('click',async()=>{
   try{await navigator.clipboard.writeText(document.getElementById('policy-embed-code').value);document.getElementById('policy-embed-status').textContent=window.DashboardI18n?.t('Copied')||'Copied';}
   catch{document.getElementById('policy-embed-code').select();}
  });
 }
 window.addEventListener('message',ev=>{
  const frame=document.getElementById('policy-insights-frame');
  if(!frame||ev.source!==frame.contentWindow||ev.origin!==location.origin||ev.data?.type!=='policy-insights-size'||!Number.isFinite(ev.data.height))return;
  frame.height=String(Math.max(700,Math.min(2400,Math.ceil(ev.data.height)+8)));
 });
 function syncInsightsLanguage(){
  const frame=document.getElementById('policy-insights-frame'),language=window.DashboardI18n?.language||'en';
  frame?.contentWindow?.postMessage({type:'policy-insights-language',language},location.origin);
  const link=document.getElementById('insight-frame-open');if(link)link.href='insights.html?lang='+encodeURIComponent(language);
  const code=document.getElementById('policy-embed-code');
  if(code&&link)code.value='<iframe src="'+new URL(link.href,location.href).href+'" title="Canada–U.S.–China Findings and Trends" width="100%" height="1100" style="border:0" loading="lazy"></iframe>';
 }
 function evidencePage(){window.CanadaImpact.show('evidence');}

 function route(focus=false){let id=routeId();
  if(id==='home')root.innerHTML=homeHTML();
  else if(homeMenu.some(([key])=>key===id))root.innerHTML=guide.page(id,C);
  else if(id==='findings-trends')insightsPage();
  else if(id==='executive-summary')summaryPage();
  else if(id==='briefing-overview'||id==='canada-implications')window.CanadaImpact.show('overview');
  else if(id==='compare-topics')window.CanadaImpact.show('compare');
  else if(id==='policy-tracker')window.CanadaImpact.show('policy');
  else if(id==='us-trade')window.USTrade.show();
  else if(id==='weekly-updates')window.WeeklyUpdates.show();
  else if(id==='research-tools')researchToolsPage();
  else if(id==='policy-map')window.showMap();
  else if(id==='relationship-explorer')window.showExplorer();
  else if(id==='daily-updates')window.PolicyLive.show('updates');
  else if(id==='your-llm')window.PolicyLive.show('llm');
  else if(id==='research-search')searchPage();
  else if(id==='evidence-methods')evidencePage();
  else {id='home';history.replaceState(null,'','#home');root.innerHTML=homeHTML();}
  updateNavigation();if(focus){root.focus({preventScroll:true});root.scrollIntoView({block:'start',behavior:'instant'});}
 }
 function navigate(target='home'){const [id,incoming='']=target.split('?');if(['home','briefing-overview','canada-implications','compare-topics','policy-tracker','evidence-methods'].includes(id)){const params=new URLSearchParams(window.CanadaImpact?.data?window.CanadaImpact.filterQuery():location.hash.split('?')[1]||'');for(const [key,value]of new URLSearchParams(incoming))params.set(key,value);target=id+(params.toString()?'?'+params:'');}history.pushState(null,'','#'+target);route(true);}
 document.addEventListener('click',e=>{const a=e.target.closest('a[data-hub]');if(!a||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;e.preventDefault();navigate(a.dataset.hub);});
 function refreshLiveSections(){const latest=document.getElementById('hub-latest'),status=document.getElementById('hub-live-status'),health=document.getElementById('hub-source-health');if(latest)latest.innerHTML=routeId()==='home'?homeLatestHTML():latestHTML(feed(),routeId()==='executive-summary'?5:3);if(status)status.innerHTML=routeId()==='home'?homeStatusHTML():statusHTML();if(health){const open=health.querySelector('details')?.open;health.innerHTML=healthHTML();if(open)health.querySelector('details').open=true;}}
 window.addEventListener('dashboard-language-changed',()=>{updateTitle();syncInsightsLanguage();});
 window.addEventListener('hashchange',()=>route());window.addEventListener('policy-updates-loaded',refreshLiveSections);
 window.HomeHub={navigate,route,updateNavigation,primaryTabs,homeMenu,compareMenu,homeHTML,executiveSummaryHTML,homeStatusHTML,homeLatestHTML,statusHTML,latestHTML,topicsHTML,refreshLiveSections,tabs,tools,researchTools};
 route();
})();

