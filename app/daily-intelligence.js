(function(g){
 'use strict';
 const countries=['Canada','United States','China'];
 const dimensions={diversification:'Trade diversification',capacity:'Domestic capacity',resilience:'Supply-chain resilience',security:'Economic security'};
 const zones=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Toronto',year:'numeric',month:'2-digit',day:'2-digit'});
 const day=value=>{if(typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value))return Number.isFinite(Date.parse(value))?value:'';const n=typeof value==='number'?value:Date.parse(value);if(!Number.isFinite(n))return '';const p=Object.fromEntries(zones.formatToParts(n).map(p=>[p.type,p.value]));return `${p.year}-${p.month}-${p.day}`;};
 const priorDay=value=>new Date(Date.parse(value)-86400000).toISOString().slice(0,10);
 function url(raw){try{const u=new URL(raw);if(u.protocol!=='https:'||u.username||u.password||u.port)return '';u.hash='';return u.href;}catch{return '';}}
 function stage(r,today){
  if(r.reviewState==='source_reported')return {id:'reported',label:'Source report · review pending'};
  if(r.kind==='statistics')return {id:'observed',label:'Reported observation'};
  if(r.through&&day(r.through)<today)return {id:'due',label:'End date reached · verify current status'};
  if(r.effectiveDate&&day(r.effectiveDate)>today)return {id:'scheduled',label:'Scheduled · implementation not yet verified'};
  if(r.kind==='contract')return {id:'awarded',label:r.implementationStatus==='contract_awarded'?'Contract award reported':'Contract status needs review'};
  if(r.kind==='MOU')return {id:'signed',label:'Signature reported · implementation separate'};
  if(r.kind==='meeting')return {id:'dialogue',label:'Dialogue documented'};
  if(r.implementationStatus==='in_force'||/in.force|historical_implemented|removal implemented|countermeasures entered into force/i.test(r.originalStatus||r.status||'')){
   if(r.effectiveDate&&day(r.reviewedAt)<day(r.effectiveDate))return {id:'due',label:'Effective date reached · verification needed'};
   return {id:'in_force',label:'In force in reviewed source'};
  }
  if(r.kind==='extension')return {id:'announced',label:'Extension announced · verify implementation'};
  if(r.kind==='recommendation')return {id:'announced',label:'Proposal or framework'};
  if(r.effectiveDate&&day(r.effectiveDate)<=today)return {id:'due',label:'Effective date reached · verification needed'};
  return {id:'recorded',label:'Policy record · verify operative status'};
 }
 function evidence(r,feed={},today=day(Date.now())){
  const sources=(r.sources||[]).filter(s=>url(s.url));
  const checks=sources.map(s=>(feed.sourceChecks||[]).find(c=>url(c.url)===url(s.url))).filter(Boolean);
  const changed=!!r.reviewedAt&&checks.some(c=>!c.baseline&&c.lastChanged&&day(c.lastChanged)>=day(r.reviewedAt));
  const failed=checks.some(c=>c.status==='failed');
  const last=checks.map(c=>c.checkedAt).filter(Boolean).sort().at(-1)||r.checkedAt||null;
  const pending=r.reviewState==='source_reported'||!r.reviewedAt;
  const legal=sources.some(s=>s.documentType==='Published legal notice'||/Canada Gazette/i.test(s.publisher));
  const observationConfidence=pending||changed?'Unassessed':legal?'High':'Moderate';
  const confidenceReason=pending?'The source report has not been assessed by an analyst.':changed?'A changed source needs a substantive reassessment.':legal?'A reviewed published legal record supports the stated measure, within its recorded scope.':'A reviewed source supports the reported claim; implementation, independent reconciliation or realized outcomes may still require evidence.';
  return {sources,checkedAt:last,reviewedAt:r.verifiedAt||r.reviewedAt||null,changed,failed,
   observationConfidence,confidenceReason,
   confidence:pending?'Analyst review pending':changed?'Reassessment required':r.kind==='analysis'?'Reviewed analysis':'Reviewed source claim',
   freshness:failed?'Source check failed':last&&day(last)===today?'Source checked today':'No successful source check recorded today',
   attribution:'Canadian policy effect not established',stage:stage(r,today)};
 }
 function priorities(r,framework){
  const ids=Object.entries(framework?.sectors||{}).flatMap(([,s])=>Object.entries(s.assessments||{}).filter(([,a])=>a.researchIds?.includes(r.id)).map(([d])=>d));
  return [...new Set([...(r.priorityIds||[]),...ids])].filter(x=>Object.hasOwn(dimensions,x));
 }
 function snapshot({feed={},register={records:[]},now=Date.now()}){
  const today=day(now),known=new Map();
  for(const r of register.records||[])if(r.reviewedAt&&day(r.reviewedAt)<=today&&day(r.date)<=today&&r.sources?.some(s=>url(s.url)))known.set(r.id,{id:r.id,title:r.title,date:r.date,relationship:r.relationship,topics:r.topics||[],priorityIds:priorities(r,typeof module!=='undefined'&&module.exports?require('./stronger-canada-framework.js'):g?.StrongerCanadaFramework),kind:r.kind,stage:stage(r,today).id,reviewedAt:r.reviewedAt,changed:r.changed||'',sourceURLs:r.sources.map(s=>url(s.url)).filter(Boolean)});
  return {date:today,generatedAt:new Date(now).toISOString(),scanAt:feed.lastAttempt||null,status:feed.lastRunStatus||'not_run',records:[...known.values()],sourceChecks:(feed.sourceChecks||[]).filter(c=>url(c.url)).map(c=>({url:url(c.url),digest:c.digest||null,status:c.status,checkedAt:c.checkedAt,lastChanged:c.lastChanged||null})),countryCoverage:Object.fromEntries(countries.map(c=>[c,feed.coverage?.[c]?.status||'pending']))};
 }
 function saveEdition(history,current){
  const editions=Array.isArray(history?.editions)?history.editions:[];
  return {schemaVersion:1,timeZone:'America/Toronto',editions:[...editions.filter(x=>x.date!==current.date),current].sort((a,b)=>a.date.localeCompare(b.date)).slice(-45)};
 }
 function compare(history,today,filters={}){
  const editions=history?.schemaVersion===1?history.editions||[]:[];
  const current=editions.find(x=>x.date===today),previous=editions.find(x=>x.date===priorDay(today));
  const matches=r=>(!filters.relationship||filters.relationship==='all'||r.relationship===filters.relationship)&&(!filters.topic||filters.topic==='all'||r.topics?.includes(filters.topic))&&(!filters.stage||filters.stage==='all'||r.kind===filters.stage||filters.stage==='policy'&&r.kind==='extension')&&(!filters.priority||filters.priority==='all'||r.priorityIds?.includes(filters.priority));
  if(!current||!previous)return {ready:false,current,previous,reason:!current?'Current edition pending':'Yesterday’s saved edition is unavailable',newRecords:[],updatedRecords:[],sourceRevisions:[],newSources:[]};
  const old=new Map(previous.records.map(r=>[r.id,r]));
  const newRecords=current.records.filter(r=>matches(r)&&!old.has(r.id));
  const updatedRecords=current.records.filter(r=>matches(r)&&old.has(r.id)&&JSON.stringify({...r,reviewedAt:null})!==JSON.stringify({...old.get(r.id),reviewedAt:null})).map(r=>({before:old.get(r.id),after:r}));
  const oldSources=new Map(previous.sourceChecks.filter(c=>c.digest).map(c=>[c.url,c]));
  const allowed=new Set(current.records.filter(matches).flatMap(r=>r.sourceURLs));
  const limited=filters.relationship&&filters.relationship!=='all'||filters.topic&&filters.topic!=='all'||filters.stage&&filters.stage!=='all'||filters.priority&&filters.priority!=='all';
  const checked=current.sourceChecks.filter(c=>c.status==='success'&&c.digest&&(!limited||allowed.has(c.url)));
  return {ready:true,current,previous,newRecords,updatedRecords,sourceRevisions:checked.filter(c=>oldSources.has(c.url)&&oldSources.get(c.url).digest!==c.digest).map(c=>({...c,beforeDigest:oldSources.get(c.url).digest})),newSources:checked.filter(c=>!oldSources.has(c.url))};
 }
 function trade(data,{topic='all',region='CA',relationship='all'}={},model){
  if(!model||data?.mappingVersion!==2)return {available:false,reason:'Official trade series unavailable'};
  const names={CA:'Canada',AB:'Alberta',BC:'British Columbia',MB:'Manitoba',NB:'New Brunswick',NL:'Newfoundland and Labrador',NS:'Nova Scotia',NT:'Northwest Territories',NU:'Nunavut',ON:'Ontario',PE:'Prince Edward Island',QC:'Quebec',SK:'Saskatchewan',YT:'Yukon'};
  const regions=Object.fromEntries(Object.entries(names).map(([code,name])=>[code,{name}]));
  const s=model.snapshot(data,{topic,region,relationship},regions);
  if(s.unsupported)return {...s,available:false,reason:'Canadian exports are context, not U.S.–China bilateral trade'};
  const year=s.year,month=s.month;
  if(!Number.isInteger(year)||!Number.isInteger(month))return {...s,available:false,reason:'Comparable reporting period unavailable'};
  const points=Array.from({length:12},(_,i)=>{const d=new Date(Date.UTC(year,month-12+i,1));const p=d.toISOString().slice(0,7);return {period:p,values:s.partners.slice(0,2).map(partner=>model.amount(partner.series?.points.find(x=>x.period?.slice(0,7)===p)))};});
  return {...s,points,retrievedAt:data.retrievedAt,lastAttempt:data.lastAttempt,status:data.status,url:url(data.url),basis:data.basis};
 }
 const api={countries,dimensions,day,priorDay,url,stage,evidence,priorities,snapshot,saveEdition,compare,trade};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(g)g.DailyIntelligence=api;
})(typeof window==='undefined'?null:window);
