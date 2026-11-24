import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import Media from '../app/source-media.js';
import Data from '../app/source-media-data.js';
import B from '../app/daily-briefing.js';
import R from '../app/research-register.js';
const code=fs.readFileSync(new URL('../app/daily-print.js',import.meta.url),'utf8');
const classes=()=>{const values=new Set();return {add:x=>values.add(x),remove:x=>values.delete(x),contains:x=>values.has(x),toggle(x,on){if(on)values.add(x);else values.delete(x);}};};
function setup(){
 const events={},dispatched=[],details=[{open:false},{open:true},{open:false}],controls=[{disabled:false,setAttribute(){},removeAttribute(){}}];
 const images=[true,false].map(complete=>({complete,naturalWidth:complete?800:0,hidden:false,attrs:{loading:'lazy'},events:{},getAttribute(k){return this.attrs[k]??null;},setAttribute(k,v){this.attrs[k]=v;},removeAttribute(k){delete this.attrs[k];},addEventListener(k,f){this.events[k]=f;},removeEventListener(k){delete this.events[k];},holder:{classList:classes()},closest(){return this.holder;}}));
 const links=[{href:'#stronger-canada?topic=energy',getAttribute(){return this.href;},setAttribute(k,v){this.href=v;}}];
 const root={isConnected:true,classList:classes(),querySelectorAll(s){return s==='details'?details:s==='.source-media-print-only img'?images:s==='[data-daily-print]'?controls:s==='a[href^="#"]'?links:[];},querySelector(){return null;}};
 const calls=[],window={document:{baseURI:'https://policyintelligence.nordivara.ca/',querySelector:()=>root,createElement:()=>({dataset:{},setAttribute(){}}),fonts:{ready:Promise.resolve()}},CustomEvent:class{constructor(type){this.type=type;}},dispatchEvent(e){dispatched.push(e.type);},addEventListener(k,f){events[k]=f;},print(){calls.push({expanded:details.every(x=>x.open),failedHidden:images[1].hidden});events.beforeprint();}};
 vm.runInNewContext(code,{window,setTimeout,clearTimeout,URL});return {api:window.DailyPrint,root,details,images,links,controls,events,calls,dispatched,window};
}

test('PDF preparation opens every nested disclosure and print/cancel restores the prior dashboard state',()=>{
 const {api,root,details,images,links,events,dispatched,window}=setup();
 events.beforeprint();assert(details.every(x=>x.open));assert(root.classList.contains('daily-printing'));assert(images.every(x=>x.loading==='eager'));assert(api.active);
 events.beforeprint();events.afterprint();assert.deepEqual(details.map(x=>x.open),[false,true,false]);assert(images.every(x=>x.attrs.loading==='lazy'));assert(!root.classList.contains('daily-printing'));assert(!api.active);assert.deepEqual(dispatched,['daily-print-finished']);
 assert.equal(links[0].href,'#stronger-canada?topic=energy');api.prepare(root);assert.equal(links[0].href,'https://policyintelligence.nordivara.ca/#stronger-canada?topic=energy');api.finish();
 events.afterprint();assert.equal(dispatched.length,2);window.document.querySelector=()=>null;events.beforeprint();assert(!api.active);
});

test('Save as PDF waits for loaded briefing data and source images, suppresses duplicate requests and discloses a failed graphic',async()=>{
 const {api,root,details,images,controls,events,calls}=setup();let ready;
 const promise=api.print(root,{ready:new Promise(resolve=>ready=resolve)});assert(controls[0].disabled);assert.equal(api.print(root),promise);assert.equal(calls.length,0);assert(!api.active);
 ready();await new Promise(setImmediate);assert(api.active);assert.equal(calls.length,0);
 images[1].events.error();await promise;assert.equal(calls.length,1);assert.deepEqual(calls[0],{expanded:true,failedHidden:true});assert(images[1].holder.classList.contains('source-media-print-unavailable'));assert(!controls[0].disabled);
 events.afterprint();assert.deepEqual(details.map(x=>x.open),[false,true,false]);
});

test('a failed export preparation re-enables controls and never leaves disclosures forced open',async()=>{
 const {api,root,controls}=setup();await assert.rejects(api.print(root,{ready:Promise.reject(Error('dataset unavailable'))}),/dataset unavailable/);assert(!controls[0].disabled);assert(!api.active);assert(!api.busy);
});

test('a browser that declines to open printing still restores the dashboard',async()=>{
 const {api,root,details,images,window}=setup();window.matchMedia=()=>({matches:false});images[1].complete=true;images[1].naturalWidth=600;await api.print(root);assert(!api.active);assert.deepEqual(details.map(x=>x.open),[false,true,false]);
});

test('paper media contains actual chart images and exact data; interactive charts and videos retain playable source links',()=>{
 const chart=Data.entries.find(x=>x.id==='statcan-fdi-2025'),plan=Data.entries.find(x=>x.context==='framework');
 const html=Media.printAssetHTML(chart);assert(html.includes('<img'));assert(html.includes(chart.cachedURL));assert(html.includes('816.8'));assert(html.includes('43.4'));assert(!html.includes('<iframe'));assert(!html.includes('<video'));assert(Media.printAssetHTML(plan).includes('Eight strategic capabilities'));
 for(const item of Data.entries.filter(x=>['video','video_embed','chart_embed'].includes(x.kind))){const paper=Media.printAssetHTML(item);assert(paper.includes(item.url));assert(paper.includes('online.'));assert(!paper.includes('<iframe'));assert(!paper.includes('autoplay'));}
 assert.equal(Media.printAssetHTML({...chart,url:'https://evil.example/fake.png'}),'');
});

test('the full paper edition preserves the selected scope, all seven sections, source checks, instruments and chart data',()=>{
 const trade=JSON.parse(fs.readFileSync(new URL('../app/regional-statistics.json',import.meta.url),'utf8'));
 const model=B.buildBriefing({register:R,now:Date.parse('2026-11-24T17:00:00Z'),tradeData:trade,filters:{topic:'agriculture',relationship:'Canada-China',region:'SK',partner:'China',stage:'policy'}}),html=B.renderBriefing(model,{});
 assert(html.includes('Full briefing'));assert(html.includes('Saskatchewan · China · Monthly export value'));assert(html.includes('Policy and tariffs'));for(const id of Object.keys(B.sections))assert(html.includes('id="daily-'+id+'"'));
 for(const value of ['Agreements and implementation watch','Sources, dates and evidence limits','Show chart data','Source changes to review','Source coverage and scan details','Evidence and verification method','Evidence confidence','Last source check'])assert(html.includes(value),value);
 const index=fs.readFileSync(new URL('../app/index.html',import.meta.url),'utf8');assert(index.indexOf('daily-print.js')<index.indexOf('daily-briefing.js'));assert(index.indexOf('daily-print.css')>index.indexOf('source-media.css'));
});
