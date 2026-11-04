import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {parseCensus} from '../monitor/us-trade-core.mjs';
import M from '../app/us-trade-model.js';
import {tradeFixture} from './us-trade-fixture.mjs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8'),e=JSON.parse(read('app/us-trade-evidence.json')),d=JSON.parse(read('app/us-trade-statistics.json'));
test('U.S. reviewed evidence covers eight topics with traceable, typed, finite observations',()=>{
 assert(M.validate(e));assert.equal(e.assessments.length,8);assert.equal(e.records.length,161);assert.equal(Object.keys(e.sources).length,46);
 for(const t of e.assessments){assert.equal(t.questions.length,4);assert(t.canadaImplications);assert(e.records.some(r=>r.topics.includes(t.id)));}
 assert.equal(e.records.find(r=>r.id==='us-oisp-nprm').measurementType,'proposed_rule');
 assert.equal(e.records.find(r=>r.id==='us-auto-model-jobs').measurementType,'modelled_baseline');
 assert.equal(e.records.find(r=>r.id==='us-fdi-in-canada').measurementType,'stock');
 assert.equal(e.records.find(r=>r.id==='us-norad').eventDate,null);
 assert.equal(e.records.filter(r=>r.sourceCell).length,72);assert.equal(e.records.find(r=>r.id==='us-bea-inward-stock-china-2025').value,19009);assert.equal(e.records.find(r=>r.id==='us-bea-outward-stock-china-2025').value,120547);
 assert(e.records.filter(r=>r.id.startsWith('us-services')).every(r=>r.measurementType==='broad_context'));
});
test('Census parser matches explicit month labels, preserves zero, validates balance and rejects incomplete history',()=>{
 const months=['January','February','March','April','May','June','July','August','September','October','November','December'];
 const row=(label,x=100,y=200,b=-100)=>`<tr><td>${label}</td><td>${x}</td><td>${y}</td><td>${b}</td></tr>`;
 const html='<table>'+months.map(m=>row(m+' 2018')).join('')+row('TOTAL 2018',1200,2400,-1200)+row('January 2019',0,0,0)+row('TOTAL 2019',0,0,0)+'</table>';
 const p=parseCensus(html,{minYear:2018,maxYear:2019});assert.equal(p.monthly.length,13);assert.equal(p.monthly.at(-1).exports,0);assert.equal(p.totals.at(-1).completeYear,false);
 assert.throws(()=>parseCensus(html.replace(row('February 2018'),''),{minYear:2018,maxYear:2019}),/Incomplete/);
 assert.throws(()=>parseCensus(html+row('January 2019'),{minYear:2018,maxYear:2019}),/Duplicate/);
 assert.throws(()=>parseCensus(html.replace(row('March 2018'),row('March 2018',100,200,-900)),{minYear:2018,maxYear:2019}),/reconcile/);
});
test('published Census vintages retain complete monthly coverage and reconcile without freezing release values',()=>{
 assert.deepEqual(d.partners.map(p=>p.id).sort(),['Canada','China']);
 for(const p of d.partners){
  assert.equal(new Set(p.monthly.map(m=>m.period)).size,p.monthly.length);
  assert.equal(p.dataThrough,p.monthly.at(-1).period);
  assert.deepEqual(p.totals.map(t=>t.period),[...new Set(p.monthly.map(m=>m.period.slice(0,4)))]);
  for(const t of p.totals){
   const rows=p.monthly.filter(m=>m.period.startsWith(t.period+'-')),year=Number(t.period);
   assert(rows.length>=1&&rows.length<=12);
   assert.deepEqual(rows.map(m=>m.period),Array.from({length:rows.length},(_,i)=>t.period+'-'+String(i+1).padStart(2,'0')));
   if(t.period<p.dataThrough.slice(0,4))assert.equal(rows.length,12);
   assert.equal(t.months,rows.length);assert.equal(t.completeYear,rows.length===12);
   const result=M.goods(d,p.id,t.period);assert(result);assert.equal(result.month,rows.length);assert.equal(result.completeYear,t.completeYear);
   for(const key of ['exports','imports','balance']){
    assert(Number.isFinite(t[key]));assert(rows.every(m=>Number.isFinite(m[key])));
    assert(Math.abs(rows.reduce((n,m)=>n+m[key],0)-t[key])<=(rows.length+1)*.05+1e-6,p.id+' '+t.period+' '+key+' does not reconcile within source rounding');
    assert.equal(result[key],t[key]);
    const prior=p.monthly.filter(m=>m.period.startsWith((year-1)+'-')&&Number(m.period.slice(5))<=rows.length);
    if(prior.length===rows.length)assert.equal(result.prior[key],prior.reduce((n,m)=>n+m[key],0));else assert.equal(result.prior,null);
   }
  }
  for(const m of p.monthly){assert(m.exports>=0&&m.imports>=0);assert(Math.abs(m.exports-m.imports-m.balance)<.21);}
 }
});
test('YTD comparisons advance with September, October and a complete year while retaining exact known fixture results',()=>{
 for(const [month,exports,imports,balance,priorImports]of [[9,16650,17100,-450,16200],[10,18550,19100,-550,18100],[12,22380,23160,-780,21960]]){
  const fixture=tradeFixture(month),china=M.goods(fixture,'China','2026');
  assert.equal(china.month,month);assert.equal(china.exports,exports);assert.equal(china.imports,imports);assert.equal(china.balance,balance);assert.equal(china.prior.imports,priorImports);assert.equal(china.completeYear,month===12);
  assert.equal(M.annual(fixture,'China').length,month===12?9:8);assert(M.annual(fixture,'China').every(p=>p.year<2026||month===12));
 }
 assert.equal(M.growth(100,0),null);
});
test('partner/topic/search filters do not allocate country aggregates or promote proposals',()=>{
 const s=M.normalize(e,{partner:'China',topic:'agriculture',query:'soybeans'}),r=M.records(e,s);assert(r.length>=2);assert(r.every(r=>r.partner==='China'&&r.topics.includes('agriculture')));
 const fi=M.records(e,M.normalize(e,{partner:'China',topic:'investment'}));assert(!fi.some(r=>r.id==='us-fdi-in-canada'));assert(fi.some(r=>r.measurementType==='proposed_rule'));
 assert.equal(M.normalize(e,{partner:'unknown',topic:'bad',page:-8}).partner,'both');assert.equal(M.normalize(e,{page:'1.2'}).page,1);
});
test('U.S. tab renders charts, labelled evidence, dates and policy stages without replacing Canadian views',async()=>{
 const nodes=new Map(),events={};const node=id=>{if(!nodes.has(id))nodes.set(id,{innerHTML:'',isConnected:true,querySelectorAll(){return[];},focus(){}});return nodes.get(id);};
 const fake=structuredClone(e);fake.records.find(r=>r.partner==='China').title='<img src=x onerror=bad()>';
 const window={USTradeModel:M,PolicyLive:{feed:{}},addEventListener:(name,fn)=>events[name]=fn},document={getElementById:node,addEventListener:(name,fn)=>events[name]=fn};
 let statistics=tradeFixture(9);
 const location={hash:'#us-trade?partner=China&view=overview&year=2026'},context={window,document,location,history:{replaceState(a,b,h){location.hash=h;}},Intl,Date,URLSearchParams,console,fetch:async url=>({ok:true,json:async()=>url==='us-trade-evidence.json'?fake:url==='us-investment-statistics.json'?{series:[{partner:'China',direction:'inward',measure:'stock',year:2025,value:null}],sources:[]}:statistics})};vm.createContext(context);vm.runInContext(read('app/policy-narrative.js'),context);vm.runInContext(read('app/us-trade.js'),context);
 window.USTrade.show();await window.USTrade.ready;let html=node('us-trade-root').innerHTML;assert(html.includes('Jan–Sep 2026 · year to date'));assert(html.includes('$17.1bn'));assert(html.includes('Complete calendar years only'));assert(html.includes('2018'));assert(!html.includes('impact-canada-map'));assert(!html.includes('19.009'));assert(html.includes('Not available'));
 statistics=tradeFixture(10);events['policy-updates-loaded']();await new Promise(resolve=>setImmediate(resolve));html=node('us-trade-root').innerHTML;assert(html.includes('Jan–Oct 2026 · year to date'));assert(html.includes('$19.1bn'));assert(html.includes('2026-10'));
 location.hash='#us-trade?partner=China&view=evidence&query=';window.USTrade.show();html=node('us-trade-root').innerHTML;assert(html.includes('&lt;img'));assert(!html.includes('<img src=x'));assert(html.includes('Source publication'));assert(html.includes('Download reviewed evidence'));
 location.hash='#us-trade?partner=China&view=policies&topic=investment';window.USTrade.show();html=node('us-trade-root').innerHTML;assert(html.includes('Proposed rule'));assert(html.includes('2026'));
 location.hash='#us-trade?partner=both&view=sectors&topic=vehicles';window.USTrade.show();html=node('us-trade-root').innerHTML;assert.equal((html.match(/<h4><span>/g)||[]).length,4);assert(html.includes('Five evidence tests'));assert(html.includes('Canada implications'));
});
