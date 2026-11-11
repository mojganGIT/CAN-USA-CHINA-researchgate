import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {parseStateProfile,refreshStateProfiles} from '../monitor/us-state-core.mjs';
import M from '../app/us-state-model.js';
import I18n from '../app/i18n.js';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const d=JSON.parse(read('app/us-trade-statistics.json')).stateTrade,g=JSON.parse(read('app/us-state-map.json'));

function fixture(name='Michigan',country='Canada'){
 return 'In 2025, '+name+' exported $60.3 billion of goods to the world. Manufacturing Exports The state’s largest manufacturing export category is transportation equipment, which accounted for $25.2 billion. '+name+"'s Largest Export Markets The state’s largest market was "+country+'. '+name+' exported $23.2 billion in goods to '+country+' in 2025, representing 39 percent. '+country+' was followed by Mexico ($16.6 billion), Germany ($1.8 billion), China ($1.5 billion), and Japan ($1.4 billion). '+name+' goods exports to major world areas included: APEC $47.7 billion. Investment: Canada was a major source of foreign investment.';
}
test('published state geometry and statistical registry cover exactly 50 states and DC',()=>{
 assert(M.validate(d));assert.equal(g.shapes.length,51);
 assert.deepEqual(g.shapes.map(s=>s.code).sort(),d.rows.map(r=>r.code).sort());
 for(const s of g.shapes){assert(s.path.startsWith('M'));assert(!/NaN|Infinity|undefined/.test(s.path));assert(s.centroid.every(Number.isFinite));assert(s.label.every(Number.isFinite));}
 assert(g.shapes.find(s=>s.code==='AK').inset);assert(g.shapes.find(s=>s.code==='HI').inset);
 assert.equal(d.rows.find(r=>r.code==='DC').totalExports,null);
 assert(d.rows.every(r=>r.totalExports===null||Number.isInteger(r.totalExports)));
 for(const r of d.rows)for(const partner of ['Canada','China'])if(r.partners[partner].value===null)assert.equal(r.partners[partner].status,'not_reported');
});
test('source parser separates explicit leading-market values, state identity and reference year',()=>{
 const r=parseStateProfile(fixture(),{name:'Michigan'});
 assert.equal(r.year,2025);assert.equal(r.totalExports,60.3e9);assert.equal(r.partners.Canada.value,23.2e9);assert.equal(r.partners.China.value,1.5e9);
 const absent=parseStateProfile(fixture('Michigan','Mexico'),{name:'Michigan'});
 assert.equal(absent.partners.Canada.value,null,'foreign investment mention cannot become Canada exports');
 assert.throws(()=>parseStateProfile(fixture('Delaware'),{name:'District of Columbia'}),/identity/);
 assert.throws(()=>parseStateProfile(fixture().replace('to Canada in 2025','to Canada in 2024'),{name:'Michigan'}),/period/);
 assert.throws(()=>parseStateProfile(fixture().replace('China ($1.5 billion)','China ($99 billion)'),{name:'Michigan'}),/reconcile/);
});
test('map colours, numerical bins and table swatches share one measure and preserve unknowns',()=>{
 const row={year:2025,totalExports:100,partners:{Canada:{value:0},China:{value:null}}};
 for(const [value,bin]of [[0,0],[4.9,0],[5,1],[15,2],[30,3]]){
  row.partners.Canada.value=value;const s={partner:'Canada',metric:'share',year:'2025'};
  assert.equal(M.paint(row,s).bin,bin);assert.equal(M.paint(row,s).fill,M.colours[bin]);
 }
 assert.equal(M.paint(row,{partner:'China',metric:'share',year:'2025'}).bin,'missing');
 assert.equal(M.measure(row,{partner:'Canada',metric:'share',year:'2026'}),null);
 assert.equal(M.normalize(d,{state:'BAD',partner:'bad',metric:'bad'}).state,'MI');
});
test('profile refresh retains older values during outages and limits concurrent source fetches',async()=>{
 let active=0,peak=0;
 const result=await refreshStateProfiles(d,{now:'2026-11-10T12:00:00Z',fetchImpl:async url=>{
  active++;peak=Math.max(peak,active);await new Promise(r=>setTimeout(r,1));
  const row=d.rows.find(r=>r.sourceURL===url);active--;
  if(row.code==='DC')throw Error('Fixture missing profile');
  return {ok:true,status:200,text:async()=>'<main><h1>'+row.name+'</h1><p>'+fixture(row.name)+'</p></main>'};
 }});
 assert(peak<=4);assert.equal(result.status,'partial');assert.equal(result.rows.find(r=>r.code==='MI').lastReadStatus,'success');
 const old=d.rows.find(r=>r.code==='DC'),missing=result.rows.find(r=>r.code==='DC');
 assert.equal(missing.totalExports,old.totalExports);assert.equal(missing.lastReadStatus,'failed');
 const offline=await refreshStateProfiles(d,{fetchImpl:async()=>{throw Error('offline');}});
 assert.equal(offline.status,'unavailable');
 assert.deepEqual(offline.rows.map(r=>r.totalExports),d.rows.map(r=>r.totalExports));
});
test('rendered state map, labels and accessible table retain exact state-to-data matches',async()=>{
 const nodes=new Map(),events={};const node=id=>{if(!nodes.has(id))nodes.set(id,{innerHTML:'',isConnected:true,querySelectorAll:()=>[],querySelector:()=>({focus(){}})});return nodes.get(id);};
 const language={value:'en'},window={USStateModel:M,addEventListener(k,f){events[k]=f;},DashboardI18n:{get language(){return language.value;},get locale(){return language.value==='fr'?'fr-CA':language.value==='zh-Hans'?'zh-CN':'en-CA';},t(s){return I18n.t(s,language.value);}}};
 const ctx={window,document:{getElementById:node,addEventListener(k,f){events[k]=f;}},Intl,fetch:async url=>({ok:true,json:async()=>url==='us-state-map.json'?g:{stateTrade:d}})};vm.createContext(ctx);
 for(const p of ['us-state-copy.js','us-state-map.js'])vm.runInContext(read('app/'+p),ctx,{filename:p});
 window.USStates.mount('map',{partner:'Canada'});await window.USStates.ready;
 for(const partner of ['Canada','China'])for(const metric of ['share','value']){
  for(const [key,value]of [['partner',partner],['metric',metric]])events.change({target:{closest(){return {id:'usstate-'+key,value,dataset:{usstateFilter:key}};}}});
  const html=node('map').innerHTML,s=window.USStates.state;
  assert.equal((html.match(/role="button" tabindex="0" data-usstate=/g)||[]).length,51);
  assert.equal((html.match(/class="usstate-row-button"/g)||[]).length,51);
  for(const shape of g.shapes){
   const r=d.rows.find(r=>r.code===shape.code),paint=M.paint(r,s),i=html.indexOf('data-usstate="'+shape.code+'"');
   assert(html.slice(i,i+shape.path.length+700).includes('fill="'+paint.fill+'"'),shape.code+' map');
   const table=html.indexOf('class="usstate-row-button"',html.indexOf('data-usstate="'+shape.code+'" class="usstate-row-button"'));
   assert(table>=0);assert(html.slice(table,table+250).includes('background:'+paint.fill),shape.code+' table');
  }
 }
 window.USStates.mount('map',{partner:'China',lockedPartner:'China'});
 assert(node('map').innerHTML.includes('id="usstate-partner" data-usstate-filter="partner" disabled'));
 assert(!node('map').innerHTML.includes('Goods exports to Canada'));
 events.change({target:{closest(){return {id:'usstate-partner',value:'Canada',dataset:{usstateFilter:'partner'}};}}});
 assert.equal(window.USStates.state.partner,'China');
 language.value='fr';events['dashboard-language-changed']();assert(node('map').innerHTML.includes('États américains'));
 language.value='zh-Hans';events['dashboard-language-changed']();assert(node('map').innerHTML.includes('美国各州'));
});
test('the U.S. state route loads independently from the national reviewed register',async()=>{
 const nodes=new Map(),node=id=>{if(!nodes.has(id))nodes.set(id,{innerHTML:'',isConnected:true,querySelectorAll:()=>[]});return nodes.get(id);};
 let maps=0;
 const window={USTradeModel:(await import('../app/us-trade-model.js')).default,USStates:{mount(id){assert.equal(id,'usstate-root');maps++;}},addEventListener(){}};
 const ctx={window,document:{getElementById:node,addEventListener(){}},location:{hash:'#us-trade?view=states&partner=China'},history:{replaceState(){}},URLSearchParams,Intl,Date,fetch:async()=>{throw Error('reviewed register unavailable');}};
 vm.createContext(ctx);vm.runInContext(read('app/us-trade.js'),ctx);
 window.USTrade.show();await window.USTrade.ready;
 assert(maps>=2);assert(node('us-trade-root').innerHTML.includes('id="usstate-root"'));
 assert(!node('us-trade-root').innerHTML.includes('U.S. evidence could not be loaded'));
});
