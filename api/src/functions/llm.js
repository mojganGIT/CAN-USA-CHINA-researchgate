import {app} from '@azure/functions';
import fs from 'node:fs';
import {principalFrom,answerCustomer} from '../lib/customer-llm.js';
const inventory=JSON.parse(fs.readFileSync(new URL('../../master-data.json',import.meta.url),'utf8'));
const evidence=JSON.parse(fs.readFileSync(new URL('../../evidence-records.json',import.meta.url),'utf8'));
// File paths are module-relative, independent of the Azure working directory.
const updates=()=>{try{return JSON.parse(fs.readFileSync(new URL('../../policy-updates.json',import.meta.url),'utf8'));}catch{return {changes:[]};}};
app.http('customerLLM',{route:'llm',methods:['POST'],authLevel:'anonymous',handler:async req=>{
 const headers={'cache-control':'no-store','content-type':'application/json','x-content-type-options':'nosniff'};
 if(!principalFrom(req.headers))return {status:401,headers,jsonBody:{error:'Sign in before using your LLM key.'}};
 const origin=req.headers.get('origin');const allowedOrigins=[new URL(req.url).origin,'https://ambitious-field-09c66cd10.1.azurestaticapps.net'];if(origin&&!allowedOrigins.includes(origin))return {status:403,headers,jsonBody:{error:'Cross-origin request rejected.'}};
 if(!req.headers.get('content-type')?.includes('application/json'))return {status:415,headers,jsonBody:{error:'JSON is required.'}};
 if(Number(req.headers.get('content-length')||0)>18000)return {status:413,headers,jsonBody:{error:'Request is too large.'}};
 let body;try{const raw=await req.text();if(raw.length>18000)return {status:413,headers,jsonBody:{error:'Request is too large.'}};body=JSON.parse(raw);}catch{return {status:400,headers,jsonBody:{error:'Invalid request.'}};}
 const result=await answerCustomer(body,{inventory,updates:updates(),evidence});
 // No request bodies, keys, prompts or provider responses are logged or persisted.
 body.apiKey='';return {...result,headers};
}});
