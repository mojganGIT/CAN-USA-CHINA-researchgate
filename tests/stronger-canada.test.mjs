import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import D from '../app/stronger-canada-data.js';
import M from '../app/stronger-canada-model.js';
import R from '../app/research-register.js';
import Impact from '../app/impact-model.js';
import PN from '../app/policy-narrative.js';
import Media from '../app/source-media.js';
import Regional from '../app/regional-trade-model.js';
import I18n from '../app/i18n.js';
const outcomes=JSON.parse(fs.readFileSync(new URL('../app/evidence-records.json',import.meta.url),'utf8'));

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
 const invalid=M.normalize(D,{topic:'<script>',region:'US',view:'unsafe'});assert.deepEqual(invalid,{topic:'finance',region:'CA',view:'overview',dimension:'all',dependency:'all'});
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
 assert(html.indexOf('stronger-canada-framework.js')<html.indexOf('stronger-canada-data.js'));assert(html.indexOf('stronger-canada-data.js')<html.indexOf('research-register.js'));assert(html.indexOf('stronger-canada.js')<html.indexOf('home.js'));
 const home=fs.readFileSync(new URL('../app/home.js',import.meta.url),'utf8');assert(home.includes("['stronger-canada','Stronger Canada']"));
});

test('all thirty-two assessments resolve typed shared records and have translated questions and findings',()=>{
 const F=D.framework;assert.equal(Object.keys(F.sectors).length,8);assert.equal(Object.keys(F.dimensions).length,4);
 for(const [topic,sector]of Object.entries(F.sectors)){
  assert.equal(Object.keys(sector.assessments).length,4);assert.equal(sector.watch.length,4);
  for(const dim of Object.keys(F.dimensions)){
   const a=M.assessment(D,R,outcomes,topic,dim);assert.equal(a.missing.length,0,topic+' '+dim);assert(Object.hasOwn(F.signals,a.signal));
   for(const ref of a.refs)assert(ref.type==='research'?R.records.includes(ref.record):outcomes.records.includes(ref.record));
   for(const lang of ['fr','zh-Hans'])for(const field of ['question','finding'])assert.notEqual(I18n.t(a.definition[field],lang),a.definition[field]);
  }
  for(const w of sector.watch)assert(w.dimensions.every(id=>Object.hasOwn(F.dimensions,id)));
 }
});

test('project signals cannot be allocated to other provinces, future headcount or foreign-affiliate activity',()=>{
 assert.equal(M.assessment(D,R,outcomes,'energy','capacity','SK').signal,'favourable');
 assert.equal(M.assessment(D,R,outcomes,'energy','capacity','BC').signal,'favourable');
 for(const region of ['ON','QC','NU'])assert.equal(M.assessment(D,R,outcomes,'energy','capacity',region).signal,'insufficient');
 const sk=M.assessment(D,R,outcomes,'energy','capacity','SK');assert.deepEqual(sk.local.map(x=>x.id),['sc-mcilvenna-production-2026']);
 const mine=sk.local[0].record;assert.equal(mine.statistics.reportedFullTimeWorkersApprox,380);assert(!Object.values(mine.statistics).includes(450));assert.match(mine.limit,/forecast/);
 assert.equal(M.assessment(D,R,outcomes,'vehicles','capacity','ON').signal,'mixed');
 const finance=M.assessment(D,R,outcomes,'finance','capacity','ON');assert.equal(finance.signal,'insufficient');assert.equal(finance.local.length,0);assert(finance.context.some(x=>x.id==='manulife-china'));
 const broken={...outcomes,records:outcomes.records.filter(r=>r.id!=='lng-operating')};const a=M.assessment(D,R,broken,'energy','capacity');assert.equal(a.signal,'insufficient');assert(a.review.required);
 assert.equal(M.assessment(D,R,null,'energy','capacity').pending,true);
});

test('dimension review flags follow linked sources without overwriting findings or guessing new-source relevance',()=>{
 const now='2026-11-23T12:00:00Z',before=JSON.stringify(D.framework),url=R.records.find(r=>r.id==='sc-mcilvenna-production-2026').sources[0].url;
 const feed={changes:[{url,topics:['energy'],changeType:'source_revision',detectedAt:'2026-11-23T08:00:00Z'}]};
 assert(M.dimensionReview(D,R,outcomes,'energy','capacity',feed,now).required);
 assert(M.dimensionReview(D,R,outcomes,'energy','resilience',feed,now).required);
 assert.equal(M.dimensionReview(D,R,outcomes,'energy','diversification',feed,now).required,false);
 const first={changes:[{...feed.changes[0],changeType:'new_source'}]};assert.equal(M.dimensionReview(D,R,outcomes,'energy','capacity',first,now).required,false);
 const unassigned={changes:[{...feed.changes[0],url:'https://www.canada.ca/new-sector-measure'}]};assert.equal(M.unassignedActivity(D,R,outcomes,'energy',unassigned,now).length,1);
 for(const dim of Object.keys(D.framework.dimensions))assert.equal(M.dimensionReview(D,R,outcomes,'energy',dim,unassigned,now).required,false);
 assert.equal(M.unassignedActivity(D,R,outcomes,'energy',feed,now).length,0);
 assert.equal(JSON.stringify(D.framework),before);
});

test('a previously flagged statistical source stays pending until its evidence is reviewed',()=>{
 const id=outcomes.records.find(r=>r.id==='vehicles-exports-ytd').sourceIds[0];
 const feed={assessmentReview:{dataVersion:outcomes.version,checks:[{sourceId:id,reviewRequired:true,changedAt:'2026-11-07T12:00:00Z'}]}};
 assert(M.dimensionReview(D,R,outcomes,'vehicles','diversification',feed,'2026-11-23T12:00:00Z').required);
 const wrongVersion={assessmentReview:{...feed.assessmentReview,dataVersion:'different-vintage'}};
 assert.equal(M.dimensionReview(D,R,outcomes,'vehicles','diversification',wrongVersion,'2026-11-23T12:00:00Z').required,false);
});

test('matrix links preserve regional scope and shared dependencies without averaging signals',()=>{
 const state=M.normalize(D,{view:'compare',region:'SK',dependency:'all'}),rows=M.matrix(D,R,outcomes,state);assert.equal(rows.length,8);assert.equal(rows.flatMap(r=>r.assessments).length,32);
 const mineral=M.matrix(D,R,outcomes,{...state,dependency:'mineral_inputs'});assert.deepEqual(mineral.map(r=>r.topic),['vehicles','energy','technology','security']);
 for(const row of rows)for(const a of row.assessments){assert.equal(a.region,'SK');const selected={...state,view:'directions',topic:row.topic,dimension:a.dimension};assert.deepEqual(M.normalize(D,Object.fromEntries(new URLSearchParams(M.query(selected).split('?')[1]))),selected);}
 const invalid=M.normalize(D,{view:'compare',dimension:'<script>',dependency:'bad'});assert.equal(invalid.dimension,'all');assert.equal(invalid.dependency,'all');
 const next=M.upcoming(D,R,'agreements','2026-11-22T12:00:00Z');assert(next.some(x=>x.record.id==='sc-indonesia-scheduled-entry-2026'&&x.date==='2026-12-01'));
 assert.equal(M.review(D,R,'agreements',{},'2026-11-22T12:00:00Z').milestones.length,0);
});

test('all sector pages render five sections, four linked assessments and a safe monitoring queue',()=>{
 const host={innerHTML:'',querySelectorAll:()=>[]},location={hash:'#stronger-canada?view=overview'},events={};
 const feed={briefings:[{id:'unclassified',reviewState:'source_reported',topics:['finance'],title:'<script>unsafe</script>',publicationDate:'2026-11-22',detectedAt:'2026-11-22T01:00:00Z',sources:[{url:'https://www.canada.ca/new-financial-measure',publisher:'Official source'}]}]};
 const window={StrongerCanadaData:D,StrongerCanadaModel:M,PolicyResearchRegister:R,ImpactModel:Impact,PolicyNarrative:PN,SourceMedia:Media,CanadaImpact:{data:outcomes,ensureData:async()=>true},PolicyLive:{feed},DashboardI18n:{t:s=>s,locale:'en-CA',translateTree(){}},addEventListener(type,fn){events[type]=fn;}};
 const document={activeElement:null,getElementById:()=>host,addEventListener(){}};
 const context=vm.createContext({window,document,location,Intl,URLSearchParams,Date});
 vm.runInContext(fs.readFileSync(new URL('../app/stronger-canada.js',import.meta.url),'utf8'),context);
 window.StrongerCanada.render();assert.equal((host.innerHTML.match(/class="sc-sector-card"/g)||[]).length,8);assert(host.innerHTML.includes('The official Stronger Canada strategy diagram'));assert(host.innerHTML.includes('<iframe'));assert(host.innerHTML.includes('Source, dates and evidence'));
 for(const topic of Object.keys(D.topics)){
  location.hash='#'+M.query(M.normalize(D,{view:'directions',topic}));window.StrongerCanada.render();
  assert.equal((host.innerHTML.match(/class="sc-page-section"/g)||[]).length,5,topic);assert.equal((host.innerHTML.match(/class="sc-assessment"/g)||[]).length,4,topic);assert(host.innerHTML.includes('Confidence in policy attribution'));
 }
 location.hash='#stronger-canada?view=directions&topic=energy&region=SK&dimension=capacity';window.StrongerCanada.render();
 assert(host.innerHTML.includes('What does the evidence show?'));assert(host.innerHTML.includes('Next analyst action'));
 assert(host.innerHTML.includes(R.records.find(r=>r.id==='sc-mcilvenna-production-2026').changed));
 assert(host.innerHTML.includes('data-sc-detail="backing-energy-capacity"><summary>'));assert(!host.innerHTML.includes('data-sc-detail="backing-energy-capacity" open'));
 location.hash='#stronger-canada?view=directions&topic=energy&region=ON&dimension=capacity';window.StrongerCanada.render();
 assert(host.innerHTML.includes('A local strategic outcome is not established by the linked records.'));
 location.hash='#stronger-canada?view=directions&topic=investment';window.StrongerCanada.render();assert(host.innerHTML.includes('Who ultimately controls investment in Canada?'));assert(host.innerHTML.includes('data-source-media-kind="video"'));assert(host.innerHTML.includes('data-source-media-inline="true"'));
 location.hash='#stronger-canada?view=crosswalk&topic=finance&region=CA&dimension=all&dependency=all';window.StrongerCanada.render();
 assert(host.innerHTML.includes('id="stronger-topic"'));assert(host.innerHTML.includes('<option value="finance" selected>'));assert(host.innerHTML.includes('Payments, settlement, and investment'));assert(host.innerHTML.includes('Summary</strong>'));assert(host.innerHTML.includes('Why it matters to Canada'));
 assert(host.innerHTML.includes('data-source-media-id="stronger-crosswalk-sector-finance-statcan-fdi-2025"'));assert(host.innerHTML.includes('data-source-media-id="stronger-crosswalk-stronger-canada-plan-diagram"'));assert(!host.innerHTML.includes('data-source-media-kind="video"'));assert(host.innerHTML.includes('Source, dates and evidence'));
 location.hash='#stronger-canada?view=crosswalk&topic=energy&region=BC&dimension=all&dependency=all';window.StrongerCanada.render();assert(host.innerHTML.includes('data-source-media-kind="video"'));assert(host.innerHTML.includes('Footage: June 30, 2025'));assert(host.innerHTML.includes('not a provincial outcome measure'));assert(host.innerHTML.includes('region=BC'));
 location.hash='#stronger-canada?view=compare';window.StrongerCanada.render();assert.equal((host.innerHTML.match(/class="sc-matrix-link"/g)||[]).length,32);assert.equal((host.innerHTML.match(/<option value="(?:CA|AB|BC|MB|NB|NL|NS|NT|NU|ON|PE|QC|SK|YT)"/g)||[]).length,14);
 location.hash='#stronger-canada?view=directions&topic=finance&dimension=capacity';window.StrongerCanada.render();assert(host.innerHTML.includes('data-sc-detail="assessment-finance-capacity" open'));assert(host.innerHTML.includes('&lt;script&gt;unsafe&lt;/script&gt;'));assert(!host.innerHTML.includes('<script>unsafe'));
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
