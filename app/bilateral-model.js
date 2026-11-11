(function(g){
 'use strict';
 const pairs={
  'canada-china':{id:'canada-china',relationship:'Canada-China',title:'Canada–China Policy and Trade',partner:'China',canadian:true},
  'us-china':{id:'us-china',relationship:'USA-China',title:'USA–China Policy and Trade',partner:'China',canadian:false},
  'us-canada':{id:'us-canada',relationship:'Canada-USA',title:'USA–Canada Policy and Trade',partner:'Canada',canadian:true}
 };
 const views=[['overview','Overview'],['compare','Compare Topics'],['policy','Policy Tracker'],['relationship','Relationship Tracker'],['evidence','Evidence & Methods'],['products','Policy Product Map'],['trends','Findings & Trends']];
 const mapViews=id=>id==='canada-china'?[['map','Canada provincial map']]:id==='us-china'?[['states','U.S. state map']]:[['map','Canada provincial map'],['states','U.S. state map']];
 function pairFor(relationship){return Object.values(pairs).find(p=>p.relationship===relationship);}
 function normalize(id,p={}){
  const pair=pairs[id]||pairs['canada-china'],allowed=[...views,...mapViews(pair.id)].map(r=>r[0]);
  return {pair,view:allowed.includes(p.view)?p.view:'overview',topic:['vehicles','agriculture','energy','finance','technology','security','investment','agreements'].includes(p.topic)?p.topic:'all',year:/^20(?:1[89]|2[0-6])$/.test(p.year)?p.year:'all',query:String(p.query||'').slice(0,180),page:Math.max(0,Math.floor(Number(p.page)||0))};
 }
 function target(pair,view='overview',extra={}){
  const id=typeof pair==='string'?(pairs[pair]?.id||pairFor(pair)?.id):pair?.id;
  if(!id)return 'home';
  const params=new URLSearchParams({...extra,view});
  return id+'?'+params;
 }
 function records(data,research,inventory,catalog,model){
  const rows=model.records(data,research,inventory);
  const tags=new Map();
  for(const t of catalog.topics)for(const issue of t.issues)for(const link of issue.links)for(const id of link.ids){if(!tags.has(id))tags.set(id,new Set());tags.get(id).add(t.id);}
  return rows.map(r=>({...r,topics:r.topics?.length?r.topics:[...(tags.get(r.id.replace(/^archive-/,''))||[])].concat(r.id==='archive-r15'?['agreements','security']:r.id==='archive-r27'?['agreements']:[])}));
 }
 function yearOf(r,view){
  if(view==='policy'||view==='products')return String(r.eventDate||r.date||'').slice(0,4);
  const period=String(r.periodEnd||r.periodStart||r.period||''),y=period.match(/20\d{2}/g);
  return y?.at(-1)||String(r.eventDate||r.date||'').slice(0,4);
 }
 function filter(rows,state,{context=false,policy=false}={}){
  const norm=x=>String(x||'').normalize('NFKD').toLowerCase().replace(/\p{M}/gu,'');
  const q=norm(state.query).trim().split(/\s+/).filter(Boolean);
  return rows.filter(r=>{
   const direct=r.relationships?.includes(state.pair.relationship);
   if(context){if(direct||r.relationships?.length||!['Canada','Research notes'].includes(r.set))return false;}
   else if(!direct)return false;
   const year=yearOf(r,policy?'policy':state.view);
   if(year&&(/^[0-9]{4}$/.test(year))&&(year<'2018'||year>'2026'))return false;
   if(state.topic!=='all'&&!r.topics?.includes(state.topic))return false;
   if(state.year!=='all'&&year!==state.year)return false;
   if(policy&&!['policy','memo','amendment','historical'].includes(r.kind))return false;
   if(q.length){const text=norm([r.title,r.summary,r.period,r.date,r.status,r.stage,...r.topics].join(' '));if(!q.every(w=>text.includes(w)))return false;}
   return true;
  });
 }
 const api={pairs,views,mapViews,pairFor,normalize,target,records,filter,yearOf};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(g)g.BilateralModel=api;
})(typeof window==='undefined'?null:window);
