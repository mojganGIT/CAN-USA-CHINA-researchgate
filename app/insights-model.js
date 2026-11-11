(function(g){
 'use strict';
 const R=g?.RegionalTradeModel||(typeof require==='function'?require('./regional-trade-model.js'):null);
 const U=g?.USTradeModel||(typeof require==='function'?require('./us-trade-model.js'):null);
 const finite=x=>Number.isFinite(x)?x:null;
 const monthKey=(year,i)=>year+'-'+String(i+1).padStart(2,'0');
 const delta=(x,y)=>x===null||y===null?null:x-y;
 const growth=(x,y)=>x!==null&&y!==null&&x>=0&&y>0?(x/y-1)*100:null;
 const years=keys=>[...new Set(keys.filter(x=>/^\d{4}/.test(x)).map(x=>String(x).slice(0,4)))].sort().reverse();
 const yearOf=(available,wanted)=>available.includes(String(wanted))?String(wanted):available[0];
 const seriesMonths=(index,year,n)=>Array.from({length:n},(_,i)=>finite(index.get(monthKey(year,i))));
 function canada(data,state){
  if(data?.mappingVersion!==2)return null;
  const selected=data.series.filter(s=>s.region===state.region&&s.topic===state.topic);
  const partner=selected.find(s=>s.partner===state.partner),world=selected.find(s=>s.partner==='All countries');
  const index=s=>new Map((s?.points||[]).map(p=>[p.period.slice(0,7),R.amount(p)]));
  const last=(data.dataThrough||'').slice(0,7);
  const available=years((partner?.points||[]).map(p=>p.period));
  const year=yearOf(available,state.year);if(!year)return null;
  const n=year===last.slice(0,4)?Number(last.slice(5,7)):12;
  if(!n||n>12)return null;
  const current=R.total(partner,year,n),prior=R.total(partner,Number(year)-1,n);
  const share=state.partner==='All countries'?null:R.ratio(current,R.total(world,year,n));
  const earlierShare=state.partner==='All countries'?null:R.ratio(prior,R.total(world,Number(year)-1,n));
  return {available,year,n,current,prior,change:delta(current,prior),percent:growth(current,prior),share,shareChange:delta(share,earlierShare),unit:'CAD',basis:data.basis,source:data.url,checked:data.retrievedAt,status:data.status,dataThrough:last,labels:Array.from({length:n},(_,i)=>monthKey(year,i)),values:seriesMonths(index(partner),year,n),previous:seriesMonths(index(partner),Number(year)-1,n)};
 }
 function us(data,state){
  const partner=data?.partners?.find(p=>p.id===state.partner);
  if(!partner)return null;
  const available=years(partner.totals.map(p=>p.period)),year=yearOf(available,state.year);
  const goods=year&&U.goods(data,state.partner,year);
  if(!goods)return null;
  const metric=['imports','exports','balance'].includes(state.measure)?state.measure:'imports';
  const current=finite(goods[metric]),prior=finite(goods.prior?.[metric]);
  const index=new Map(partner.monthly.map(p=>[p.period,p[metric]]));
  return {available,year,n:goods.month,current,prior,change:delta(current,prior),percent:metric==='balance'?null:growth(current,prior),unit:'USD million',basis:data.basis,source:partner.url,checked:partner.retrievedAt,status:partner.status,dataThrough:partner.dataThrough,labels:Array.from({length:goods.month},(_,i)=>monthKey(year,i)),values:seriesMonths(index,year,goods.month),previous:seriesMonths(index,Number(year)-1,goods.month)};
 }
 function investment(data,state){
  const selected=(data?.series||[]).filter(r=>r.partner===state.partner&&r.direction===state.direction&&r.measure===state.measure);
  const available=years(selected.map(r=>String(r.year))),year=yearOf(available,state.year);
  if(!year)return null;
  const current=finite(selected.find(r=>String(r.year)===year)?.value),prior=finite(selected.find(r=>r.year===Number(year)-1)?.value);
  const source=data.sources.find(s=>s.direction===state.direction);
  const labels=available.filter(y=>y<=year).reverse(),values=labels.map(y=>finite(selected.find(r=>String(r.year)===y)?.value));
  return {available,year,current,prior,change:delta(current,prior),percent:state.measure==='stock'?growth(current,prior):null,unit:'USD million',basis:data.basis,source:source?.url,checked:source?.retrievedAt,status:source?.status||data.status,dataThrough:available[0],labels,values};
 }
 const labels={memo:'Signed MOU',amendment:'Amendment or extension',policy:'Policy or agreement',statistics:'Official statistics',research:'Independent research',evidence:'Reviewed evidence',historical:'Historical inventory',update:'Unreviewed source observation'};
 function kind(r){
  if(r.kind==='MOU')return 'memo';
  if(r.kind==='extension'||/\bamend(?:ing|ment|ed)\b/i.test(r.title))return 'amendment';
  return 'policy';
 }
 const link=(url,publisher)=>({url,publisher});
 const linked=(r,doc)=>(r.sourceIds||[]).map(id=>doc?.sources?.[id]).filter(Boolean).map(s=>link(s.url,s.publisher));
 const rel=r=>r.partner==='China'?'USA-China':'Canada-USA';
 const oldRel=r=>({'Canada–USA':'Canada-USA','Canada–U.S.':'Canada-USA','Canada–China':'Canada-China','USA–China':'USA-China','U.S.–China':'USA-China'})[r.relationship];
 function records(d,curated,inventory){
  const out=[];
  for(const r of d.canadian?.records||[])out.push({...r,id:'ca-'+r.id,kind:'evidence',set:'Canada',date:r.periodEnd||r.periodStart,dates:'Reference period',sources:linked(r,d.canadian)});
  for(const r of d.american?.records||[]){
   const k=U.policyTypes.includes(r.measurementType)?kind(r):'evidence';
   out.push({...r,id:'us-'+r.id,kind:k,set:'United States',date:r.eventDate||r.reviewedAt,dates:r.eventDate?'Event date':'Sources reviewed',relationships:[rel(r)],sources:linked(r,d.american)});
  }
  for(const r of d.canadian?.policies||[])out.push({...r,id:'policy-'+r.id,kind:kind(r),set:'Canada',date:r.eventDate,dates:'Event date',relationships:[r.relationship],limitation:r.attribution,sources:linked(r,d.canadian)});
  for(const r of curated?.records||[])out.push({...r,id:'note-'+r.id,kind:r.kind==='analysis'?'research':r.kind==='statistics'?'statistics':kind(r),set:'Research notes',dates:'Record date',reviewedAt:r.reviewedAt||curated.reviewedAt,relationships:r.relationship==='Canada'?[]:[r.relationship],summary:r.changed,why:r.canada,limitation:r.limit,status:r.originalStatus==='proposed'?'Proposed':curated.labels[r.kind]});
  for(const r of inventory?.records||[])out.push({...r,id:'archive-'+r.id,kind:'historical',set:'Historical inventory',date:String(r.year),dates:'Inventory year',relationships:[oldRel(r)].filter(Boolean),sources:[link(r.url,r.source)]});
  for(const r of d.daily?.changes||[])out.push({...r,id:'update-'+r.id,kind:'update',set:'Daily Updates',date:r.detectedAt,dates:'Detected',status:r.ai?.kind||r.changeType,summary:r.ai?.summary||'',limitation:r.ai?.uncertainty||'',sources:[link(r.url,r.source)]});
  return out.sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
 }
 function filter(rows,state,translate=x=>x){
  const norm=s=>String(s??'').normalize('NFKD').toLowerCase().replace(/\p{M}/gu,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
  const words=norm(state.query).split(/\s+/).filter(Boolean);
  return rows.filter(r=>{
   if(state.view==='policies'&&!['policy','memo','amendment'].includes(r.kind))return false;
   if(state.view==='updates'&&r.kind!=='update')return false;
   if(state.view==='evidence'&&r.kind==='update')return false;
   if(state.kind&&state.kind!=='all'&&r.kind!==state.kind)return false;
   if(state.set&&state.set!=='all'&&r.set!==state.set)return false;
   if(state.relationship&&state.relationship!=='all'&&!r.relationships?.includes(state.relationship))return false;
   if(state.topic&&state.topic!=='all'&&!r.topics?.includes(state.topic))return false;
   if(state.query){
    const fields=[r.title,r.summary,r.date,r.period,r.status,labels[r.kind],r.set,...(r.topics||[]),...(r.relationships||[]),...r.sources.map(s=>s.publisher)];
    const text=norm(fields.flatMap(x=>[x,translate(x)]).join(' '));
    if(!words.every(w=>text.includes(w)))return false;
   }
   return true;
  });
 }
 const api={canada,us,investment,records,filter,labels};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(g)g.InsightsModel=api;
})(typeof window==='undefined'?null:window);
