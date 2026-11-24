(function(g){
 'use strict';
 const D=typeof module!=='undefined'&&module.exports?require('./source-media-data.js'):g.SourceMediaData;
 const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const registered=new Map(),loaded=new Map(),videoSizing=new WeakMap();
 function sourceURL(raw){try{const u=new URL(raw);if(u.protocol!=='https:'||u.username||u.password||u.port||!D.allowedSourceHosts.includes(u.hostname))return '';u.hash='';return u.href;}catch{return '';}}
 function assetURL(raw,source,kind){
  try{const u=new URL(raw,source),s=new URL(source);if(u.protocol!=='https:'||u.username||u.password||u.port)return '';
   if(kind==='video_embed'){
    const youtube=['www.youtube.com','www.youtube-nocookie.com'].includes(u.hostname)&&/^\/embed\/[\w-]{11}$/.test(u.pathname);
    const vimeo=u.hostname==='player.vimeo.com'&&/^\/video\/\d+$/.test(u.pathname);
    if(!youtube&&!vimeo)return '';if(youtube)u.hostname='www.youtube-nocookie.com';u.search='';u.hash='';return u.href;
   }
   if(kind==='chart_embed'){if(u.hostname!=='datawrapper.dwcdn.net'||!/^\/[a-zA-Z0-9]{5}\/\d+\/$/.test(u.pathname))return '';u.search='';u.hash='';return u.href;}
   if(u.origin!==s.origin)return '';
   if(kind==='document_image'){if(!/\.pdf$/i.test(u.pathname))return '';u.hash='';return u.href;}
   if(kind==='image'&&!/\.(?:png|jpe?g|webp|gif|svg)$/i.test(u.pathname))return '';
   if(kind==='video'&&!/\.(?:mp4|webm)$/i.test(u.pathname))return '';
   if(kind==='page')return u.href===s.href?u.href:'';if(!['image','video'].includes(kind))return '';u.hash='';return u.href;
  }catch{return '';}
 }
 const keyOf=item=>encodeURIComponent(item.id||item.sourceURL+'|'+item.url);
 function normalize(item){
  const source=sourceURL(item?.sourceURL),url=source&&assetURL(item.url,source,item.kind);
  if(!url||!item.title||!item.verifiedAt&&!item.checkedAt)return null;
  if(item.kind==='document_image'&&!D.entries.some(x=>x.id===item.id&&x.kind===item.kind&&x.url===url&&x.documentPage===item.documentPage&&x.sourceURL===source))return null;
  if(item.kind==='chart_embed'&&!D.entries.some(x=>x.id===item.id&&x.kind===item.kind&&x.url===url&&x.sourceURL===source))return null;
  return {...item,sourceURL:source,url,title:String(item.title).slice(0,250),alt:String(item.alt||item.title).slice(0,500),automatic:!!item.automatic};
 }
 function automatic(feed={}){
  return (feed.sourceMedia||[]).flatMap(page=>{
   const url=sourceURL(page.sourceURL),check=(feed.sourceChecks||[]).find(c=>sourceURL(c.url)===url);
   if(!url||!check||!page.sourceDigest||page.sourceDigest!==check.digest)return [];
   return (page.items||[]).filter(item=>!/\/magnify-clip\.(?:png|gif)(?:[?#]|$)/i.test(String(item.url||''))).map((item,i)=>normalize({...item,id:'discovered-'+url+'-'+i,sourceURL:url,publisher:page.publisher||new URL(url).hostname,publicationDate:page.publicationDate||null,referencePeriod:page.referencePeriod||'Source reference period not separately verified',checkedAt:page.checkedAt,automatic:true,verifiedAt:undefined,table:undefined,diagram:undefined,memo:undefined,sourceURLs:[url],context:null,geographyLevel:'unverified',regions:[],topics:page.topics||[],relationships:page.relationships||[],geography:'Scope requires analyst review',note:'Automatically discovered on the checked source page. Its subject, date and analytical relevance require review.'})).filter(Boolean);
  });
 }
 function all(feed){const seen=new Set();return [...D.entries.map(normalize).filter(Boolean),...automatic(feed)].filter(x=>{const k=originalVisualURL(x);if(seen.has(k))return false;seen.add(k);return true;});}
 function matching({topic='all',relationship='all',region='CA',framework=false,year='all'}={},feed={}){
  return all(feed).filter(x=>(framework?x.context==='framework':x.context!=='framework')&&(topic==='all'||x.topics?.includes(topic))&&(relationship==='all'||x.relationships?.includes(relationship))&&(year==='all'||(x.referenceYears||[String(x.publicationDate||'').slice(0,4)]).includes(String(year)))&&(region==='CA'||x.geographyLevel==='national'||x.regions?.includes(region)||x.automatic));
 }
 function forSources(sources=[],feed={}){const urls=new Set(sources.map(s=>sourceURL(typeof s==='string'?s:s.url)).filter(Boolean));return all(feed).filter(x=>[x.sourceURL,...(x.sourceURLs||[])].some(url=>urls.has(sourceURL(url))));}
 function forRecord(record,sources={},feed={}){
  const items=forSources([...(record.sources||[]),...(record.sourceIds||[]).map(id=>sources[id]).filter(Boolean)],feed).filter(x=>!x.recordIds||x.recordIds.includes(record.id));
  const selectedSources=new Set(items.filter(x=>!x.automatic&&x.recordIds?.includes(record.id)).map(x=>x.sourceURL));
  return items.filter(x=>!x.automatic||!selectedSources.has(x.sourceURL));
 }
 function recordHTML(record,sources={},feed={},options={}){
  const items=forRecord(record,sources,feed);
  if(items.length)return render(items,options);
  if(options.fallbackPreview===false)return '';
  const source=[...(record.sources||[]),...(record.sourceIds||[]).map(id=>sources[id]).filter(Boolean)].find(s=>sourceURL(s.url));
  const checkedAt=record.reviewedAt||record.checkedAt||record.detectedAt||source?.verifiedAt||source?.reviewedAt;
  if(!source||!checkedAt)return '';
  return render([{id:'page-'+source.url,kind:'page',sourceURL:source.url,url:source.url,title:record.title,publisher:source.publisher,referencePeriod:record.referencePeriod||record.period||'Original source period',publicationDate:source.publicationDate||record.date,checkedAt,geography:record.geography||'Original geographic scope',note:'Read the original publication alongside the analyst memo. Its own dates, policy stage and geographic scope remain authoritative.'}],options);
 }
 function cachedImageURL(item){
  const known=D.entries.find(x=>x.id===item.id&&['image','document_image'].includes(x.kind)&&x.url===item.url&&sourceURL(x.sourceURL)===sourceURL(item.sourceURL));
  return known&&/^assets\/source-visuals\/[a-z0-9-]+\.(?:png|jpg|svg)$/.test(known.cachedURL||'')?known.cachedURL:'';
 }
 function originalVisualURL(item){return item.url+(item.kind==='document_image'?'#page='+item.documentPage:'');}
 function printAssetHTML(raw,{translate=v=>v}={}){
  const item=normalize(typeof raw==='string'?registered.get(raw):raw);if(!item||item.kind==='page')return '';
  const t=v=>E(translate(v)),link=`<a href="${E(originalVisualURL(item))}" target="_blank" rel="noopener noreferrer">${t('Open original visual or video')}</a>`;
  if(!['image','document_image'].includes(item.kind))return `<div class="source-media-print-only"><p class="source-media-print-note">${t(item.kind==='chart_embed'?'Interactive chart: open the original online.':'Video: open the original recording online.')} ${link}</p></div>`;
  const table=item.table?`<table><caption>${E(item.table.caption)}</caption><thead><tr>${item.table.columns.map(v=>`<th scope="col">${E(v)}</th>`).join('')}</tr></thead><tbody>${item.table.rows.map(row=>`<tr>${row.map((v,i)=>`<${i?'td':'th scope="row"'}>${E(v)}</${i?'td':'th'}>`).join('')}</tr>`).join('')}</tbody></table>`:'';
  const diagram=item.diagram?`<p><strong>${t('Eight strategic capabilities')}</strong></p><ul>${item.diagram.capabilities.map(v=>`<li>${t(v)}</li>`).join('')}</ul><p><strong>${t('Five policy foundations')}</strong></p><ul>${item.diagram.foundations.map(v=>`<li>${t(v)}</li>`).join('')}</ul>`:'';
  return `<div class="source-media-print-only"><img loading="lazy" src="${E(cachedImageURL(item)||item.url)}" alt="${E(item.alt)}" referrerpolicy="no-referrer"><p class="source-media-print-note source-media-print-failure">${t('The source image could not be loaded for this export.')} ${link}</p>${table}${diagram}</div>`;
 }
 function frameHTML(item,{heading=true}={}){
  const source=sourceURL(item.sourceURL),url=assetURL(item.url,source,item.kind);if(!url)return '';
  const table=item.table,diagram=item.diagram;
  const original=originalVisualURL({...item,url}),originalImage=`<a href="${E(original)}" target="_blank" rel="noopener noreferrer" aria-label="Open publisher’s original visual"><img loading="lazy" src="${E(cachedImageURL(item)||url)}" alt="${E(item.alt)}" referrerpolicy="no-referrer"></a>`;
  const diagramHTML=diagram?`<details><summary>Accessible text version of the official diagram</summary><h2>Eight strategic capabilities</h2><ul class="capabilities">${diagram.capabilities.map(v=>`<li>${E(v)}</li>`).join('')}</ul><h2>Five policy foundations</h2><ul class="foundations">${diagram.foundations.map(v=>`<li>${E(v)}</li>`).join('')}</ul></details>`:'';
  const exact=table?`<details><summary>Accessible chart data · ${E(table.caption)}</summary><div class="table"><table><caption>${E(table.caption)}</caption><thead><tr>${table.columns.map(v=>`<th scope="col">${E(v)}</th>`).join('')}</tr></thead><tbody>${table.rows.map(row=>`<tr>${row.map((v,i)=>`<${i?'td':'th scope="row"'}>${E(v)}</${i?'td':'th'}>`).join('')}</tr>`).join('')}</tbody></table></div></details>`:'';
  const content=['image','document_image'].includes(item.kind)?`${originalImage}${diagramHTML}${exact}`:item.kind==='video'?`<video controls playsinline preload="none" aria-label="${E(item.alt)}"><source src="${E(url)}" type="${url.includes('.webm')?'video/webm':'video/mp4'}">Video playback is unavailable. Open the original video.</video><p>Publisher-provided footage. Playback does not start automatically. Captions or a transcript may not be provided by the publisher.</p>`:'';
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font:16px/1.6 system-ui;color:#122b49;margin:16px;background:#fff}h1{font-size:1.1rem}img,video,svg{display:block;width:100%;height:auto}svg{min-width:600px}h2{font-size:1rem}.capabilities,.foundations{list-style:none;padding:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.capabilities li,.foundations li{padding:14px;border:1px solid #d6c7ac;border-top:3px solid #b58629;border-radius:4px;background:#fffcf6}.foundations li{border-top-color:#122b49}body{overflow-x:auto}svg text{font:14px system-ui}video{max-height:430px}a{color:#234f7c}table{border-collapse:collapse;width:100%}th,td{padding:10px;border:1px solid #ccd4da;text-align:left}.table{overflow:auto}summary{cursor:pointer;font-weight:600;padding:12px 0}.fallback{font-size:.9rem;color:#475b6d}</style>${heading?`<h1>${E(item.title)}</h1>`:''}${content}<p><a href="${E(original)}" target="_blank" rel="noopener noreferrer">Open original visual or video</a> · <a href="${E(source)}" target="_blank" rel="noopener noreferrer">Open publisher’s source page</a></p></html>`;
 }
 function frameMarkup(item,mode='asset'){
  item=normalize(item);if(!item)return '';
  const remote=mode==='page'||['video_embed','chart_embed'].includes(item.kind);
  const title=(mode==='page'?'Original source page: ':['image','document_image','chart_embed'].includes(item.kind)?'Source visual: ':'Source video: ')+item.title;
  const sandbox=remote?'allow-scripts allow-same-origin allow-presentation allow-popups':'allow-same-origin allow-popups';
  return `<iframe title="${E(title)}" loading="lazy" referrerpolicy="${item.kind==='video_embed'&&mode!=='page'?'strict-origin-when-cross-origin':'no-referrer'}" sandbox="${sandbox}" allowfullscreen${remote?' allow="fullscreen; encrypted-media; picture-in-picture"':''} ${remote?`src="${E(mode==='page'?item.sourceURL:item.url)}"`:`srcdoc="${E(frameHTML(item,{heading:false}))}"`}></iframe>`;
 }
 function render(items,{keyPrefix='source',translate=v=>v,sourceDetails=true}={}){
  return items.map(raw=>{
   const x=normalize(raw);if(!x)return '';const key=keyPrefix+'-'+keyOf(x);registered.set(key,x);const t=v=>E(translate(v));
   const memo=!x.automatic&&x.memo?.summary&&x.memo?.canada&&x.memo?.reviewedAt?x.memo:null;
   const story=memo?`<div class="source-media-memo"><p><strong>${t('Summary')}</strong><span>${t(memo.summary)}</span></p><p><strong>${t('Why it matters to Canada')} <small>${t('Analyst interpretation')}</small></strong><span>${t(memo.canada)}</span></p></div>`:'';
   const body=`<div class="source-media-body"><p class="source-media-meta">${t(x.publisher)} · ${t(x.referencePeriod||'Original source period')}${x.publicationDate?' · '+t('Source publication')+': '+E(x.publicationDate):''}</p><p class="source-media-note">${t(x.note)}</p><p class="source-media-meta">${t(x.kind==='page'?'Source record date':x.automatic?'Automatically discovered · analyst review pending':'Visual and source link checked')}: ${E(x.verifiedAt||x.checkedAt)} · ${t(x.geography||'Original geographic scope')}${memo?' · '+t('Summary reviewed')+': '+E(memo.reviewedAt):''}</p><div class="source-media-actions"><button type="button" data-source-media-load="page" data-source-media-key="${E(key)}">${t('Preview original source page')}</button></div><div class="source-media-slot source-media-page-slot" aria-live="polite"></div><p class="source-media-fallback">${t('Publisher or browser restrictions may prevent an embedded page or media from loading. The original links remain available.')}</p><p class="source-media-links"><a href="${E(x.sourceURL)}" target="_blank" rel="noopener noreferrer">${t('Open original source')}</a>${x.kind!=='page'?` · <a href="${E(originalVisualURL(x))}" target="_blank" rel="noopener noreferrer">${t('Open original visual or video')}</a>`:''}</p></div>`;
   if(x.kind==='page')return `<details class="source-media" data-source-media-id="${E(key)}" data-daily-detail="media-${E(key)}" data-sc-detail="media-${E(key)}"><summary>${t('Original source preview')}: ${t(x.title)}</summary>${body}</details>`;
   const reading=x.kind==='document_image'?'Original report page '+x.documentPage:x.table?'Investment stock, not newly completed spending.':x.diagram?'Policy framework, not a measured commercial outcome.':x.automatic?'Automatically discovered · analyst review pending':'';
   return `<article class="source-media source-media-inline" data-source-media-id="${E(key)}" data-source-media-inline="true" data-source-media-kind="${E(x.kind)}"><h5>${t(x.title)}</h5><p class="source-media-caption"><a href="${E(x.sourceURL)}" target="_blank" rel="noopener noreferrer">${t(x.publisher)}</a> · ${t(x.referencePeriod||'Original source period')} · ${t(x.geography||'Original geographic scope')}</p>${story}${reading?`<p class="source-media-reading">${t(reading)}</p>`:''}<div class="source-media-slot source-media-primary">${frameMarkup(x)}</div>${printAssetHTML(x,{translate})}${sourceDetails?`<details class="source-media-details" data-source-media-details data-daily-detail="media-${E(key)}" data-sc-detail="media-${E(key)}"><summary>${t('Source, dates and evidence')}</summary>${body}</details>`:''}</article>`;
  }).join('');
 }
 function collection(options={},feed={},renderOptions={}){
  const items=matching(options,feed);if(!items.length)return '';
  const t=v=>E((renderOptions.translate||((v)=>v))(v));
  return `<section class="source-media-collection"><h4>${t(renderOptions.heading||'Explore the source visuals')}</h4><p>${t('Original charts, diagrams and publisher-provided footage attached to the evidence. Reference periods remain separate from today’s briefing date.')}</p>${options.region&&options.region!=='CA'?`<p class="source-media-note">${t('National and project visuals retain their original geography; they are not a provincial outcome measure.')}</p>`:''}${render(items.slice(0,4),renderOptions)}${items.length>4?`<details data-daily-detail="additional-visuals" data-sc-detail="additional-visuals"><summary>${t('More source visuals')} (${items.length-4})</summary>${render(items.slice(4),renderOptions)}</details>`:''}</section>`;
 }
 function fitVideoFrame(frame){
  if(!frame?.matches?.('.source-media-inline[data-source-media-kind="video"] > .source-media-primary > iframe')||!frame.hasAttribute('srcdoc'))return;
  let doc;try{doc=frame.contentDocument;}catch{return;}
  const body=doc?.body,video=body?.querySelector('video'),view=frame.contentWindow;if(!body||!video||!view)return;
  const previous=videoSizing.get(frame);if(previous?.body===body){previous.update();return;}previous?.dispose();
  const update=()=>{
   if(!frame.isConnected)return;
   const style=view.getComputedStyle(body),height=Math.ceil(body.getBoundingClientRect().height+(parseFloat(style.marginTop)||0)+(parseFloat(style.marginBottom)||0)+2);
   if(Number.isFinite(height)&&height>0&&frame.style.height!==height+'px')frame.style.height=height+'px';
  };
  const observer=typeof g.ResizeObserver==='function'?new g.ResizeObserver(update):null;
  const dispose=()=>{
   observer?.disconnect();view.removeEventListener('resize',update);view.removeEventListener('pagehide',dispose);
   for(const type of ['loadedmetadata','resize','error'])video.removeEventListener(type,update);
   if(videoSizing.get(frame)?.body===body)videoSizing.delete(frame);
  };
  videoSizing.set(frame,{body,update,dispose});observer?.observe(body);view.addEventListener('resize',update);view.addEventListener('pagehide',dispose,{once:true});
  for(const type of ['loadedmetadata','resize','error'])video.addEventListener(type,update);
  update();
 }
 function clearFrames(slot){
  for(const frame of slot?.querySelectorAll?.('iframe')||[])videoSizing.get(frame)?.dispose();
  slot?.replaceChildren();
 }
 function chartSize(event){
  if(event.origin!=='https://datawrapper.dwcdn.net')return;
  for(const frame of g.document?.querySelectorAll?.('.source-media-inline[data-source-media-kind="chart_embed"] > .source-media-primary > iframe')||[]){
   if(frame.contentWindow!==event.source)continue;
   const id=new URL(frame.src).pathname.split('/')[1],height=event.data?.['datawrapper-height']?.[id];
   if(Number.isFinite(height)&&height>=200&&height<=2400)frame.style.height=Math.ceil(height)+'px';
  }
 }
 function load(container,mode){
  const item=registered.get(container.dataset.sourceMediaId),slot=container.querySelector(mode==='page'?'.source-media-page-slot':'.source-media-primary');if(!item||!slot)return;
  const frame=g.document.createElement('iframe');frame.title=(mode==='page'?'Original source page: ':['image','document_image','chart_embed'].includes(item.kind)?'Source visual: ':'Source video: ')+item.title;frame.loading='lazy';frame.referrerPolicy=item.kind==='video_embed'&&mode!=='page'?'strict-origin-when-cross-origin':'no-referrer';
  if(mode==='page'||['video_embed','chart_embed'].includes(item.kind)){
   frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-presentation allow-popups');frame.allow='fullscreen; encrypted-media; picture-in-picture';frame.src=mode==='page'?item.sourceURL:item.url;
  }else{frame.setAttribute('sandbox','allow-same-origin allow-popups');frame.srcdoc=frameHTML(item,{heading:false});}
  frame.setAttribute('allowfullscreen','');clearFrames(slot);slot.replaceChildren(frame);if(mode==='page')loaded.set(container.dataset.sourceMediaId,mode);
 }
 function hydrate(root){
  const viewers=[...(root?.matches?.('.source-media')?[root]:[]),...(root?.querySelectorAll?.('.source-media')||[])];
  for(const el of viewers){
   if(el.closest?.('details:not([open])'))continue;
   const inline=el.dataset.sourceMediaInline==='true',primary=el.querySelector('.source-media-primary');
   if(inline&&primary){const frame=primary.querySelector('iframe');if(frame)fitVideoFrame(frame);else load(el,'asset');}
   const mode=loaded.get(el.dataset.sourceMediaId),details=inline?el.querySelector('.source-media-details'):el,page=el.querySelector('.source-media-page-slot');
   if(mode&&details?.open&&page&&!page.querySelector('iframe'))load(el,mode);
  }
 }
 function toggle(event){
  const target=event.target;
  if(target.open){hydrate(target);return;}
  if(target.matches?.('.source-media-details')){
   const owner=target.closest('.source-media');if(owner)loaded.delete(owner.dataset.sourceMediaId);
   clearFrames(target.querySelector('.source-media-page-slot'));return;
  }
  const viewers=target.matches?.('.source-media')?[target]:[...(target.querySelectorAll?.('.source-media')||[])];
  for(const viewer of viewers){loaded.delete(viewer.dataset.sourceMediaId);for(const slot of viewer.querySelectorAll?.('.source-media-slot')||[])clearFrames(slot);}
 }
 const api={sourceURL,assetURL,normalize,all,matching,forSources,forRecord,frameHTML,frameMarkup,printAssetHTML,originalVisualURL,render,recordHTML,collection,hydrate};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(g){g.SourceMedia=api;g.document?.addEventListener('click',e=>{const b=e.target.closest('[data-source-media-load]');if(!b)return;const mode=b.dataset.sourceMediaLoad;if(!['asset','page'].includes(mode))return;const container=b.closest('.source-media');if(container){e.preventDefault();load(container,mode);}});g.document?.addEventListener('toggle',toggle,true);g.document?.addEventListener('load',e=>fitVideoFrame(e.target),true);g.addEventListener?.('message',chartSize);}
})(typeof window==='undefined'?null:window);
