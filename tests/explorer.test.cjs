const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const dir=require('node:path').join(__dirname,'../app');
const media={matches:false,addEventListener(){}};
const ctx={window:{matchMedia:()=>media,addEventListener(){}},location:{hash:''},URL,URLSearchParams,history:{replaceState(){}},document:{},CSS:{escape:s=>s},console};
vm.createContext(ctx);
for(const file of ['explorer-inventory.js','explorer-catalog.js','regional-trade-model.js','us-trade-model.js','insights-model.js','insights-copy.js','relationship-copy.js','relationship-findings.js','relationship-explorer.js'])vm.runInContext(fs.readFileSync(dir+'/'+file,'utf8'),ctx,{filename:file});
const api=ctx.window.PolicyExplorer;
assert.equal(api.catalog.topics.length,8);
assert.equal(api.records.size,37);
assert.deepEqual(JSON.parse(JSON.stringify(api.inventory)),JSON.parse(fs.readFileSync(require('node:path').join(__dirname,'../api/master-data.json'),'utf8')));
assert.equal(new Set(api.inventory.records.map(r=>r.id)).size,37);
let views=0,gaps=0;
for(const topic of api.catalog.topics){
 assert.equal(topic.issues.length,3);
 for(const issue of topic.issues){
  assert.equal(issue.links.length,3);
  for(let relationship=0;relationship<3;relationship++){
   const m=api.model(topic.id,issue.id,relationship),qs=api.brief(m);
   assert.equal(m.issue.id,issue.id);assert.equal(m.index,relationship);assert.equal(qs.length,4);
   assert(issue.why.length>120&&issue.uncertainty.length>100);
   assert(m.link.connection.length>65);assert(m.link.label.length>0);
   for(const r of m.items){assert(api.validURL(r.url));assert(r.summary&&r.source&&r.year&&r.status);}
   if(!m.items.length){gaps++;assert(m.link.context);assert(qs[2].html.includes('coverage gap'));}
   for(const q of qs)assert(q.html.includes('<p>')&&q.html.length>65);
   api.state.topic=topic.id;api.state.issue=issue.id;api.state.relationship=relationship;
   const html=api.view();assert(html.includes(issue.title.replaceAll('&','&amp;')));
   for(let n=0;n<4;n++)assert(html.includes('id="lab-question-'+n+'"'));
   assert.equal((html.match(/data-relationship="/g)||[]).length,3);
   assert.equal((html.match(/data-country="/g)||[]).length,3);
   for(const code of ['ca','us','cn'])assert(html.includes(`src="flags/${code}.svg" alt=""`));
   assert.equal((html.match(/data-stage="/g)||[]).length,3);
   for(const r of m.items)assert(html.includes('data-record="'+r.id+'"'));
   assert(!/onclick=|href="javascript:/.test(html));
   const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);
   for(const ref of html.matchAll(/aria-(?:controls|labelledby)="([^"]+)"/g))for(const id of ref[1].split(' '))assert(ids.includes(id));
   views++;
  }
 }
}
assert.equal(views,72);assert(gaps>0);
assert.equal(api.model('bad','bad',91).index,1);assert.equal(api.validURL('javascript:alert(1)'), '');
assert.equal(api.model('security','fentanyl',1).items.length,0);
assert(api.model('security','fentanyl',0).items.some(r=>r.id==='r16'));
// Check that source strings are escaped before insertion into the real view builder.
const r=api.records.get('r9'),original=r.summary;r.summary='<script>alert("x")</script>';
api.state.topic='agriculture';api.state.issue='canola';api.state.relationship=1;
assert(api.view().includes('&lt;script&gt;'));assert(!api.view().includes('<script>alert'));r.summary=original;
// Exercise actual event handlers with a minimal event target, without a browser.
let handler,topicChange,chartChange,chartKey;
const nodes=new Map();
function node(id){if(!nodes.has(id))nodes.set(id,{innerHTML:'',hidden:false,dataset:{},setAttribute(){},addEventListener(type,fn){if(id==='relationship-explorer'&&type==='click')handler=fn;if(id==='relationship-explorer'&&type==='change')chartChange=fn;if(id==='relationship-explorer'&&type==='keydown')chartKey=fn;if(id==='#lab-topic'&&type==='change')topicChange=fn;},querySelector(sel){return node(sel);},querySelectorAll(){return[];},focus(){},scrollIntoView(){},showModal(){this.open=true;},removeAttribute(){}});return nodes.get(id);}
ctx.document.getElementById=id=>node(id);ctx.document.querySelector=sel=>node(sel);ctx.document.querySelectorAll=()=>[];
ctx.history.replaceState=(a,b,hash)=>ctx.location.hash=hash;
ctx.window.showExplorer();assert(handler&&topicChange);assert(node('root').innerHTML.includes('Relationship Explorer'));
function click(dataset){const b={dataset,hasAttribute:k=>k==='data-lab-print'&&dataset.print};handler({target:{closest:()=>b}});}
topicChange({target:{value:'security'}});assert.equal(api.state.topic,'security');
click({issue:'fentanyl'});assert.equal(api.state.issue,'fentanyl');
click({relationship:'0'});assert.equal(api.state.relationship,0);assert(node('root').innerHTML.includes('Enforcement and intelligence'));
click({country:'china'});assert.equal(api.state.relationship,1);assert.equal(api.state.country,'china');
click({stage:'finding'});assert.equal(api.state.stage,'finding');assert(node('#lab-trace-detail').innerHTML.includes('No dated finding is indexed'));assert(ctx.location.hash.includes('stage=finding'));
click({stage:'implication'});assert(node('#lab-trace-detail').innerHTML.includes('Canadian policy implications'));assert(node('#lab-trace-detail').innerHTML.includes('What to check next'));
click({stage:'source'});assert(node('#lab-trace-detail').innerHTML.includes('No original document is indexed'));
click({record:'r16'});assert(node('lab-evidence-dialog').open);assert(node('lab-dialog-body').innerHTML.includes('Joint Action Plan'));
click({question:'3'});
let mapOpened=false,briefOpened=false,printed=false;ctx.window.showMap=()=>mapOpened=true;ctx.window.render=()=>briefOpened=true;ctx.window.print=()=>printed=true;
click({labView:'map'});assert(mapOpened);click({labView:'briefing'});assert(briefOpened);click({print:true});assert(printed);
for(const file of ['app.js','master-data.js'])new vm.Script(fs.readFileSync(dir+'/'+file,'utf8'));
const legacyCtx={window:{},document:ctx.document,location:{hash:''},history:ctx.history,URL};vm.createContext(legacyCtx);
vm.runInContext(fs.readFileSync(dir+'/master-data.js','utf8'),legacyCtx);
vm.runInContext(fs.readFileSync(dir+'/app.js','utf8'),legacyCtx);
assert.equal(legacyCtx.window.POLICY_MASTER.records.length,22);
assert(legacyCtx.window.LegacyPolicy.results('fentalyn').some(r=>r.title.includes('Opioids')));
legacyCtx.window.showMap();assert.equal((node('root').innerHTML.match(/class="mapcell"/g)||[]).length,21);
const index=fs.readFileSync(dir+'/index.html','utf8');
for(const src of index.matchAll(/(?:src|href)="([^"#]+\.(?:js|css))"/g))assert(fs.existsSync(dir+'/'+src[1]));
console.log(JSON.stringify({passed:true,topics:8,subtopics:24,relationshipBriefings:views,explicitEvidenceGaps:gaps,sourceRecords:37,checks:'data integrity, 4-question content, identifiers, ARIA links, escaping, URL safety, topic/subtopic/country/relationship controls, evidence trail, source dialog, navigation, printing',browserQA:'not run; no browser automation tool available'}));

// Bilateral mounting preserves its surrounding portal and uses the locked relationship.
vm.runInContext(fs.readFileSync(dir+'/bilateral-model.js','utf8'),ctx);
const visited=[];ctx.window.HomeHub={navigate(target){visited.push(target);},updateNavigation(){}};
ctx.window.BilateralHub={active:{relationship:'Canada-China'},target(view,extra){return ctx.window.BilateralModel.target('canada-china',view,extra);}};
ctx.location.hash='#canada-china?view=relationship&topic=agriculture&issue=canola';
const outer=node('root').innerHTML;ctx.window.showExplorer();
assert.equal(node('root').innerHTML,outer);assert(node('bilateral-body').innerHTML.includes('Relationship Explorer'));
assert.equal(api.state.relationship,1);assert(ctx.location.hash.includes('view=relationship'));
click({country:'us'});assert.equal(api.state.relationship,1);
click({relationship:'0'});assert(visited.at(-1).startsWith('us-canada?'));
click({labView:'map'});assert(visited.at(-1).includes('view=products'));

const {test}=require('node:test');
test('Finding controls load the matched chart and navigate policy records without changing the relationship',async()=>{
 const files=[];
 ctx.fetch=async name=>{files.push(name);return {ok:true,json:async()=>JSON.parse(fs.readFileSync(dir+'/'+name,'utf8'))};};
 const flush=()=>new Promise(resolve=>setImmediate(resolve));
 ctx.location.hash='#canada-china?view=relationship&topic=agriculture&issue=canola&stage=finding';
 ctx.window.showExplorer();await flush();
 assert.deepEqual(files,['evidence-records.json']);
 const chart=()=>node('#lab-finding-chart').innerHTML;
 assert(chart().includes('Canola seed shipments to China'));assert(chart().includes('2026-03'));assert(chart().includes('Show exact values'));assert(chart().includes('2,581,011')||chart().includes('2.58M'));
 chartChange({target:{dataset:{labChart:'series'},value:'canola-meal-china'}});
 assert(chart().includes('Canola meal shipments to China'));assert(!chart().includes('Canola seed tariff change:'));
 chartChange({target:{dataset:{labChart:'point'},value:'2'}});assert(chart().includes('2026-03: 42,126 tonnes'));
 chartKey({key:'Enter',preventDefault(){},target:{closest:()=>({dataset:{labPoint:'7'}})}});assert(chart().includes('2026-08: 295,172 tonnes'));
 ctx.window.BilateralHub.active.relationship='Canada-USA';
 ctx.location.hash='#us-canada?view=relationship&topic=technology&issue=telecom&stage=finding';
 ctx.window.showExplorer();
 assert(node('bilateral-body').innerHTML.includes('data-lab-finding="r29"'));
 assert(node('bilateral-body').innerHTML.includes('a numerical trend would need a comparable outcome series'));
 click({labFinding:'r29'});assert(node('#lab-trace-detail').innerHTML.includes('data-lab-finding="r29" aria-controls="lab-timeline-detail" aria-pressed="true"'));
 assert.equal(files.length,1,'a policy-only issue should not request unrelated statistics');
});
