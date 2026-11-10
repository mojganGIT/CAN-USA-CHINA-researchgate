const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const amount=(n,u)=>Math.round(Number(n.replaceAll(',',''))*(u==='billion'?1e9:1e6));
export function parseStateProfile(text,state,{yearLimit=new Date().getUTCFullYear()}={}){
 const s=String(text).replace(/\s+/g,' ').trim();
 const t=s.match(new RegExp('In (20\\d{2}), '+escape(state.name)+' exported (?:a record )?\\$([\\d,.]+) (billion|million) of goods to the world'));
 if(!t||Number(t[1])<2018||Number(t[1])>yearLimit)throw Error('State identity, year or total was not established');
 const year=Number(t[1]),totalExports=amount(t[2],t[3]);
 const start=s.indexOf('Largest Export Markets'),end=s.indexOf('goods exports to major',start);
 if(start<0)throw Error('Leading-market section was missing');
 const market=s.slice(start,end>start?end:start+900);
 if(!market.includes('in '+year))throw Error('The market section has a different reference period');
 const partners={};
 for(const country of ['Canada','China']){
  const m=market.match(new RegExp(country+' \\(\\$([\\d,.]+) (billion|million)\\)'))||market.match(new RegExp('exported \\$([\\d,.]+) (billion|million) in goods to '+country+' in '+year));
  const value=m?amount(m[1],m[2]):null;
  if(value!==null&&(!Number.isFinite(value)||value<0||value>totalExports))throw Error('Partner value did not reconcile');
  partners[country]={value,status:m?'reported':'not_reported',year};
 }
 const m=s.match(/largest manufacturing export category (?:is|was) (.+?),? which accounted for \$([\d,.]+) (billion|million)/);
 return {year,totalExports,partners,leadingManufacturingCategory:m?m[1].trim():null,leadingManufacturingValue:m?amount(m[2],m[3]):null};
}
export async function refreshStateProfiles(previous,{fetchImpl=fetch,now=new Date().toISOString()}={}){
 if(previous?.rows?.length!==51)return previous||null;
 const queue=[...previous.rows],rows=new Map();
 async function one(old){
  try{
   let url=new URL(old.sourceURL),response;
   for(let redirects=0;redirects<4;redirects++){
    if(url.protocol!=='https:'||url.username||url.password||!['ustr.gov','www.ustr.gov'].includes(url.hostname))throw Error('Invalid USTR source');
    response=await fetchImpl(url.href,{redirect:'manual',signal:AbortSignal.timeout(15000)});
    if([301,302,303,307,308].includes(response.status)){url=new URL(response.headers.get('location'),url);continue;}
    break;
   }
   if(!response?.ok)throw Error('USTR HTTP '+response?.status);
   let text=await response.text();if(text.length>2e6)throw Error('Oversized source');
   text=text.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/&#0*39;|&apos;/g,"'").replace(/&#8217;|&rsquo;/g,'’').replace(/&#36;|&dollar;/g,'$');
   const parsed=parseStateProfile(text,old,{yearLimit:Number(now.slice(0,4))});
   return {...old,...parsed,sourceStatus:'parsed',retrievedAt:now,lastAttempt:now,lastReadStatus:'success',error:null};
  }catch(e){return {...old,lastAttempt:now,lastReadStatus:'failed',error:e.message};}
 }
 async function worker(){while(queue.length){const row=queue.shift();rows.set(row.code,await one(row));}}
 await Promise.all(Array.from({length:4},worker));
 const result=previous.rows.map(r=>rows.get(r.code)),count=result.filter(r=>r.lastReadStatus==='success').length;
 return {...previous,lastAttempt:now,lastSuccessfulRun:count?now:previous.lastSuccessfulRun||null,status:count===51?'success':count?'partial':'unavailable',rows:result};
}
