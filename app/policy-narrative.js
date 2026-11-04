(function(global){
 'use strict';
 const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const names={ON:'Ontario',QC:'Quebec',BC:'British Columbia',AB:'Alberta',SK:'Saskatchewan',MB:'Manitoba',NB:'New Brunswick',NS:'Nova Scotia',PE:'Prince Edward Island',NL:'Newfoundland and Labrador',YT:'Yukon',NT:'Northwest Territories',NU:'Nunavut'};
 const lenses={
  vehicles:['The policy question is whether market access sustains Canadian assembly and parts production, or changes competition for Canadian producers.','Watch assembly and battery communities in Ontario and Quebec; a national trade total cannot establish their local jobs result.'],
  agriculture:['The policy question is whether Canadian growers and processors retain buyers, and whether higher-value processing stays in Canada.','Prairie growers and processors, and relevant food and seafood communities elsewhere, may face different demand and tariff effects; provincial magnitudes need local data.'],
  energy:['The policy question is how reliable export demand and alternative buyers affect Canadian producers’ options. Prices, volumes and operating capacity tell different stories.','Check producing regions and transport routes separately, including Alberta, Saskatchewan, British Columbia and Newfoundland and Labrador; national totals do not allocate local benefits.'],
  finance:['The policy question is whether Canadian firms can serve customers and manage cross-border financial risks. Foreign earnings are different from services exported from Canada.','Financial centres and firms across Canada may be exposed; these bilateral or company figures do not assign activity or employment to a province.'],
  technology:['The policy question is whether Canadian suppliers can access technology and markets while meeting data, export-control and security requirements.','Technology firms and infrastructure operators across provinces may face compliance or sourcing choices; local costs and employment effects are not measured here.'],
  security:['The policy question is how Canadian cooperation, enforcement and supplier choices address security risks while sustaining legitimate trade.','Provincial infrastructure, border communities and defence suppliers may have different exposure; operational results and local effects require their own evidence.'],
  investment:['The policy question is whether cross-border capital supports Canadian productive capacity, and which screening conditions constrain it.','Identify the actual project location before assigning a provincial effect; a national investment position or financial flow is not a factory or jobs count.'],
  agreements:['The policy question is whether a change in legal access gives Canadian businesses more reliable options, or adds uncertainty.','Effects depend on each province’s products and buyers. Check tariff lines, origin rules and implementation before estimating provincial exposure.']
 };
 function topic(r){
  if(r.topic&&lenses[r.topic])return r.topic;
  if(r.topics?.length)return r.topics.find(t=>lenses[t])||'agreements';
  const text=[r.title,r.field,r.commodity].join(' ').toLowerCase();
  return /fentanyl|opioid|defence|security/.test(text)?'security':/vehicle|batter|automotive/.test(text)?'vehicles':/canola|farm|agricultur|food|seafood/.test(text)?'agriculture':/energy|crude|\blng\b|mineral/.test(text)?'energy':/technolog|digital|cyber|huawei/.test(text)?'technology':/screening|investment/.test(text)?'investment':/financ|services/.test(text)?'finance':'agreements';
 }
 const n=v=>new Intl.NumberFormat('en-CA',{maximumFractionDigits:3}).format(v);
 function describe(r={}){
  const t=topic(r),id=r.id||'',type=r.measurementType||'',text=[id,r.title].join(' ').toLowerCase(),lens=lenses[t];
  let why=lens[0],regions=lens[1],changed=r.summary||'This is a dated source observation. Its operative policy status needs to be checked against the original document.';
  const amount=r.value===null||r.value===undefined?'Value unavailable':n(r.value)+' '+(r.unit||'');
  if(r.kind==='us-goods'){
   const direction={exports:'U.S. exports to '+r.partner,imports:'U.S. imports from '+r.partner,balance:'U.S. goods balance with '+r.partner,total:'Two-way U.S. goods trade with '+r.partner}[r.metric];
   changed=direction+' were '+amount+' in '+r.period+'.';
   if(Number.isFinite(r.prior)&&Number.isFinite(r.value)){const d=r.value-r.prior;changed+=' '+(d===0?'Unchanged':(d>0?'Up ':'Down ')+n(Math.abs(d))+' '+r.unit)+' from the same period a year earlier.';}
   else changed+=' No comparable prior period is available here.';
   if(!Number.isFinite(r.value))changed=direction+' have no publishable value for '+r.period+'. Missing values are not zero.';
   why=r.partner==='Canada'?(r.metric==='imports'?'From Canada’s perspective, U.S. imports are a demand indicator for Canadian goods. Gross receipts are not Canadian value added or jobs.':r.metric==='exports'?'These are Canadian purchases of U.S. goods, which may supply households or production. A rise alone is not evidence of a Canadian loss.':'This shows the scale or balance of integrated goods flows. The balance alone does not establish Canadian welfare or bargaining power.'):'U.S.–China trade can change competition and demand facing Canadian suppliers. This figure does not measure diverted sales to Canada.';
   regions='This is a national bilateral goods total. Use Changes across Canada to examine each province’s measured export exposure; no provincial share is inferred here.';
  }else if(r.kind==='regional-trade'){
   const location=r.geography||'Canada',dest=r.partner||'all countries';
   if(r.metric==='growth')changed=location+' domestic exports to '+dest+' '+(r.value===null?'have no comparable growth rate':(r.value===0?'were unchanged':(r.value<0?'fell ':'rose ')+n(Math.abs(r.value))+'%'))+' in '+r.period+' versus the same months a year earlier.';
   else if(r.metric==='share')changed=dest+' received '+amount+' of '+location+' domestic exports in '+r.period+'. This is concentration, not a change over time.';
   else {changed=location+' shipped '+amount+' of '+(r.commodity||'merchandise')+' to '+dest+' in '+r.period+'.';if(Number.isFinite(r.prior)&&Number.isFinite(r.value))changed+=' The comparable earlier period was '+n(r.prior)+' '+r.unit+'.';else changed+=' This observation alone does not establish a trend.';}
   why='The '+(r.commodity||'merchandise')+' series helps test '+location+'’s dependence on '+dest+' and compare demand with alternative buyers. Values also move with prices and exchange rates.';
   regions=location==='Canada'?'National figures remain national. Select a province or territory for its origin-based export series; employment and value-added effects require separate measures.':'This series is assigned to '+location+' by province or territory of origin. It shows commercial exposure; the change cannot by itself establish local jobs, net benefit or policy causation.';
   if(r.value===null)changed='No publishable, comparable value is available for '+location+' / '+dest+' in '+r.period+'. Missing, suppressed and unavailable values are not zero.';
  }else if(r.sourceCell){
   changed=(r.title||'BEA observation')+': '+amount+' in '+r.period+'. '+(type==='stock'?'This is an accumulated historical-cost position, not new project spending.':type==='financial_flow'?'This is a net financial transaction flow; a negative value need not mean a factory closed.':'This is investment income, not exports or employment.');
   why=r.partner==='Canada'?(r.investmentDirection==='outward'?'This records U.S. investment interests in Canada and helps assess Canada’s capital ties to its largest integrated market.':'This records Canadian investment interests in the U.S. and helps assess firms’ exposure to American returns and operating conditions.'):'This measures U.S.–China capital ties, offering a comparator for Canada’s investment and screening choices; it does not measure capital redirected to Canada.';
   regions='BEA’s bilateral country series does not identify a Canadian province. Compare years on the same ownership and valuation basis before investigating specific projects.';
  }else{
   if(r.value!==null&&r.value!==undefined&&!/\d/.test(changed))changed=amount+' · '+(r.period||r.year||'dated observation')+'. '+changed;
   if(type==='stock')changed+=' This is an accumulated capital position, not newly completed investment.';
   else if(type==='financial_flow')changed+=' Net financial flows do not measure completed factory spending.';
   else if(type==='modelled_baseline')changed='Historical model estimate: '+changed+' This is not an observed 2026 result.';
   else if(type==='proposed_rule'||type==='proposed_framework')changed='Proposal / framework: '+changed+' Implementation and outcomes remain separate tests.';
   else if(type==='administrative')changed+=' Permit use does not establish customs arrivals or Canadian production.';
   else if(type==='decision')changed+=' A decision is distinct from completed construction and operating jobs.';
   else if(['institutional','agreement'].includes(type))changed+=' A coordination mechanism does not itself establish a commercial or enforcement outcome.';
   else if(!/changed|rose|fell|declin|increas|versus|moved|began|took effect|entered|suspend|imposed|effective|up |down /i.test(changed))changed+=' This is a dated level or baseline; a change is not established by this record alone.';
   if(/canola.*oil/.test(text)){why='Processed oil links export access to Canadian crushing capacity. Compare its buyers with seed and meal markets before treating canola recovery as uniform.';regions='Prairie processors and growers may face different exposure to U.S. oil demand and Chinese seed or meal access. The record does not quantify provincial jobs.';}
   if(/quota|ev.*permit/.test(text)){why='Chinese EV access changes the import channel and competitive setting. Consumer savings and Canadian factory effects need separate evidence.';regions='Ontario and Quebec vehicle and battery supply chains may face competitive or sourcing choices; permit totals do not measure their production or employment.';}
   if(/fentanyl|opioid|precursor|cnwg|nadd/.test(text)){why='This informs Canada’s border, health and enforcement cooperation. Seizure locations and coordination announcements do not identify the origin or full volume of illicit supply.';regions='Border agencies, provincial health systems and communities across Canada may be involved. This record does not allocate provincial harms or establish that cooperation reduced them.';}
   if(/services-/.test(id)){why='All-services trade helps compare Canada’s access to U.S. customers with China’s. It cannot stand in for financial services or digital trade alone.';}
   if(type==='broad_labour_context'){why='This is a labour-market warning to investigate alongside sector evidence. It does not isolate employment caused by trade with China or the U.S.';}
   if(r.partner==='China'&&id.startsWith('us-')&&t==='agriculture'){why='U.S. sales to China provide a benchmark for competing Canadian exports. A change may alter competition, but does not prove Canadian producers gained those sales.';}
   const local=(r.observationRegions||[]).map(c=>names[c]).filter(Boolean);
   if(local.length&&['project','employer','province'].includes(r.geographyLevel))regions='Observed location: '+(r.geography||local.join(', '))+'. Read this as '+(r.geographyLevel==='province'?'a provincial measure':'a project or employer observation')+'; it is not a total for '+local.join(', ')+' or proof of an agreement’s effect.';
   else if(r.geographyLevel==='province')regions='This record concerns '+r.geography+'. It retains its original industry and period; it cannot explain other provinces or establish a bilateral trade effect.';
  }
  if(r.unreviewed){changed='Source '+(r.changeType==='source_revision'?'revision':'discovery')+' detected '+(r.detectedAt||'on the labelled date')+'. '+(r.ai?.summary||'A changed page does not establish a new policy or an economic result.');regions+=' Geographic effects still require substantive review.';}
  return {changed,why,regions};
 }
 function html(r){const d=describe(r);return `<div class="policy-story"><p class="policy-story-label">Policy reading · implications are analytical interpretation</p><dl><dt>What changed?</dt><dd>${E(d.changed)}</dd><dt>Why does it matter to Canada?</dt><dd>${E(d.why)}</dd><dt>How could Canada and its provinces be affected?</dt><dd>${E(d.regions)}</dd></dl></div>`;}
 function compact(r){return `<details class="policy-story-drawer"><summary>What changed · why Canada · provincial effects</summary>${html(r)}</details>`;}
 function value(label,r){return `<button type="button" class="policy-datum" data-policy-datum="${E(JSON.stringify(r))}" aria-label="${E(label+' — policy context for '+(r.title||r.commodity||r.metric||'this observation'))}">${E(label)}</button>`;}
 function open(r,origin){
  const doc=global.document||document;doc.getElementById('policy-datum-dialog')?.remove();const d=doc.createElement('dialog');d.id='policy-datum-dialog';d.className='policy-story-modal';d.setAttribute('aria-labelledby','policy-datum-title');
  let link='';try{const u=new URL(r.url);if(u.protocol==='https:')link=`<a href="${E(u.href)}" target="_blank" rel="noopener noreferrer">Open original source ↗</a>`;}catch{}
  d.innerHTML=`<form method="dialog"><button type="submit" class="btn">Close context</button></form><h2 id="policy-datum-title">${E(r.title||r.commodity||'Read the data')}</h2><p class="impact-meta">${E(r.period||'Original reference period')} · ${E(r.geography||'National bilateral scope')}</p>${html(r)}${r.limitation?`<p class="impact-limit">${E(r.limitation)}</p>`:''}${link}`;doc.body.append(d);d.addEventListener('close',()=>{if(origin?.isConnected)origin.focus();d.remove();},{once:true});d.showModal();
 }
 const api={describe,html,compact,value,topic,open};if(typeof module!=='undefined'&&module.exports)module.exports=api;if(global){global.PolicyNarrative=api;global.document?.addEventListener('click',e=>{const b=e.target.closest('[data-policy-datum]');if(b){try{open(JSON.parse(b.dataset.policyDatum),b);}catch{}}});}
})(typeof window==='undefined'?null:window);
