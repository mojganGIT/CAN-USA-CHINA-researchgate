import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {buildWeeklyDigest,atomFeed,writeWeeklyFeeds,FEED_FILES} from '../monitor/weekly-digest-core.mjs';
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
 const atom=atomFeed(first);assert(atom.includes('xmlns="http://www.w3.org/2005/Atom"'));assert(atom.includes('A &lt;new&gt; &amp; old source'));assert(!atom.includes('A <new>'));assert(atom.includes('How could Canada and its provinces be affected?'));assert(atom.includes('https://www.canada.ca/test'));
});
test('all three weekly feeds preserve issue dates, source URLs and stable language-specific identities',()=>{
 const digest=buildWeeklyDigest({now:new Date('2026-11-04T15:00:00Z'),canada,us}),before=JSON.stringify(digest),ids=new Set();
 for(const [language,file]of Object.entries(FEED_FILES)){
  const xml=atomFeed(digest,{language});assert(xml.includes('xml:lang="'+language+'"'));assert(xml.includes('/'+file));assert(xml.includes(digest.issues[0].publishedAt));assert(xml.includes(canada.sources.S01.url));
  execFileSync('python3',['-c','import sys,xml.etree.ElementTree as E; r=E.fromstring(sys.stdin.read()); n={"a":"http://www.w3.org/2005/Atom"}; assert r.find("a:entry/a:content",n) is not None'],{input:xml,stdio:['pipe','pipe','pipe']});
  const id=xml.match(/<entry><id>(.*?)<\/id>/)[1];ids.add(id);assert.equal(atomFeed(digest,{language}),xml);
  if(language==='en')assert(id.endsWith('/weekly/'+digest.issues[0].id));
  if(language==='fr'){assert(xml.includes('Pourquoi est-ce important pour le Canada'));assert(xml.includes('?lang=fr#weekly-updates'));}
  if(language==='zh-Hans'){assert(xml.includes('为什么这对加拿大重要'));assert(xml.includes('?lang=zh-Hans#weekly-updates'));}
 }
 assert.equal(ids.size,3);assert.equal(JSON.stringify(digest),before);
});
test('missing weekly language files regenerate between editions without changing the issue or republishing it',async()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'policy-weekly-feeds-')),url=pathToFileURL(directory+'/'),digest=buildWeeklyDigest({now:new Date('2026-11-04T15:00:00Z'),canada,us}),before=JSON.stringify(digest);
 try{
  assert.equal((await writeWeeklyFeeds(digest,{directory:url})).length,3);assert.deepEqual(await writeWeeklyFeeds(digest,{directory:url}),[]);
  fs.unlinkSync(path.join(directory,FEED_FILES.fr));assert.deepEqual(await writeWeeklyFeeds(digest,{directory:url}),[FEED_FILES.fr]);
  assert.equal(JSON.stringify(digest),before);assert.equal(buildWeeklyDigest({now:new Date('2026-11-05'),previous:digest,canada,us}),digest);
 }finally{fs.rmSync(directory,{recursive:true,force:true});}
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
test('weekly subscription and copied address follow the language without replacing open edition content',async()=>{
 const nodes=new Map(),node=id=>{if(!nodes.has(id))nodes.set(id,{innerHTML:'',isConnected:true});return nodes.get(id);},location={hash:'#weekly-updates'},events={},windowEvents={},copied=[];
 const digest=buildWeeklyDigest({now:new Date('2026-11-04'),canada,us}),window={DashboardI18n:{language:'fr'},addEventListener:(n,f)=>windowEvents[n]=f};
 const ctx={window,document:{getElementById:node,addEventListener:(n,f)=>events[n]=f},navigator:{clipboard:{writeText:async text=>copied.push(text)}},location,URL,URLSearchParams,Intl,Date,fetch:async url=>({ok:true,json:async()=>url.startsWith('/api')?{emailAvailable:false}:digest})};vm.createContext(ctx);vm.runInContext(read('app/weekly-updates.js'),ctx);window.WeeklyUpdates.show();await window.WeeklyUpdates.ready;
 const unchanged=node('root').innerHTML;assert(unchanged.includes('href="weekly-updates.fr.xml"'));
 for(const [language,file]of Object.entries(FEED_FILES)){
  window.DashboardI18n.language=language;windowEvents['dashboard-language-changed']();assert.equal(node('weekly-feed-link').href,file);assert(node('weekly-feed-url').value.endsWith('/'+file));assert.equal(node('root').innerHTML,unchanged);
  await events.click({target:{closest:()=>({})}});assert(copied.at(-1).endsWith('/'+file));
 }
});
