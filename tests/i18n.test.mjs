import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import L from '../app/i18n.js';
import PN from '../app/policy-narrative.js';
import {answerCustomer} from '../api/src/lib/customer-llm.js';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('French and Simplified Chinese cover every reviewed record, policy question and research subtopic',()=>{
 for(const name of ['evidence-records.json','us-trade-evidence.json']){
  const data=JSON.parse(read('app/'+name)),before=JSON.stringify(data);
  for(const lang of ['fr','zh-Hans'])for(const r of data.records){
   for(const key of ['title','summary','limitation'])assert.notEqual(L.t(r[key],lang),r[key],r.id+' '+key+' '+lang);
   for(const key of ['why','regions'])assert.notEqual(L.t(PN.describe(r)[key],lang),PN.describe(r)[key],r.id+' '+key+' '+lang);
  }
  for(const t of data.assessments)for(const lang of ['fr','zh-Hans']){assert.notEqual(L.t(t.summary,lang),t.summary);for(const q of t.questions||[])assert.notEqual(L.t(q.text,lang),q.text);}
  assert.equal(JSON.stringify(data),before);
 }
 const c={window:{}};vm.createContext(c);vm.runInContext(read('app/explorer-catalog.js'),c);
 for(const t of c.window.EXPLORER_CATALOG.topics)for(const issue of t.issues)for(const lang of ['fr','zh-Hans'])for(const text of [issue.title,issue.why,issue.uncertainty,...issue.links.flatMap(l=>[l.label,l.connection])])assert.notEqual(L.t(text,lang),text,lang+': '+text);
});
test('statistical narratives preserve actual values, reference periods, units and missing-data distinctions',()=>{
 const us={kind:'us-goods',partner:'Canada',metric:'imports',value:304564.9,prior:290000,unit:'USD million',period:'Jan–Sep 2026'};
 for(const lang of ['fr','zh-Hans']){const s=L.t(PN.describe(us).changed,lang);assert(s.includes('304,564.9'));assert(s.includes('14,564.9'));assert(s.includes('2026'));assert(!s.includes(' were '));}
 assert(L.t(PN.describe({...us,value:null}).changed,'zh-Hans').includes('零'));
 const regional={kind:'regional-trade',geography:'Ontario',partner:'China',metric:'exports',value:12345,unit:'CAD',period:'January–August 2026',commodity:'Motor vehicles and parts'};
 assert(L.t(PN.describe(regional).changed,'zh-Hans').includes('12,345加元'));
 assert(L.t(PN.describe(regional).regions,'fr').includes('origine'));
 for(const s of ['https://www.canada.ca/en/test?year=2026','energy-exports-ytd','US45','9c830c925abde177e7231ab34a8cd956'])for(const lang of ['fr','zh-Hans'])assert.equal(L.t(s,lang),s);
});
test('language switching restores English and preserves form values, expanded evidence, IDs and filter URLs',()=>{
 const nodes=new Map(),saved=new Map();let callback,events=0;
 class Element{
  constructor(tag,attrs={}){this.tagName=tag.toUpperCase();this.nodeType=1;this.attrs=attrs;this.children=[];this.value='';if(attrs.id)nodes.set(attrs.id,this);}
  append(n){n.parentElement=this;this.children.push(n);}
  setAttribute(k,v){this.attrs[k]=v;}getAttribute(k){return this.attrs[k]??null;}
  closest(selector){for(let n=this;n;n=n.parentElement)if(selector.split(',').some(s=>s.trim()===n.tagName?.toLowerCase()||s.includes('data-no-translate')&&n.attrs?.['data-no-translate']!==undefined||s.includes('translate="no"')&&n.attrs?.translate==='no'))return n;return null;}
  querySelectorAll(){const out=[];for(const n of this.children){if(n.nodeType===1){out.push(n);out.push(...n.querySelectorAll());}}return out;}
 }
 const root=new Element('html'),header=new Element('header'),main=new Element('main'),select=new Element('select',{id:'dashboard-language'}),note=new Element('small',{id:'dashboard-language-note','data-no-translate':''}),form=new Element('input',{id:'customer-key',placeholder:'Provider API key'}),details=new Element('details',{id:'evidence'}),text={nodeType:3,nodeValue:'Policy Tracker'},quote=new Element('blockquote'),quoteText={nodeType:3,nodeValue:'What changed?'};
 details.open=true;form.value='typed-private-session-value';header.append(select);header.append(note);main.append(text);main.append(form);main.append(details);quote.append(quoteText);main.append(quote);root.append(header);root.append(main);
 const doc={documentElement:root,getElementById:id=>nodes.get(id),querySelector:s=>s==='body > header'?header:null,createTreeWalker(n){const values=[];function walk(el){for(const c of el.children||[]){if(c.nodeType===3)values.push(c);else walk(c);}}walk(n);let i=0;return{nextNode:()=>values[i++]||null};}};
 const win={document:doc,location:{href:'https://example.com/?lang=en#canada-implications?region=ON&topic=vehicles'},history:{replaceState(a,b,u){win.location.href=new URL(u,win.location.href).href;}},localStorage:{getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v)},dispatchEvent(){events++;},MutationObserver:class{constructor(f){callback=f;}observe(){}}};
 const context={window:win,document:doc,URL,Event};vm.createContext(context);for(const f of ['translations-ui.js','translations-content.js','i18n.js'])vm.runInContext(read('app/'+f),context);
 win.DashboardI18n.setLanguage('fr');assert.equal(text.nodeValue,'Suivi des politiques');assert.equal(form.getAttribute('placeholder'),'Clé API du fournisseur');assert.equal(root.lang,'fr');
 win.DashboardI18n.setLanguage('zh-Hans');assert.equal(text.nodeValue,'政策追踪');assert.equal(root.lang,'zh-Hans');assert(win.location.href.includes('region=ON&topic=vehicles'));assert(win.location.href.includes('lang=zh-Hans'));
 assert.equal(form.value,'typed-private-session-value');assert(details.open);assert.equal(form.getAttribute('id'),'customer-key');assert.equal(quoteText.nodeValue,'What changed?');
 win.DashboardI18n.setLanguage('en');assert.equal(text.nodeValue,'Policy Tracker');assert.equal(form.getAttribute('placeholder'),'Provider API key');
 text.nodeValue='Evidence & Methods';callback([{type:'characterData',target:text}]);win.DashboardI18n.setLanguage('fr');assert.equal(text.nodeValue,'Données et méthodes');assert.equal(saved.size,1);assert.equal(saved.get('policy-dashboard-language'),'fr');assert(events>=4);
});
test('French and Chinese search terms reach the original English evidence without changing route keys',()=>{
 assert.equal(L.searchQuery('芬太尼'),'fentanyl');assert.equal(L.searchQuery('huile de canola'),'canola oil');assert.equal(L.searchQuery('chine'),'China');
 const c={window:{DashboardI18n:L}};vm.createContext(c);vm.runInContext(read('app/us-trade-model.js'),c);const data=JSON.parse(read('app/us-trade-evidence.json')),M=c.window.USTradeModel;
 const rows=M.records(data,M.normalize(data,{query:'芬太尼'}));assert(rows.length>=2);assert(rows.some(r=>r.id==='us-fentanyl-north'));const batteries=M.records(data,M.normalize(data,{query:'中国 电池'}));assert(batteries.length);assert(batteries.every(r=>r.partner==='China'));
});
test('customer model language uses fixed trusted instructions and keeps citation validation',async()=>{
 const evidence=JSON.parse(read('app/evidence-records.json')),inventory=JSON.parse(read('api/master-data.json'));let system='';
 for(const [language,expected]of [['fr','French'],['zh-Hans','Simplified Chinese'],['constructor','English']]){
  const result=await answerCustomer({provider:'openai',model:'fixture',apiKey:'not-a-real-key',question:'What changed in Windsor?',recordIds:['nextstar-jobs'],language},{evidence,inventory,fetchImpl:async(u,options)=>{const body=JSON.parse(options.body);system=JSON.stringify(body);return new Response(JSON.stringify({output:[{content:[{type:'output_text',text:'Evidence [nextstar-jobs].'}]}]}));}});
  assert.equal(result.status,200);assert(system.includes('Respond in '+expected));
 }
});
test('office palette has readable text and charts retain the same map/legend data mapping',()=>{
 const css=read('app/office-theme.css'),colour=name=>css.match(new RegExp('--office-'+name+':(#[0-9a-f]{6})'))[1];
 const luminance=h=>{const a=h.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return a[0]*.2126+a[1]*.7152+a[2]*.0722;};
 for(const [a,b]of [['navy','beige'],['navy','paper'],['navy','gold'],['muted','beige'],['ink-gold','paper']]){const x=luminance(colour(a)),y=luminance(colour(b));assert((Math.max(x,y)+.05)/(Math.min(x,y)+.05)>=4.5,a+'/'+b);}
 assert(!/\.impact-province\s*\{[^}]*fill\s*:/.test(css));
 const html=read('app/index.html');assert(html.indexOf('office-theme.css')>html.indexOf('policy-narrative.css'));assert(html.indexOf('i18n.js')<html.indexOf('master-data.js'));
});
