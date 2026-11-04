import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {buildWeeklyDigest,atomFeed} from '../monitor/weekly-digest-core.mjs';
import {subscriptionConfig} from '../api/src/lib/weekly-subscription.js';
const read=f=>fs.readFileSync(new URL('../'+f,import.meta.url),'utf8');
const canada=JSON.parse(read('app/evidence-records.json')),us=JSON.parse(read('app/us-trade-evidence.json'));
test('weekly editions are idempotent, use detection windows and do not relabel baselines as new policy',()=>{
 const now=new Date('2026-11-04T15:00:00Z'),feed={lastRunStatus:'partial',sourceFailures:[{url:'blocked'}],changes:[{id:'test',title:'A <new> & old source',url:'https://www.canada.ca/test',topics:['agriculture'],detectedAt:'2026-11-03T15:00:00Z',publicationDate:'2020-01-01',changeType:'new_source'},{id:'old',detectedAt:'2026-09-01T00:00:00Z'}]};
 const first=buildWeeklyDigest({now,feed,canada,us});assert.equal(first.issues.length,1);assert.equal(first.issues[0].observationCount,1);assert(first.issues[0].reviewed.every(r=>r.baseline));assert(first.issues[0].observations[0].kind.includes('not necessarily a new policy'));
 assert.equal(buildWeeklyDigest({now:new Date('2026-11-05'),previous:first,feed,canada,us}),first);
 const next=buildWeeklyDigest({now:new Date('2026-11-09T15:00:00Z'),previous:first,feed,canada,us});assert.equal(next.issues.length,2);assert.equal(next.issues[0].reviewed.length,0);assert.equal(next.issues[0].sourceFailures,1);
 const revised=structuredClone(canada);revised.records[0].summary='Revised observed value; no causal attribution.';
 const changed=buildWeeklyDigest({now:new Date('2026-11-16T15:00:00Z'),previous:next,feed,canada:revised,us});assert.equal(changed.issues[0].reviewed.length,1);assert(!changed.issues[0].reviewed[0].baseline);
 const atom=atomFeed(first);assert(atom.includes('xmlns="http://www.w3.org/2005/Atom"'));assert(atom.includes('A &lt;new&gt; &amp; old source'));assert(!atom.includes('A <new>'));assert(atom.includes('Provincial exposure:'));assert(atom.includes('https://www.canada.ca/test'));
});
test('email signup only becomes available for a valid hosted HTTPS signup URL',()=>{
 assert.deepEqual(subscriptionConfig({}),{emailAvailable:false,signupURL:null});
 for(const url of ['javascript:alert(1)','http://example.com','https://user:secret@example.com'])assert.equal(subscriptionConfig({WEEKLY_SIGNUP_URL:url}).emailAvailable,false);
 assert.deepEqual(subscriptionConfig({WEEKLY_SIGNUP_URL:'https://example.com/newsletter'}),{emailAvailable:true,signupURL:'https://example.com/newsletter'});
});
test('weekly tab handles unavailable email, escaping and a late response after navigation',async()=>{
 const nodes=new Map(),node=id=>{if(!nodes.has(id))nodes.set(id,{innerHTML:'',isConnected:true});return nodes.get(id);},location={hash:'#weekly-updates'},events={};
 const digest=buildWeeklyDigest({now:new Date('2026-11-04'),canada,us});digest.issues[0].lead='<script>bad()</script>';
 const ctx={window:{addEventListener(){}},document:{getElementById:node,addEventListener:(n,f)=>events[n]=f},location,URL,URLSearchParams,Intl,Date,fetch:async url=>({ok:true,json:async()=>url.startsWith('/api')?{emailAvailable:false}:digest})};vm.createContext(ctx);vm.runInContext(read('app/weekly-updates.js'),ctx);ctx.window.WeeklyUpdates.show();await ctx.window.WeeklyUpdates.ready;
 let html=node('root').innerHTML;assert(html.includes('weekly-updates.xml'));assert(html.includes('reviewed Nov 3, 2026'));assert(html.includes('Email signup is not connected'));assert(html.includes('&lt;script&gt;'));assert(!html.includes('<script>'));assert(!html.includes('type="email"'));
 ctx.window.WeeklyUpdates.show();location.hash='#compare-topics';node('root').innerHTML='CANADIAN COMPARISON';await ctx.window.WeeklyUpdates.ready;assert.equal(node('root').innerHTML,'CANADIAN COMPARISON');
});
