import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import I from '../app/daily-intelligence.js';
import B from '../app/daily-briefing.js';
import R from '../app/research-register.js';
import F from '../app/stronger-canada-framework.js';
import RM from '../app/regional-trade-model.js';
import {makeBriefings} from '../monitor/briefings.mjs';
const now=Date.parse('2026-11-22T18:30:00Z'),source={publisher:'Official fixture',url:'https://www.canada.ca/policy'};
const record=(id,extra={})=>({id,date:'2026-11-20',kind:'policy',relationship:'Canada-China',topics:['agriculture'],sources:[source],reviewedAt:'2026-11-22',title:id,changed:'Documented policy claim.',canada:'A Canadian decision question.',...extra});
const scan=(digest='one',status='success',date='2026-11-22T12:00:00Z')=>({lastAttempt:date,lastRunStatus:status,sourceChecks:[{url:source.url,digest,status,checkedAt:date,lastChanged:date}]});

test('a reached date, MOU signature and contract award never become an implemented benefit',()=>{
 const scheduled=record('scheduled',{effectiveDate:'2026-11-23',reviewedAt:'2026-11-22'});
 assert.equal(I.stage(scheduled,'2026-11-22').id,'scheduled');
 assert.equal(I.stage(scheduled,'2026-11-23').id,'due');
 assert.equal(I.stage({...scheduled,originalStatus:'in_force'},'2026-11-23').id,'due');
 assert.equal(I.stage(record('mou',{kind:'MOU'}),'2026-11-22').id,'signed');
 const contract=R.records.find(x=>x.id==='ca-us-ccc-t400-contract-2026');
 assert.equal(I.stage(contract,'2026-11-22').id,'awarded');
 assert.equal(contract.value,undefined);assert.equal(contract.regions,undefined);
 assert.match(contract.limit,/executed contract|delivery records/);
 const legal=R.records.find(x=>x.id==='uc-maritime-suspension-november-2026');
 assert.equal(I.stage(legal,'2026-11-22').id,'in_force');
 assert.equal(I.stage(legal,'2027-01-10').id,'due');
 assert.match(legal.sources[0].url,/govinfo.gov/);
 assert.equal(I.stage({...legal,reviewState:'source_reported'},'2026-11-22').id,'reported');
});

test('source retrieval, claim review and attribution retain independent confidence and timestamps',()=>{
 const r=record('proof',{reviewedAt:'2026-11-21'});
 const p=I.evidence(r,scan(),'2026-11-22');assert.equal(p.confidence,'Reassessment required');assert.equal(p.checkedAt,'2026-11-22T12:00:00Z');assert.equal(p.reviewedAt,'2026-11-21');assert.equal(p.attribution,'Canadian policy effect not established');
 const f=I.evidence(r,scan('one','failed'),'2026-11-22');assert.equal(f.freshness,'Source check failed');
 const baseline=scan();baseline.sourceChecks[0].baseline=true;assert.equal(I.evidence(r,baseline).changed,false);
 assert.equal(I.evidence({...r,reviewState:'source_reported'},scan()).confidence,'Analyst review pending');
 assert.equal(I.evidence(r,{},'2026-11-22').checkedAt,null);
});

test('saved Toronto editions compare reviewed records and source hashes without inventing yesterday',()=>{
 assert.equal(I.day('2026-11-22T04:59:00Z'),'2026-11-21');assert.equal(I.day('2026-11-22T05:01:00Z'),'2026-11-22');
 const old=I.snapshot({feed:scan('one','success','2026-11-21T12:00:00Z'),register:{records:[record('same',{reviewedAt:'2026-11-21'})]},now:Date.parse('2026-11-21T13:00:00Z')});
 const current=I.snapshot({feed:scan('two'),register:{records:[record('same',{changed:'Amended reviewed scope.'}),record('new')]},now});
 let history=I.saveEdition(null,old);history=I.saveEdition(history,current);history=I.saveEdition(history,current);
 assert.equal(history.editions.length,2);
 const c=I.compare(history,'2026-11-22');assert.equal(c.ready,true);assert.equal(c.newRecords.length,1);assert.equal(c.updatedRecords.length,1);assert.equal(c.sourceRevisions.length,1);assert.equal(c.newSources.length,0);
 assert.equal(I.compare({schemaVersion:1,editions:[current]},'2026-11-22').ready,false);
 assert.equal(I.compare(history,'2026-11-23').reason,'Current edition pending');
 assert.equal(I.compare(history,'2026-11-22',{relationship:'USA-China'}).sourceRevisions.length,0);
 const failed={...current,sourceChecks:[{url:source.url,status:'failed',digest:'two'}]};assert.equal(I.compare(I.saveEdition(history,failed),'2026-11-22').sourceRevisions.length,0);
 const firstIndex={...current,sourceChecks:[{url:source.url+'/new',status:'success',digest:'first'}]};const d=I.compare(I.saveEdition(history,firstIndex),'2026-11-22');assert.equal(d.newSources.length,1);assert.equal(d.sourceRevisions.length,0);
});

test('priority filters use explicit reviewed mappings while unclassified reports stay unreviewed',()=>{
 const known=R.records.find(r=>r.id==='cc-finance-mou-november-2026');assert(I.priorities(known,F).includes('capacity'));
 const unknown=record('unclassified',{reviewState:'source_reported'});assert.deepEqual(I.priorities(unknown,F),[]);
 const automatic={...unknown,detectedAt:'2026-11-22T12:00:00Z',publicationDate:'2026-11-21',versionId:'v1',changeType:'parser_refresh'};
 assert.equal(B.buildBriefing({feed:{briefings:[automatic]},register:{records:[]},now}).featured.length,0);
 const m=B.buildBriefing({register:R,filters:{priority:'capacity',stage:'MOU'},now});
 assert(m.instruments.length);assert(m.instruments.every(e=>e.record.kind==='MOU'&&I.priorities(e.record,F).includes('capacity')));
});

test('interactive trade visuals preserve suppression, exact periods, geography and units',()=>{
 const points=(scale=1)=>Array.from({length:24},(_,i)=>({period:`${2025+Math.floor(i/12)}-${String(i%12+1).padStart(2,'0')}-01`,value:(i+1)*scale,scalarFactorCode:3,securityLevelCode:0,statusCode:0}));
 const data={mappingVersion:2,status:'success',retrievedAt:'2026-11-22T12:00:00Z',url:source.url,series:['All countries','United States','China'].map((partner,i)=>({region:'Canada',topic:'all',partner,points:points(i?0.2:1)}))};
 let s=I.trade(data,{},RM);assert.equal(s.points.length,12);assert.equal(s.points[0].period,'2026-01');assert.equal(s.partners[0].share,20);
 data.series[1].points[23].securityLevelCode=1;s=I.trade(data,{},RM);assert.equal(s.points.at(-1).values[0],null);assert.equal(s.partners[0].current,null);
 const service=I.trade(data,{topic:'finance'},RM);assert.equal(service.contextOnly,true);
 assert.equal(I.trade(data,{relationship:'USA-China'},RM).available,false);
 const m=B.buildBriefing({register:R,tradeData:data,now});const html=B.renderBriefing(m,scan());assert.match(html,/daily-line-chart/);assert.match(html,/Jan 2026–Dec 2026/);assert.match(html,/Show chart data/);assert.match(html,/data-daily-filter="region"/);assert.doesNotMatch(html,/NaN|Infinity|undefined/);
 const share=B.renderBriefing(B.buildBriefing({register:R,tradeData:data,filters:{chart:'share'},now}),scan());assert.match(share,/daily-share-bars/);assert.doesNotMatch(share,/width:NaN/);
});

test('the seven briefing sections follow the supplied structure and retain mandatory decision fields',()=>{
 const m=B.buildBriefing({feed:scan(),register:R,now});const html=B.renderBriefing(m,scan());
 const ids=['daily-summary','daily-developments','daily-sectors','daily-relationships','daily-strategy','daily-watch','daily-implications'];
 const positions=ids.map(id=>html.indexOf(`id="${id}"`));assert(positions.every(n=>n>=0));assert.deepEqual([...positions].sort((a,b)=>a-b),positions);
 for(const label of ['Executive takeaway','What changed since yesterday?','Implementation status','Evidence confidence','Last source check','Analyst reviewed','Next analyst action'])assert(html.includes(label),label);
 assert.equal((html.match(/class="daily-sector"/g)||[]).length,8);assert.equal((html.match(/class="daily-flag"/g)||[]).length,6);
 const unsafe=record('unsafe',{title:'<img src=x onerror=bad()>',changed:'<script>bad()</script>'});const safe=B.renderBriefing(B.buildBriefing({register:{records:[unsafe]},now}),{});assert(!safe.includes('<img src=x'));assert(safe.includes('&lt;script&gt;bad()'));
 const index=fs.readFileSync(new URL('../app/index.html',import.meta.url),'utf8');assert(index.indexOf('daily-policy-data.js')<index.indexOf('research-register.js'));assert(index.indexOf('daily-intelligence.js')<index.indexOf('daily-briefing.js'));
 const daily=fs.readFileSync(new URL('../.github/workflows/daily-policy-monitor.yml',import.meta.url),'utf8');assert.match(daily,/17 11 \* \* \*/);assert.match(daily,/git add app\/daily-editions.json/);
});

test('an automatic procurement report identifies an award without upgrading it to executed deliveries',()=>{
 const doc={title:'CCC and Canadian supplier awarded U.S. military contract',text:'Canada and the United States maintain defence trade cooperation. The Canadian supplier was awarded a five-year contract for aircraft engine parts. Deliveries will follow the terms of the contract.',publicationDate:'2026-11-21'};
 const rows=makeBriefings(doc,{url:source.url,detectedAt:'2026-11-22T12:00:00Z',id:'v1',changeType:'new_source'},'Canada');assert.equal(rows[0].kind,'contract');assert.equal(rows[0].implementationStatus,'unverified');assert.equal(rows[0].reviewState,'source_reported');assert.equal(I.stage(rows[0],'2026-11-22').id,'reported');
});
