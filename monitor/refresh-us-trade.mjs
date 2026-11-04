import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {PARTNERS,parseCensus} from './us-trade-core.mjs';
const output=new URL('../app/us-trade-statistics.json',import.meta.url),now=new Date().toISOString();
let previous={partners:[]};try{previous=JSON.parse(await fs.readFile(output,'utf8'));}catch{}
const partners=await Promise.all(PARTNERS.map(async source=>{
 const old=previous.partners.find(p=>p.id===source.id);
 try{const response=await fetch(source.url,{signal:AbortSignal.timeout(45000)});if(!response.ok||new URL(response.url).hostname!=='www.census.gov')throw Error('Official Census request failed: HTTP '+response.status);const parsed=parseCensus(await response.text());return {...source,...parsed,status:'success',retrievedAt:now,lastAttempt:now};}
 catch(error){return {...(old||source),status:'unavailable',lastAttempt:now,error:error.message};}
}));
const successful=partners.filter(p=>p.status==='success').length;
const data={schemaVersion:1,title:'U.S. merchandise trade with Canada and China',status:successful===2?'success':successful?'partial':'unavailable',lastAttempt:now,lastSuccessfulRun:successful?now:previous.lastSuccessfulRun||null,basis:'U.S. Census Bureau, nominal USD millions, not seasonally adjusted, goods only. Exports include re-exports. Annual totals are source-reported; the latest year is labelled year-to-date until 12 months are present. Retrieved vintage can revise earlier observations.',partners};
await fs.writeFile(output,JSON.stringify(data,null,2)+'\n');console.log(JSON.stringify({status:data.status,partners:partners.map(p=>({id:p.id,status:p.status,dataThrough:p.dataThrough,monthly:p.monthly?.length||0,error:p.error||null}))}));
