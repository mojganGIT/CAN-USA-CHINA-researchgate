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

test('30 added primary-source records retain all three readings, real dates and source-status distinctions',()=>{
 const added=research.records.filter(r=>/^(cc-|uc-|ca-us-)/.test(r.id));assert.equal(added.length,30);
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
 vm.createContext(ctx);
 for(const p of ['research-register.js','dashboard-guide.js','explorer-inventory.js','explorer-catalog.js','regional-trade-model.js','us-trade-model.js','impact-model.js','policy-narrative.js','insights-model.js','bilateral-copy.js','bilateral-model.js','bilateral-hub.js'])vm.runInContext(read(p),ctx,{filename:p});
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
 language.value='en';go('canada-china','overview');setOutage();events['policy-updates-loaded']();await window.BilateralHub.ready;
 assert(node('root').innerHTML.includes('Some published datasets could not be refreshed'));
 assert(node('root').innerHTML.includes('bilateral-stat'),'previous valid values retained');
});
