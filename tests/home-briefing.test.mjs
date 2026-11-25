import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import HB from '../app/home-briefing.js';
import R from '../app/research-register.js';
import L from '../app/i18n.js';
const read=file=>fs.readFileSync(new URL('../app/'+file,import.meta.url),'utf8');
const now=Date.parse('2026-11-24T17:00:00Z');
const issue={id:'week-2026-11-23',title:'Week of November 23',publishedAt:'2026-11-23T12:09:11.053Z',windowStart:'2026-11-16T12:09:11.053Z',windowEnd:'2026-11-23T12:09:11.053Z',lead:'Published weekly context.',sourceStatus:'partial',observations:[],reviewed:[],statisticalUpdates:[]};
const digest={issues:[issue]};

test('the Home weekly narrative covers the three relationships using dated reviewed records and preserves source periods',()=>{
 const before=JSON.stringify(R),model=HB.weekly({digest,register:R,now});
 assert.equal(model.issue.id,issue.id);assert.equal(model.records.length,3);assert.deepEqual(model.records.map(r=>r.relationship),['Canada-China','Canada-USA','USA-China']);
 assert(model.summary.includes('C$1.74 billion'));assert(model.summary.includes('March–August 2026'));assert(model.summary.includes('16,211'));assert(model.summary.includes('committee readout'));assert(model.summary.includes('trilateral declaration'));
 assert(model.why.includes('EV arrivals are different from permit allocations'));assert(model.why.includes('support reaches exposed firms'));assert(model.records.every(r=>r.reviewedAt==='2026-11-22'&&r.sources.every(s=>s.url.startsWith('https://'))));
 assert.equal(JSON.stringify(R),before);assert(!model.stale);
});

test('future editions, records reviewed after publication and pending source reports cannot become a published Home assessment',()=>{
 const future={...issue,id:'week-2027-01-04',publishedAt:'2027-01-04T12:00:00Z',windowStart:'2026-12-28T12:00:00Z',windowEnd:'2027-01-04T12:00:00Z'};
 const record={...R.records.find(r=>r.id==='cc-november-backgrounder-realized-trade')};
 const rows=[{...record,id:'pending',reviewState:'source_reported',changed:'Do not publish a pending claim'},{...record,id:'future-review',reviewedAt:'2026-11-24',changed:'Do not backdate this review'},{...record,id:'older',date:'2026-11-01',changed:'Do not recast older context as this week'}];
 const m=HB.weekly({digest:{issues:[future,issue]},register:{records:rows},now});assert.equal(m.issue.id,issue.id);assert.equal(m.records.length,0);assert.equal(m.summary,issue.lead);assert(m.why.includes('Source monitoring alone'));
 assert.equal(HB.weekly({digest:{issues:[future]},register:R,now}),null);assert(HB.weekly({digest,register:R,now:now+9*86400000}).stale);
 for(const url of ['javascript:alert(1)','https://user:secret@www.canada.ca/a','https://www.canada.ca:444/a'])assert.equal(HB.sourceURL(url),'');
});

test('Home and the weekly page share one archive request and retain a valid edition during an outage',async()=>{
 let requests=[],fail=false,tick=now;const events={},nodes=new Map();const node=id=>{if(!nodes.has(id))nodes.set(id,{innerHTML:'',isConnected:true});return nodes.get(id);};
 const window={addEventListener(){}},context={window,document:{getElementById:node,addEventListener:(t,f)=>events[t]=f},location:{hash:'#home'},URL,URLSearchParams,Intl,Date:class extends Date{static now(){return tick;}},fetch:async url=>{requests.push(url);return {ok:!fail,json:async()=>url.startsWith('/api')?{emailAvailable:false}:digest};}};
 vm.createContext(context);vm.runInContext(read('weekly-updates.js'),context);
 const first=window.WeeklyUpdates.loadDigest(),second=window.WeeklyUpdates.loadDigest();assert.equal(first,second);await first;assert.deepEqual(requests,['weekly-updates.json']);
 context.location.hash='#weekly-updates?view=briefing';window.WeeklyUpdates.show();await window.WeeklyUpdates.ready;assert.equal(requests.filter(p=>p==='weekly-updates.json').length,1);assert(node('root').innerHTML.includes('Published weekly context.'));
 fail=true;tick+=6*60*1000;await assert.rejects(window.WeeklyUpdates.loadDigest());assert.equal(window.WeeklyUpdates.digest.issues[0].id,issue.id);assert(window.WeeklyUpdates.digestError);
});

test('Home renders two weekly paragraphs, escapes source text and links the same dated edition without replacing other tabs',async()=>{
 const nodes=new Map(),handlers={},events={};const node=id=>{if(!nodes.has(id))nodes.set(id,{innerHTML:'',open:false,isConnected:true,querySelector(){return null;},querySelectorAll(){return[];},addEventListener(){},focus(){},scrollIntoView(){}});return nodes.get(id);};
 const location={hash:'#home',href:'https://dashboard.test/#home'},window={addEventListener:(t,f)=>events[t]=f};let resolve;const pending=new Promise(r=>resolve=r);
 const context={window,document:{getElementById:node,addEventListener:(t,f)=>handlers[t]=f,querySelectorAll:()=>[]},location,history:{replaceState(){},pushState(a,b,url){location.hash=url;}},URL,URLSearchParams,Intl,Date:class extends Date{static now(){return now;}}};
 vm.createContext(context);for(const file of ['bilateral-model.js','research-register.js','dashboard-guide.js','master-data.js','explorer-inventory.js','explorer-catalog.js','home-briefing.js','source-media-data.js','source-media.js'])vm.runInContext(read(file),context);
 let saved=null;window.WeeklyUpdates={get digest(){return saved;},loadDigest:()=>pending.then(v=>saved=v)};window.BilateralHub={clear(){},show(){}};window.PolicyLive={feed:{changes:[]}};
 vm.runInContext(read('home.js'),context);const hub=window.HomeHub;const initial=node('root').innerHTML;assert(initial.includes('hub-executive-title'));assert(initial.includes('hub-weekly-title'));assert(initial.includes('Loading the latest published'));
 const visual=hub.homeVisualHTML();assert(initial.includes('hub-visual-title'));assert(initial.indexOf('hub-weekly-title')<initial.indexOf('hub-visual-title'));
 assert(visual.includes('statcan-fdi-2025.png'));assert(visual.includes('260429/cg-b002-eng.htm'));assert(visual.includes('Year-end 2025'));
 assert(visual.includes('Source, dates and evidence'));assert(visual.includes('CAD 816.8 billion'));assert(visual.includes('CAD 43.4 billion'));assert(visual.includes('not newly completed spending'));
 assert.match(visual,/<iframe[^>]+srcdoc=/);assert(!visual.includes('autoplay'));
 location.hash='#research-search';node('root').innerHTML='SEARCH VIEW';resolve(digest);await hub.weeklyReady;assert.equal(node('root').innerHTML,'SEARCH VIEW');
 location.hash='#home';const html=hub.homeWeeklyHTML();assert.equal((html.match(/class="hub-weekly-narrative"/g)||[]).length,2);assert(html.includes('issue=week-2026-11-23'));assert(html.includes('Record date'));assert(html.includes('Reviewed'));assert(html.includes('Partial coverage'));
 saved={issues:[{...issue,lead:'<script>bad()</script>',windowStart:'2026-10-01T12:00:00Z',windowEnd:'2026-10-02T12:00:00Z'}]};const safe=hub.homeWeeklyHTML();assert(!safe.includes('<script>'));assert(safe.includes('&lt;script&gt;'));
 for(const lang of ['fr','zh-Hans'])for(const key of ['Weekly Brief','Why It Matters to Canada','Reviewed policy context for this observation window','Sources and Dates','Canada’s Investment Links'])assert.notEqual(L.t(key,lang),key);
 const index=read('index.html');assert(index.indexOf('home-briefing.js')<index.indexOf('home.js'));assert(index.indexOf('weekly-updates.js')<index.indexOf('home.js'));
});
