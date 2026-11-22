(function(g){
 'use strict';
 const views=['directions','briefing','compare','crosswalk','sources'];
 const regions=['CA','AB','BC','MB','NB','NL','NS','NT','NU','ON','PE','QC','SK','YT'];
 const metrics=['shipments','supply_chain','investment','tariffs','employment'];
 function normalize(content,state={}){return {view:views.includes(state.view)?state.view:'directions',topic:Object.hasOwn(content.topics,state.topic)?state.topic:'finance',region:regions.includes(state.region)?state.region:'CA'};}
 function query(state){return 'stronger-canada?'+new URLSearchParams(state);}
 function basis(content,research,topic){const ids=content.topics[topic]?.basis||[];return ids.map(id=>(research?.records||[]).find(r=>r.id===id)).filter(Boolean);}
 function related(research,topic){return (research?.records||[]).filter(r=>r.topics.includes(topic)).sort((a,b)=>b.date.localeCompare(a.date)||a.id.localeCompare(b.id));}
 function canonical(value){try{const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password)return '';u.hash='';u.searchParams.delete('HPA');u.searchParams.sort();return u.href;}catch{return '';}}
 function review(content,research,topic,feed={},now=new Date().toISOString()){
  const rows=basis(content,research,topic),urls=new Set([...rows.flatMap(r=>r.sources),{url:content.urls.plan},{url:content.urls.fiscal}].map(s=>canonical(s.url)).filter(Boolean));
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
 const api={views,regions,metrics,normalize,query,basis,related,canonical,review,evidenceGroups,regionalSnapshot};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(g)g.StrongerCanadaModel=api;
})(typeof window==='undefined'?null:window);
