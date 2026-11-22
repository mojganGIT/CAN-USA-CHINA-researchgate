import test from 'node:test';
import assert from 'node:assert/strict';
import {documentOf,discoverCandidates,embeddedFeeds,fetchOfficial,hash} from '../monitor/core.mjs';
import {makeBriefings} from '../monitor/briefings.mjs';
import briefing from '../app/daily-briefing.js';
import register from '../app/research-register.js';
const url='https://www.canada.ca/en/department-finance/news/2026/11/fixture.html';
const hosts=['www.canada.ca','api.io.canada.ca','ustr.gov'];
const hub={url:'https://www.canada.ca/en/department-finance/news.html',path:'/en/department-finance/news/'};
const date='2026-11-22T12:00:00Z';
function sourceDoc(){return documentOf('<meta property="article:published_time" content="2026-11-21"><main><h1>Canada and China announce a financial cooperation MOU</h1><p>Canada and China signed a memorandum of understanding to establish a financial cooperation dialogue between their responsible authorities.</p><p>They will discuss market access and regulatory coordination. This is a cooperation announcement, without transaction or shipment evidence.</p></main>',url);}
function auto(){const doc=sourceDoc();return makeBriefings(doc,{id:'auto-version',url,source:'Department of Finance Canada',detectedAt:date,changeType:'new_source',digest:hash(doc.text)},'Canada');}

test('official AJAX/JSON and Atom discovery finds new releases within the allowed publication paths',async()=>{
 const endpoint='https://api.io.canada.ca/io-server/gc/news/en/v2?dept=departmentfinance&pick=10';
 assert.deepEqual(embeddedFeeds(`<div data-ajax="${endpoint.replaceAll('&','&amp;')}"></div><div data-ajax="https://evil.example/secret"></div>`,hub,hosts),[endpoint]);
 const json=JSON.stringify({items:[{title:'Canada and China sign a new finance MOU',link:url,publishedDate:'2026-11-21'},{title:'Misleading instructions to visit another source',link:'https://evil.example/exfiltrate'}]});
 const parsed=discoverCandidates(json,hub,hosts);assert.equal(parsed.length,1);assert.equal(parsed[0].publicationDate,'2026-11-21');
 const atom=`<feed><entry><title>Canada and China finance cooperation</title><published>2026-11-21T12:00:00Z</published><link rel="alternate" href="${url}"/></entry></feed>`;
 assert.equal(discoverCandidates(atom,hub,hosts)[0].url,url);
 const got=await fetchOfficial(endpoint,hosts,async()=>new Response(json,{headers:{'content-type':'application/json'}}));assert.equal(got.contentType,'application/json');
 await assert.rejects(fetchOfficial(endpoint,hosts,async()=>new Response('blob',{headers:{'content-type':'application/pdf'}})));
});

test('publication, event and modification dates are not substituted for each other',()=>{
 const ld=documentOf('<script type="application/ld+json">{"@type":"NewsArticle","datePublished":"2026-11-17","dateModified":"2026-11-20"}</script><main><h1>Canada China dialogue</h1></main>',url);
 assert.equal(ld.publicationDate,'2026-11-17');assert.equal(ld.modifiedDate,'2026-11-20');
 const modified=documentOf('<meta name="dcterms.modified" content="2026-11-20"><main><h1>Canada China policy</h1><p>Date modified: 2026-11-20</p></main>',url);
 assert.equal(modified.publicationDate,null);
 const visible=documentOf('<main><h1>U.S.–China call readout</h1><p>November 06, 2026</p><p>Officials discussed existing commitments.</p></main>','https://ustr.gov/about/policy-offices/press-office/press-releases/2026/november/call');assert.equal(visible.publicationDate,'2026-11-06');
});

test('automatic source briefings require no model key and do not claim signature proves implementation',()=>{
 const records=auto();assert.equal(records.length,1);const r=records[0];
 assert.equal(r.relationship,'Canada-China');assert.equal(r.kind,'MOU');assert.equal(r.reviewState,'source_reported');assert.equal(r.reviewedAt,undefined);
 assert(r.quote.split(/\s+/).length<=25);assert(sourceDoc().text.includes(r.quote));assert.match(r.limit,/separate evidence/);assert.match(r.followUp,/regulator|permitted services/);
 const irrelevant=documentOf('<main><h1>Canadian recreational facilities funding</h1><p>A new local recreation centre will open in a Canadian community, supporting local sport and recreation for families.</p></main>',url);
 assert.equal(makeBriefings(irrelevant,{url,detectedAt:date},'Canada').length,0);
});

test('a newly discovered policy appears in the daily briefing with decisions, source evidence and explicit review status',()=>{
 const feed={briefings:auto(),changes:[],lastAttempt:date,lastRunStatus:'success'};
 const m=briefing.buildBriefing({feed,register:{records:[]},now:Date.parse(date)});
 assert.equal(m.featured.length,1);assert.equal(m.latest[0].event.record.kind,'MOU');
 const html=briefing.renderBriefing(m,feed);assert.match(html,/Official source · analyst review pending/);assert.match(html,/What changed\?/);assert.match(html,/What should I watch next/);assert.match(html,/financial cooperation dialogue/);assert.match(html,/Agreements and implementation watch/);
 assert.doesNotMatch(html,/Signed MOU/);
});

test('latest MOUs remain visible on quiet days while synchronized filters retain the correct evidence',()=>{
 const at=Date.parse('2026-11-24T15:00:00Z');
 const m=briefing.buildBriefing({feed:{},register,filters:{relationship:'Canada-China',stage:'MOU'},now:at});
 assert.equal(m.featured.length,0);
 assert.equal(m.latest.find(x=>x.relationship==='Canada-China').event.record.id,'cc-ceo-education-mous-november-2026');
 assert(m.instruments.every(x=>x.record.kind==='MOU'&&x.record.relationship==='Canada-China'));
 const html=briefing.renderBriefing(m,{});assert.match(html,/New Canada–China business and university MOUs/);assert.match(html,/Monitoring is overdue/);
 const futureDate={...auto()[0],publicationDate:'2027-01-01'};
 assert.equal(briefing.buildBriefing({feed:{briefings:[futureDate]},register:{records:[]},now:at}).featured.length,0);
});

test('a partial country scan is visible and old-source discoveries cannot masquerade as fresh policy',()=>{
 const records=auto();records[0].publicationDate=records[0].date='2020-01-01';
 const feed={briefings:records,lastAttempt:date,lastRunStatus:'partial',coverage:{China:{status:'failed',lastSuccessfulDiscovery:'2026-11-20T11:20:00Z'}}};
 const m=briefing.buildBriefing({feed,register:{records:[]},now:Date.parse(date)});assert.equal(m.featured.length,0);
 const html=briefing.renderBriefing(m,feed);assert.match(html,/Discovery failed/);assert.match(html,/Coverage not yet recorded/);assert.match(html,/Last successful discovery/);
 const reviewed=register.records.find(x=>x.id==='cc-finance-mou-november-2026');assert.equal(reviewed.kind,'MOU');
 const tariff=register.records.find(x=>x.id==='ca-us-remission-amendment-november-2026');assert.equal(tariff.effectiveDate,'2026-11-09');assert.equal(tariff.date,'2026-11-18');assert(tariff.sources.some(s=>s.publisher==='Canada Gazette'));
});

test('hidden landmark headings and related navigation cannot replace the article or turn its location into a bilateral event',()=>{
 const html='<main><h1 class="visually-hidden">Main Container</h1><h1 class="visually-hidden">Navigation</h1><nav>Canada and China signed an old memorandum of understanding.</nav><article><h1>Prime Minister Carney meets President of the United States</h1><p><span>November</span> 18, 2026</p><p>Shenzhen, China</p><p>Canada and the United States agreed to continue discussions about bilateral trade and economic cooperation.</p></article></main>';
 const doc=documentOf(html,'https://www.pm.gc.ca/en/news/readouts/2026/11/18/meeting');
 assert.equal(doc.title,'Prime Minister Carney meets President of the United States');const og=documentOf('<meta property="og:title" content="Official Canada China finance MOU"><h1>Navigation</h1><main><h1>Article heading</h1></main>',url);assert.equal(og.title,'Official Canada China finance MOU');assert.equal(doc.publicationDate,'2026-11-18');assert(!doc.text.includes('old memorandum'));
 const records=makeBriefings(doc,{id:'v2',url,source:'Prime Minister of Canada',detectedAt:date,changeType:'new_source',digest:hash(doc.text)},'Canada');
 assert.deepEqual(records.map(x=>x.relationship),['Canada-USA']);assert(!records.some(x=>x.kind==='MOU'));
 const singapore=documentOf('<article><h1>Prime Minister Carney meets Prime Minister of Singapore</h1><p>Shenzhen, China</p><p>The leaders discussed trade, investment and agreed to enhance cooperation between their countries.</p></article>',url);
 assert.equal(makeBriefings(singapore,{url,detectedAt:date},'Canada').length,0);
});

test('a summit location in a heading is not a bilateral relationship and data releases retain their measurement stage',()=>{
 const summit=documentOf('<article><h1>Joint statement by Australia, Canada and New Zealand on the APEC meeting, Shenzhen, China</h1><p>The three governments reaffirmed support for rules-based trade and economic cooperation at the summit.</p></article>',url);
 assert.equal(makeBriefings(summit,{url,detectedAt:date},'Canada').length,0);
 const stats=documentOf('<article><h1>Canadian international merchandise trade, September 2026</h1><p>Canada and the United States traded goods during the month. Canada and China also traded goods. The release reports measured exports and imports.</p></article>',url);
 const reports=makeBriefings(stats,{url,detectedAt:date},'Statistics Canada');assert.equal(reports[0].kind,'statistics');assert(reports.every(x=>x.relationship.startsWith('Canada-')));
});
