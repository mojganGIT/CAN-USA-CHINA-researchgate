import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import D from '../app/stronger-canada-data.js';
import M from '../app/stronger-canada-model.js';
import R from '../app/research-register.js';
import Impact from '../app/impact-model.js';
import Regional from '../app/regional-trade-model.js';
import I18n from '../app/i18n.js';

test('all eight directions resolve to the shared register and preserve evidence identity',()=>{
 assert.equal(Object.keys(D.topics).length,8);assert.equal(D.capabilities.length,8);
 const seen=new Set();for(const r of R.records){assert(!seen.has(r.id));seen.add(r.id);}
 for(const [topic,d]of Object.entries(D.topics)){
  const basis=M.basis(D,R,topic);assert.equal(basis.length,d.basis.length,topic);
  for(const r of basis){assert(R.records.includes(r));assert(r.sources.length);}
  for(const field of ['title','response','gate','tradeoff','escalate','reconsider','lead'])for(const lang of ['fr','zh-Hans'])assert.notEqual(I18n.t(d[field],lang),d[field],topic+' '+field+' '+lang);
 }
 for(const r of D.records)assert(R.records.includes(r));
});

test('invalid route values are normalized and all thirteen jurisdictions round-trip',()=>{
 const invalid=M.normalize(D,{topic:'<script>',region:'US',view:'unsafe'});assert.deepEqual(invalid,{topic:'finance',region:'CA',view:'directions'});
 assert.equal(M.regions.length,14);
 for(const region of M.regions)for(const view of M.views){const state=M.normalize(D,{topic:'energy',region,view});assert.deepEqual(M.normalize(D,Object.fromEntries(new URLSearchParams(M.query(state).split('?')[1]))),state);}
});

test('source revisions request reassessment without changing an analyst response or treating indexing as policy',()=>{
 const source=R.records.find(r=>r.id==='cc-finance-mou-november-2026').sources[0].url;
 const before=JSON.stringify(D.topics.finance),now='2026-11-23T12:00:00Z';
 const changes=[{url:source,detectedAt:'2026-11-23T08:00:00Z',changeType:'source_revision'}];
 const revised=M.review(D,R,'finance',{changes,lastAttempt:now,lastRunStatus:'partial'},now);
 assert.equal(revised.required,true);assert.equal(revised.revisions.length,1);assert.equal(revised.fresh,true);
 assert.equal(JSON.stringify(D.topics.finance),before);
 assert.equal(M.review(D,R,'finance',{changes:[{...changes[0],changeType:'new_source'}]},now).required,false);
 assert.equal(M.review(D,R,'finance',{changes:[{...changes[0],changeType:'parser_refresh'}]},now).required,false);
 assert.equal(M.review(D,R,'finance',{changes:[{...changes[0],detectedAt:'2026-11-24T08:00:00Z'}]},now).required,false);
 const same=M.review(D,R,'finance',{changes:[{...changes[0],detectedAt:'2026-11-22T08:00:00Z'}]},now);assert.equal(same.revisions[0].sameDay,true);
});

test('new source reports and arrived effective dates are review gates, not automatic commercial gains',()=>{
 const report={id:'new-mou',title:'New MOU',topics:['finance'],reviewState:'source_reported',publicationDate:'2026-11-23',detectedAt:'2026-11-23T08:00:00Z',sources:[{url:'https://www.canada.ca/new-finance.html'}]};
 const r=M.review(D,R,'finance',{briefings:[report]},'2026-11-23T12:00:00Z');assert.equal(r.newReports.length,1);assert(r.required);
 assert.equal(M.review(D,R,'finance',{briefings:[{...report,publicationDate:'2025-11-23'}]},'2026-11-23T12:00:00Z').required,false);
 const future=M.review(D,R,'agreements',{},'2026-11-22T12:00:00Z');assert.equal(future.milestones.length,0);
 const due=M.review(D,R,'agreements',{},'2026-12-01T12:00:00Z');assert(due.milestones.some(m=>m.record.id==='sc-indonesia-scheduled-entry-2026'));assert(due.required);
 assert.equal(R.records.find(r=>r.id==='sc-indonesia-scheduled-entry-2026').originalStatus,'Signed agreement; future effective date');
});

test('national and other-province records cannot become a selected province employment result',()=>{
 const make=(id,level,geo,regions,observationRegions)=>({id,topics:['vehicles'],metric:'employment',geographyLevel:level,geography:geo,regions,observationRegions,measurementType:'observed'});
 const data={records:[make('national','national','Canada',['ON'],[]),make('ontario','project','Ontario',['ON'],['ON']),make('quebec','province','Quebec',['QC'],['QC'])]};
 const groups=M.evidenceGroups(data,'vehicles','ON',Impact),jobs=groups.find(g=>g.metric==='employment');
 assert.deepEqual(jobs.local.map(r=>r.id),['ontario']);assert.deepEqual(jobs.context.map(r=>r.id),['national']);assert(!jobs.rows.some(r=>r.id==='quebec'));
});

test('regional goods are unavailable for service topics and suppressed data remain unavailable',()=>{
 assert.equal(M.regionalSnapshot({},{regions:{}},{topic:'finance',region:'ON'},Regional),null);
 const r={mappingVersion:2,series:[{region:'Ontario',topic:'vehicles',partner:'China',points:[{period:'2026-01-01',value:100,scalarFactorCode:0,securityLevelCode:1,statusCode:0}]}]};
 const s=M.regionalSnapshot(r,{regions:{ON:{name:'Ontario'}}},{topic:'vehicles',region:'ON'},Regional);assert.equal(s.partners.find(p=>p.partner==='China').current,null);assert.equal(s.contextOnly,false);
});

test('source failure and stale monitoring are visible independently of substantive review status',()=>{
 const url=R.records.find(r=>r.id==='cc-finance-mou-november-2026').sources[0].url;
 const r=M.review(D,R,'finance',{lastAttempt:'2026-11-20T12:00:00Z',lastRunStatus:'failed',sourceFailures:[{url,error:'timeout'}]},'2026-11-23T12:00:00Z');assert.equal(r.fresh,false);assert.equal(r.failures.length,1);assert.equal(r.required,false);assert.equal(r.status,'failed');
 assert.equal(M.canonical('https://secret@www.canada.ca/test'),'');assert.equal(M.canonical('javascript:alert(1)'),'');
});

test('production loads shared data before the register and mounts the tab after its dependencies',()=>{
 const html=fs.readFileSync(new URL('../app/index.html',import.meta.url),'utf8');
 for(const file of ['stronger-canada-data.js','stronger-canada-copy.js','stronger-canada-model.js','stronger-canada.js','stronger-canada.css'])assert(html.includes(file));
 assert(html.indexOf('stronger-canada-data.js')<html.indexOf('research-register.js'));assert(html.indexOf('stronger-canada.js')<html.indexOf('home.js'));
 const home=fs.readFileSync(new URL('../app/home.js',import.meta.url),'utf8');assert(home.includes("['stronger-canada','Stronger Canada']"));
});

test('shared evidence loads once before a map host is mounted and reports recoverable failures',async()=>{
 let requests=0,fail=false;const events=[];
 const window={ImpactModel:Impact,addEventListener(){},dispatchEvent(event){events.push(event.type);}};
 const context=vm.createContext({window,document:{addEventListener(){}},location:{hash:'#stronger-canada?topic=finance'},URLSearchParams,Event,fetch:async url=>{
  requests++;return {ok:!fail,json:async()=>url==='evidence-records.json'?{schemaVersion:1,records:[],regions:{},assessments:[],relationships:[],metrics:[]}:{shapes:Array.from({length:13},()=>({}))}};
 }});
 vm.runInContext(fs.readFileSync(new URL('../app/impact-explorer.js',import.meta.url),'utf8'),context);
 const initial=window.CanadaImpact.ensureData();assert.equal(await initial,true);assert.equal(requests,2);assert.deepEqual(events,['impact-evidence-loaded']);
 assert.equal(window.CanadaImpact.ensureData(),initial);assert(window.CanadaImpact.data);
 fail=true;assert.equal(await window.CanadaImpact.ensureData(true),false);assert.equal(requests,4);assert(window.CanadaImpact.data,'last reviewed evidence survives a failed refresh');
});
