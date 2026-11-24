import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import PN from '../app/policy-narrative.js';
const read=f=>JSON.parse(fs.readFileSync(new URL('../app/'+f,import.meta.url),'utf8'));
test('all 220 reviewed observations receive three concise policy answers without mutating evidence',()=>{
 const records=[...read('evidence-records.json').records,...read('us-trade-evidence.json').records],before=JSON.stringify(records);
 for(const r of records){const s=PN.describe(r);for(const k of ['changed','why','regions'])assert(s[k].length>35,r.id+': '+k);assert(Object.values(s).join(' ').split(/\s+/).length<210,r.id+' is too long');assert(PN.html(r).includes('What changed?'));}
 assert.equal(JSON.stringify(records),before);
 const e=read('evidence-records.json');assert(PN.describe(e.records.find(r=>r.id==='nextstar-jobs')).regions.includes('project or employer observation'));
 assert(PN.describe(e.records.find(r=>r.id==='lfs-BC')).why.includes('does not isolate'));
 const us=read('us-trade-evidence.json');assert(PN.describe(us.records.find(r=>r.id==='us-oisp-nprm')).changed.startsWith('Proposal'));
 assert(PN.describe(us.records.find(r=>r.id==='us-auto-model-jobs')).changed.includes('not an observed 2026'));
 assert(PN.describe(us.records.find(r=>r.id==='us-fentanyl-north')).why.includes('do not identify the origin'));
 assert(PN.describe(us.records.find(r=>r.id==='us-bea-inward-financial_flow-canada-2025')).changed.includes('need not mean a factory closed'));
});
test('statistic buttons open a labelled dialog, keep source links safe and restore keyboard focus',()=>{
 const events={},nodes=new Map();let focused=false;
 const doc={getElementById:id=>nodes.get(id),body:{append(n){nodes.set(n.id,n);}},createElement(){return {innerHTML:'',setAttribute(k,v){this[k]=v;},addEventListener(n,f){this[n]=f;},showModal(){this.open=true;},remove(){nodes.delete(this.id);}};},addEventListener(n,f){events[n]=f;}};
 const ctx={window:{document:doc},document:doc,URL,Intl};vm.createContext(ctx);vm.runInContext(fs.readFileSync(new URL('../app/policy-narrative.js',import.meta.url),'utf8'),ctx);
 const datum={kind:'regional-trade',title:'Ontario exports',geography:'Ontario',partner:'China',value:10,unit:'CAD',period:'January 2026',url:'https://www150.statcan.gc.ca/test'},origin={dataset:{policyDatum:JSON.stringify(datum)},isConnected:true,focus(){focused=true;}};
 events.click({target:{closest:()=>origin}});const dialog=nodes.get('policy-datum-dialog');assert(dialog.open);assert.equal(dialog['aria-labelledby'],'policy-datum-title');assert(dialog.innerHTML.includes('How could Canada'));assert(dialog.innerHTML.includes('https://www150.statcan.gc.ca/test'));dialog.close();assert(focused);assert(!nodes.has(dialog.id));
});
test('numeric explanations distinguish trade direction, comparable changes, concentration and missing data',()=>{
 const r={kind:'us-goods',partner:'Canada',metric:'imports',value:100,prior:90,unit:'USD million',period:'Jan–Aug 2026'};
 assert(PN.describe(r).why.includes('demand indicator for Canadian goods'));assert(PN.describe(r).changed.includes('Up 10 USD million'));
 assert(PN.describe({...r,metric:'exports'}).why.includes('Canadian purchases'));
 assert(PN.describe({...r,partner:'China'}).why.includes('does not measure diverted sales'));
 const p={kind:'regional-trade',geography:'Ontario',partner:'China',value:15,unit:'%',metric:'share',period:'Jan–Aug 2026',commodity:'Motor vehicles and parts'};
 assert(PN.describe(p).changed.includes('concentration, not a change'));assert(PN.describe(p).regions.includes('province or territory of origin'));
 assert(PN.describe({...p,value:null}).changed.includes('not zero'));
 const unsafe={...r,title:'<img src=x onerror=bad()>',summary:'<script>x</script>'};const html=PN.value('<img>',unsafe)+PN.html(unsafe);assert(!html.includes('<img'));assert(!html.includes('<script>'));assert(html.includes('&lt;img'));
});


test('mini memos separate observation, Canadian relevance and next action while escaping source text',()=>{
 const memo={changed:'<script>claim</script>',why:'Buyer access is not a completed sale.',next:'Check the first shipment.',automatic:true,sourceExcerpt:true,truncated:true};
 const before=JSON.stringify(memo),html=PN.memo(memo);
 assert(html.includes('What changed?'));assert(html.includes('Why does it matter to Canada?'));assert(html.includes('Next analyst action'));
 assert(html.includes('<q>&lt;script&gt;claim&lt;/script&gt;…</q>'));assert(!html.includes('<script>'));assert(html.includes('data-no-translate'));assert.equal(JSON.stringify(memo),before);
});

test('trade memos preserve matched periods, missing observations, concentration and non-causal reading',()=>{
 const snapshot={region:'Saskatchewan',commodity:'Energy products',year:2026,month:9};
 const partner={partner:'China',current:100000000,prior:125000000,change:-20,share:12.5};
 const memo=PN.tradeMemo(snapshot,partner);
 assert.match(memo.changed,/Saskatchewan.*China.*January through September 2026/);assert.match(memo.changed,/fell 20%.*same months/);
 assert.match(memo.why,/12.5%.*concentration/);assert.match(memo.next,/before attributing/);assert(!memo.changed.includes('yesterday'));
 const missing=PN.tradeMemo(snapshot,{...partner,current:null,change:null,share:null});assert.match(missing.changed,/not zero/);assert.match(missing.why,/missing denominator/);assert(!missing.changed.includes('fell'));
 const noPrior=PN.tradeMemo(snapshot,{...partner,change:null});assert.match(noPrior.changed,/does not establish a trend/);
 const flat=PN.tradeMemo(snapshot,{...partner,change:0});assert.match(flat.changed,/unchanged/);
});

test('trade memo templates and reading controls remain available in French and Chinese',async()=>{
 const {default:I18n}=await import('../app/i18n.js');
 for(const lang of ['fr','zh-Hans']){
  const translate=v=>I18n.t(v,lang),memo=PN.tradeMemo({region:'Ontario',commodity:'Motor vehicles and parts',year:2026,month:9},{partner:'China',current:100000000,change:5,share:2},{locale:lang==='fr'?'fr-CA':'zh-CN',translate});
  assert(!memo.changed.includes('shipped'));assert(!memo.changed.includes('Export value rose'));assert(!memo.why.includes('received'));assert(!memo.next.includes('Compare shipment'));
  for(const label of ['Figures behind this memo','Read the latest record memo','What does the evidence show?'])assert.notEqual(translate(label),label);
 }
});
