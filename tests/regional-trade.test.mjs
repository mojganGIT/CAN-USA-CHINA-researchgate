import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import vm from 'node:vm';
import M from '../app/regional-trade-model.js';
const root=new URL('../',import.meta.url),read=p=>fs.readFileSync(new URL(p,root),'utf8');
const regions=JSON.parse(read('app/evidence-records.json')).regions;
const point=(month,value,extra={})=>({period:'2026-'+String(month).padStart(2,'0')+'-01',value,scalarFactorCode:3,statusCode:0,symbolCode:0,securityLevelCode:0,...extra});
test('monetary scaling preserves missing, suppressed, rounded-to-zero and true-zero distinctions',()=>{
 assert.equal(M.amount(point(1,123)),123000);assert.equal(M.amount(point(1,0)),0);
 for(const p of [undefined,point(1,null),point(1,' '),point(1,99,{securityLevelCode:1}),point(1,0,{statusCode:2}),point(1,99,{statusCode:8})])assert.equal(M.amount(p),null);
 assert.equal(M.amount(point(1,12,{statusCode:7})),12000);
 assert.equal(M.total({points:[point(1,10),point(3,20)]},2026,3),null);
 assert.equal(M.change(100,0),null);assert.equal(M.ratio(0,100),0);
});
test('shares use matching region, product and period; national values are never allocated',()=>{
 const series=[];
 for(const [region,base] of [['Canada',1000],['Ontario',100]])for(const [partner,factor] of [['All countries',1],['United States',.8],['China',.1]])series.push({region,topic:'all',partner,points:[point(1,base*factor),point(2,base*factor)]});
 const data={mappingVersion:2,series},s=M.snapshot(data,{region:'ON',topic:'finance',period:'2026'},regions);
 assert.equal(s.partners[0].current,160000);assert.equal(s.partners[0].share,80);assert.equal(s.partners[1].share,10);assert(s.contextOnly);
 assert.equal(M.snapshot(data,{region:'YT',topic:'all',period:'2026'},regions).available,false);
 assert.equal(M.snapshot(data,{region:'ON',topic:'all',period:'2024'},regions).available,false);
 assert.equal(M.exposure(data,{region:'ON',topic:'all',relationship:'USA-China'},regions).share,null);
 assert.equal(M.snapshot({...data,mappingVersion:1},{region:'ON'},regions).available,false);
});
test('collector safely correlates shuffled official responses and preserves a previous valid vintage on failure',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'regional-trade-'));
 try{
  fs.mkdirSync(path.join(temp,'monitor'));fs.mkdirSync(path.join(temp,'app'));
  fs.writeFileSync(path.join(temp,'monitor/refresh-regional-stats.mjs'),read('monitor/refresh-regional-stats.mjs'));
  const fixture=new URL('tests/regional-stats-fixture.mjs',root),metadata=new URL('monitor/regional-series-metadata.json',root);
  const run=extra=>execFileSync(process.execPath,['--import',fixture.href,path.join(temp,'monitor/refresh-regional-stats.mjs')],{env:{...process.env,STATSCAN_FIXTURE_METADATA:metadata.pathname,...extra},stdio:'pipe'});
  run({});const first=JSON.parse(fs.readFileSync(path.join(temp,'app/regional-statistics.json')));
  assert.equal(first.status,'success');assert.equal(first.mappingVersion,2);assert.equal(first.series.length,168);assert.equal(new Set(first.series.map(s=>s.coordinate)).size,168);
  for(const series of first.series){const [geo,,commodity,partner]=series.coordinate.split('.').map(Number);assert.equal(series.points[0].value,(10000+geo*1000+commodity*100)*(partner===1?1:partner===2?.7:.1));assert.equal(series.selection[0].member,series.region);}
  assert.equal(M.snapshot(first,{region:'ON',topic:'energy',period:'2026'},regions).partners[0].share,70);
  run({STATSCAN_FIXTURE_FAIL:'1'});const failed=JSON.parse(fs.readFileSync(path.join(temp,'app/regional-statistics.json')));
  assert.equal(failed.status,'unavailable');assert.deepEqual(failed.series,first.series);assert.equal(failed.retrievedAt,first.retrievedAt);assert.match(failed.error,/coordinate/);
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
test('regional statistics render 13 selectable regions, dated values and truthful map legends',async()=>{
 const series=[];
 for(const [partner,value] of [['All countries',100],['United States',80],['China',10]])series.push({region:'Ontario',topic:'all',partner,points:[point(1,value)]});
 const data={mappingVersion:2,status:'success',series,retrievedAt:'2026-11-04T03:46:00Z'},events=[];
 const window={RegionalTradeModel:M,addEventListener(){},dispatchEvent:e=>events.push(e.type)};
 const context={window,Intl,Date,Event,console,fetch:async()=>({ok:true,json:async()=>data})};vm.createContext(context);vm.runInContext(read('app/regional-trade.js'),context);
 await window.RegionalTrade.refresh();await new Promise(resolve=>setImmediate(resolve));
 const state={region:'ON',topic:'all',relationship:'all',period:'2026',layer:'trade'},html=window.RegionalTrade.html(state,regions);
 assert.equal((html.match(/data-impact-region=/g)||[]).length,14);assert(html.includes('$80,000'));assert(html.includes('80.0%'));assert(html.includes('Canada —')===false);assert(html.includes('2026'));assert(html.includes('rounded-to-zero'));assert(events.includes('regional-statistics-loaded'));
 assert.match(window.RegionalTrade.paint('ON',state,regions).label,/80.0%/);assert.match(window.RegionalTrade.legend(state,regions),/not a gain\/loss score/);
 assert.match(window.RegionalTrade.html({...state,relationship:'USA-China'},regions),/not a Canadian provincial export series/);
});
test('published vintage has complete regional coverage and consistent all-destination denominators',()=>{
 const data=JSON.parse(read('app/regional-statistics.json'));
 if(!data.series.length)return;
 assert.equal(data.mappingVersion,2);assert.equal(new Set(data.series.map(s=>s.coordinate)).size,168);
 for(const region of ['CA',...Object.keys(regions)])for(const topic of Object.keys(M.groups)){
  const s=M.snapshot(data,{region,topic,period:'all'},regions);assert(s.available);
  for(const p of s.partners)if(p.share!==null)assert(p.share>=0&&p.share<=100.01,region+' '+topic+' '+p.partner);
 }
});
