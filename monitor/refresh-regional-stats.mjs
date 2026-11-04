import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=path.join(root,'app/regional-statistics.json');
const regions=['Canada','Newfoundland and Labrador','Prince Edward Island','Nova Scotia','New Brunswick','Quebec','Ontario','Manitoba','Saskatchewan','Alberta','British Columbia','Yukon','Northwest Territories','Nunavut'];
const commodities=[['all','Total of all merchandise'],['agriculture','Farm, fishing and intermediate food products'],['energy','Energy products'],['vehicles','Motor vehicles and parts']];
const now=new Date().toISOString();let previous={series:[]};try{previous=JSON.parse(await fs.readFile(output,'utf8'));}catch{}
async function post(method,body){const response=await fetch('https://www150.statcan.gc.ca/t1/wds/rest/'+method,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(45000)});if(!response.ok)throw Error(method+' HTTP '+response.status);return response.json();}
try{
 const raw=await post('getCubeMetadata',[{productId:12100175}]),meta=raw[0]?.object;if(!meta?.dimension)throw Error('Statistics Canada metadata was unavailable.');
 await fs.writeFile(path.join(root,'monitor/regional-series-metadata.json'),JSON.stringify(meta,null,2)+'\n');
 const dimensions=[...meta.dimension].sort((a,b)=>a.dimensionPositionId-b.dimensionPositionId);
 const find=(d,re)=>d.member.find(m=>re.test(m.memberNameEn));
 const requests=[],labels=[];
 for(const region of regions)for(const partner of ['United States','China','All countries'])for(const [topic,commodity] of commodities){
  const members=dimensions.map(d=>{
   if(/geograph/i.test(d.dimensionNameEn))return d.member.find(m=>m.memberNameEn===region||region==='Yukon'&&/Yukon/.test(m.memberNameEn));
   if(/partner|countr/i.test(d.dimensionNameEn))return d.member.find(m=>m.memberNameEn===partner)||partner==='All countries'&&find(d,/^(All countries|Total.*countr)/i);
   if(/trade|flow/i.test(d.dimensionNameEn)&&!/classif|product/i.test(d.dimensionNameEn))return find(d,/^Domestic exports?$/i);
   if(/classif|product/i.test(d.dimensionNameEn))return d.member.find(m=>m.memberNameEn===commodity);
   return find(d,/^Total (?:of )?(?:all )?(?:merchandise|products|commodities)/i)||find(d,/^All (?:sections|products|commodities)/i)||find(d,/^Unadjusted$/i)||(d.member.length===1?d.member[0]:null);
  });
  if(members.some(x=>!x))throw Error('A table dimension could not be matched safely: '+dimensions.map((d,i)=>members[i]?d.dimensionNameEn+'='+members[i].memberNameEn:d.dimensionNameEn+'=UNRESOLVED').join('; '));
  const coords=Array(10).fill(0);dimensions.forEach((d,i)=>coords[d.dimensionPositionId-1]=members[i].memberId);
  requests.push({productId:12100175,coordinate:coords.join('.'),latestN:24});labels.push({region,partner,topic,commodity,selection:dimensions.map((d,i)=>({dimension:d.dimensionNameEn,member:members[i].memberNameEn})),coordinate:coords.join('.')});
 }
 const series=[];
 for(let at=0;at<requests.length;at+=14){const response=await post('getDataFromCubePidCoordAndLatestNPeriods',requests.slice(at,at+14));for(let i=0;i<response.length;i++){const r=response[i];series.push({...labels[at+i],status:r.status,vectorId:r.object?.vectorId||null,points:(r.object?.vectorDataPoint||[]).map(p=>({period:p.refPer,value:p.value===null?null:Number(p.value),scalarFactorCode:p.scalarFactorCode,symbolCode:p.symbolCode,statusCode:p.statusCode,securityLevelCode:p.securityLevelCode,releaseTime:p.releaseTime}))});}}
 if(!series.some(s=>s.points.length))throw Error('No provincial data points were returned.');
 await fs.writeFile(output,JSON.stringify({table:'12-10-0175-01',title:meta.cubeTitleEn,url:'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1210017501',retrievedAt:now,lastAttempt:now,status:'success',releaseTime:meta.releaseTime,dataThrough:meta.cubeEndDate,basis:'Domestic merchandise exports on a customs basis, unadjusted, current Canadian dollars. Province of origin, not port of exit. Latest retrieved vintage, not a reconstructed historical vintage. Re-exports and services excluded. Topic groups are broad product categories, not exact EV/battery or seafood industry totals.',series})+'\n');
 console.log(JSON.stringify({status:'success',series:series.length,dataThrough:meta.cubeEndDate}));
}catch(e){await fs.writeFile(output,JSON.stringify({...previous,lastAttempt:now,status:'unavailable',error:e.message},null,2)+'\n');console.log(JSON.stringify({status:'unavailable',error:e.message}));}
