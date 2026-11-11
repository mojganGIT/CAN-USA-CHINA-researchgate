(function(g){
 'use strict';
 const M=g?.InsightsModel||(typeof require==='function'?require('./insights-model.js'):null);
 const R=g?.RegionalTradeModel||(typeof require==='function'?require('./regional-trade-model.js'):null);
 const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const T=(key,...args)=>g?.RelationshipCopy?.text(key,...args)||String(key).replace(/\{(\d+)\}/g,(_,n)=>String(args[n]??''));
 const tx=(key,...args)=>E(T(key,...args));
 const locale=()=>g?.DashboardI18n?.locale||'en-CA';
 const fmt=(value,options={})=>new Intl.NumberFormat(locale(),{maximumFractionDigits:2,...options}).format(value);
 const safe=s=>{try{const url=new URL(s);return url.protocol==='https:'&&!url.username&&!url.password?url.href:'';}catch{return '';}};
 const files={evidence:['evidence-records.json','records'],regional:['regional-statistics.json','series'],us:['us-trade-statistics.json','partners']};
 const cache=new Map(),requests=new Map(),errors=new Set();
 const flows=[['imports','Imports'],['exports','Exports'],['balance','Trade balance']];
 const within=y=>y>='2018'&&y<='2026';
 function choices(m){
  const topic=m.topic.id,canola=m.issue.id==='canola';
  const broad=['vehicles','agriculture','energy'].includes(topic);
  if(!broad&&!(m.issue.id==='regional-rules'&&m.index===0))return [];
  const list=[];
  if(canola&&m.index===1)list.push({id:'canola-seed-china',feed:'evidence',kind:'canola',label:'Canola seed shipments to China'},
   {id:'canola-meal-china',feed:'evidence',kind:'canola',label:'Canola meal shipments to China'});
  if(canola&&m.index===0)list.push({id:'canola-products-us',feed:'evidence',kind:'products',label:'Canola shipments to the United States by product'});
  if(m.index!==2)list.push({id:'regional',feed:'regional',kind:'regional',topic:broad?topic:'all',partner:m.index===0?'United States':'China',label:'Canadian domestic exports: broader trade context'});
  if(m.index!==1)list.push({id:'us',feed:'us',kind:'us',partner:m.index===0?'Canada':'China',label:'U.S. goods trade: all products'});
  return list;
 }
 function canola(d,option){
  const r=d?.records?.find(x=>x.id===option.id&&x.relationships?.includes('Canada-China')&&x.measurementType==='observed'&&x.unit==='tonnes'),values=r?.series?.values;
  if(!values?.length||values.length!==r.series.labels?.length||!values.every(v=>Number.isFinite(v)&&v>=0)||values.reduce((a,b)=>a+b,0)!==r.value)return null;
  if(!r.periodStart||!r.periodEnd)return null;
  const year=Number(r.periodStart.slice(0,4)),start=Number(r.periodStart.slice(5,7));
  if(!Number.isInteger(year)||!(start>=1&&start<=12))return null;
  const labels=values.map((_,i)=>new Date(Date.UTC(year,start-1+i,1)).toISOString().slice(0,7));
  if(labels.at(-1)!==r.periodEnd.slice(0,7))return null;
  const source=d.sources?.[r.sourceIds?.[0]],tariff=d.records.find(x=>x.id==='canola-seed-tariff');
  // The timing marker is for the seed tariff only; the meal series has separate product treatment.
  const marker=r.id==='canola-seed-china'?tariff?.periodStart?.slice(0,7):null;
  return {kind:'canola',title:T(r.title),unit:'tonnes',labels,values,period:r.period,current:r.value,prior:null,source:source?.url,publisher:source?.publisher,checked:source?.reviewedAt,basis:r.limitation,marker};
 }
 function products(d){
  const rows=['seed','meal','oil'].map(product=>d?.records?.find(r=>r.id==='canola-'+product+'-us'&&r.relationships?.includes('Canada-USA')&&r.measurementType==='observed'&&r.unit==='tonnes'));
  if(!rows.every(r=>r&&Number.isFinite(r.value)&&r.value>=0&&r.periodStart===rows[0].periodStart&&r.periodEnd===rows[0].periodEnd))return null;
  const source=d.sources?.[rows[0].sourceIds?.[0]];
  return {kind:'products',title:T('Canola shipments to the United States by product'),unit:'tonnes',period:rows[0].period,labels:['Canola seed','Canola meal','Canola oil'],values:rows.map(r=>r.value),source:source?.url,publisher:source?.publisher,checked:source?.reviewedAt,basis:rows[0].limitation};
 }
 function series(data,option,state={}){
  if(!data||!option)return null;
  if(option.kind==='canola')return canola(data,option);
  if(option.kind==='products')return products(data);
  const year=within(state.year)?state.year:'latest';
  if(option.kind==='regional'){
   const r=M.canada(data,{region:'Canada',topic:option.topic,partner:option.partner,year});
   if(!r||!within(r.year))return null;
   return {...r,kind:'regional',title:T('Canadian domestic exports to {0}',T(option.partner))+' · '+T(R.groups[option.topic]),publisher:'Statistics Canada',scope:'This is a broader product group, so use it as trade context for the selected issue.'};
  }
  if(option.kind==='us'){
   const flow=flows.some(([id])=>id===state.flow)?state.flow:'imports';
   const r=M.us(data,{partner:option.partner,measure:flow,year});
   if(!r||!within(r.year))return null;
   return {...r,kind:'us',flow,title:T('U.S. goods trade with {0}',T(option.partner))+' · '+T(flows.find(([id])=>id===flow)[1]),publisher:'U.S. Census Bureau',scope:'This series covers all goods traded with the partner. It does not isolate the selected sector or product.'};
  }
  return null;
 }
 function amount(v,unit,compact=false,sign=false){
  if(!Number.isFinite(v))return T('Not available');
  if(compact&&unit==='USD million'){v*=1e6;unit='USD';}
  return fmt(v,{notation:compact?'compact':'standard',signDisplay:sign?'exceptZero':'auto'})+' '+T(unit);
 }
 const period=(year,n)=>n===1?year+'-01':year+'-01 – '+year+'-'+String(n).padStart(2,'0');
 const label=(r,i)=>r.kind==='products'?T(r.labels[i]):r.labels[i];
 function pointIndex(r,index){return Number.isInteger(index)&&index>=0&&index<r.labels.length?index:r.labels.length-1;}
 function reading(r,i){
  const labelNow=label(r,i),v=amount(r.values[i],r.unit);
  if(!r.previous)return tx('{0}: {1}',labelNow,v);
  return tx('{0}: {1}. Same month in {2}: {3}.',labelNow,v,Number(r.year)-1,amount(r.previous[i],r.unit));
 }
 function selectedPoint(r,i){return `<span>${reading(r,i)}</span>`;}
 function graphic(r,selected){
  const rows=[r.values,...(r.previous?[r.previous]:[])],points=rows.flat().filter(Number.isFinite);
  if(!points.length)return `<p>${tx('No observations to plot')}</p>`;
  const low=Math.min(0,...points),high=Math.max(0,...points),span=high-low||1,W=540,H=232;
  const plot={left:67,right:508,top:29,bottom:184};
  const X=i=>r.kind==='products'?plot.left+(i+.5)*(plot.right-plot.left)/r.labels.length:r.labels.length===1?(plot.left+plot.right)/2:plot.left+i*(plot.right-plot.left)/(r.labels.length-1);
  const Y=v=>plot.bottom-(v-low)/span*(plot.bottom-plot.top);
  const axis=Array.from({length:5},(_,i)=>{
   const v=low+(high-low)*i/4,y=Y(v);return `<line class="lab-chart-grid" x1="${plot.left}" x2="${plot.right}" y1="${y}" y2="${y}"/><text class="lab-chart-tick" x="${plot.left-9}" y="${y+4}" text-anchor="end">${E(fmt(v,{notation:'compact'}))}</text>`;
  }).join('');
  const lines=r.kind==='products'?'':rows.map((values,i)=>{
   let on=false;
   const path=values.map((v,j)=>{if(!Number.isFinite(v)){on=false;return '';}const d=(on?'L':'M')+X(j).toFixed(1)+' '+Y(v).toFixed(1);on=true;return d;}).join(' ');
   return `<path class="lab-series ${i?'prior':'current'}" d="${path}"/>${values.map((v,j)=>Number.isFinite(v)?`<circle class="lab-series-dot ${i?'prior':'current'}" cx="${X(j)}" cy="${Y(v)}" r="3.8"/>`:'').join('')}`;
  }).join('');
  const marks=r.labels.map((l,i)=>{
   const v=Number.isFinite(r.values[i])?r.values[i]:r.previous?.[i];if(!Number.isFinite(v))return '';
   const shape=r.kind==='products'?`<rect class="lab-product-bar" x="${X(i)-26}" y="${Y(v)}" width="52" height="${Math.max(0,Y(0)-Y(v))}" rx="4"/>`:`<circle class="lab-point-ring" cx="${X(i)}" cy="${Y(v)}" r="8"/><circle cx="${X(i)}" cy="${Y(v)}" r="15" fill="transparent"/>`;
   return `<g role="button" tabindex="0" data-lab-point="${i}" aria-pressed="${i===selected}" aria-label="${reading(r,i)}"><title>${reading(r,i)}</title>${shape}</g>`;
  }).join('');
  const ticks=r.labels.map((l,i)=>r.labels.length>8&&i%2&&i!==r.labels.length-1?'':`<text class="lab-chart-tick" x="${X(i)}" y="207" text-anchor="middle">${E(r.kind==='products'?T(l):l.slice(5))}</text>`).join('');
  const mark=r.labels.indexOf(r.marker),timing=mark>=0?`<line class="lab-chart-timing" x1="${X(mark)}" x2="${X(mark)}" y1="${plot.top}" y2="${plot.bottom}"/>`:'';
  return `<svg class="lab-chart-svg" viewBox="0 0 ${W} ${H}" role="group" aria-label="${tx('Interactive trade chart')} · ${E(r.title)}"><text class="lab-chart-tick" x="${plot.left}" y="17">${tx(r.unit)}</text>${axis}${timing}${lines}${marks}${ticks}</svg>`;
 }
 function metrics(r){
  const metric=(l,v,n='')=>`<div><dt>${tx(l)}</dt><dd>${E(v)}</dd>${n?`<dd class="lab-chart-period">${E(n)}</dd>`:''}</div>`;
  if(r.kind==='products')return `<p>${tx('These are totals by product over one period, not a time trend.')}</p>`;
  if(r.kind==='canola'){
   const peak=Math.max(...r.values),index=r.values.indexOf(peak),first=r.values[0],last=r.values.at(-1);
   return `<dl class="lab-chart-metrics">${metric('Total for the period',amount(r.current,r.unit,true),T(r.period))}${metric('Highest observed month',amount(peak,r.unit,true),r.labels[index])}${metric('Change from first to last month',amount(last-first,r.unit,true,true))}</dl><p>${tx('The first month recorded {0}; the last recorded {1}. The highest month was {2}.',amount(first,r.unit),amount(last,r.unit),r.labels[index])}</p>`;
  }
  const pct=r.percent===null?'':fmt(r.percent/100,{style:'percent',signDisplay:'exceptZero'});
  let readingText;
  if(r.change===null)readingText=tx('A complete comparison for the same months is unavailable. Missing observations are not zero.');
  else if(r.change===0)readingText=tx('The total was unchanged from the same months a year earlier.');
  else readingText=tx(r.change>0?'The total was {0} higher than the same months a year earlier.':'The total was {0} lower than the same months a year earlier.',amount(Math.abs(r.change),r.unit,true));
  return `<dl class="lab-chart-metrics">${metric('Selected period',amount(r.current,r.unit,true),period(r.year,r.n))}${metric('Same period a year earlier',amount(r.prior,r.unit,true),period(String(Number(r.year)-1),r.n))}${metric('Change from prior period',pct||amount(r.change,r.unit,true,true),pct?amount(r.change,r.unit,true,true):'')}</dl><p>${readingText}</p>`;
 }
 function select(key,l,rows,value){return `<label><span>${tx(l)}</span><select data-lab-chart="${key}">${rows.map(([id,name])=>`<option value="${E(id)}" ${String(id)===String(value)?'selected':''}>${tx(name)}</option>`).join('')}</select></label>`;}
 function render(m,s){
  const options=choices(m);
  if(!options.length)return `<p class="lab-chart-gap">${tx(m.gap?'No comparable series is indexed for this selection. A dated measure and matched outcome data are needed to chart a trend.':'This issue is documented through policy records. The dated findings above show what was recorded; a numerical trend would need a comparable outcome series.')}</p>`;
  const option=options.find(o=>o.id===s.series)||options[0],r=series(cache.get(option.feed),option,s);
  const dataset=options.length>1?select('series','Data series',options.map(o=>[o.id,o.label]),option.id):'';
  const control=(r?.available?.length?select('year','Reporting year',[['latest','Latest available period'],...r.available.filter(within).map(y=>[y,y])],s.year||'latest'):'')+(option.kind==='us'?select('flow','Trade measure',flows,s.flow||'imports'):'');
  const problem=errors.has(option.feed)?`<p role="status">${tx('The chart data could not be loaded. The dated findings above are still available.')}</p><button type="button" class="lab-text-button" data-lab-retry>${tx('Retry chart data')}</button>`:cache.has(option.feed)?`<p>${tx('No comparable observations are available for this selection.')}</p>`:`<p role="status">${tx('Loading chart data…')}</p>`;
  const i=r?pointIndex(r,s.point):0,sourceURL=safe(r?.source);
  return `<section class="lab-chart" aria-labelledby="lab-chart-title"><h5 id="lab-chart-title">${tx('Trade data and trends')}</h5>${dataset||control?`<div class="lab-chart-controls">${dataset}${control}</div>`:''}${!r?problem:`
   <p class="lab-chart-title">${E(r.title)}</p>${r.scope?`<p class="lab-chart-scope">${tx(r.scope)}</p>`:''}${r.period?`<p class="lab-small">${tx(r.period)}</p>`:''}
   ${metrics(r)}${r.flow==='balance'?`<p class="lab-small">${tx('A negative trade balance means imports exceeded exports.')}</p>`:''}<figure>${graphic(r,i)}<figcaption>${r.previous?`<span class="lab-chart-key current">${E(r.year)}</span><span class="lab-chart-key prior">${Number(r.year)-1}</span>`:''}${r.marker?`<span class="lab-chart-key timing">${tx('Canola seed tariff change: {0}',r.marker)}</span>`:''}</figcaption></figure>
   <div class="lab-chart-point">${select('point',r.kind==='products'?'Inspect a product':'Inspect a month',r.labels.map((_,j)=>[j,label(r,j)]),i)}<p id="lab-chart-point" role="status" aria-live="polite">${selectedPoint(r,i)}</p></div>
   <details class="lab-chart-data"><summary>${tx('Show exact values')}</summary><div class="lab-chart-scroll"><table><thead><tr><th scope="col">${tx(r.kind==='products'?'Product':'Reference period')}</th><th scope="col">${tx('Reported value')}</th>${r.previous?`<th scope="col">${tx('Same month a year earlier')}</th>`:''}</tr></thead><tbody>${r.labels.map((_,j)=>`<tr><th scope="row">${E(label(r,j))}</th><td>${E(amount(r.values[j],r.unit))}</td>${r.previous?`<td>${E(amount(r.previous[j],r.unit))}</td>`:''}</tr>`).join('')}</tbody></table></div></details>
   <p class="lab-small">${tx(r.basis||'')} ${tx('A change in the series does not establish the effect of the selected policy.')}</p>${r.status&&r.status!=='success'?`<p class="lab-small">${tx('The latest refresh was incomplete. Check the retrieval date and data coverage.')}</p>`:''}
   <p class="lab-small">${sourceURL?`<a href="${E(sourceURL)}" target="_blank" rel="noopener noreferrer">${tx('Original data source')}: ${E(r.publisher)} ↗</a>`:''}${r.checked?' · '+tx(r.kind==='canola'||r.kind==='products'?'Sources reviewed':'Source retrieved')+': '+E(String(r.checked).slice(0,10)):''}</p>`}</section>`;
 }
 function ensure(m,s,refresh=false){
  const options=choices(m),option=options.find(o=>o.id===s.series)||options[0],key=option?.feed;
  if(!key||!g||typeof fetch!=='function')return null;
  if(requests.has(key))return requests.get(key);
  if(!refresh&&(cache.has(key)||errors.has(key)))return null;
  errors.delete(key);
  const [path,field]=files[key];
  const request=Promise.resolve().then(()=>fetch(path,{cache:'no-store',...(typeof AbortSignal!=='undefined'&&AbortSignal.timeout?{signal:AbortSignal.timeout(15000)}:{})})).then(async response=>{
   if(!response.ok)throw Error(path);const d=await response.json();if(!Array.isArray(d[field]))throw Error(path);cache.set(key,d);
  }).catch(()=>errors.add(key)).finally(()=>requests.delete(key));
  requests.set(key,request);
  return request;
 }
 const api={choices,series,render,ensure};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(g)g.RelationshipFindings=api;
})(typeof window==='undefined'?null:window);
