import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {buildHomePosition} from '../scripts/build-home-position.mjs';
import I18n from '../app/i18n.js';
const read=name=>fs.readFileSync(new URL('../'+name,import.meta.url),'utf8');
const evidence=JSON.parse(read('app/evidence-records.json')),stats=JSON.parse(read('app/regional-statistics.json'));
const data=buildHomePosition(evidence,stats),geometry=JSON.parse(read('app/canada-map.json'));
function runtime(fetchImpl){
 const nodes=new Map(),events={};const node=id=>{if(!nodes.has(id))nodes.set(id,{id,innerHTML:'',isConnected:true,querySelector(){return null;},focus(){}});return nodes.get(id);};
 const document={getElementById:node,addEventListener:(type,fn)=>events[type]=fn};
 const window={document,addEventListener:(type,fn)=>events[type]=fn};
 const c={window,document,Intl,Date,URLSearchParams,fetch:fetchImpl};vm.createContext(c);
 vm.runInContext(read('app/explorer-catalog.js'),c);vm.runInContext(read('app/home-position.js'),c);
 return {api:window.HomePosition,window,node,events};
}
test('Home export shares use complete matching periods, a national denominator and original regional scope',()=>{
 const before=JSON.stringify(stats),d=buildHomePosition(evidence,stats);
 assert.equal(d.regions.length,13);assert(d.statistics.period.year>=2026);assert(d.statistics.period.month>=1&&d.statistics.period.month<=12);
 assert(Math.abs(d.national.shares.reduce((n,p)=>n+p.share,0)-100)<1e-9);
 const total=partner=>stats.series.find(s=>s.region==='Canada'&&s.topic==='all'&&s.partner===partner).points.filter(p=>p.period.startsWith(d.statistics.period.year+'-')&&Number(p.period.slice(5,7))<=d.statistics.period.month).reduce((sum,p)=>sum+Number(p.value)*10**Number(p.scalarFactorCode),0);
 const us=d.national.shares.find(p=>p.partner==='United States');assert.equal(us.value,total('United States'));assert.equal(us.share,total('United States')/total('All countries')*100);
 assert.equal(d.national.shares[2].value,total('All countries')-total('United States')-total('China'));
 assert.equal(d.reviewedAt,evidence.asOf);assert.equal(d.statistics.retrievedAt,stats.retrievedAt);
 assert.equal(d.regions.find(r=>r.code==='SK').summary,evidence.regions.SK.summary);assert.equal(JSON.stringify(stats),before);
});
test('incomplete, suppressed and zero-base totals cannot create a diversification or regional score',()=>{
 const missing=structuredClone(stats);const s=missing.series.find(s=>s.region==='Canada'&&s.topic==='all'&&s.partner==='China');s.points=s.points.filter(p=>!p.period.startsWith(data.statistics.period.year+'-01'));
 assert.equal(buildHomePosition(evidence,missing).national.shares,null);
 const suppressed=structuredClone(stats);const t=suppressed.series.find(s=>s.region==='Ontario'&&s.topic==='all'&&s.partner==='United States');t.points.find(p=>p.period.startsWith(data.statistics.period.year+'-01')).securityLevelCode=1;
 assert.equal(buildHomePosition(evidence,suppressed).regions.find(r=>r.code==='ON').shares,null);
 const invalid=buildHomePosition(evidence,{mappingVersion:1,series:[],status:'unavailable'});assert.equal(invalid.statistics.period,null);assert.equal(invalid.national.shares,null);assert.equal(invalid.regions.length,13);
 const zero=structuredClone(stats);for(const s of zero.series.filter(s=>s.region==='Canada'&&s.topic==='all'))for(const p of s.points.filter(p=>p.period.startsWith((data.statistics.period.year-1)+'-')))p.value=0;
 assert.equal(buildHomePosition(evidence,zero).national.priorShares,null);
});
test('the overview loads compact data once, preserves all eight links and opens source-matched provincial maps',async()=>{
 const requests=[],r=runtime(async url=>{requests.push(url);return {ok:true,json:async()=>url==='home-position.json'?data:geometry};});
 r.api.mount();await r.api.ready;const html=r.node('hub-position').innerHTML;
 assert.deepEqual(requests,['home-position.json','canada-map.json']);assert.equal((html.match(/data-home-sector=/g)||[]).length,8);assert.equal((html.match(/data-home-map-region=/g)||[]).length,13);
 assert(html.includes('Trade Dependence and Diversification'));assert(html.includes('January through'));assert(html.includes(String(data.statistics.period.year)));assert(html.includes(String(data.statistics.period.year-1)));assert(!html.includes('816.8 billion'));
 r.events.change({target:{dataset:{homePositionFilter:'region'},value:'SK'}});r.events.change({target:{dataset:{homePositionFilter:'partner'},value:'China'}});
 const sk=r.node('hub-position').innerHTML;assert(sk.includes('region=SK&amp;topic=agriculture'));assert(sk.includes('relationship=Canada-China'));assert(sk.includes('Saskatchewan'));assert(!sk.includes('region=undefined'));assert(sk.includes('0–5%'));assert(sk.includes('15–100%'));const fills=Array.from(sk.matchAll(/fill="(#[a-f0-9]+)" fill-rule="evenodd"/g),m=>m[1]);assert(new Set(fills).size>1,'China exposure uses ranges that reveal provincial differences');
 await r.api.load();assert.equal(requests.length,2);
});
test('a failed map retains the 13-region selector, and later failures preserve labelled prior data',async()=>{
 let fail=false;const r=runtime(async url=>{if(url==='canada-map.json'||fail)throw Error('offline');return {ok:true,json:async()=>data};});
 r.api.mount();await r.api.ready;assert(r.node('hub-position').innerHTML.includes('The map is temporarily unavailable'));assert(r.node('hub-position').innerHTML.includes('value="NU"'));
 fail=true;await r.api.load(true);const html=r.node('hub-position').innerHTML;assert(html.includes('Showing the saved dates and values'));assert(html.includes(data.reviewedAt.slice(0,4)));assert.equal(r.api.data.statistics.retrievedAt,stats.retrievedAt);
});
test('late overview loads cannot replace another tab, and labels retain French and Chinese support',async()=>{
 let resolve;const pending=new Promise(r=>resolve=r),r=runtime(async url=>({ok:true,json:async()=>url==='home-position.json'?await pending:geometry}));
 r.api.mount();const host=r.node('hub-position');host.isConnected=false;r.node('root').innerHTML='SEARCH VIEW';resolve(data);await r.api.ready;assert.equal(r.node('root').innerHTML,'SEARCH VIEW');
 for(const lang of ['fr','zh-Hans'])for(const text of ['Canada’s Strategic Position at a Glance','Trade Dependence and Diversification','Eight Sector Assessments','Provincial Exposure'])assert.notEqual(I18n.t(text,lang),text);
 const workflow=read('.github/workflows/azure-static-web-apps-ambitious-field-09c66cd10.yml');assert(workflow.indexOf('node scripts/build-home-position.mjs')<workflow.indexOf('name: Build And Deploy'));
});
