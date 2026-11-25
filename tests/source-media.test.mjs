import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import Media from '../app/source-media.js';
import Data from '../app/source-media-data.js';
import UI from '../app/translations-ui.js';
import {discoverSourceMedia} from '../monitor/source-media.mjs';
import B from '../app/daily-briefing.js';
const chart=Data.entries.find(x=>x.id==='statcan-fdi-2025');
const source='https://www.eia.gov/todayinenergy/detail.php?id=67904';
const textOnlySource='https://www.tradecommissioner.gc.ca/en/market-industry-info/search-country-region/country/canada-united-states-export/us-tariffs/answers-common-questions-tariffs.html';

test('interactive tariff charts are curated and resize only on messages from their own publisher frame',()=>{
 const item=Data.entries.find(x=>x.id==='us-china-tariff-chart'),events={},ownWindow={},otherWindow={};
 const frame={src:item.url,contentWindow:ownWindow,style:{}};
 const window={SourceMediaData:Data,document:{querySelectorAll:()=>[frame],addEventListener(){}},addEventListener(type,fn){events[type]=fn;}};
 const context=vm.createContext({window,URL});vm.runInContext(fs.readFileSync(new URL('../app/source-media.js',import.meta.url),'utf8'),context);
 const V=window.SourceMedia,markup=V.frameMarkup(item);assert(markup.includes(item.url));assert(markup.includes('allow-scripts'));assert(!markup.includes('allow-top-navigation'));
 assert.equal(V.normalize({...item,id:'unreviewed-chart'}),null);assert.equal(V.normalize({...item,url:'https://datawrapper.dwcdn.net/other/1/'}),null);assert.equal(V.assetURL('https://evil.example/fMrtV/13/',item.sourceURL,'chart_embed'),'');
 for(const event of [{origin:'https://evil.example',source:ownWindow,data:{'datawrapper-height':{fMrtV:444}}},{origin:'https://datawrapper.dwcdn.net',source:otherWindow,data:{'datawrapper-height':{fMrtV:444}}},{origin:'https://datawrapper.dwcdn.net',source:ownWindow,data:{'datawrapper-height':{other:444}}},{origin:'https://datawrapper.dwcdn.net',source:ownWindow,data:{'datawrapper-height':{fMrtV:99999}}}])events.message(event);
 assert.equal(frame.style.height,undefined);events.message({origin:'https://datawrapper.dwcdn.net',source:ownWindow,data:{'datawrapper-height':{fMrtV:444.2}}});assert.equal(frame.style.height,'445px');
 const video=V.frameMarkup(Data.entries.find(x=>x.id==='white-house-trilateral-video-2026'));assert(video.includes('strict-origin-when-cross-origin'));assert(video.includes('youtube-nocookie.com'));assert(!video.includes('autoplay'));
 assert(Media.matching({relationship:'USA-China',year:'2024'}).some(x=>x.id==='eia-lng-destinations-2025'));assert(!Media.matching({relationship:'USA-China',year:'2024'}).some(x=>x.id==='white-house-trilateral-video-2026'));
 assert(Media.matching({relationship:'USA-China',year:'2023'}).some(x=>x.id==='eia-lng-destinations-2025'),'the original chart retains its 2023 baseline');
});

test('the requested chart retains its source, year, ownership basis, exact table and national scope in both tabs',()=>{
 const outcomes=JSON.parse(fs.readFileSync(new URL('../app/evidence-records.json',import.meta.url),'utf8'));
 for(const id of ['fdi-stock-us','fdi-stock-china']){
  const row=outcomes.records.find(r=>r.id===id),items=Media.forRecord(row,outcomes.sources);assert(items.some(x=>x.id===chart.id));
 }
 const library=Media.collection({topic:'investment',region:'ON'});assert(library.includes(chart.title));assert(library.includes('Year-end 2025'));assert(library.includes('not a provincial outcome measure'));assert(!library.includes('LNG Canada operating site footage'));
 const frame=Media.frameHTML(chart);assert(frame.includes(chart.url));assert(frame.includes(chart.cachedURL));assert(frame.includes('816.8'));assert(frame.includes('737.3'));assert(frame.includes('43.4'));assert(frame.includes('24.6'));assert(frame.includes('Accessible chart data'));assert(!frame.includes('<svg'));assert(frame.indexOf('<img')<frame.indexOf('<details'));assert(!frame.includes('dashboard rendering'));
 const plan=Data.entries.find(x=>x.context==='framework'),diagram=Media.frameHTML(plan);assert(diagram.includes(plan.cachedURL));assert(diagram.indexOf('<img')<diagram.indexOf('<details'));assert(diagram.includes('Eight strategic capabilities'));assert(diagram.includes('Five policy foundations'));assert(!diagram.includes('Accessible rendering of'));assert(!diagram.includes('View publisher’s original image'));assert(!diagram.includes('composite score'));
 const injected=Media.frameHTML({...plan,cachedURL:'https://evil.example/copied.png'});assert(!injected.includes('evil.example'));assert(injected.includes(plan.cachedURL));
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
 const item={kind:'image',url:'https://www.eia.gov/chart.png',title:'Source trade chart',memo:{summary:'Unreviewed outcome claim',canada:'Unreviewed Canadian gain',reviewedAt:'2026-11-24'}};
 const page={sourceURL:source,sourceDigest:'one',checkedAt:'2026-11-24T12:00:00Z',topics:['energy'],relationships:['Canada-USA'],items:[item]};
 const feed={sourceMedia:[page],sourceChecks:[{url:source,digest:'one',status:'success'}]};
 const html=Media.collection({topic:'energy',relationship:'Canada-USA'},feed);assert(html.includes('Automatically discovered · analyst review pending'));assert(html.includes(item.title));assert(!html.includes('Favourable'));
 assert(!html.includes(item.memo.summary));assert(!html.includes(item.memo.canada));
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
 const page=Media.recordHTML({title:'Checked publication',date:'2026-11-24',reviewedAt:'2026-11-24',sources:[{publisher:'Trade Commissioner Service',url:textOnlySource}]});assert(page.startsWith('<details'));assert(!page.includes('<iframe'));assert(page.includes('Preview original source page'));
 assert.equal(Media.frameMarkup({...chart,url:'https://evil.example/chart.png'}),'');assert.equal(Media.frameMarkup({...chart,sourceURL:'javascript:alert(1)'},'page'),'');
});

test('security evidence maps each original report page to the matching record without collapsing pages from the same PDF',()=>{
 const outcomes=JSON.parse(fs.readFileSync(new URL('../app/evidence-records.json',import.meta.url),'utf8'));
 const expected={'defence-us-exports':15,'defence-domestic-supply':11,'defence-direct-jobs':10,'defence-share-ON':12,'defence-share-QC':12,'defence-atlantic-share':12,'defence-west-north-share':12};
 for(const [id,page] of Object.entries(expected)){
  const row=outcomes.records.find(r=>r.id===id),items=Media.forRecord(row,outcomes.sources);assert.equal(items.length,1,id);assert.equal(items[0].documentPage,page,id);
  const html=Media.recordHTML(row,outcomes.sources,{}, {sourceDetails:false,fallbackPreview:false});assert(html.includes('<iframe'));assert(!html.includes('<details class="source-media-details"'));assert(!html.includes('Original source preview'));assert(html.includes('2024 activities'));
  const frame=Media.frameHTML(items[0]);assert(frame.includes(items[0].cachedURL));assert(frame.includes(items[0].url+'#page='+page));assert(!frame.includes('<svg'));
 }
 assert.equal(Media.all().filter(x=>x.kind==='document_image').length,4);
 const doc=Data.entries.find(x=>x.kind==='document_image');assert.equal(Media.normalize({...doc,documentPage:99}),null);
 const textOnly={id:'text-only',title:'Text-only checked source',reviewedAt:'2026-11-24',sources:[{publisher:'Trade Commissioner Service',url:textOnlySource}]};assert.equal(Media.recordHTML(textOnly,{}, {},{fallbackPreview:false}),'');
});

test('record-bound national context excludes source utility icons and cannot be mistaken for a provincial defence chart',()=>{
 const outcomes=JSON.parse(fs.readFileSync(new URL('../app/evidence-records.json',import.meta.url),'utf8'));
 const row=outcomes.records.find(r=>r.id==='lfs-BC'),url=outcomes.sources[row.sourceIds[0]].url;
 const feed={sourceChecks:[{url,digest:'current'}],sourceMedia:[{sourceURL:url,sourceDigest:'current',checkedAt:'2026-11-24',items:[{kind:'image',url:'https://www150.statcan.gc.ca/dai-quo/img/magnify-clip.png',title:'Chart magnifying icon'},{kind:'image',url:'https://www150.statcan.gc.ca/chart.png',title:'A second unreviewed chart'}]}]};
 assert(!Media.all(feed).some(x=>x.title==='Chart magnifying icon'));
 const items=Media.forRecord(row,outcomes.sources,feed);assert.equal(items.length,1);assert.equal(items[0].id,'statcan-employment-rate-september-2026');assert(items[0].note.includes('not a provincial defence-employment series'));
});

test('reviewed visual memos explain the source and Canadian relevance without promoting a stock or footage to an outcome',()=>{
 for(const item of Data.entries){
  const html=Media.render([item]);assert(item.memo?.summary&&item.memo?.canada&&item.memo?.reviewedAt,item.id);
  assert(html.includes('Summary</strong>'));assert(html.includes('Why it matters to Canada'));assert(html.includes('Analyst interpretation'));assert(html.includes('Summary reviewed'));
  assert(html.indexOf('source-media-memo')<html.indexOf('<iframe'));assert.equal(UI[item.memo.summary]?.length,2);assert.equal(UI[item.memo.canada]?.length,2);
 }
 const html=Media.collection({topic:'finance',region:'CA'});assert(html.includes('CAD 816.8 billion'));assert(html.includes('CAD 43.4 billion'));assert(html.includes('does not measure financial-service sales'));assert(!html.includes('LNG Canada’s media kit'));
 const hostile=Media.render([{...chart,memo:{summary:'<script>claim</script>',canada:'<img onerror=claim()>',reviewedAt:'2026-11-24'}}]);assert(!hostile.includes('<script>claim</script>'));assert(hostile.includes('&lt;script&gt;claim&lt;/script&gt;'));assert(!hostile.includes('<img onerror=claim()>'));
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
 parent.open=true;events.toggle({target:parent});assert(primary.children[0].srcdoc.includes(chart.cachedURL));assert.equal(primary.children[0].attrs.sandbox,'allow-same-origin allow-popups');assert.equal(page.children.length,0);
});

test('video frames shrink to their content, follow metadata and width changes, and release observers when hidden',()=>{
 const events={},videoEvents={},viewEvents={},observers=[];let contentHeight=240;
 const video={addEventListener(type,fn){videoEvents[type]=fn;},removeEventListener(type){delete videoEvents[type];}};
 const body={querySelector:selector=>selector==='video'?video:null,getBoundingClientRect:()=>({height:contentHeight})};
 const view={getComputedStyle:()=>({marginTop:'16px',marginBottom:'16px'}),addEventListener(type,fn){viewEvents[type]=fn;},removeEventListener(type){delete viewEvents[type];}};
 const frame={style:{height:'560px'},isConnected:true,contentDocument:{body},contentWindow:view,hasAttribute:name=>name==='srcdoc',matches:selector=>selector.includes('[data-source-media-kind="video"]')};
 const document={addEventListener(type,fn){events[type]=fn;}};
 const window={SourceMediaData:Data,document,ResizeObserver:class{constructor(fn){this.update=fn;observers.push(this);}observe(target){assert.equal(target,body);}disconnect(){this.disconnected=true;}}};
 vm.runInContext(fs.readFileSync(new URL('../app/source-media.js',import.meta.url),'utf8'),vm.createContext({window,URL}));
 events.load({target:frame});assert.equal(frame.style.height,'274px');assert.equal(observers.length,1);
 contentHeight=385;viewEvents.resize();assert.equal(frame.style.height,'419px');
 contentHeight=510;videoEvents.loadedmetadata();assert.equal(frame.style.height,'544px');
 contentHeight=220;observers[0].update();assert.equal(frame.style.height,'254px');
 events.load({target:frame});assert.equal(observers.length,1);
 const slot={querySelectorAll:()=>[frame],replaceChildren(){frame.isConnected=false;}};
 const container={dataset:{sourceMediaId:'video'},querySelectorAll:()=>[slot]};
 events.toggle({target:{open:false,matches:()=>false,querySelectorAll:()=>[container]}});
 assert(observers[0].disconnected);assert.equal(Object.keys(videoEvents).length,0);assert.equal(Object.keys(viewEvents).length,0);
 contentHeight=400;observers[0].update();assert.equal(frame.style.height,'254px');
 const foreign={matches:()=>false};events.load({target:foreign});assert.equal(observers.length,1);
});
