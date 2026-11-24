// Collect media references from the fetched article, not search results or model output.
import {decode,textOf,normalize,hash,classify} from './core.mjs';
import media from '../app/source-media.js';
function attributes(tag){const out={};for(const m of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g))out[m[1].toLowerCase()]=decode(m[2]??m[3]??m[4]??'');return out;}
export function discoverSourceMedia(html,{sourceURL,sourceDigest,checkedAt,title,publicationDate,publisher,issuer}={}){
 const url=media.sourceURL(sourceURL);if(!url)return null;
 const main=html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1]||html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1]||'';
 const body=main.replace(/<(script|style|nav|header|footer|aside)\b[^>]*>[\s\S]*?<\/\1>/gi,' '),items=[],seen=new Set();
 const add=(kind,raw,alt)=>{const asset=media.assetURL(raw,url,kind);if(!asset||seen.has(asset)||items.length>=6)return;seen.add(asset);items.push({kind,url:asset,title:normalize(alt||title||'Publisher media').slice(0,250),alt:normalize(alt||title||'Publisher media').slice(0,500)});};
 const image=(tag,caption='')=>{const a=attributes(tag),alt=a.alt||caption,w=/^\d+$/.test(a.width||'')?Number(a.width):null;
  if(!alt||/logo|wordmark|headshot|portrait|social[- ]media|back.to.top|flag|avatar|icon/i.test(alt+' '+(a.src||''))||w!==null&&w<280)return;
  if(!caption&&!(w>=280)&&!/chart|graph|infographic|diagram|map|figure|cargo|facility|plant|terminal|mine|battery|shipping|production/i.test(alt))return;
  add('image',a['data-src']||a.src,alt);
 };
 for(const m of body.matchAll(/<figure\b[^>]*>([\s\S]*?)<\/figure>/gi)){const caption=textOf(m[1].match(/<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/i)?.[1]||'');for(const img of m[1].matchAll(/<img\b[^>]*>/gi))image(img[0],caption);}
 for(const m of body.matchAll(/<img\b[^>]*>/gi))image(m[0]);
 for(const m of body.matchAll(/<video\b([^>]*)>([\s\S]*?)<\/video>/gi)){const a=attributes(m[1]);if(a.src)add('video',a.src,a.title||a['aria-label']||title);for(const src of m[2].matchAll(/<source\b[^>]*>/gi)){const b=attributes(src[0]);add('video',b.src,a.title||a['aria-label']||title);}}
 for(const m of body.matchAll(/<iframe\b[^>]*>/gi)){const a=attributes(m[0]);add('video_embed',a.src,a.title||title);}
 const tags=classify(title+' '+textOf(body).slice(0,12000),issuer||publisher);
 return {sourceURL:url,sourceDigest,checkedAt,title,publisher:publisher||new URL(url).hostname,publicationDate:publicationDate||null,reviewState:'source_reported',mediaDigest:hash(JSON.stringify(items)),topics:tags.topics,relationships:tags.relationships,items};
}
