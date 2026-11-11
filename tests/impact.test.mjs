import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import M from '../app/impact-model.js';
import {validateEvidence} from '../scripts/validate-evidence.mjs';
import {assessmentReview} from '../monitor/assessment-review.mjs';
import {selectContext,answerCustomer} from '../api/src/lib/customer-llm.js';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const data=JSON.parse(read('app/evidence-records.json'));
const inventory=JSON.parse(read('api/master-data.json'));
const s=extra=>M.normalize(data,{...M.defaults,...extra});
test('shared snapshot has seven five-test assessments, pending technology and complete source references',()=>{
 assert.equal(validateEvidence(data).records,59);
 assert.equal(read('app/evidence-records.json'),read('api/evidence-records.json'));
 const g=JSON.parse(read('app/canada-map.json'));assert.equal(g.shapes.length,13);
 assert.deepEqual(new Set(g.shapes.map(x=>x.code)),new Set(Object.keys(data.regions)));
 assert(g.shapes.every(x=>x.d.startsWith('M')&&!x.d.includes('NaN')));
});
test('provincial filters preserve national geography and reject invented provincial allocation',()=>{
 const before=JSON.stringify(data),sk=M.records(data,s({region:'SK',topic:'agriculture',relationship:'Canada-China'}));
 const seed=sk.find(r=>r.id==='canola-seed-china');assert(seed);assert.equal(seed.geographyLevel,'national');assert.equal(seed.geography,'Canada');assert.equal(seed.value,2581011);
 assert(!sk.some(r=>r.id==='nextstar-jobs'));assert(!M.records(data,s({region:'ON',topic:'agriculture'})).some(r=>r.id==='canola-seed-china'));
 assert.equal(JSON.stringify(data),before);
});
test('reference-period filtering does not turn 2024 defence observations into 2026 results',()=>{
 const now=M.records(data,s({region:'ON',topic:'security',period:'2026'}));assert(!now.some(r=>r.id==='defence-direct-jobs'));
 const past=M.records(data,s({region:'ON',topic:'security',period:'2024'}));assert(past.some(r=>r.id==='defence-share-ON'));
 const crop=M.records(data,s({region:'SK',period:'2026'}));assert(crop.some(r=>r.id==='canola-crush'));
});
test('map outcome classification excludes stocks, forecasts, historical shares and broad labour changes',()=>{
 assert.equal(M.mapClass(data,s({layer:'observed'}),'ON'),'mixed');
 assert.equal(M.mapClass(data,s({layer:'observed',topic:'energy'}),'BC'),'operating');
 assert.equal(M.mapClass(data,s({layer:'observed',topic:'energy'}),'AB'),'gap'); // Kitimat relevance is not an Alberta project location
 assert.equal(M.mapClass(data,s({layer:'observed',topic:'security'}),'ON'),'gap');
 assert.equal(M.mapClass(data,s({layer:'observed',topic:'investment'}),'BC'),'operating'); // existing commissioned asset, not FID
 assert.equal(M.mapClass(data,s({layer:'observed',topic:'finance'}),'QC'),'gap');
 for(const code of ['YT','NT','NU'])assert.equal(M.mapClass(data,s({layer:'observed'}),code),'gap');
 const r=data.records.find(r=>r.id==='lng-phase2');assert(!M.local(r,'BC'));
});
test('policy filters retain effective dates and limit measure-specific results',()=>{
 const policies=M.policies(data,s({region:'SK',topic:'agriculture',relationship:'Canada-China',metric:'tariffs'}));
 assert.equal(policies.length,1);assert.equal(policies[0].effectiveDate,'2026-03-01');assert.equal(policies[0].expiryDate,'2026-12-31');
 assert.equal(M.policies(data,s({metric:'employment'})).length,0);
 const usChina=M.policies(data,s({relationship:'USA-China'}));assert.equal(usChina.length,1);assert.equal(usChina[0].effectiveDate,null);
 assert(usChina[0].summary.includes('predates'));
});
test('unknown filters normalize safely and source changes do not advance reviewed findings',()=>{
 assert.deepEqual(M.normalize(data,{region:'XX',topic:'made-up',period:'today'}),M.defaults);
 const pages={},url=data.sources.S07.url;pages[url]={digest:'a',lastChecked:'2026-11-03T20:00:00Z',lastChanged:'2026-11-03T20:00:00Z'};
 const baseline=assessmentReview(data,{pages});assert(!baseline.checks.find(c=>c.sourceId==='S07').reviewRequired);
 pages[url]={digest:'b',lastChecked:'2026-11-04T12:00:00Z',lastChanged:'2026-11-04T12:00:00Z'};
 const changed=assessmentReview(data,{pages},[],baseline);assert(changed.checks.find(c=>c.sourceId==='S07').reviewRequired);assert.equal(changed.reviewedAt,'2026-11-03');
 const retained=assessmentReview(data,{pages},[{url,error:'HTTP 503'}],changed);assert.equal(retained.checks.find(c=>c.sourceId==='S07').status,'failed');assert(retained.checks.find(c=>c.sourceId==='S07').reviewRequired);
 assert.equal(data.records.find(r=>r.id==='nextstar-jobs').value,1300);
});
test('BYLLM context contains the same verified units, geography and original sources',()=>{
 const context=selectContext('What changed in Windsor?', ['nextstar-jobs','gm-layoffs'],inventory,{},data);
 assert.equal(context.length,2);assert.equal(context[0].snapshotVersion,data.version);assert(context.every(r=>r.sources.length&&r.geography&&r.limitation));
 assert(!selectContext('canola tariffs',undefined,inventory,{changes:[{ai:{summary:'unreviewed'}}]},data).some(r=>!r.snapshotVersion));
});
test('BYLLM refuses missing/unknown citations and empty explicit selections',async()=>{
 const body={provider:'openai',model:'fixture',apiKey:'not-a-real-key',question:'What changed in Windsor?',recordIds:['nextstar-jobs']};
 const response=text=>async()=>new Response(JSON.stringify({output:[{content:[{type:'output_text',text}]}]}));
 const good=await answerCustomer(body,{inventory,evidence:data,fetchImpl:response('About 1,300 employees were reported; the new-arrangement effect is not established [nextstar-jobs].')});assert.equal(good.status,200);
 for(const text of ['Claim without a citation.','Claim [invented].'])assert.equal((await answerCustomer(body,{inventory,evidence:data,fetchImpl:response(text)})).status,422);
 assert.equal((await answerCustomer({...body,recordIds:[],requireSelection:true},{inventory,evidence:data})).status,422);
});
test('rendered explorer loads its two assets, escapes records and retains filter state across views',async()=>{
 const nodes=new Map(),events={};
 const node=id=>{if(!nodes.has(id))nodes.set(id,{innerHTML:'',isConnected:true,focus(){}});return nodes.get(id);};
 const fake=structuredClone(data);fake.records.find(r=>r.id==='nextstar-jobs').title='<img src=x onerror=bad()>';
 const geometry=JSON.parse(read('app/canada-map.json')),location={hash:'#home?region=ON&topic=vehicles&relationship=Canada-USA'};
 const window={ImpactModel:M,PolicyLive:{feed:{changes:[]}},addEventListener(k,fn){events[k]=fn;},dispatchEvent(){}};
 const document={getElementById:node,addEventListener(k,fn){events[k]=fn;}};
 const ctx={window,document,location,history:{replaceState(a,b,h){location.hash=h;}},URLSearchParams,Intl,Date,Event,console,fetch:async url=>({ok:true,json:async()=>url==='evidence-records.json'?fake:geometry})};
 vm.createContext(ctx);vm.runInContext(read('app/policy-narrative.js'),ctx);vm.runInContext(read('app/impact-explorer.js'),ctx);window.CanadaImpact.mount('overview','target');await window.CanadaImpact.ready;
 const html=node('target').innerHTML;assert.equal((html.match(/data-impact-region=/g)||[]).length,26);assert(html.includes('&lt;img'));assert(!html.includes('<img src=x'));
 assert(html.includes('How confidently can we connect it?'));assert(html.includes('30%'));assert(html.includes('S07'));
 window.CanadaImpact.show('compare');assert.equal(window.CanadaImpact.state.region,'ON');assert.equal(window.CanadaImpact.state.topic,'vehicles');assert(node('canada-impact-root').innerHTML.includes('Canada–U.S.'));
 events.change({target:{matches:()=>true,dataset:{impactFilter:'region'},value:'BC'}});assert(location.hash.includes('region=BC'));
 window.BilateralHub={active:{canadian:true,relationship:'Canada-China'},target(view,extra){return 'canada-china?'+new URLSearchParams({...extra,view});}};
 location.hash='#canada-china?view=map&relationship=Canada-USA';window.CanadaImpact.mount('overview','target');
 assert.equal(window.CanadaImpact.state.relationship,'Canada-China');
 events.change({target:{matches:()=>true,dataset:{impactFilter:'relationship'},value:'Canada-USA'}});
 assert.equal(window.CanadaImpact.state.relationship,'Canada-China');assert(location.hash.includes('view=map'));assert(location.hash.includes('relationship=Canada-China'));
 assert(node('target').innerHTML.includes('id="impact-relationship" data-impact-filter="relationship" disabled'));
 assert(node('target').innerHTML.includes('data-hub="canada-china?'));

});

