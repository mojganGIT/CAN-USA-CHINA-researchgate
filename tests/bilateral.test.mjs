import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import B from '../app/bilateral-model.js';
import M from '../app/insights-model.js';
import I18n from '../app/i18n.js';
import research from '../app/research-register.js';
const read=p=>fs.readFileSync(new URL('../app/'+p,import.meta.url),'utf8');
const json=p=>JSON.parse(read(p+'.json'));
const reference={window:{}};vm.createContext(reference);
for(const p of ['explorer-inventory.js','explorer-catalog.js'])vm.runInContext(read(p),reference);
const inventory=reference.window.EXPLORER_INVENTORY,catalog=reference.window.EXPLORER_CATALOG;
const data={canadian:json('evidence-records'),american:json('us-trade-evidence'),daily:json('policy-updates')};
const rows=B.records(data,research,inventory,catalog,M);

test('bilateral collections isolate relationships and keep broad Canadian context separate',()=>{
 for(const pair of Object.values(B.pairs)){
  const state=B.normalize(pair.id),matched=B.filter(rows,state);
  assert(matched.length>20);
  assert(matched.every(r=>r.relationships.includes(pair.relationship)));
  const context=B.filter(rows,state,{context:true});
  assert(context.every(r=>!r.relationships.length));
  assert(!context.some(r=>matched.includes(r)));
  const policy=B.filter(rows,state,{policy:true});
  assert(policy.some(r=>r.date.startsWith('2018')));
  assert(policy.some(r=>r.date.startsWith('2026')));
  assert(policy.every(r=>['policy','memo','amendment','historical'].includes(r.kind)));
  assert(!policy.some(r=>r.kind==='update'),'source observations never become enacted policy');
 }
 const state=B.normalize('canada-china',{topic:'vehicles',year:'2024',view:'policy'});
 const result=B.filter(rows,state,{policy:true});
 assert(result.some(r=>r.id==='note-cc-2024-ev-steel-surtaxes'));
 assert(result.every(r=>r.topics.includes('vehicles')&&B.yearOf(r,'policy')==='2024'));
 const future={id:'future',topics:[],date:'2027-01-01',relationships:['Canada-China']};
 assert.equal(B.filter([future],B.normalize('canada-china')).length,0);
 assert.equal(new URLSearchParams(B.target('canada-china','map',{view:'policy'}).split('?')[1]).get('view'),'map');
 assert.equal(B.normalize('us-china',{view:'map'}).view,'overview');
});

test('original 30 primary-source records retain all three readings, real dates and source-status distinctions',()=>{
 const added=research.records.filter(r=>/^(cc-|uc-|ca-us-)/.test(r.id)&&r.reviewedAt==='2026-11-10');assert.equal(added.length,30);
 for(const r of added){
  assert.equal(r.reviewedAt,'2026-11-10');assert(r.dateType);
  for(const lang of ['fr','zh-Hans'])for(const k of ['title','changed','canada','limit'])assert.notEqual(I18n.t(r[k],lang),r[k]);
 }
 assert.equal(added.find(r=>r.id==='uc-connected-vehicles-2025').effectiveDate,'2025-03-17');
 assert.equal(added.find(r=>r.id==='uc-coins-proposal-2026').originalStatus,'proposed');
 assert(added.find(r=>r.id==='cc-2024-ev-steel-surtaxes').limit.includes('2026'));
});

async function setup(){
 const nodes=new Map(),handlers={},events={};
 const node=id=>{if(!nodes.has(id))nodes.set(id,{innerHTML:'',isConnected:true,value:'',querySelectorAll:()=>[],focus(){},scrollIntoView(){},addEventListener(){}});return nodes.get(id);};
 const document={getElementById:node,addEventListener(k,f){handlers[k]=f;}};
 const location={hash:'#canada-china',origin:'https://dashboard.test'};
 const language={value:'en'};let outage=false;
 const mounts=[];
 const window={addEventListener(k,f){events[k]=f;},DashboardI18n:{get language(){return language.value;},get locale(){return language.value==='fr'?'fr-CA':language.value==='zh-Hans'?'zh-CN':'en-CA';},t(s){return I18n.t(s,language.value);},searchQuery:I18n.searchQuery},CanadaImpact:{mount(view,id){mounts.push(['canada',view,id]);}},USStates:{mount(id,config){mounts.push(['states',id,config]);}},showExplorer(){mounts.push(['relationship']);}};
 const ctx={window,document,location,history:{replaceState(a,b,url){location.hash=url;}},URL,URLSearchParams,Intl,Number,Date,AbortSignal,fetch:async file=>{if(outage)throw Error('offline');return {ok:true,json:async()=>JSON.parse(read(file))};}};
 window.document=document;vm.createContext(ctx);
 for(const p of ['research-register.js','dashboard-guide.js','explorer-inventory.js','explorer-catalog.js','regional-trade-model.js','us-trade-model.js','impact-model.js','policy-narrative.js','insights-model.js','source-media-data.js','source-media.js','bilateral-copy.js','bilateral-model.js','canada-china-visuals.js','us-canada-visuals.js','bilateral-hub.js'])vm.runInContext(read(p),ctx,{filename:p});
 window.BilateralHub.show('canada-china');await window.BilateralHub.ready;
 const go=(pair,view='overview',params={})=>{location.hash='#'+B.target(pair,view,params);window.BilateralHub.show(pair);return node('root').innerHTML;};
 return {node,window,go,mounts,language,events,handlers,setOutage(){outage=true;}};
}

test('every relationship renders eight topics, scoped policy and evidence, maps, trends and translations',async()=>{
 const {node,window,go,mounts,language,events,handlers,setOutage}=await setup();
 for(const pair of Object.values(B.pairs)){
  const overview=go(pair.id);
  assert(overview.includes(pair.title));assert.equal((overview.match(/class="bilateral-topic"/g)||[]).length,8);
  for(const view of ['compare','policy','evidence','products']){
   const html=go(pair.id,view);
   const ids=[...html.matchAll(/data-bilateral-record="([^"]+)"/g)].map(m=>m[1]);assert(ids.length>0);
   const broadContext=html.indexOf('All-market Canadian context — not a bilateral allocation');
   const directHTML=broadContext<0?html:html.slice(0,broadContext);
   for(const match of directHTML.matchAll(/data-bilateral-record="([^"]+)"/g))assert(rows.find(r=>r.id===match[1]).relationships.includes(pair.relationship),pair.id+' '+match[1]);
   assert(html.includes('What changed?'));assert(html.includes('Why does it matter to Canada?'));assert(html.includes('How could Canada and its provinces be affected?'));
   assert(!html.includes('href="javascript:'));
  }
  const trends=go(pair.id,'trends');assert(trends.includes('relationship='+encodeURIComponent(pair.relationship)));
  for(const [view]of B.mapViews(pair.id))go(pair.id,view);
  const stateMount=mounts.findLast(r=>r[0]==='states');
  if(pair.id!=='canada-china')assert.equal(stateMount[2].lockedPartner,pair.partner);
  go(pair.id,'relationship');assert.equal(window.BilateralHub.active.relationship,pair.relationship);
 }
 const selected=go('canada-china','policy',{topic:'vehicles',year:'2024'});
 assert(selected.includes('note-cc-2024-ev-steel-surtaxes'));
 assert(!selected.includes('note-uc-section301-ev-2024'));
 for(const lang of ['fr','zh-Hans']){language.value=lang;events['dashboard-language-changed']();const html=node('root').innerHTML;assert(html.includes(I18n.t('Canada–China Policy and Trade',lang)));assert(html.includes(I18n.t('Why does it matter to Canada?',lang)));}
 language.value='en';go('canada-china','overview');
 const printed=[{open:false},{open:true}],root=node('root'),query=root.querySelectorAll;root.querySelectorAll=()=>printed;
 events.beforeprint();assert(printed.every(x=>x.open));events.afterprint();assert.equal(printed[0].open,false);assert.equal(printed[1].open,true);root.querySelectorAll=query;
 setOutage();events['policy-updates-loaded']();await window.BilateralHub.ready;
 assert(node('root').innerHTML.includes('Some published datasets could not be refreshed'));
 assert(node('root').innerHTML.includes('bilateral-stat'),'previous valid values retained');
});

test('U.S.–China shows original source media, Canadian memos and expandable provenance scoped to topic and reference year',async()=>{
 const {go,language,events,node}=await setup();
 const overview=go('us-china');
 for(const title of ['U.S.–China tariffs: the publisher’s interactive chart','U.S. agricultural export markets, 2025','Where U.S. LNG cargoes went in 2024 and 2025','Official video: November 2026 trilateral meeting'])assert(overview.includes(title),title);
 assert(overview.includes('https://datawrapper.dwcdn.net/fMrtV/13/'));assert(overview.includes('https://www.youtube-nocookie.com/embed/A9Z4qlR9Y_s'));assert(overview.includes('Why it matters to Canada'));assert(overview.includes('Analyst interpretation'));
 assert(overview.indexOf('Eight topic comparisons')<overview.indexOf('U.S.–China source visuals'));assert(overview.indexOf('U.S.–China source visuals')<overview.indexOf('Latest reviewed milestones'));
 assert(!overview.includes('LNG Canada operating site footage'));assert(!overview.includes('autoplay='));assert(!overview.includes(' autoplay'));
 const agriculture=go('us-china','overview',{topic:'agriculture',year:'2025'});assert(agriculture.includes('usda-export-markets-2025'));assert(agriculture.includes('us-china-tariff-chart'));assert(!agriculture.includes('eia-lng-destinations-2025'));assert(!agriculture.includes('white-house-trilateral-video-2026'));
 const energy=go('us-china','overview',{topic:'energy',year:'2024'});assert(energy.includes('eia-lng-destinations-2025'));assert(!energy.includes('usda-export-markets-2025'));assert(!energy.includes('white-house-trilateral-video-2026'));
 const policy=go('us-china','policy',{topic:'security',year:'2026'}),record=policy.split('data-bilateral-record="note-uc-trilateral-declaration-november-2026"')[1]?.split('</div></details>')[0];
 assert(record?.includes('white-house-trilateral-video-2026'));assert(record.indexOf('<iframe')<record.indexOf('class="bilateral-source-details"'));assert(record.includes('Source, dates and evidence'));assert(record.includes('2026-11-24'));assert(record.includes('not establish a signed bilateral commercial MOU'));
 assert(!go('canada-china').includes('us-china-tariff-chart'));assert(!go('canada-us').includes('white-house-trilateral-video-2026'));
 go('us-china');for(const lang of ['fr','zh-Hans']){language.value=lang;events['dashboard-language-changed']();assert(node('root').innerHTML.includes(I18n.t('U.S.–China source visuals and Canadian implications',lang)));assert(node('root').innerHTML.includes(I18n.t('Why it matters to Canada',lang)));}
});

test('Canada–China retains a source briefing and filtered inline visuals across every section and all eight sectors',async()=>{
 const {go,language,events,node,window,handlers}=await setup();
 for(const [view] of [...B.views,...B.mapViews('canada-china')]){
  const html=go('canada-china',view);
  assert(html.includes('What Changed and Why It Matters'),view);
  assert(html.includes('Canada–China Source Visuals and Canadian Implications'),view);
  assert(html.includes('canada-china-apec-video-2026'),view);
  assert.equal((html.match(/id="bilateral-topic"/g)||[]).length,1,view);
  assert.equal((html.match(/id="bilateral-year"/g)||[]).length,1,view);
  assert(html.indexOf('id="cc-visuals"')>html.indexOf('id="bilateral-body"'),view+' survives embedded map and tracker mounts');
  assert(!html.includes('us-china-tariff-chart'));assert(!html.includes('autoplay='));
 }
 for(const topic of catalog.topics){
  const html=go('canada-china','compare',{topic:topic.id,year:'2026'});
  assert(html.includes('Why It Matters to Canada'));assert(html.includes('Official APEC media remarks, November 2026'));
  assert(!html.includes('statcan-fdi-2025'),'reference year does not relabel a 2025 stock as 2026');
 }
 const investment=go('canada-china','overview',{topic:'investment',year:'2025'});
 assert(investment.includes('statcan-fdi-2025'));assert(!investment.includes('canada-china-apec-video-2026'));
 const past=go('canada-china','policy',{topic:'vehicles',year:'2024'});
 assert(past.includes('No verified source visual matches'));assert(!past.includes('cc-tariff-product'));
 assert(!past.includes('March implementation reopened'));
 const record=go('canada-china','evidence',{topic:'investment',year:'2025'}).split('data-bilateral-record="ca-fdi-stock-china"')[1]?.split('</div></details>')[0];
 assert(record?.includes('statcan-fdi-2025'));assert(record.indexOf('<iframe')<record.indexOf('class="bilateral-source-details"'));
 go('canada-china','overview',{topic:'agriculture',year:'2026'});
 for(const lang of ['fr','zh-Hans']){language.value=lang;events['dashboard-language-changed']();assert(node('root').innerHTML.includes(I18n.t('What Changed and Why It Matters',lang)));assert.notEqual(I18n.t('Canada–China Interactive Tariff Comparison',lang),'Canada–China Interactive Tariff Comparison');}
 assert(window.BilateralHub.target('relationship',{topic:'energy'}).includes('year=2026'));
 language.value='en';go('canada-china','relationship',{topic:'agriculture',year:'2026'});
 handlers.change({target:{id:'lab-topic',value:'energy'}});
 assert.equal(window.BilateralHub.state.topic,'energy');assert(node('root').innerHTML.includes('Pacific LNG exports began in 2025'));
 assert(!node('root').innerHTML.includes('id="cc-tariff-product"'));assert(node('root').innerHTML.includes('topic=energy&amp;year=2026'));

});

test('Canada–China tariff comparison preserves rate basis, quota limits, effective dates and the future implementation boundary',async()=>{
 const {go,window}=await setup(),chart=window.CanadaChinaVisuals;
 let html=go('canada-china','products',{topic:'agriculture',year:'2026'});
 assert(html.includes('84.8%'));assert(html.includes('14.9%'));assert(html.includes('Combined applied tariff'));
 chart.selectProduct('canola-meal');html=chart.tariff(B.normalize('canada-china',{topic:'agriculture',year:'2026'}));
 assert(html.includes('100%'));assert(html.includes('0%'));assert(html.includes('Additional anti-discrimination tariff'));assert(html.includes('31 December 2028'));
 assert(html.includes('data-bilateral-detail="cc-tariff"'));assert(html.indexOf('role="img"')<html.indexOf('<details'));
 chart.selectProduct('ev');html=chart.tariff(B.normalize('canada-china',{topic:'vehicles',year:'2026'}));
 assert(html.includes('Additional Canadian surtax'));assert(html.includes('6.1% MFN tariff'));assert(html.includes('49,000'));assert(html.includes('not describe out-of-quota treatment'));
 assert(!html.includes('14.9%'));assert(html.includes('prospective rates are not plotted as implemented 2026 treatment'));
 assert.equal(chart.tariff(B.normalize('canada-china',{topic:'finance',year:'2026'})),'');
 assert.equal(chart.tariff(B.normalize('canada-china',{year:'2025'})),'');
 assert.equal(chart.selectProduct('<script>rate</script>'),false);
});

test('U.S.–Canada briefs and original visuals survive all nine section mounts and follow sector and reference year',async()=>{
 const {go,node,window,handlers,language,events}=await setup();
 for(const [view] of [...B.views,...B.mapViews('us-canada')]){
  const html=go('us-canada',view);
  assert(html.includes('id="us-canada-briefing-title"'),view);
  assert(html.includes('U.S.–Canada Source Visuals and Canadian Implications'),view);
  assert(html.includes('white-house-canada-meeting-2025'),view);
  assert.equal((html.match(/id="bilateral-topic"/g)||[]).length,1,view);
  assert.equal((html.match(/id="bilateral-year"/g)||[]).length,1,view);
  assert(html.indexOf('id="us-canada-visuals"')>html.indexOf('id="bilateral-body"'),view);
  assert(!html.includes('canada-china-partnership-video-2026'));assert(!html.includes('us-china-tariff-chart'));
  assert(!html.includes('autoplay='));assert(!html.includes(' autoplay'));
 }
 for(const topic of catalog.topics){
  const html=go('us-canada','compare',{topic:topic.id,year:'2026'});
  assert(html.includes('Why It Matters to Canada'));assert(html.includes('canada-ontario-tariff-response-2026'));
  assert(!html.includes('white-house-canada-meeting-2025'));assert(!html.includes('statcan-fdi-2025'));
 }
 const security=go('us-canada','overview',{topic:'security',year:'2024'});
 for(const id of ['defence-exports-2024','defence-suppliers-2024','defence-regions-2024','defence-employment-2024'])assert(security.includes(id));
 assert(!security.includes('canada-ontario-tariff-response-2026'));assert(!security.includes('white-house-canada-meeting-2025'));
 const finance=go('us-canada','overview',{topic:'finance',year:'2025'});assert(finance.includes('statcan-fdi-2025'));assert(!finance.includes('eia-canada-energy-value-2025'));
 const oldTechnology=go('us-canada','overview',{topic:'technology',year:'2018'});assert(oldTechnology.includes('No verified source visual matches'));assert(!oldTechnology.includes('U.S. product coverage changed during 2026'));
 const record=go('us-canada','evidence',{topic:'investment',year:'2025'}).split('data-bilateral-record="ca-fdi-stock-us"')[1]?.split('</div></details>')[0];
 assert(record?.includes('statcan-fdi-2025'));assert(record.indexOf('<iframe')<record.indexOf('class="bilateral-source-details"'));
 go('us-canada','relationship',{topic:'agriculture',year:'2026'});handlers.change({target:{id:'lab-topic',value:'energy'}});
 assert.equal(window.BilateralHub.state.topic,'energy');assert(node('root').innerHTML.includes('The EIA charts distinguish energy trade value'));
 for(const lang of ['fr','zh-Hans']){language.value=lang;events['dashboard-language-changed']();assert(node('root').innerHTML.includes(I18n.t('U.S.–Canada Source Visuals and Canadian Implications',lang)));assert.notEqual(I18n.t('U.S.–Canada Source Visuals and Canadian Implications',lang),'U.S.–Canada Source Visuals and Canadian Implications');}
});

test('U.S.–Canada chart keeps import directions, duty layers, approved content and historical rates distinct',async()=>{
 const {go,window}=await setup(),chart=window.USCanadaVisuals;
 let html=go('us-canada','products',{topic:'vehicles',year:'2026'});
 assert(html.includes('25%'));assert(html.includes('0%'));assert(html.includes('approved U.S. content'));assert(html.includes('Other duties, import restrictions and eligible remission'));
 chart.selectProduct('ca-steel');html=chart.tariff(B.normalize('us-canada',{topic:'vehicles',year:'2026'}));
 assert(html.includes('U.S. → Canada'));assert(html.includes('7208.10.00'));assert(html.includes('25%'));assert(html.includes('50%'));assert(html.includes('before any applicable remission'));
 const prior=chart.tariff(B.normalize('us-canada',{topic:'vehicles',year:'2025'}));assert(prior.includes('25%'));assert(!prior.includes('50%'));assert(prior.includes('13 March 2025'));
 chart.selectProduct('us-338');html=chart.tariff(B.normalize('us-canada',{topic:'technology',year:'2026'}));
 assert(html.includes('50%'));assert(html.includes('CUSMA status does not exempt'));assert(html.includes('Import bans require a separate check'));
 chart.selectProduct('us-301');html=chart.tariff(B.normalize('us-canada',{topic:'technology',year:'2026'}));assert(html.includes('10%'));assert(html.includes('0%'));assert(html.includes('Section 301 layer only'));
 assert(html.indexOf('role="img"')<html.indexOf('data-bilateral-detail="us-canada-tariff"'));
 assert.equal(chart.tariff(B.normalize('us-canada',{topic:'finance',year:'2026'})),'');
 assert.equal(chart.tariff(B.normalize('us-canada',{year:'2024'})),'');
 assert.equal(chart.selectProduct('<script>rate</script>'),false);
 const index=read('index.html');assert(index.indexOf('us-canada-visuals.js')<index.indexOf('bilateral-hub.js'));
});

