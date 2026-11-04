(function(global){
 'use strict';
 const groups={all:'All merchandise',agriculture:'Farm, fishing and intermediate food products',energy:'Energy products',vehicles:'Motor vehicles and parts'};
 const unavailableStatuses=new Set([1,2,8,9,10]);
 function amount(point){
  if(!point||point.value===null||point.value===undefined||typeof point.value==='string'&&!point.value.trim()||Number(point.securityLevelCode)!==0||unavailableStatuses.has(Number(point.statusCode)))return null;
  const n=Number(point.value),scale=Number(point.scalarFactorCode);
  return Number.isFinite(n)&&Number.isInteger(scale)&&scale>=0&&scale<=9?n*10**scale:null;
 }
 function total(series,year,month){
  if(!series||month<1||month>12)return null;
  let sum=0;
  for(let m=1;m<=month;m++){
   const point=series.points.find(p=>p.period?.slice(0,7)===year+'-'+String(m).padStart(2,'0'));
   const value=amount(point);if(value===null)return null;sum+=value;
  }
  return sum;
 }
 function ratio(n,d){return n!==null&&d!==null&&d>0?n/d*100:null;}
 function change(current,prior){return current!==null&&prior!==null&&prior>0?(current/prior-1)*100:null;}
 function snapshot(data,state={},regions={}){
  if(data?.mappingVersion!==2)data={series:[]};
  const topic=Object.hasOwn(groups,state.topic)?state.topic:'all';
  const latest=(data?.series||[]).flatMap(s=>s.points||[]).map(p=>p.period?.slice(0,7)).filter(Boolean).sort().at(-1);
  const year=state.period&&state.period!=='all'?Number(state.period):Number(latest?.slice(0,4));
  const month=year===Number(latest?.slice(0,4))?Number(latest.slice(5,7)):12;
  const region=state.region==='CA'||!state.region?'Canada':regions[state.region]?.name;
  const series=(data?.series||[]).filter(s=>s.region===region&&s.topic===topic);
  const partners=['United States','China','All countries'].map(partner=>{
   const s=series.find(s=>s.partner===partner),current=total(s,year,month),prior=total(s,year-1,month);
   return {partner,series:s,current,prior,change:change(current,prior)};
  });
  const world=partners.find(p=>p.partner==='All countries').current;
  for(const p of partners)p.share=ratio(p.current,world);
  return {region,topic,commodity:groups[topic],contextOnly:topic!==state.topic&&state.topic!=='all',latest,year,month,partners,available:partners.some(p=>p.current!==null),unsupported:state.relationship==='USA-China'};
 }
 function exposure(data,state,regions){
  const s=snapshot(data,state,regions),partner=state.relationship==='Canada-China'?'China':'United States',p=s.partners.find(p=>p.partner===partner);
  return {share:s.unsupported?null:p.share,partner,snapshot:s};
 }
 const api={groups,amount,total,ratio,change,snapshot,exposure};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(global)global.RegionalTradeModel=api;
})(typeof window==='undefined'?null:window);
