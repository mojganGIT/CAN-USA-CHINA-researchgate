import {createHash} from 'node:crypto';
export const hash=s=>createHash('sha256').update(s).digest('hex');
export const normalize=s=>String(s||'').replace(/\s+/g,' ').trim();
export function decode(s){return s.replace(/&#x([\da-f]+);/gi,(_,h)=>String.fromCodePoint(Math.min(parseInt(h,16),0x10ffff))).replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Math.min(+n,0x10ffff))).replace(/&(?:amp|lt|gt|quot|apos|nbsp);/g,x=>({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'",'&nbsp;':' '})[x]);}
export function textOf(html){return normalize(decode(html.replace(/<(script|style|nav|header|footer|aside)\b[^>]*>[\s\S]*?<\/\1>/gi,' ').replace(/<[^>]+>/g,' ')));}
export function dateOf(value){
 const s=String(value||'').match(/^(\d{4}-\d{2}-\d{2})/)?.[1];
 return s&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s?s:null;
}
function attributes(tag){const out={};for(const m of tag.matchAll(/([\w:-]+)\s*=\s*["']([^"']*)["']/g))out[m[1].toLowerCase()]=decode(m[2]);return out;}
export function documentOf(html,url){
 const main=html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1]||html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1]||html;
 const text=textOf(main),title=textOf(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]||html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||new URL(url).hostname).slice(0,250);
 let publicationDate=null,modifiedDate=null;
 for(const m of html.matchAll(/<meta\b[^>]*>/gi)){
  const a=attributes(m[0]),key=a.property||a.name||a.itemprop||'';
  if(/^(?:datePublished|dcterms\.issued|article:published_time|dc\.date\.issued|pubdate|publishdate)$/i.test(key))publicationDate||=dateOf(a.content);
  if(/^(?:dateModified|dcterms\.modified|article:modified_time)$/i.test(key))modifiedDate||=dateOf(a.content);
 }
 for(const m of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){
  try{const walk=(v,depth=0)=>{if(!v||typeof v!=='object'||depth>6)return;publicationDate||=dateOf(v.datePublished);modifiedDate||=dateOf(v.dateModified);for(const x of Object.values(v))if(typeof x==='object')walk(x,depth+1);};walk(JSON.parse(m[1]));}catch{}
 }
 for(const m of main.matchAll(/<time\b[^>]*>/gi)){
  const a=attributes(m[0]);if(/modified/i.test(a.property||a.itemprop||a.class||''))continue;
  publicationDate||=dateOf(a.datetime);
 }
 // A standalone release dateline can supply a date. A date mentioned in a
 // headline or narrative could be the meeting date, so it is never used here.
 const visible=main.match(/<(?:p|span|div)\b[^>]*>\s*(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(20\d{2})\s*<\/(?:p|span|div)>/i);
 if(visible){const months=['january','february','march','april','may','june','july','august','september','october','november','december'];publicationDate||=dateOf(visible[3]+'-'+String(months.indexOf(visible[1].toLowerCase())+1).padStart(2,'0')+'-'+visible[2].padStart(2,'0'));}
 // Full day URL dates are a fallback, never use a footer's modification date as publication.
 const urlDate=new URL(url).pathname.match(/(?:^|\/)(\d{4})[/-](\d{2})[/-](\d{2})(?:[/-]|$)/);
 if(urlDate)publicationDate||=dateOf(urlDate.slice(1,4).join('-'));
 return {title,text,publicationDate,modifiedDate};
}
export function safeURL(raw,hosts){const u=new URL(raw);if(u.protocol!=='https:'||u.username||u.password||u.port||!hosts.includes(u.hostname))throw new Error('Source URL is not allowed.');u.hash='';return u.href;}
export function discoverCandidates(body,hub,hosts){
 const found=new Map(),origin=new URL(hub.url);
 const add=(raw,title,date)=>{try{
  const url=safeURL(new URL(decode(String(raw)),hub.url).href,hosts),u=new URL(url);
  const articleHosts=hub.articleHosts||[origin.hostname];
  if(!articleHosts.includes(u.hostname)||!u.pathname.startsWith(hub.path)||(hub.articlePattern&&!new RegExp(hub.articlePattern).test(u.pathname))||url===hub.url||/\.(?:pdf|jpg|png|zip)$/i.test(u.pathname)||textOf(String(title||'')).length<15)return;
  const name=textOf(String(title)).slice(0,250);
  const yearPath=u.pathname.match(/(?:^|\/)(20\d{2})[/-](\d{2})[/-](\d{2})(?:[/-]|$)/);
  const feedDate=/^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),/i.test(String(date||''))&&Number.isFinite(Date.parse(date))?new Date(date).toISOString().slice(0,10):null;
  const publicationDate=dateOf(date)||feedDate||(yearPath?dateOf(yearPath.slice(1,4).join('-')):null);
  found.set(url,{url,title:name,publicationDate});
 }catch{}};
 if(/^\s*[\[{]/.test(body)){
  try{const walk=(v,depth=0)=>{if(!v||typeof v!=='object'||depth>8)return;
   const title=typeof v.title==='object'?(v.title._||v.title.value):v.title;
   const link=v.link||v.url||v.uri;const raw=typeof link==='string'?link:Array.isArray(link)?link.find(l=>l.rel==='alternate')?.href:link?.href;
   if(raw&&title)add(raw,title,v.publishedDate||v.published||v.datePublished||v.pubDate||v.date);
   for(const x of Object.values(v))if(typeof x==='object')walk(x,depth+1);
  };walk(JSON.parse(body));}catch{}
 }
 for(const m of body.matchAll(/<(?:entry|item)\b[^>]*>([\s\S]*?)<\/(?:entry|item)>/gi)){
  const b=m[1],title=b.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/<!\[CDATA\[|\]\]>/g,'');
  const raw=b.match(/<link[^>]*href=["']([^"']+)/i)?.[1]||b.match(/<link[^>]*>([^<]+)<\/link>/i)?.[1];
  if(raw)add(raw,title,b.match(/<(?:published|pubDate|dc:date)[^>]*>([^<]+)/i)?.[1]);
 }
 const content=body.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1]||body;
 for(const m of content.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi))add(m[1],m[2]);
 const relevance=x=>/china|canada|canadian|united states|u\.s\.|memorandum|\bmou\b|tariff|trade|economic|financial|agreement|critical mineral/i.test(x.title)?1:0;
 return [...found.values()].sort((a,b)=>relevance(b)-relevance(a)||(b.publicationDate||'').localeCompare(a.publicationDate||'')).slice(0,hub.limit||24);
}
export function discover(body,hub,hosts){return discoverCandidates(body,hub,hosts).map(x=>x.url).slice(0,12);}
export function embeddedFeeds(html,hub,hosts){
 const urls=new Set();
 for(const m of html.matchAll(/(?:data-ajax(?:-replace)?|href)\s*=\s*["']([^"']+)["']/gi)){
  try{const url=safeURL(new URL(decode(m[1]),hub.url).href,hosts),u=new URL(url);
   if(u.hostname==='api.io.canada.ca'&&new URL(hub.url).hostname==='www.canada.ca'&&u.pathname.startsWith('/io-server/gc/news/'))urls.add(url);
   else if(u.hostname===new URL(hub.url).hostname&&/(?:format=atom|format=rss|\.rss$|\.xml$)/i.test(url))urls.add(url);
  }catch{}
 }return [...urls].slice(0,2);
}
export function classify(text,issuer=''){
 const t=text.toLowerCase(),countries={Canada:/\bcanad(?:a|ian)\b/i.test(t),US:/\b(?:united states|american|usmca|ustr)\b|\bu\.s\./i.test(t),China:/\b(?:china|chinese|prc)\b/i.test(t)};
 if(/Canada|Canadian/i.test(issuer))countries.Canada=true;if(/United States|USTR|U\.S\.|White House/i.test(issuer))countries.US=true;if(/China|Chinese|MOFCOM/i.test(issuer))countries.China=true;
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
  const response=await fetchImpl(url,{redirect:'manual',signal:AbortSignal.timeout(18000),headers:{'user-agent':'CanadaPolicyResearchMonitor/1.0','accept':'text/html,application/xhtml+xml,application/json,application/atom+xml,application/rss+xml'}});
  if([301,302,303,307,308].includes(response.status)){url=safeURL(new URL(response.headers.get('location'),url).href,hosts);continue;}
  if(!response.ok)throw new Error('Official source returned HTTP '+response.status);
  const contentType=response.headers.get('content-type')||'';if(!/(?:text\/(?:html|xml)|application\/(?:xhtml\+xml|json|atom\+xml|rss\+xml|xml))/i.test(contentType))throw new Error('Unsupported official source format.');
  const reader=response.body.getReader(),chunks=[];let size=0;
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>2_000_000){await reader.cancel();throw new Error('Source exceeded the size limit.');}chunks.push(Buffer.from(value));}
  return {url,html:Buffer.concat(chunks).toString('utf8'),contentType};
 }throw new Error('Too many redirects.');
}
