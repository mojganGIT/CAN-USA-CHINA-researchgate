import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import M from '../app/insights-model.js';
import research from '../app/research-register.js';
import I18n from '../app/i18n.js';

const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const json=p=>JSON.parse(read('app/'+p+'.json'));
const point=(period,value,securityLevelCode=0)=>({period:period+'-01',value,scalarFactorCode:0,securityLevelCode,statusCode:0});
const canada=(points,world=points)=>({mappingVersion:2,dataThrough:'2026-02-01',series:[
 {region:'Ontario',partner:'China',topic:'vehicles',points},
 {region:'Ontario',partner:'All countries',topic:'vehicles',points:world}
]});
const sel={region:'Ontario',partner:'China',topic:'vehicles'};
test('iframe comparisons use matching months, geographic denominators and disclosure flags',()=>{
 const pts=[point('2025-01',10),point('2025-02',10),point('2026-01',20),point('2026-02',10)];
 const world=[point('2025-01',100),point('2025-02',100),point('2026-01',100),point('2026-02',100)];
 const r=M.canada(canada(pts,world),sel);
 assert.equal(r.year,'2026');assert.equal(r.n,2);assert.equal(r.current,30);assert.equal(r.prior,20);assert.equal(r.percent,50);assert.equal(r.share,15);assert.equal(r.shareChange,5);
 assert.deepEqual(r.values,[20,10]);assert.deepEqual(r.previous,[10,10]);
 const suppressed=M.canada(canada([...pts.slice(0,-1),point('2026-02',100,1)],world),sel);
 assert.equal(suppressed.current,null);assert.equal(suppressed.percent,null);assert.equal(suppressed.share,null);
 assert.equal(suppressed.values[1],null);
 const zero=M.canada(canada(pts.map(p=>({...p,value:0})),world),sel);
 assert.equal(zero.current,0);assert.equal(zero.percent,null);assert.equal(zero.change,0);
 assert.equal(M.canada(canada(pts.filter(p=>p.period!=='2025-01-01')),sel).prior,null);
});
test('trade deficits and signed investment flows do not receive misleading growth rates',()=>{
 const us=json('us-trade-statistics');
 const r=M.us(us,{partner:'China',measure:'balance',year:'2026'});
 assert(r.current<0);assert.equal(r.percent,null);assert.equal(r.n,us.partners.find(p=>p.id==='China').totals.at(-1).months);
 const data={series:[{partner:'China',direction:'outward',measure:'financial_flow',year:2024,value:-100},{partner:'China',direction:'outward',measure:'financial_flow',year:2025,value:20}],sources:[{direction:'outward',status:'success'}]};
 const flow=M.investment(data,{partner:'China',direction:'outward',measure:'financial_flow'});
 assert.equal(flow.change,120);assert.equal(flow.percent,null);assert.deepEqual(flow.values,[-100,20]);
 data.series.forEach(r=>r.measure='stock');
 const stock=M.investment(data,{partner:'China',direction:'outward',measure:'stock'});
 assert.equal(stock.percent,null);
 data.series[0].value=100;
 assert.equal(M.investment(data,{partner:'China',direction:'outward',measure:'stock'}).percent,-80);
});
test('all reviewed collections and monitor revisions retain their distinct scope and status',()=>{
 const data={canadian:json('evidence-records'),american:json('us-trade-evidence'),daily:{changes:[{id:'fixture',title:'Source updated',changeType:'source_revision',detectedAt:'2026-11-10',url:'https://www.canada.ca/test',relationships:['Canada-China'],topics:['energy']}]}};
 const ctx={window:{}};vm.runInNewContext(read('app/explorer-inventory.js'),ctx);
 const inv=ctx.window.EXPLORER_INVENTORY;
 const rows=M.records(data,research,inv);
 assert.equal(rows.length,data.canadian.records.length+data.american.records.length+data.canadian.policies.length+research.records.length+inv.records.length+1);
 assert.equal(new Set(rows.map(r=>r.id)).size,rows.length);
 const amendment=M.filter(rows,{view:'policies',kind:'amendment'});assert(amendment.some(r=>r.id==='note-canada-china-relief-extension'));
 assert(!amendment.some(r=>r.id==='update-fixture'),'a source revision must not become a verified amendment');
 assert.equal(M.filter(rows,{view:'updates'})[0].kind,'update');
 assert(M.filter(rows,{view:'policies',kind:'memo'}).length>=4);
 assert(M.filter(rows,{view:'evidence',query:'canola 2028'}).some(r=>r.id==='note-canada-china-relief-extension'));
 assert(M.filter(rows,{view:'evidence',set:'Historical inventory'}).every(r=>r.kind==='historical'));
});
test('embed renders all workspaces, changes language, escapes sources, and survives partial refresh',async()=>{
 const nodes=new Map(),handlers={},windowEvents={},intervals=[];
 const node=id=>{
  if(!nodes.has(id))nodes.set(id,{id,innerHTML:'',textContent:'',disabled:false,value:'',dataset:{},listeners:{},addEventListener(k,f){this.listeners[k]=f;},querySelectorAll(){return[];},focus(){},scrollIntoView(){}});
  return nodes.get(id);
 };
 const document={referrer:'https://dashboard.test/',documentElement:{scrollHeight:1400},body:{},getElementById:node,addEventListener(k,f){handlers[k]=f;},hidden:false};
 const location={hash:'#trends',href:'https://dashboard.test/insights.html',origin:'https://dashboard.test'};
 const language={value:'en'};
 const languageAPI={get language(){return language.value;},get locale(){return language.value==='fr'?'fr-CA':language.value==='zh-Hans'?'zh-CN':'en-CA';},t(s){return I18n.t(s,language.value);},setLanguage(s){language.value=s;windowEvents['dashboard-language-changed']?.();}};
 let outage=false;
 const window={DashboardI18n:languageAPI,addEventListener(k,f){windowEvents[k]=f;}};window.parent=window;
 const ctx={window,document,location,Intl,Number,Date,URL,URLSearchParams,AbortSignal,setInterval:f=>intervals.push(f),fetch:async file=>{
  if(outage&&file==='policy-updates.json')throw Error('Fixture outage');
  const data=JSON.parse(read('app/'+file));
  if(file==='evidence-records.json'){
   data.records[0].title='<img src=x onerror=alert(1)>';
   data.sources[data.records[0].sourceIds[0]].url='javascript:alert(1)';
  }
  return {ok:true,json:async()=>data};
 }};
 vm.createContext(ctx);
 for(const p of ['research-register.js','dashboard-guide.js','explorer-inventory.js','explorer-catalog.js','regional-trade-model.js','us-trade-model.js','impact-model.js','policy-narrative.js','insights-copy.js','insights-model.js','insights.js'])vm.runInContext(read('app/'+p),ctx,{filename:p});
 await new Promise(resolve=>setImmediate(resolve));
 assert(node('insights-view').innerHTML.includes('<svg'));
 assert(node('insights-view').innerHTML.includes('What changed?'));
 assert(node('insights-view').innerHTML.includes('Source retrieved'));
 location.hash='#evidence';windowEvents.hashchange();
 assert(node('insights-view').innerHTML.includes('Source collection'));
 node('insight-query').value='onerror';
 node('insights-root').listeners.submit({target:{id:'insight-search'},preventDefault(){}});
 assert(node('insights-view').innerHTML.includes('&lt;img src=x onerror=alert(1)&gt;'));
 assert(!node('insights-view').innerHTML.includes('<img src=x'));
 assert(!node('insights-view').innerHTML.includes('href="javascript:'));
 node('insight-query').value='';
 node('insights-root').listeners.submit({target:{id:'insight-search'},preventDefault(){}});
 location.hash='#policies';windowEvents.hashchange();
 assert(node('insights-view').innerHTML.includes('Amendment or extension'));
 location.hash='#updates';windowEvents.hashchange();
 assert(node('insights-view').innerHTML.includes('Weekly briefings'));
 assert(node('insights-view').innerHTML.includes('not a verified legal amendment'));
 languageAPI.setLanguage('fr');assert(node('insights-title').textContent.includes('Constats'));
 languageAPI.setLanguage('zh-Hans');assert(node('insights-title').textContent.includes('趋势'));
 languageAPI.setLanguage('en');outage=true;await intervals[0]();
 await new Promise(resolve=>setImmediate(resolve));
 assert(node('insights-status').textContent.includes('Some feeds did not load'));
 assert(node('insights-view').innerHTML.includes('Weekly briefings'));
 const config=JSON.parse(read('app/staticwebapp.config.json'));
 assert.equal(config.routes.find(r=>r.route==='/insights.html').headers['X-Frame-Options'],'');
 assert(config.routes.find(r=>r.route==='/api/llm').allowedRoles.includes('authenticated'));
 assert(!read('app/insights.js').includes('/api/llm'));
});

test('relationship-scoped embeds restrict datasets, partners, policies and updates',async()=>{
 for(const [relationship,pair]of [['Canada-China','canada-china'],['USA-China','us-china'],['Canada-USA','us-canada']]){
  const nodes=new Map(),events={};const node=id=>{if(!nodes.has(id))nodes.set(id,{innerHTML:'',textContent:'',listeners:{},value:'',addEventListener(k,f){this.listeners[k]=f;},querySelectorAll(){return[];},focus(){},scrollIntoView(){}});return nodes.get(id);};
  const location={hash:'#trends',search:'?relationship='+relationship,origin:'https://dashboard.test',href:'https://dashboard.test/insights.html?relationship='+relationship};
  const document={referrer:'https://dashboard.test/',documentElement:{},body:{},getElementById:node,addEventListener(){}};
  const window={DashboardI18n:{language:'en',locale:'en-CA',t:I18n.t},addEventListener(k,f){events[k]=f;}};window.parent=window;
  const ctx={window,document,location,URL,URLSearchParams,Intl,Number,Date,AbortSignal,setInterval(){},fetch:async file=>({ok:true,json:async()=>JSON.parse(read('app/'+file))})};vm.createContext(ctx);
  for(const p of ['research-register.js','dashboard-guide.js','explorer-inventory.js','explorer-catalog.js','regional-trade-model.js','us-trade-model.js','impact-model.js','policy-narrative.js','insights-copy.js','insights-model.js','insights.js'])vm.runInContext(read('app/'+p),ctx,{filename:p});
  await new Promise(r=>setImmediate(r));
  const html=node('insights-view').innerHTML;
  const select=id=>html.match(new RegExp('<select id="insight-'+id+'"[^>]*>([\\s\\S]*?)</select>'))?.[1];
  assert.equal((select('partner').match(/<option /g)||[]).length,1);
  assert(select('partner').includes(relationship==='Canada-USA'?'United States':'China'));
  if(relationship==='Canada-China')assert(!select('dataset').includes('value="us"'));
  if(relationship==='USA-China')assert(!select('dataset').includes('value="canada"'));
  assert(node('insights-full').href.endsWith('#'+pair));
  location.hash='#policies';events.hashchange();
  const full=M.records({canadian:json('evidence-records'),american:json('us-trade-evidence'),daily:json('policy-updates')},research,ctx.window.EXPLORER_INVENTORY);
  for(const id of node('insights-view').innerHTML.matchAll(/data-insight-detail="([^"]+)"/g))assert(full.find(r=>r.id===id[1]).relationships.includes(relationship));
  assert(node('insights-view').innerHTML.includes('data-insight-filter="relationship" disabled'));
  location.hash='#updates';events.hashchange();assert(!node('insights-view').innerHTML.includes('<h2>Weekly briefings</h2>'));
 }
});
