import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import Media from '../app/source-media.js';
import Data from '../app/source-media-data.js';
import {discoverSourceMedia} from '../monitor/source-media.mjs';
import B from '../app/daily-briefing.js';
const chart=Data.entries.find(x=>x.id==='statcan-fdi-2025');
const source='https://www.eia.gov/todayinenergy/detail.php?id=67904';

test('the requested chart retains its source, year, ownership basis, exact table and national scope in both tabs',()=>{
 const outcomes=JSON.parse(fs.readFileSync(new URL('../app/evidence-records.json',import.meta.url),'utf8'));
 for(const id of ['fdi-stock-us','fdi-stock-china']){
  const row=outcomes.records.find(r=>r.id===id),items=Media.forRecord(row,outcomes.sources);assert(items.some(x=>x.id===chart.id));
 }
 const library=Media.collection({topic:'investment',region:'ON'});assert(library.includes(chart.title));assert(library.includes('Year-end 2025'));assert(library.includes('not a provincial outcome measure'));assert(!library.includes('LNG Canada operating site footage'));
 const frame=Media.frameHTML(chart);assert(frame.includes(chart.url));assert(frame.includes('816.8'));assert(frame.includes('737.3'));assert(frame.includes('43.4'));assert(frame.includes('24.6'));assert(frame.includes('Accessible chart data'));assert(frame.includes('Data rendering from Statistics Canada'));assert(frame.includes('role="img"'));assert(frame.includes('Dashboard rendering')||frame.includes('dashboard rendering'));
 const diagram=Media.frameHTML(Data.entries.find(x=>x.context==='framework'));assert(diagram.includes('Eight strategic capabilities'));assert(diagram.includes('Five policy foundations'));assert(!diagram.includes('composite score'));
 assert(!Media.matching({relationship:'USA-China'}).some(x=>x.id===chart.id));assert(Media.matching({framework:true}).some(x=>x.id==='stronger-canada-plan-diagram'));
 const html=B.renderBriefing(B.buildBriefing({now:Date.parse('2026-11-24T15:00:00Z')}),{});assert(html.includes(chart.title));assert(html.includes('<iframe'));assert(html.includes('data-source-media-inline="true"'));assert(!html.includes('Load source video'));assert(!html.includes('Load source visual'));
 const index=fs.readFileSync(new URL('../app/index.html',import.meta.url),'utf8');assert(index.indexOf('source-media.js')<index.indexOf('daily-briefing.js'));assert(index.indexOf('source-media.js')<index.indexOf('stronger-canada.js'));
});

test('article discovery excludes chrome, portraits, trackers, unsupported origins and non-video iframes',()=>{
 const html=`<header><img src="/header.png" alt="A large energy chart" width="900"></header><main><img src="/logo.png" alt="Company logo" width="900"><img src="/person.jpg" alt="Headshot of official" width="600"><img src="/pixel.png" alt="Energy chart" width="1"><figure><img src="/chart.png"><figcaption>U.S.–Canada energy trade value, 2025</figcaption></figure><img src="https://evil.example/chart.png" alt="Trade chart" width="900"><video aria-label="Operating site footage"><source src="/footage.mp4"></video><iframe src="https://www.youtube.com/embed/abcdefghijk?autoplay=1" title="Official video"></iframe><iframe src="https://www.googletagmanager.com/ns.html?id=x"></iframe></main>`;
 const page=discoverSourceMedia(html,{sourceURL:source,sourceDigest:'source-one',checkedAt:'2026-11-24T12:00:00Z',title:'U.S.–Canada energy trade',issuer:'United States'});
 assert.equal(page.items.length,3);assert.deepEqual(page.items.map(x=>x.kind),['image','video','video_embed']);assert(page.items[0].url.endsWith('/chart.png'));assert.equal(page.items[2].url,'https://www.youtube-nocookie.com/embed/abcdefghijk');assert.equal(page.reviewState,'source_reported');assert(page.relationships.includes('Canada-USA'));
 assert.equal(discoverSourceMedia('<main></main>',{sourceURL:'https://evil.example/article'}),null);
});

test('automatically discovered visuals stay bound to their source version and never become reviewed analytical evidence',()=>{
 const item={kind:'image',url:'https://www.eia.gov/chart.png',title:'Source trade chart'};
 const page={sourceURL:source,sourceDigest:'one',checkedAt:'2026-11-24T12:00:00Z',topics:['energy'],relationships:['Canada-USA'],items:[item]};
 const feed={sourceMedia:[page],sourceChecks:[{url:source,digest:'one',status:'success'}]};
 const html=Media.collection({topic:'energy',relationship:'Canada-USA'},feed);assert(html.includes('Automatically discovered · analyst review pending'));assert(html.includes(item.title));assert(!html.includes('Favourable'));
 const mismatched=Media.collection({topic:'energy'}, {...feed,sourceChecks:[{url:source,digest:'two',status:'success'}]});assert(!mismatched.includes(item.title));
 const stale={...page,items:[{...item,url:chart.url}],sourceURL:chart.sourceURL};const both=Media.all({sourceMedia:[stale],sourceChecks:[{url:chart.sourceURL,digest:'one'}]});assert.equal(both.filter(x=>x.url===chart.url).length,1);
 const run=fs.readFileSync(new URL('../monitor/run.mjs',import.meta.url),'utf8');assert(run.indexOf('discoverSourceMedia(page.html')<run.indexOf('if(!before&&meta.known)continue'));assert(run.includes('feed.sourceMedia='));
});

test('only approved sources and media forms reach frames; source text is escaped and videos never autoplay',()=>{
 for(const raw of ['javascript:alert(1)','https://user:secret@www.eia.gov/a','https://www.eia.gov.evil.example/a','https://www.eia.gov:444/a'])assert.equal(Media.sourceURL(raw),'');
 assert.equal(Media.assetURL('https://evil.example/a.mp4',source,'video'),'');assert.equal(Media.assetURL('https://www.youtube.com/watch?v=abcdefghijk',source,'video_embed'),'');
 const hostile={...chart,title:'<script>bad()</script>',alt:'"><img src=x onerror=bad()>',note:'<iframe src=evil>'};
 const output=Media.render([hostile])+Media.frameHTML(hostile);assert(!output.includes('<script>'));assert(!output.includes('onerror=bad()>'));assert(output.includes('&lt;script&gt;'));
 const video=Media.frameHTML(Data.entries.find(x=>x.kind==='video'));assert(video.includes('preload="none"'));assert(video.includes('<video controls'));assert(!video.includes(' autoplay'));
});

test('visuals appear before independently expandable sources; page-only previews still require user action',()=>{
 const html=Media.render([chart],{keyPrefix:'inline'});
 assert(html.startsWith('<article'));assert(html.indexOf('<iframe')<html.indexOf('<details class="source-media-details"'));
 assert(html.includes('loading="lazy"'));assert(html.includes('sandbox="allow-same-origin allow-popups"'));assert(!html.includes('data-source-media-details open'));
 assert(html.includes('Source, dates and evidence'));assert(html.includes(chart.publicationDate));assert(html.includes(chart.verifiedAt));assert(html.includes(chart.sourceURL));
 const page=Media.recordHTML({title:'Checked publication',date:'2026-11-24',reviewedAt:'2026-11-24',sources:[{publisher:'EIA',url:source}]});assert(page.startsWith('<details'));assert(!page.includes('<iframe'));assert(page.includes('Preview original source page'));
 assert.equal(Media.frameMarkup({...chart,url:'https://evil.example/chart.png'}),'');assert.equal(Media.frameMarkup({...chart,sourceURL:'javascript:alert(1)'},'page'),'');
});

test('expanding or closing source details keeps the inline visual; closing its parent stops hidden media',()=>{
 const events={},frames=[];
 const slot=()=>({children:[],replaceChildren(...items){this.children=items;},querySelector(){return this.children[0]||null;}});
 const primary=slot(),page=slot(),inlineFrame={srcdoc:'existing visible chart'};primary.children=[inlineFrame];
 const details={open:true,matches:s=>s==='.source-media-details',closest:()=>container,querySelector:s=>s==='.source-media-page-slot'?page:null};
 const container={dataset:{sourceMediaId:'',sourceMediaInline:'true'},matches:s=>s==='.source-media',closest:()=>null,querySelector:s=>s==='.source-media-primary'?primary:s==='.source-media-page-slot'?page:s==='.source-media-details'?details:null,querySelectorAll:()=>[primary,page]};
 const document={createElement(){const n={attrs:{},setAttribute(k,v){this.attrs[k]=v;}};frames.push(n);return n;},addEventListener(type,fn){events[type]=fn;}};
 const window={SourceMediaData:Data,document};const context=vm.createContext({window,URL});vm.runInContext(fs.readFileSync(new URL('../app/source-media.js',import.meta.url),'utf8'),context);
 const html=window.SourceMedia.render([chart],{keyPrefix:'test'});container.dataset.sourceMediaId=html.match(/data-source-media-id="([^"]+)/)[1];
 events.click({preventDefault(){},target:{closest(){return {dataset:{sourceMediaLoad:'page'},closest:()=>container};}}});
 assert.equal(primary.children[0],inlineFrame);assert.equal(page.children[0].src,chart.sourceURL);assert.equal(page.children[0].referrerPolicy,'no-referrer');assert(!page.children[0].attrs.sandbox.includes('allow-top-navigation'));
 page.replaceChildren();window.SourceMedia.hydrate({querySelectorAll:()=>[container]});assert.equal(page.children[0].src,chart.sourceURL);assert.equal(primary.children[0],inlineFrame);
 details.open=false;events.toggle({target:details});assert.equal(page.children.length,0);assert.equal(primary.children[0],inlineFrame);
 const parent={open:false,matches:()=>false,querySelectorAll:()=>[container]};events.toggle({target:parent});assert.equal(primary.children.length,0);
 parent.open=true;events.toggle({target:parent});assert(primary.children[0].srcdoc.includes('Statistics Canada'));assert.equal(primary.children[0].attrs.sandbox,'allow-same-origin allow-popups');assert.equal(page.children.length,0);
});
