import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import register from '../app/research-register.js';
import I18n from '../app/i18n.js';
import {safeURL} from '../monitor/core.mjs';

const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const ca=JSON.parse(read('app/evidence-records.json'));
const hosts=JSON.parse(read('monitor/sources.json')).allowedHosts;
const c={window:{}};vm.createContext(c);
for(const file of ['research-register.js','dashboard-guide.js'])vm.runInContext(read('app/'+file),c);
const guide=c.window.PolicyGuide;

test('new evidence keeps provenance, bilingual translations and status distinctions',()=>{
 const ids=new Set(),topics=new Set(ca.assessments.map(x=>x.id));
 for(const r of register.records){
  assert(!ids.has(r.id));ids.add(r.id);
  assert.match(r.date,/^\d{4}-\d{2}-\d{2}$/);assert(r.date<=register.reviewedAt);
  assert(r.topics.every(t=>topics.has(t))&&r.regions?.every(v=>ca.regions[v])!==false);
  assert(r.sources.length&&r.sources.every(s=>s.publisher&&new URL(s.url).protocol==='https:'));
  if(r.kind!=='analysis')for(const s of r.sources)assert.doesNotThrow(()=>safeURL(s.url,hosts),s.url);
  for(const lang of ['fr','zh-Hans'])for(const k of ['title','changed','canada','limit'])assert.notEqual(I18n.t(r[k],lang),r[k],r.id+' '+k);
 }
 const extension=register.records.find(r=>r.id==='canada-china-relief-extension');
 assert.equal(extension.kind,'extension');assert.equal(extension.through,'2028-12-31');
 assert(extension.limit.includes('does not extend the canola-seed tariff'));
 assert.equal(register.records.find(r=>r.id==='us-china-board-framework').kind,'recommendation');
 assert.equal(register.records.find(r=>r.id==='canada-september-merchandise').period,'2026-09');
});

test('policy and evidence views separate interpretation, geography and partner scope',()=>{
 const policy=guide.register('policy',{topic:'agriculture',relationship:'Canada-China',period:'2026',region:'SK'});
 assert(policy.includes('canada-china-relief-extension'));assert(!policy.includes('canada-china-food-security'));
 assert(!guide.register('policy',{region:'ON',topic:'agriculture'}).includes('canada-china-relief-extension'));
 assert(guide.register('policy',{period:'2018'}).includes('section-301-start'));
 const us=guide.register('us',{partner:'China',year:'2026'});
 assert(us.includes('us-china-board-framework')&&us.includes('piie-tariff-series'));
 assert(!us.includes('cusma-joint-review-meeting'));
 assert(guide.register('evidence',{topic:'energy'}).includes('canada-september-energy'));
 assert(guide.register('evidence',{topic:'agriculture'}).includes('canada-china-food-security'));
});
