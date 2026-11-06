const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'../app'),nodes=new Map(),events=new Map();
function node(id){if(!nodes.has(id))nodes.set(id,{innerHTML:'',value:'',open:false,listeners:{},addEventListener(type,fn){this.listeners[type]=fn;},querySelector(s){return node(id+' '+s);},querySelectorAll(){return[];},closest(){return node('panel');},insertAdjacentHTML(_,html){this.innerHTML+=html;},focus(){},scrollIntoView(){},setAttribute(){},append(){},showModal(){this.open=true;},remove(){}});return nodes.get(id);}
const location={hash:'',pathname:'/',search:''},document={title:'',getElementById:node,querySelector:s=>node(s),querySelectorAll:()=>[],addEventListener(type,fn){events.set(type,fn);}};
const window={addEventListener(type,fn){events.set(type,fn);}};
const ctx={window,document,location,history:{replaceState(a,b,url){location.hash=url.startsWith('#')?url:'';},pushState(a,b,url){location.hash=url;}},URL,URLSearchParams,Intl,Date,console};vm.createContext(ctx);
for(const file of ['research-register.js','dashboard-guide.js','master-data.js','app.js','explorer-inventory.js','explorer-catalog.js'])vm.runInContext(fs.readFileSync(path.join(dir,file),'utf8'),ctx,{filename:file});
const original=JSON.stringify(window.POLICY_MASTER.executiveSummary);
const feed={lastSuccessfulRun:new Date().toISOString(),lastRunStatus:'partial',sourcesChecked:40,sourceFailures:[{url:'https://www.canada.ca/moved',error:'HTTP 404'}],aiEnabled:false,scheduleUTC:'11:17 daily',changes:[{id:'auto-test',title:'New EV customs source <script>x</script>',url:'https://www.canada.ca/test',source:'Canada',detectedAt:new Date().toISOString(),topics:['vehicles'],relationships:['Canada-USA'],changeType:'new_source'}]};
window.PolicyLive={feed,show(view){location.hash=view==='llm'?'#your-llm':'#daily-updates';node('root').innerHTML='LIVE VIEW '+view;}};
window.USTrade={show(){node('root').innerHTML='US TRADE VIEW';}};
window.WeeklyUpdates={show(){node('root').innerHTML='WEEKLY UPDATES VIEW';}};
window.showExplorer=()=>{location.hash='#relationship-explorer?topic=agriculture';node('root').innerHTML='EXPLORER VIEW';};
const mounts=[],impactViews=[];window.CanadaImpact={data:null,mount(view,id){mounts.push(id);node(id).innerHTML='IMPACT '+view;},show(view){impactViews.push(view);node('root').innerHTML='IMPACT '+view;}};
vm.runInContext(fs.readFileSync(path.join(dir,'home.js'),'utf8'),ctx,{filename:'home.js'});
const hub=window.HomeHub;
assert(hub);assert.equal(hub.tools.length,3);
const primary=['home','compare-topics','policy-tracker','us-trade','research-search','your-llm','weekly-updates','daily-updates'];
const initialNav=node('site-navigation').innerHTML;
assert.deepEqual(Array.from(initialNav.matchAll(/data-hub="([^"?]+)(?:\?[^"]*)?"/g),m=>m[1]).filter(id=>primary.includes(id)),primary);
assert.deepEqual(Array.from(hub.homeMenu,([id])=>id),['categories','countries','comparative']);
assert.deepEqual(Array.from(hub.compareMenu,([id])=>id),['evidence-methods','relationship-explorer']);
assert.equal((initialNav.match(/<details class="hub-nav-menu">/g)||[]).length,2);
assert(!initialNav.includes('data-hub="research-tools"'));

const initialHome=hub.homeHTML();
assert(initialHome.includes('class="hub-welcome"'));assert(initialHome.includes('Explore Canada’s policy choices.'));
assert(initialHome.includes('Where would you like to start?'));
assert.equal((initialHome.match(/class="hub-tool"/g)||[]).length,3);
assert.equal((initialHome.match(/id="hub-live-status"/g)||[]).length,1);
assert.equal((initialHome.match(/class="hub-topic"/g)||[]).length,0);
assert(!initialHome.includes('hub-region-explorer'));assert(!initialHome.includes('<table'));assert(!initialHome.includes('<svg'));assert.equal(mounts.length,0);
for(const [id]of hub.tools)assert(initialHome.includes('data-hub="'+id+'"'));
assert(initialHome.includes('data-hub="executive-summary"'));assert(!initialHome.includes('data-hub="canada-implications"'));assert(!initialHome.includes('Explore the Canada map'));
assert(node('site-navigation').innerHTML.includes('data-hub="home" aria-current="page">Home</a>'));
assert(initialHome.includes('Source first indexed'));assert(!initialHome.includes('<script>x'));
assert(hub.homeStatusHTML().includes('Partial coverage'));assert(!hub.homeStatusHTML().includes('<dl>'));assert(!hub.homeStatusHTML().includes('Scheduled'));
assert(hub.homeStatusHTML({...feed,lastSuccessfulRun:'2000-01-01'}).includes('Check overdue'));
const many={...feed,changes:Array.from({length:8},(_,i)=>({...feed.changes[0],id:'preview-'+i,title:'Source '+i,ai:{summary:'Do not repeat the detailed analysis here.'}}))};
const preview=hub.homeLatestHTML(many);assert.equal((preview.match(/<li>/g)||[]).length,3);assert(!preview.includes('Do not repeat the detailed analysis here.'));
assert.equal((hub.topicsHTML().match(/class="hub-topic"/g)||[]).length,8);
for(const [id]of hub.tabs){
 const viewsBefore=impactViews.length;hub.navigate(id);assert(/aria-current="(?:page|location)"/.test(node('site-navigation').innerHTML));assert(node('root').innerHTML.length>0);
 if(id==='home')assert(node('root').innerHTML.includes('hub-home-title'));
 if(['briefing-overview','canada-implications'].includes(id))assert.equal(node('root').innerHTML,'IMPACT overview');
 if(id==='executive-summary'){assert.equal(impactViews.length,viewsBefore);assert(node('root').innerHTML.includes('hub-product-summary'));assert(node('root').innerHTML.includes('What is this dashboard?'));assert(node('root').innerHTML.includes('Who can use it?'));assert(!node('root').innerHTML.includes('canada-impact-root'));}
 if(id==='compare-topics')assert.equal(node('root').innerHTML,'IMPACT compare');
 if(id==='policy-tracker')assert.equal(node('root').innerHTML,'IMPACT policy');
 if(id==='us-trade')assert.equal(node('root').innerHTML,'US TRADE VIEW');
 if(id==='weekly-updates')assert.equal(node('root').innerHTML,'WEEKLY UPDATES VIEW');
 if(id==='research-tools'){assert.equal((node('root').innerHTML.match(/class="hub-research-card"/g)||[]).length,7);for(const [tool]of hub.researchTools)assert(node('root').innerHTML.includes('data-hub="'+tool+'"'));}
 if(['categories','countries','comparative'].includes(id)){
  const html=node('root').innerHTML;assert(html.includes('Why does it matter to Canada?'));assert(html.includes('How can it help policy analysis?'));assert(html.includes('What changed?'));
  if(id==='categories')assert.equal((html.match(/data-hub="compare-topics\?topic=/g)||[]).length,8);
  if(id==='countries'){assert(html.includes('2018-07-06'));assert(html.includes('2026-11-04'));assert(html.includes('data-hub="canada-implications"'));}
  if(id==='comparative')assert(html.includes('data-hub="compare-topics"'));
 }

 if(id==='policy-map'){assert.equal((node('root').innerHTML.match(/class="mapcell"/g)||[]).length,21);assert(node('root').innerHTML.includes('data-legacy-record="live-auto-test-Canada-USA"'));assert(!node('root').innerHTML.includes('data-legacy-record="-1"'));}
 if(id==='daily-updates')assert.equal(node('root').innerHTML,'LIVE VIEW updates');
 if(id==='your-llm')assert.equal(node('root').innerHTML,'LIVE VIEW llm');
 if(id==='research-search')assert(node('root').innerHTML.includes('Research search'));
 if(id==='evidence-methods')assert.equal(node('root').innerHTML,'IMPACT evidence');
}
assert(window.LegacyPolicy.results('customs').some(r=>r.live));assert.equal(window.POLICY_MASTER.records.length,22);
feed.changes[0].title='A later daily source revision';hub.refreshLiveSections();assert(node('hub-latest').innerHTML.includes('A later daily source revision'));assert.equal(JSON.stringify(window.POLICY_MASTER.executiveSummary),original);
hub.navigate('unknown');assert.equal(location.hash,'#home');assert(node('root').innerHTML.includes('hub-home-title'));assert.equal(mounts.length,0);assert(!node('root').innerHTML.includes('hub-region-explorer'));
window.CanadaImpact.data={};window.CanadaImpact.filterQuery=()=>"region=ON&topic=vehicles&relationship=Canada-USA&period=2026&metric=all&layer=trade";
for(const id of ['home','briefing-overview','canada-implications']){hub.navigate(id);assert(location.hash.startsWith('#'+id+'?region=ON&topic=vehicles'));}
hub.navigate('executive-summary');assert.equal(location.hash,'#executive-summary');assert(node('root').innerHTML.includes('hub-product-summary'));
hub.navigate('compare-topics?topic=agriculture');const selected=new URLSearchParams(location.hash.split('?')[1]);assert.equal(selected.get('region'),'ON');assert.equal(selected.get('topic'),'agriculture');assert.equal(selected.get('layer'),'trade');
window.CanadaImpact.data=null;
const input=node('q');window.showResearchSearch();input.value='fentanyl';window.ask();assert(node('ans').innerHTML.includes('Opioids'));
input.value='lobster 2028';window.ask();assert(node('ans').innerHTML.includes('data-guide-source="canada-china-relief-extension"'));
input.value='龙虾';window.ask();assert(node('ans').innerHTML.includes('data-guide-source="canada-china-relief-extension"'));

const index=fs.readFileSync(path.join(dir,'index.html'),'utf8');assert(index.includes('id="site-navigation"'));assert(index.includes('id="root" tabindex="-1"'));assert(index.includes('home.js'));assert(index.includes('home.css'));
const live=fs.readFileSync(path.join(dir,'agent-tools.js'),'utf8');assert(live.includes('5*60*1000'));assert(live.includes("cache:'no-store'"));assert(live.includes("'visibilitychange'"));assert(!/localStorage|sessionStorage/.test(live));
console.log(JSON.stringify({passed:true,navigationTabs:hub.tabs.length,primaryTabs:8,dropdowns:2,homeSections:3,topicViews:8,routes:'all home destinations',daily:'home shows at most three source-title rows and a compact status; detailed records stay in their tools',preservation:'curated executive assessment and 22 original records retained',browserQA:'live and preview access restricted by network/saved browser permissions'}));

