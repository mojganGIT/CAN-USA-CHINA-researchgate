(function(global){
 'use strict';
 const defaults={region:'CA',topic:'all',relationship:'all',period:'all',metric:'all',layer:'summary'};
 const kinds={observed:'Observed outcome',derived:'Calculated indicator',administrative:'Administrative utilization',implemented_policy:'Implemented policy',modelled_baseline:'Modelled historical baseline',historical_baseline:'Historical baseline',company_result:'Foreign affiliate result',stock:'Investment stock',financial_flow:'Financial flow',decision:'Investment decision',agreement:'Agreement / framework',institutional:'Institutional activity',broad_labour_context:'Broad labour context'};
 const attribution={not_established:'Arrangement effect not established',pre_existing_project:'Existing project; new-arrangement effect not established',predates_arrangement:'Predates the new arrangements',policy_only:'Policy implementation; commercial effect not established'};
 const stages={signed:'Signed',in_force:'In force',implemented_decision:'Decision implemented',meeting_held:'Meeting held',published_framework:'Framework published',review_outcome:'Review outcome recorded'};
 function years(data){const end=Number(data.asOf?.slice(0,4));return end>=2018&&end<2100?Array.from({length:end-2018+1},(_,i)=>String(end-i)):[];}
 function normalize(data,state={}){
  return {region:state.region==='CA'||data.regions[state.region]?state.region:defaults.region,topic:state.topic==='all'||data.assessments.some(t=>t.id===state.topic)?state.topic:'all',relationship:data.relationships.includes(state.relationship)?state.relationship:'all',period:years(data).includes(state.period)?state.period:'all',metric:[...data.metrics.map(m=>m.id),'resilience'].includes(state.metric)?state.metric:'all',layer:['summary','observed','exposure','policy','trade'].includes(state.layer)?state.layer:'summary'};
 }
 function recordMatches(record,state,{ignoreRegion=false,ignoreMetric=false,ignoreRelationship=false}={}){
  if(!ignoreRegion&&state.region!=='CA'&&record.regions.length&&!record.regions.includes(state.region))return false;
  if(state.topic!=='all'&&!record.topics.includes(state.topic))return false;
  if(!ignoreRelationship&&state.relationship!=='all'&&record.relationships.length&&!record.relationships.includes(state.relationship))return false;
  if(!ignoreMetric&&state.metric!=='all'&&record.metric!==state.metric)return false;
  if(state.period!=='all'&&(record.periodStart||'').slice(0,4)!==state.period&&(record.periodEnd||'').slice(0,4)!==state.period)return false;
  return true;
 }
 function records(data,state,opts){return data.records.filter(r=>recordMatches(r,state,opts));}
 function policies(data,state){return data.policies.filter(p=>(state.topic==='all'||p.topics.includes(state.topic))&&(state.relationship==='all'||p.relationship===state.relationship)&&(state.region==='CA'||!p.regions.length||p.regions.includes(state.region))&&(state.period==='all'||p.eventDate.startsWith(state.period))&&(state.metric==='all'||p.recordIds.some(id=>data.records.find(r=>r.id===id)?.metric===state.metric))).sort((a,b)=>b.eventDate.localeCompare(a.eventDate));}
 function local(record,region){return (record.observationRegions||[]).includes(region)&&['project','employer','province'].includes(record.geographyLevel)&&!['historical_baseline','modelled_baseline','broad_labour_context','decision','implemented_policy','institutional','agreement'].includes(record.measurementType);}
 function mapClass(data,state,region){
  const s={...state,region},rs=records(data,s),ps=policies(data,s);
  if(state.layer==='policy')return ps.length?'access':'gap';
  if(state.layer==='exposure')return rs.some(r=>r.regions.includes(region))?'exposure':'gap';
  if(state.layer==='summary'&&state.topic==='all'&&state.relationship==='all'&&state.period==='all'&&state.metric==='all')return data.regions[region].kind;
  const actual=rs.filter(r=>local(r,region)),gain=actual.some(r=>r.outcome==='gain'),pressure=actual.some(r=>r.outcome==='pressure');
  if(gain&&pressure)return 'mixed';if(gain)return 'operating';if(pressure)return 'pressure';
  if(state.layer==='observed')return 'gap';
  if(rs.some(r=>r.regions.includes(region)))return 'exposure';
  return 'gap';
 }
 function sourceHealth(data,feed,record){
  const checks=feed?.assessmentReview?.dataVersion===data.version?feed.assessmentReview.checks||[]:[];
  return record.sourceIds.map(id=>({source:data.sources[id],check:checks.find(c=>c.sourceId===id)||null}));
 }
 function displayedValue(record){return record.value===null?record.unit:new Intl.NumberFormat('en-CA',{maximumFractionDigits:3}).format(record.value)+' '+record.unit;}
 const api={defaults,kinds,attribution,stages,years,normalize,recordMatches,records,policies,local,mapClass,sourceHealth,displayedValue};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(global)global.ImpactModel=api;
})(typeof window==='undefined'?null:window);

