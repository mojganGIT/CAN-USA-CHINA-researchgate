import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import F from '../app/relationship-findings.js';
const read=name=>JSON.parse(fs.readFileSync(new URL('../app/'+name+'.json',import.meta.url),'utf8'));
const evidence=read('evidence-records'),regional=read('regional-statistics'),us=read('us-trade-statistics');
const issue=(id,index,topic='agriculture')=>({topic:{id:topic},issue:{id},index});

test('canola charts use the selected destination, measurement and reference window',()=>{
 const seed=F.choices(issue('canola',1))[0],r=F.series(evidence,seed);
 assert.equal(r.kind,'canola');assert.equal(r.unit,'tonnes');assert.equal(r.current,2581011);
 assert.equal(r.labels.at(-1),'2026-08');assert.equal(r.prior,null);assert.equal(r.marker,'2026-03');
 assert.equal(r.values[0],0,'reported zero is an observation');
 const bad=structuredClone(evidence);bad.records.find(r=>r.id===seed.id).series.values[1]++;
 assert.equal(F.series(bad,seed),null,'an unreconciled series is not charted');
 const usCanola=F.series(evidence,F.choices(issue('canola',0))[0]);
 assert.equal(usCanola.kind,'products');assert.equal(usCanola.labels.length,3);assert.equal(usCanola.values[0],242489);
 assert(!('year' in usCanola),'one reference-period cross-section is not a time series');
});

test('trade comparisons retain sector coverage, currency, matched periods and missing values',()=>{
 const energy=F.choices(issue('networks',1,'energy'))[0];
 const r=F.series(regional,energy,{year:'2026'});assert.equal(r.kind,'regional');assert.equal(r.unit,'CAD');assert(r.title.includes('Energy products'));assert(r.scope.includes('broader product group'));assert.equal(r.labels.length,r.previous.length);
 const bad=structuredClone(regional);const first=bad.series.find(s=>s.region==='Canada'&&s.partner==='China'&&s.topic==='energy').points.find(p=>p.period==='2026-01-01');first.securityLevelCode=1;
 const missing=F.series(bad,energy,{year:'2026'});assert.equal(missing.values[0],null);assert.equal(missing.current,null);assert.equal(missing.change,null);
 const trade=F.choices(issue('market-access',2,'vehicles'))[0];assert.equal(trade.partner,'China');
 const imp=F.series(us,trade,{year:'2025',flow:'imports'}),exp=F.series(us,trade,{year:'2025',flow:'exports'}),bal=F.series(us,trade,{year:'2025',flow:'balance'});
 assert(imp.scope.includes('all goods'));assert.equal(imp.unit,'USD million');assert.notEqual(imp.current,exp.current);assert(Math.abs(bal.current-(exp.current-imp.current))<0.1);assert.equal(bal.percent,null);
 assert.deepEqual(F.choices(issue('telecom',0,'technology')),[]);
});
