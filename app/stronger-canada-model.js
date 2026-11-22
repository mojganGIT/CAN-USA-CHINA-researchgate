(function(g){
 'use strict';
 const views=['overview','directions','briefing','compare','crosswalk','sources'];
 const regions=['CA','AB','BC','MB','NB','NL','NS','NT','NU','ON','PE','QC','SK','YT'];
 const metrics=['shipments','supply_chain','investment','tariffs','employment'];
 function normalize(content,state={}){return {view:views.includes(state.view)?state.view:Object.hasOwn(content.topics,state.topic)?'directions':'overview',topic:Object.hasOwn(content.topics,state.topic)?state.topic:'finance',region:regions.includes(state.region)?state.region:'CA',dimension:Object.hasOwn(content.framework?.dimensions||{},state.dimension)?state.dimension:'all',dependency:Object.hasOwn(content.framework?.dependencies||{},state.dependency)?state.dependency:'all'};}
 function query(state){return 'stronger-canada?'+new URLSearchParams(state);}
 function basis(content,research,topic){const ids=content.topics[topic]?.basis||[];return ids.map(id=>(research?.records||[]).find(r=>r.id===id)).filter(Boolean);}
 function related(research,topic){return (research?.records||[]).filter(r=>r.topics.includes(topic)).sort((a,b)=>b.date.localeCompare(a.date)||a.id.localeCompare(b.id));}
 function sectorResearch(content,research,topic){const ids=new Set([...(content.topics[topic]?.basis||[]),...Object.values(content.framework?.sectors[topic]?.assessments||{}).flatMap(a=>a.researchIds)]);return [...ids].map(id=>research.records.find(r=>r.id===id)).filter(Boolean).sort((a,b)=>b.date.localeCompare(a.date)||a.id.localeCompare(b.id));}
 function canonical(value){try{const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password)return '';u.hash='';u.searchParams.delete('HPA');u.searchParams.sort();return u.href;}catch{return '';}}
 function review(content,research,topic,feed={},now=new Date().toISOString(),extraSources=[]){
  const rows=sectorResearch(content,research,topic),urls=new Set([...rows.flatMap(r=>r.sources),...extraSources,{url:content.urls.plan},{url:content.urls.fiscal}].map(s=>canonical(s.url)).filter(Boolean));
  const day=content.reviewedAt.slice(0,10),today=now.slice(0,10);
  const revisions=(feed.changes||[]).filter(c=>c.changeType==='source_revision'&&urls.has(canonical(c.url))&&c.detectedAt&&c.detectedAt.slice(0,10)>=day&&c.detectedAt<=now).map(c=>({...c,sameDay:c.detectedAt.slice(0,10)===day}));
  const failures=(feed.sourceFailures||[]).filter(f=>urls.has(canonical(f.url)));
  const newRecords=related(research,topic).filter(r=>r.date>day&&r.date<=today);
  const newReports=(feed.briefings||[]).filter(r=>r.reviewState==='source_reported'&&r.changeType!=='parser_refresh'&&r.topics?.includes(topic)&&r.publicationDate?.slice(0,10)>=day&&r.publicationDate.slice(0,10)<=today&&r.detectedAt<=now&&r.sources?.some(s=>canonical(s.url)&&!urls.has(canonical(s.url))));
  const milestones=rows.flatMap(r=>[r.effectiveDate,r.through,...(r.announcedDeadlines||[]).map(d=>d.date),...(r.watchDates||[]).map(d=>d.date)].filter(date=>date>day&&date<=today).map(date=>({date,record:r})));
  const missing=(content.topics[topic]?.basis||[]).filter(id=>!rows.some(r=>r.id===id));
  const fresh=Number.isFinite(Date.parse(feed.lastAttempt))&&Date.parse(now)-Date.parse(feed.lastAttempt)>=0&&Date.parse(now)-Date.parse(feed.lastAttempt)<=36*3600000;
  return {revisions,failures,newRecords,newReports,milestones,missing,fresh,required:!!(revisions.length||newRecords.length||newReports.length||milestones.length||missing.length),status:feed.lastRunStatus||'loading'};
 }
 function evidenceGroups(data,topic,region,impact){
  const rows=(data?.records||[]).filter(r=>r.topics.includes(topic));
  return metrics.map(metric=>{
   const candidates=rows.filter(r=>r.metric===metric);
   if(region==='CA')return {metric,rows:candidates,local:[],context:candidates};
   const local=candidates.filter(r=>impact.local(r,region));
   const context=candidates.filter(r=>r.geographyLevel==='national'||r.geography==='Canada');
   return {metric,rows:[...local,...context.filter(r=>!local.includes(r))],local,context};
  });
 }
 function regionalSnapshot(regional,data,state,model){
  if(!['vehicles','agriculture','energy'].includes(state.topic))return null;
  return model.snapshot(regional,{topic:state.topic,region:state.region,period:'all',relationship:'all'},data?.regions||{});
 }
 function references(content,research,data,topic,dimension){
  const def=content.framework?.sectors[topic]?.assessments[dimension];if(!def)return [];
  return [...def.researchIds.map(id=>({type:'research',id,record:research.records.find(r=>r.id===id)})),...def.outcomeIds.map(id=>({type:'outcome',id,record:data?.records.find(r=>r.id===id)}))];
 }
 function referenceSources(rows,data){return rows.flatMap(({type,record:r})=>!r?[]:type==='research'?r.sources:r.sourceIds.map(id=>data?.sources[id]).filter(Boolean));}
 function localReference(ref,region){const r=ref.record;return !!r&&(r.observationRegions||[]).includes(region)&&['project','province','employer'].includes(r.geographyLevel)&&!['historical_baseline','modelled_baseline','broad_labour_context','decision','implemented_policy','institutional','agreement'].includes(r.measurementType);}
 function dimensionReview(content,research,data,topic,dimension,feed={},now=new Date().toISOString()){
  const def=content.framework.sectors[topic].assessments[dimension],refs=references(content,research,data,topic,dimension);
  const scoped={reviewedAt:def.reviewedAt,urls:content.urls,topics:{[topic]:{basis:def.researchIds}}};
  const result=review(scoped,research,topic,feed,now,referenceSources(refs,data));
  // Unknown source reports require sector triage; do not guess their dimensions.
  result.newReports=[];result.newRecords=result.newRecords.filter(r=>def.researchIds.includes(r.id));
  const checks=data?.version&&data.version===feed.assessmentReview?.dataVersion?feed.assessmentReview.checks||[]:[];
  const sourceIds=new Set(refs.filter(r=>r.type==='outcome'&&r.record).flatMap(r=>r.record.sourceIds));
  result.sourceChecks=checks.filter(c=>sourceIds.has(c.sourceId)&&c.reviewRequired&&c.changedAt&&c.changedAt<=now);
  result.required=!!(result.revisions.length||result.newRecords.length||result.milestones.length||result.missing.length||result.sourceChecks.length);
  return result;
 }
 function assessment(content,research,data,topic,dimension,region='CA',feed={},now=new Date().toISOString()){
  const def=content.framework.sectors[topic].assessments[dimension],refs=references(content,research,data,topic,dimension);
  const missing=refs.filter(ref=>!ref.record),local=region==='CA'?[]:refs.filter(ref=>localReference(ref,region));
  const pending=!data&&missing.some(ref=>ref.type==='outcome');
  const nationalSignal=missing.length?'insufficient':def.signal;
  const signal=region==='CA'?nationalSignal:local.length&&!missing.length?def.regionalSignals[region]||'insufficient':'insufficient';
  const check=dimensionReview(content,research,data,topic,dimension,feed,now);
  if(missing.length&&!pending){check.missing=[...new Set([...check.missing,...missing.map(r=>r.id)])];check.required=true;}
  return {dimension,definition:def,signal,nationalSignal,refs,local,context:refs.filter(ref=>ref.record&&!local.includes(ref)),missing,pending,region,review:check};
 }
 function matrix(content,research,data,state,feed={},now=new Date().toISOString()){
  const topics=content.framework.dependencies[state.dependency||'all']?.topics||Object.keys(content.topics);
  return topics.map(topic=>({topic,assessments:Object.keys(content.framework.dimensions).map(d=>assessment(content,research,data,topic,d,state.region,feed,now))}));
 }
 function upcoming(content,research,topic,now=new Date().toISOString()){
  const today=now.slice(0,10),seen=new Set();return sectorResearch(content,research,topic).flatMap(record=>[
   ...(record.effectiveDate?[{date:record.effectiveDate,title:'Recorded effective date'}]:[]),
   ...(record.announcedDeadlines||[]),...(record.watchDates||[])
  ].filter(x=>x.date>today).map(x=>({...x,record}))).filter(x=>{const key=x.record.id+'|'+x.date+'|'+x.title;if(seen.has(key))return false;seen.add(key);return true;}).sort((a,b)=>a.date.localeCompare(b.date));
 }
 function unassignedActivity(content,research,data,topic,feed={},now=new Date().toISOString()){
  const refs=Object.keys(content.framework.dimensions).flatMap(d=>references(content,research,data,topic,d));
  const urls=new Set([...referenceSources(refs,data).map(s=>canonical(s.url)),canonical(content.urls.plan),canonical(content.urls.fiscal)]);
  const reports=review(content,research,topic,feed,now).newReports.map(r=>({...r,url:r.sources.find(s=>canonical(s.url))?.url}));
  const revisions=(feed.changes||[]).filter(c=>c.changeType==='source_revision'&&c.topics?.includes(topic)&&canonical(c.url)&&!urls.has(canonical(c.url))&&c.detectedAt?.slice(0,10)>=content.framework.reviewedAt&&c.detectedAt<=now);
  return [...new Map([...reports,...revisions].map(r=>[canonical(r.url),r])).values()];
 }
 const api={views,regions,metrics,normalize,query,basis,related,sectorResearch,canonical,review,evidenceGroups,regionalSnapshot,references,referenceSources,localReference,dimensionReview,assessment,matrix,upcoming,unassignedActivity};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(g)g.StrongerCanadaModel=api;
})(typeof window==='undefined'?null:window);
