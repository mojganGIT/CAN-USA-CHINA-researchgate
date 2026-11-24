(function(g){
 'use strict';
 let session=null,pending=null;
 function prepare(root){
  if(session||!root?.isConnected)return session;
  const details=[...root.querySelectorAll('details')].map(el=>({el,open:el.open}));
  const images=[...root.querySelectorAll('.source-media-print-only img')].map(el=>({el,loading:el.getAttribute('loading')}));
  const links=[...root.querySelectorAll('a[href^="#"]')].map(el=>({el,href:el.getAttribute('href')}));
  session={root,details,images,links,x:g?.scrollX,y:g?.scrollY,focus:g?.document?.activeElement};
  root.classList.add('daily-printing');
  for(const {el} of details)el.open=true;
  for(const {el} of images)el.loading='eager';
  for(const {el,href} of links)el.setAttribute('href',new URL(href,g.document.baseURI||g.location.href).href);
  const stamp=root.querySelector('[data-daily-print-time]');
  if(stamp){const now=new Date(),language=g?.DashboardI18n?.language||'en';stamp.textContent=new Intl.DateTimeFormat(g?.DashboardI18n?.locale||'en-CA',{dateStyle:'medium',timeStyle:'short',timeZone:'America/Toronto'}).format(now)+' '+({fr:'HE','zh-Hans':'东部时间'}[language]||'ET');}
  return session;
 }
 function finish(){
  if(!session)return;
  const old=session;session=null;
  for(const {el,open} of old.details)el.open=open;
  for(const {el,loading} of old.images){if(loading===null)el.removeAttribute('loading');else el.setAttribute('loading',loading);}
  for(const {el,href} of old.links)el.setAttribute('href',href);
  old.root.classList.remove('daily-printing');
  if(Number.isFinite(old.x)&&Number.isFinite(old.y))g?.scrollTo?.(old.x,old.y);
  if(old.focus?.isConnected)old.focus.focus?.({preventScroll:true});
  if(g?.CustomEvent&&g.dispatchEvent)g.dispatchEvent(new g.CustomEvent('daily-print-finished'));
 }
 function imageReady(img,timeout=8000){
  if(img.complete)return Promise.resolve(img.naturalWidth>0);
  return new Promise(resolve=>{
   const done=()=>{clearTimeout(timer);img.removeEventListener('load',done);img.removeEventListener('error',done);resolve(img.naturalWidth>0);};
   const timer=setTimeout(done,timeout);img.addEventListener('load',done,{once:true});img.addEventListener('error',done,{once:true});
  });
 }
 function busy(root,value){
  for(const el of root?.querySelectorAll('[data-daily-print]')||[]){el.disabled=value;if(value)el.setAttribute('aria-busy','true');else el.removeAttribute('aria-busy');}
  if(value){
   let status=root?.querySelector('[data-daily-print-status]');
   if(!status&&g?.document){status=g.document.createElement('p');status.className='daily-meta daily-print-status';status.dataset.dailyPrintStatus='';status.setAttribute('role','status');root.querySelector('.daily-export')?.append(status);}
   if(status)status.textContent=g?.DashboardI18n?.t('Preparing the full briefing for PDF…')||'Preparing the full briefing for PDF…';
  }else root?.querySelector('[data-daily-print-status]')?.remove();
 }
 function print(root,{ready}={}){
  if(pending||session)return pending||Promise.resolve();
  busy(root,true);
  pending=(async()=>{
   try{
    await ready;
    if(!root?.isConnected)return;
    busy(root,true);const current=prepare(root);
    const results=await Promise.all(current.images.map(({el})=>imageReady(el)));
    current.images.forEach(({el},i)=>{el.hidden=!results[i];el.closest('.source-media-print-only')?.classList.toggle('source-media-print-unavailable',!results[i]);});
    if(g?.document?.fonts?.ready)await g.document.fonts.ready;
    g?.print?.();
    if(g?.matchMedia&&!g.matchMedia('print').matches)finish();
   }catch(error){finish();throw error;}finally{
    // afterprint restores state when a print dialog closes. Also clean up if printing is unavailable.
    busy(root,false);pending=null;if(!g?.print)finish();
   }
  })();
  return pending;
 }
 const api={prepare,finish,print,get active(){return !!session;},get busy(){return !!pending;}};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(g){g.DailyPrint=api;g.addEventListener('beforeprint',()=>prepare(g.document?.querySelector('.daily-briefing')));g.addEventListener('afterprint',finish);g.addEventListener('pagehide',finish);}
})(typeof window==='undefined'?null:window);
