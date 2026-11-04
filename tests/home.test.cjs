const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'../app'),nodes=new Map(),events=new Map();
function node(id){if(!nodes.has(id))nodes.set(id,{innerHTML:'',value:'',open:false,listeners:{},addEventListener(type,fn){this.listeners[type]=fn;},querySelector(s){return node(id+' '+s);},querySelectorAll(){return[];},closest(){return node('panel');},insertAdjacentHTML(_,html){this.innerHTML+=html;},focus(){},scrollIntoView(){},setAttribute(){},append(){},showModal(){this.open=true;},remove(){}});return nodes.get(id);}
const location={hash:'',pathname:'/',search:''},document={title:'',getElementById:node,querySelector:s=>node(s),querySelectorAll:()=>[],addEventListener(type,fn){events.set(type,fn);}};
const window={addEventListener(type,fn){events.set(type,fn);}};
const ctx={window,document,location,history:{replaceState(a,b,url){location.hash=url.startsWith('#')?url:'';},pushState(a,b,url){location.hash=url;}},URL,URLSearchParams,Intl,Date,console};vm.createContext(ctx);
for(const file of ['master-data.js','app.js','explorer-inventory.js','explorer-catalog.js'])vm.runInContext(fs.readFileSync(path.join(dir,file),'utf8'),ctx,{filename:file});
const original=JSON.stringify(window.POLICY_MASTER.executiveSummary);
const feed={lastSuccessfulRun:new Date().toISOString(),lastRunStatus:'partial',sourcesChecked:40,sourceFailures:[{url:'https://www.canada.ca/moved',error:'HTTP 404'}],aiEnabled:false,scheduleUTC:'11:17 daily',changes:[{id:'auto-test',title:'New EV customs source <script>x</script>',url:'https://www.canada.ca/test',source:'Canada',detectedAt:new Date().toISOString(),topics:['vehicles'],relationships:['Canada-USA'],changeType:'new_source'}]};
window.PolicyLive={feed,show(view){location.hash=view==='llm'?'#your-llm':'#daily-updates';node('root').innerHTML='LIVE VIEW '+view;}};
window.showExplorer=()=>{location.hash='#relationship-explorer?topic=agriculture';node('root').innerHTML='EXPLORER VIEW';};
window.CanadaImpact={data:null,mount(view,id){node(id).innerHTML='IMPACT '+view;},show(view){node('root').innerHTML='IMPACT '+view;}};
vm.runInContext(fs.readFileSync(path.join(dir,'home.js'),'utf8'),ctx,{filename:'home.js'});
const hub=window.HomeHub;
assert(hub);assert.equal(hub.tabs.length,12);assert.equal(hub.tools.length,11);
assert(node('root').innerHTML.includes('All sections, one home.'));
assert.equal((node('site-navigation').innerHTML.match(/data-hub=/g)||[]).length,12);
for(const [id]of hub.tabs){assert(node('site-navigation').innerHTML.includes('href="#'+id+'"'));}
const initialHome=hub.homeHTML();
assert(initialHome.includes('class="hub-hero"'));assert(initialHome.includes('Canada’s policy choices.'));
assert(initialHome.indexOf('id="hub-home-title"')<initialHome.indexOf('id="hub-region-explorer"'));
assert(initialHome.indexOf('id="hub-sections-title"')<initialHome.indexOf('id="hub-region-explorer"'));
assert(initialHome.indexOf('id="hub-topics-title"')<initialHome.indexOf('id="hub-region-explorer"'));
assert.equal((initialHome.match(/id="hub-live-status"/g)||[]).length,1);
assert.equal((initialHome.match(/id="hub-region-explorer"/g)||[]).length,1);
for(const [id]of hub.tabs.filter(([id])=>id!=='home'))assert(initialHome.includes('data-hub="'+id+'"'));
assert.equal((initialHome.match(/class="hub-topic"/g)||[]).length,8);
assert(initialHome.includes('data-hub="compare-topics?topic=technology"'));
assert(node('site-navigation').innerHTML.includes('data-hub="home" aria-current="page">Home</a>'));
assert(hub.homeHTML().includes('Source first indexed'));assert(!hub.homeHTML().includes('<script>x'));
assert(hub.statusHTML().includes('40'));assert(hub.statusHTML().includes('Partial coverage'));
assert(hub.statusHTML({...feed,lastSuccessfulRun:'2000-01-01'}).includes('Check overdue'));
assert.equal((hub.topicsHTML().match(/class="hub-topic"/g)||[]).length,8);
for(const [id]of hub.tabs){
 hub.navigate(id);assert(node('site-navigation').innerHTML.includes('aria-current="page"'));assert(node('root').innerHTML.length>0);
 if(id==='home')assert(node('root').innerHTML.includes('hub-home-title'));
 if(['executive-summary','briefing-overview','canada-implications'].includes(id))assert.equal(node('root').innerHTML,'IMPACT overview');
 if(id==='compare-topics')assert.equal(node('root').innerHTML,'IMPACT compare');
 if(id==='policy-tracker')assert.equal(node('root').innerHTML,'IMPACT policy');
 if(id==='policy-map'){assert.equal((node('root').innerHTML.match(/class="mapcell"/g)||[]).length,21);assert(node('root').innerHTML.includes('data-legacy-record="live-auto-test-Canada-USA"'));assert(!node('root').innerHTML.includes('data-legacy-record="-1"'));}
 if(id==='daily-updates')assert.equal(node('root').innerHTML,'LIVE VIEW updates');
 if(id==='your-llm')assert.equal(node('root').innerHTML,'LIVE VIEW llm');
 if(id==='research-search')assert(node('root').innerHTML.includes('Research search'));
 if(id==='evidence-methods')assert.equal(node('root').innerHTML,'IMPACT evidence');
}
assert(window.LegacyPolicy.results('customs').some(r=>r.live));assert.equal(window.POLICY_MASTER.records.length,22);
feed.changes[0].title='A later daily source revision';hub.refreshLiveSections();assert(node('hub-latest').innerHTML.includes('A later daily source revision'));assert.equal(JSON.stringify(window.POLICY_MASTER.executiveSummary),original);
hub.navigate('unknown');assert.equal(location.hash,'#home');assert(node('root').innerHTML.includes('hub-home-title'));assert.equal(node('hub-region-explorer').innerHTML,'IMPACT overview');
window.CanadaImpact.data={};window.CanadaImpact.filterQuery=()=>"region=ON&topic=vehicles&relationship=Canada-USA&period=2026&metric=all&layer=trade";
for(const id of ['home','briefing-overview','canada-implications']){hub.navigate(id);assert(location.hash.startsWith('#'+id+'?region=ON&topic=vehicles'));}
window.CanadaImpact.data=null;
const input=node('q');window.showResearchSearch();input.value='fentanyl';window.ask();assert(node('ans').innerHTML.includes('Opioids'));
const index=fs.readFileSync(path.join(dir,'index.html'),'utf8');assert(index.includes('id="site-navigation"'));assert(index.includes('id="root" tabindex="-1"'));assert(index.includes('home.js'));assert(index.includes('home.css'));
const live=fs.readFileSync(path.join(dir,'agent-tools.js'),'utf8');assert(live.includes('5*60*1000'));assert(live.includes("cache:'no-store'"));assert(live.includes("'visibilitychange'"));assert(!/localStorage|sessionStorage/.test(live));
console.log(JSON.stringify({passed:true,navigationTabs:12,homeSections:11,topicLinks:8,routes:'all home destinations',daily:'live feed refreshes home and executive developments; map and search include labelled observations',preservation:'curated executive assessment and 22 original records retained',browserQA:'live and preview access restricted by network/saved browser permissions'}));

