import {createHash} from 'node:crypto';
export const hash=s=>createHash('sha256').update(s).digest('hex');
export const normalize=s=>String(s||'').replace(/\s+/g,' ').trim();
export function decode(s){return s.replace(/&#x([\da-f]+);/gi,(_,h)=>String.fromCodePoint(Math.min(parseInt(h,16),0x10ffff))).replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Math.min(+n,0x10ffff))).replace(/&(?:amp|lt|gt|quot|apos|nbsp);/g,x=>({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'",'&nbsp;':' '})[x]);}
export function textOf(html){return normalize(decode(html.replace(/<(script|style|nav|header|footer|aside)\b[^>]*>[\s\S]*?<\/\1>/gi,' ').replace(/<[^>]+>/g,' ')));}
export function documentOf(html,url){
 const main=html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1]||html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1]||html;
 const text=textOf(main),title=textOf(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]||html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||new URL(url).hostname).slice(0,250);
 const dates=[...html.matchAll(/<meta\b[^>]*(?:datePublished|dcterms\.issued|article:published_time)[^>]*>/gi)].map(m=>m[0].match(/content=["']([^"']+)/i)?.[1]).filter(Boolean);
 const publicationDate=dates.map(x=>x.match(/^\d{4}-\d{2}-\d{2}/)?.[0]).find(Boolean)||null;
 return {title,text,publicationDate};
}
export function safeURL(raw,hosts){const u=new URL(raw);if(u.protocol!=='https:'||u.username||u.password||u.port||!hosts.includes(u.hostname))throw new Error('Source URL is not allowed.');u.hash='';return u.href;}
export function discover(html,hub,hosts){
 const seen=new Set();
 for(const m of html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)){
  try{const url=safeURL(new URL(decode(m[1]),hub.url).href,hosts),u=new URL(url);if(u.hostname!==new URL(hub.url).hostname||!u.pathname.startsWith(hub.path)||url===hub.url||/\.(?:pdf|jpg|png|zip)$/i.test(u.pathname))continue;if(textOf(m[2]).length<15)continue;seen.add(url);}catch{}
 }return [...seen].slice(0,12);
}
export function classify(text,issuer=''){
 const t=text.toLowerCase(),countries={Canada:/\bcanad(?:a|ian)\b/i.test(t),US:/\b(?:united states|american|usmca|ustr)\b|\bu\.s\./i.test(t),China:/\b(?:china|chinese|prc)\b/i.test(t)};
 if(issuer==='Canada')countries.Canada=true;if(issuer==='United States')countries.US=true;if(issuer==='China')countries.China=true;
 const relationships=[];if(countries.Canada&&countries.US)relationships.push('Canada-USA');if(countries.Canada&&countries.China)relationships.push('Canada-China');if(countries.US&&countries.China)relationships.push('USA-China');
 const lex={vehicles:/\b(?:electric vehicle|automotive|batter(?:y|ies)|evs?)\b/i,agriculture:/\b(?:agricultur|canola|seafood|food|soybean)/i,energy:/\b(?:energy|lng|oil|gas|electricity)\b/i,finance:/\b(?:financial|banking|insurance|money laundering)/i,technology:/\b(?:semiconductor|digital|cyber|quantum|artificial intelligence|telecom)/i,security:/\b(?:defen[cs]e|security|fentanyl|precursor|norad|military)/i,investment:/\b(?:investment|cfius|acquisition|screening)/i,agreements:/\b(?:memorandum|mou|agreement|amendment|treaty|dialogue|consultation)/i};
 return {relationships,topics:Object.keys(lex).filter(k=>lex[k].test(t))};
}
export function validateExtraction(result,document,catalog){
 if(!result||result.relevant!==true)return null;
 const quote=normalize(result.quote),body=normalize(document.text);
 if(quote.length<30||quote.length>180||quote.split(/\s+/).length>25||!body.includes(quote))throw new Error('Evidence quotation is not supported by the fetched source.');
 const topics=Array.isArray(result.topics)?result.topics.filter(id=>catalog.topics.some(t=>t.id===id)):[];
 const supported=classify(document.text,document.issuer).relationships;
 const relationships=Array.isArray(result.relationships)?result.relationships.filter(id=>catalog.relationships.includes(id)&&supported.includes(id)):[];
 const issues=Array.isArray(result.issues)?result.issues.filter(id=>catalog.topics.filter(t=>topics.includes(t.id)).some(t=>t.issues.some(i=>i.id===id))):[];
 if(!topics.length||!relationships.length||!issues.length)throw new Error('Missing valid topic, relationship or subtopic classification.');
 const findings=String(result.summary||'').trim();if(findings.length<30||findings.length>1400)throw new Error('Invalid extraction summary.');
 return {summary:findings,quote,topics,relationships,issues,kind:['policy','MOU','amendment','implementation','consultation'].includes(result.kind)?result.kind:'policy',uncertainty:String(result.uncertainty||'Implementation and current applicability require separate verification.').slice(0,1200)};
}
export async function fetchOfficial(raw,hosts,fetchImpl=fetch){
 let url=safeURL(raw,hosts);
 for(let n=0;n<5;n++){
  const response=await fetchImpl(url,{redirect:'manual',signal:AbortSignal.timeout(18000),headers:{'user-agent':'CanadaPolicyResearchMonitor/1.0','accept':'text/html,application/xhtml+xml'}});
  if([301,302,303,307,308].includes(response.status)){url=safeURL(new URL(response.headers.get('location'),url).href,hosts);continue;}
  if(!response.ok)throw new Error('Official source returned HTTP '+response.status);
  if(!/(?:text\/html|application\/xhtml)/i.test(response.headers.get('content-type')||''))throw new Error('Non-HTML source requires a separate parser.');
  const reader=response.body.getReader(),chunks=[];let size=0;
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>2_000_000){await reader.cancel();throw new Error('Source exceeded the size limit.');}chunks.push(Buffer.from(value));}
  return {url,html:Buffer.concat(chunks).toString('utf8')};
 }throw new Error('Too many redirects.');
}
