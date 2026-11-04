(function(global){
 'use strict';
 const common=typeof module!=='undefined'&&module.exports;
 const ui=common?require('./translations-ui.js'):global.POLICY_TRANSLATIONS_UI;
 const content=common?require('./translations-content.js'):global.POLICY_TRANSLATIONS_CONTENT;
 const dictionaries={...(ui||{}),...(content||{})};
 const normalize=s=>{const code=String(s??'').replaceAll('_','-').toLowerCase();return /^fr(?:-|$)/.test(code)?'fr':['zh','zh-cn','zh-hans','zh-hans-cn'].includes(code)?'zh-Hans':'en';};
 let language='en';const textCache=new Map();const originals=new WeakMap(),attributes=new WeakMap();
 const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
 function exact(text,lang){const entry=dictionaries[text];return entry?.[lang==='fr'?0:1]??null;}
 function translate(text,lang=language){
  const original=String(text??'');lang=normalize(lang);if(lang==='en'||!original.trim())return original;
  const normalized=clean(original),direct=exact(normalized,lang);if(direct!==null)return original.replace(original.trim(),direct);
  const monthYear=normalized.match(/^(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{4})$/);
  if(monthYear)return original.replace(original.trim(),lang==='fr'?translate(monthYear[1],lang)+' '+monthYear[2]:monthYear[2]+'年'+translate(monthYear[1],lang));
  if(!/[A-Za-z]/.test(normalized))return original;
  if(/^(?:https?:\/\/|[a-z]+-[a-z0-9_-]+$|[A-Z]{1,3}\d+$|[a-f0-9]{30,})/.test(normalized))return original;
  const cacheKey=lang+'\0'+normalized;if(textCache.has(cacheKey))return original.replace(original.trim(),textCache.get(cacheKey));
  let result=normalized;
  for(const rule of rules){result=result.replace(rule[0],(...args)=>rule[lang==='fr'?1:2](...args));}
  // Full phrases, longest first, preserve numbers, source identifiers and URLs.
  for(const [source,target] of phraseEntries(lang)){
   if(!result.includes(source))continue;
   const escaped=source.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
   result=result.replace(new RegExp('(?<![A-Za-z])'+escaped+'(?![A-Za-z])','g'),()=>target);
  }
  result=result.replace(dateRule[0],(...args)=>dateRule[lang==='fr'?1:2](...args));
  if(textCache.size>15000)textCache.clear();textCache.set(cacheKey,result);
  return original.replace(original.trim(),result);
 }
 const cache={};function phraseEntries(lang){return cache[lang]||(cache[lang]=Object.entries(dictionaries).filter(([s])=>s.length>2).sort((a,b)=>b[0].length-a[0].length).map(([s,v])=>[s,v[lang==='fr'?0:1]]));}
 const rules=[
  [/^U\.S\. (exports to|imports from|goods balance with) (Canada|China) have no publishable value for (.+?)\./,(_,kind,c,p)=>'Aucune valeur publiable pour '+({'exports to':'les exportations américaines vers ','imports from':'les importations américaines depuis ','goods balance with':'le solde américain avec '}[kind])+translate(c,'fr')+' pour '+translate(p,'fr')+'.',(_,kind,c,p)=>({'exports to':'美国对','imports from':'美国从','goods balance with':'美国对'}[kind])+translate(c,'zh-Hans')+({'exports to':'出口','imports from':'进口','goods balance with':'货物贸易差额'}[kind])+'在'+translate(p,'zh-Hans')+'没有可公布数值。'],
  [/^Two-way U\.S\. goods trade with (Canada|China) have no publishable value for (.+?)\./,(_,c,p)=>'Aucune valeur publiable du commerce bilatéral des États-Unis avec '+translate(c,'fr')+' pour '+translate(p,'fr')+'.',(_,c,p)=>'美国与'+translate(c,'zh-Hans')+'的双边货物贸易在'+translate(p,'zh-Hans')+'没有可公布数值。'],
  [/^(.+?) domestic exports to (United States|China|All countries) were unchanged in (.+?) versus the same months a year earlier\./,(_,r,c,p)=>'Pour la région « '+translate(r,'fr')+' », les exportations intérieures vers '+translate(c,'fr')+' sont restées stables pour '+translate(p,'fr')+' par rapport aux mêmes mois de l’année précédente.',(_,r,c,p)=>translate(r,'zh-Hans')+'对'+translate(c,'zh-Hans')+'的本国产品出口在'+translate(p,'zh-Hans')+'较上年同期保持不变。'],
  [/^Canada policy briefing · week of (\d{4}-\d{2}-\d{2})$/,(_,date)=>'Note de politique canadienne · semaine du '+date,(_,date)=>'加拿大政策简报 · '+date+'当周'],
  [/^(.*) export volume to (China|Canada)$/,(_,p,c)=>'Volume d’exportation de '+translate(p,'fr')+' vers '+(c==='China'?'la Chine':'le Canada'),(_,p,c)=>translate(p,'zh-Hans')+'对'+translate(c,'zh-Hans')+'出口量'],
  [/^(.*) exports to (China|Canada)$/,(_,p,c)=>'Exportations de '+translate(p,'fr')+' vers '+(c==='China'?'la Chine':'le Canada'),(_,p,c)=>translate(p,'zh-Hans')+'对'+translate(c,'zh-Hans')+'出口'],
  [/^U\.S\. (exports to|imports from|goods balance with) (Canada|China) were ([−+\d,. -]+) USD million in (.+?)\./,(_,kind,c,n,p)=>({'exports to':'Les exportations américaines vers ','imports from':'Les importations américaines depuis ','goods balance with':'Le solde américain avec '}[kind])+translate(c,'fr')+' étaient de '+n+' millions USD pour '+translate(p,'fr')+'.',(_,kind,c,n,p)=>({'exports to':'美国对','imports from':'美国从','goods balance with':'美国对'}[kind])+translate(c,'zh-Hans')+({'exports to':'出口','imports from':'进口','goods balance with':'货物贸易差额'}[kind])+'在'+translate(p,'zh-Hans')+'为'+n+'百万美元。'],
  [/^Two-way U\.S\. goods trade with (Canada|China) were ([−+\d,. -]+) USD million in (.+?)\./,(_,c,n,p)=>'Le commerce bilatéral des États-Unis avec '+translate(c,'fr')+' était de '+n+' millions USD pour '+translate(p,'fr')+'.',(_,c,n,p)=>'美国与'+translate(c,'zh-Hans')+'的双边货物贸易在'+translate(p,'zh-Hans')+'为'+n+'百万美元。'],
  [/\b(Up|Down) ([−+\d,. -]+) (USD million|CAD) from the same period a year earlier\./,(_,d,n,u)=>(d==='Up'?'Hausse de ':'Baisse de ')+n+' '+translate(u,'fr')+' par rapport à la même période de l’année précédente.',(_,d,n,u)=>'较上一年同期'+(d==='Up'?'增加':'减少')+n+translate(u,'zh-Hans')+'。'],
  [/Unchanged from the same period a year earlier\./,()=> 'Inchangé par rapport à la même période de l’année précédente.',()=> '与上一年同期持平。'],
  [/^(.+?) domestic exports to (United States|China|All countries) (rose|fell) ([\d,.]+)% in (.+?) versus the same months a year earlier\./,(_,r,c,d,n,p)=>'Les exportations intérieures de '+translate(r,'fr')+' vers '+translate(c,'fr')+' ont '+(d==='rose'?'augmenté':'diminué')+' de '+n+' % pour '+translate(p,'fr')+' par rapport aux mêmes mois de l’année précédente.',(_,r,c,d,n,p)=>translate(r,'zh-Hans')+'对'+translate(c,'zh-Hans')+'的本国产品出口在'+translate(p,'zh-Hans')+'较上年同期'+(d==='rose'?'增长':'下降')+n+'%。'],
  [/^(United States|China|All countries) received ([\d,.]+) % of (.+?) domestic exports in (.+?)\./,(_,c,n,r,p)=>translate(c,'fr')+' a reçu '+n+' % des exportations intérieures de '+translate(r,'fr')+' pour '+translate(p,'fr')+'.',(_,c,n,r,p)=>'在'+translate(p,'zh-Hans')+'，'+translate(c,'zh-Hans')+'占'+translate(r,'zh-Hans')+'本国产品出口的'+n+'%。'],
  [/^(.+?) shipped ([−+\d,. -]+) CAD of (.+?) to (United States|China|All countries) in (.+?)\./,(_,r,n,k,c,p)=>translate(r,'fr')+' a expédié '+n+' CAD de '+translate(k,'fr')+' vers '+translate(c,'fr')+' pour '+translate(p,'fr')+'.',(_,r,n,k,c,p)=>translate(r,'zh-Hans')+'在'+translate(p,'zh-Hans')+'向'+translate(c,'zh-Hans')+'出口'+n+'加元的'+translate(k,'zh-Hans')+'。'],
  [/The comparable earlier period was ([−+\d,. -]+) CAD\./,(_,n)=>'La période antérieure comparable affichait '+n+' CAD.',(_,n)=>'可比前期为'+n+'加元。'],
  [/^The (.+?) series helps test (.+?)’s dependence on (United States|China|All countries) and compare demand with alternative buyers\./,(_,k,r,c)=>'La série '+translate(k,'fr')+' aide à évaluer la dépendance de '+translate(r,'fr')+' envers '+translate(c,'fr')+' et les débouchés auprès d’autres acheteurs.',(_,k,r,c)=>translate(k,'zh-Hans')+'序列有助于检验'+translate(r,'zh-Hans')+'对'+translate(c,'zh-Hans')+'的依赖，并与替代买家的需求比较。'],
  [/^This series is assigned to (.+?) by province or territory of origin\. It shows commercial exposure; the change cannot by itself establish local jobs, net benefit or policy causation\./,(_,r)=>'Cette série est attribuée à '+translate(r,'fr')+' selon l’origine provinciale ou territoriale. Elle montre l’exposition commerciale ; elle ne prouve pas à elle seule l’emploi local, le bénéfice net ou la causalité.',(_,r)=>'该序列按原产省或地区归属于'+translate(r,'zh-Hans')+'，反映商业敞口；变化本身不能确定本地就业、净收益或政策因果关系。'],
  [/^Observed location: (.+?)\. Read this as (a provincial measure|a project or employer observation); it is not a total for (.+?) or proof of an agreement’s effect\./,(_,r,k,p)=>'Lieu observé : '+translate(r,'fr')+'. Il s’agit '+(k==='a provincial measure'?'d’une mesure provinciale':'d’une observation de projet ou d’employeur')+', pas d’un total pour '+translate(p,'fr')+' ni d’une preuve de l’effet d’un accord.',(_,r,k,p)=>'观测地点：'+translate(r,'zh-Hans')+'。这是'+(k==='a provincial measure'?'省级指标':'项目或雇主观测记录')+'，并非'+translate(p,'zh-Hans')+'的总量，也不能证明协议的影响。'],
  [/^This record concerns (.+?)\. It retains its original industry and period; it cannot explain other provinces or establish a bilateral trade effect\./,(_,r)=>'Cette fiche concerne '+translate(r,'fr')+'. Son secteur et sa période d’origine sont conservés ; elle n’explique pas les autres provinces ni un effet bilatéral.',(_,r)=>'此记录涉及'+translate(r,'zh-Hans')+'。保留其原有行业与参考期，不能解释其他省份或确定双边贸易效果。'],
  [/^(.+?): ([−+\d,. -]+) USD million in Calendar year (\d{4})\./,(_,title,n,y)=>translate(title,'fr')+' : '+n+' millions USD, année civile '+y+'.',(_,title,n,y)=>translate(title,'zh-Hans')+'：'+y+'自然年为'+n+'百万美元。'],
  [/^(.+?): ([−+\d,. -]+) USD million in End (\d{4})\./,(_,title,n,y)=>translate(title,'fr')+' : '+n+' millions USD à fin '+y+'.',(_,title,n,y)=>translate(title,'zh-Hans')+'：截至'+y+'年末为'+n+'百万美元。'],
  [/^Source (revision|discovery) detected ([\dTZ:.+-]+)\./,(_,k,date)=>'Source '+(k==='revision'?'révisée':'découverte')+' détectée le '+date+'.',(_,k,date)=>'在'+date+'检测到来源'+(k==='revision'?'修订':'首次收录')+'。'],
  [/^No publishable, comparable value is available for (.+?) \/ (.+?) in (.+?)\./,(_,r,c,p)=>'Aucune valeur publiable comparable pour '+translate(r,'fr')+' / '+translate(c,'fr')+' pour '+translate(p,'fr')+'.',(_,r,c,p)=>translate(r,'zh-Hans')+'／'+translate(c,'zh-Hans')+'在'+translate(p,'zh-Hans')+'没有可发布的可比数值。'],
  [/Calendar year (\d{4})/g,(_,y)=>'Année civile '+y,(_,y)=>y+'自然年'],
  [/End of (\d{4})/g,(_,y)=>'Fin de '+y,(_,y)=>y+'年末'],
  [/January–([A-Za-z]+) (\d{4})/g,(_,m,y)=>'Janvier–'+translate(m,'fr')+' '+y,(_,m,y)=>y+'年1月至'+translate(m,'zh-Hans')],
  [/Jan–([A-Za-z]+) (\d{4})/g,(_,m,y)=>'Janv.–'+translate(m,'fr')+' '+y,(_,m,y)=>y+'年1月至'+translate(m,'zh-Hans')],
  [/\b(\d+) records match/g,(_,n)=>n+' fiches correspondent',(_,n)=>n+'条记录符合'],
  [/\b(\d+) matching records/g,(_,n)=>n+' fiches correspondantes',(_,n)=>n+'条匹配记录'],
  [/\bpage (\d+) of (\d+)/g,(_,p,n)=>'page '+p+' sur '+n,(_,p,n)=>'第'+p+'页，共'+n+'页'],
  [/\b(\d+) evidence record\(s\)/g,(_,n)=>n+' fiche(s)',(_,n)=>n+'条证据记录'],
  [/\b(\d+) records/g,(_,n)=>n+' fiches',(_,n)=>n+'条记录'],
  [/\b(\d+) original sources/g,(_,n)=>n+' sources originales',(_,n)=>n+'个原始来源'],
  [/\b(\d+) latest errors/g,(_,n)=>n+' erreurs récentes',(_,n)=>n+'个最近错误'],
  [/\b(\d+) source errors/g,(_,n)=>n+' erreurs de source',(_,n)=>n+'个来源错误'],
  [/\b(\d+) source pages read/g,(_,n)=>n+' pages sources lues',(_,n)=>n+'个已读取来源页面']
 ];

 rules.push(
  [/\bInspect (R\d+) and source\b/g,(_,id)=>'Examiner '+id+' et sa source',(_,id)=>'查看'+id+'及来源'],
  [/\bInspect linked implementation and outcome evidence \((\d+)\)/g,(_,n)=>'Examiner les preuves de mise en œuvre et résultats ('+n+')',(_,n)=>'查看关联实施与结果证据（'+n+'）'],
  [/\bExpand the (\d+) matched evidence records/g,(_,n)=>'Ouvrir les '+n+' fiches correspondantes',(_,n)=>'展开'+n+'条匹配证据记录'],
  [/\b(\d+) source\(s\) changed after monitoring began\. Reviewed findings are preserved; inspect source-review flags below\./g,(_,n)=>n+' source(s) modifiée(s) depuis le début de la veille. Résultats examinés conservés ; consulter les alertes ci-dessous.',(_,n)=>'监测开始后有'+n+'个来源变化。保留已审阅结论，请查看下方审阅标记。'],
  [/\b(\d+) observations in this window; (\d+) shown\./g,(_,n,s)=>n+' observations dans cette période ; '+s+' présentées.',(_,n,s)=>'本期窗口内有'+n+'项动态；显示'+s+'项。'],
  [/Scheduled at ([\d:]+) daily UTC\. Covers registered official sources; GitHub scheduling can be delayed\. A source revision is not automatically an amendment or a policy entering into force\./g,(_,time)=>'Prévu chaque jour à '+time+' UTC pour les sources officielles inscrites. GitHub peut retarder l’exécution. Une révision n’est pas automatiquement un amendement ni une entrée en vigueur.',(_,time)=>'每日UTC '+time+'运行，覆盖已登记官方来源；GitHub调度可能延迟。来源修订不自动等于法律修订或政策生效。'],
  [/\b([−+\d,.]+) % from (\w+) (\d{4}) to (\w+) (\d{4})/g,(_,n,m,y,m2,y2)=>n+' % de '+translate(m,'fr')+' '+y+' à '+translate(m2,'fr')+' '+y2,(_,n,m,y,m2,y2)=>y+'年'+translate(m,'zh-Hans')+'至'+y2+'年'+translate(m2,'zh-Hans')+'变化'+n+'%'],
 );
 const dateRule=[/\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?) (\d{1,2}), (\d{4})\b/g,(_,m,d,y)=>d+' '+translate(m,'fr')+' '+y,(_,m,d,y)=>y+'年'+translate(m,'zh-Hans')+d+'日'];
 function nodeText(node){
  const parent=node.parentElement;if(!parent||parent.closest?.('script,style,code,pre,textarea,blockquote,[data-no-translate],[translate="no"]'))return;
  const old=originals.get(node),source=old&&node.nodeValue===old.output?old.source:node.nodeValue,output=translate(source);originals.set(node,{source,output});if(node.nodeValue!==output)node.nodeValue=output;
 }
 function nodeAttributes(node){if(!node.getAttribute||node.closest?.('[data-no-translate],[translate="no"]'))return;let saved=attributes.get(node);if(!saved){saved={};attributes.set(node,saved);}for(const key of ['aria-label','title','placeholder','alt']){const value=node.getAttribute(key);if(value===null)continue;const old=saved[key],source=old&&value===old.output?old.source:value,output=translate(source);saved[key]={source,output};if(value!==output)node.setAttribute(key,output);}}
 function translateTree(root){if(!global?.document||!root)return;if(root.nodeType===3){nodeText(root);return;}nodeAttributes(root);const doc=global.document,walker=doc.createTreeWalker(root,4);let node;while((node=walker.nextNode()))nodeText(node);for(const el of root.querySelectorAll?.('[aria-label],[title],[placeholder],[alt]')||[])nodeAttributes(el);}
 function setLanguage(code,{persist=true}={}){
  language=normalize(code);if(!global?.document)return language;const doc=global.document;doc.documentElement.lang=language;const select=doc.getElementById('dashboard-language');if(select)select.value=language;
  const note=doc.getElementById('dashboard-language-note');if(note)note.textContent=language==='fr'?'Les sources s’ouvrent dans leur langue de publication. Les valeurs et les dates de référence sont conservées.':language==='zh-Hans'?'来源链接以原始发布语言打开。数据值和参考期保持不变。':'Sources open in their published language. Data values and reference periods are preserved.';
  if(persist){try{global.localStorage.setItem('policy-dashboard-language',language);}catch{}try{const url=new URL(global.location.href);url.searchParams.set('lang',language);global.history.replaceState(null,'',url.pathname+url.search+url.hash);}catch{}}
  translateTree(doc.documentElement);global.dispatchEvent?.(new Event('dashboard-language-changed'));return language;
 }
 function mount(){const doc=global.document,header=doc.querySelector('body > header');if(header&&!doc.getElementById('dashboard-language')){const bar=doc.createElement('div');bar.className='dashboard-language-bar';bar.setAttribute('data-no-translate','');bar.innerHTML='<label for="dashboard-language">Language / Langue / 语言</label><select id="dashboard-language" aria-label="Language / Langue / 语言"><option value="en" lang="en">English</option><option value="fr" lang="fr">Français</option><option value="zh-Hans" lang="zh-Hans">简体中文</option></select><small id="dashboard-language-note"></small>';header.append(bar);bar.querySelector('select').addEventListener('change',e=>setLanguage(e.target.value));}
  let preferred='en';try{preferred=new URL(global.location.href).searchParams.get('lang')||global.localStorage.getItem('policy-dashboard-language')||'en';}catch{}setLanguage(preferred,{persist:false});
  if(global.MutationObserver){const observer=new global.MutationObserver(records=>{for(const r of records){if(r.type==='characterData')nodeText(r.target);else if(r.type==='attributes')nodeAttributes(r.target);else for(const n of r.addedNodes)translateTree(n);}});observer.observe(doc.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['aria-label','title','placeholder','alt']});}
  global.addEventListener?.('popstate',()=>{try{const requested=new URL(global.location.href).searchParams.get('lang');if(requested&&normalize(requested)!==language)setLanguage(requested,{persist:false});}catch{}});
 }
 const searchAliases={'出口':'exports','进口':'imports','就业':'employment','中兴':'ZTE','华为':'Huawei','芬太尼':'fentanyl','前体':'precursor','电动汽车':'EV','电池':'battery','车辆':'vehicle','汽车':'vehicle','油菜籽':'canola','菜籽油':'canola oil','菜籽粕':'canola meal','农业':'agriculture','农产品':'agriculture','能源':'energy','石油':'oil','天然气':'LNG','金融':'financial','投资':'investment','关税':'tariff','国防':'defence','安全':'security','技术':'technology','半导体':'semiconductor','数据':'data','加拿大':'Canada','美国':'United States','中国':'China','协议':'agreement','谅解备忘录':'MOU','véhicules électriques':'EV','voitures électriques':'EV','véhicules':'vehicle','batteries':'battery','défense':'defence','sécurité':'security','droits de douane':'tariff','droits':'tariff','énergie':'energy','investissements':'investment','investissement':'investment','services financiers':'financial services','financiers':'financial','technologie':'technology','précurseurs':'precursor','huile de canola':'canola oil','tourteaux de canola':'canola meal','Chine':'China','États-Unis':'United States','données':'data','emploi':'employment','accords':'agreements'};
 function searchQuery(input=''){let result=String(input??'');for(const [source,target]of Object.entries(searchAliases).sort((a,b)=>b[0].length-a[0].length)){const escaped=source.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');result=result.replace(new RegExp(escaped,/[A-Za-z]/.test(source)?'gi':'g'),' '+target+' ');}return result.replace(/[对的与和及在向省]/g,' ').replace(/\s+/g,' ').trim();}
 const api={t:translate,setLanguage,translateTree,normalize,dictionaries,searchQuery,get language(){return language;},get locale(){return language==='fr'?'fr-CA':language==='zh-Hans'?'zh-CN':'en-CA';}};
 if(common)module.exports=api;if(global){global.DashboardI18n=api;mount();}
})(typeof window==='undefined'?null:window);
