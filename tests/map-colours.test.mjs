import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('every regional shape, legend and table swatch uses the same active-layer colour',async()=>{
 const evidence=JSON.parse(read('app/evidence-records.json')),geometry=JSON.parse(read('app/canada-map.json')),statistics=JSON.parse(read('app/regional-statistics.json'));
 const events={},nodes=new Map();
 const node=id=>{if(!nodes.has(id))nodes.set(id,{innerHTML:'',isConnected:true,focus(){},querySelectorAll(){return [];}});return nodes.get(id);};
 const window={addEventListener:(name,fn)=>(events[name]??=[]).push(fn),dispatchEvent:event=>(events[event.type]||[]).forEach(fn=>fn(event)),PolicyLive:{feed:{changes:[]}}};
 const document={getElementById:node,addEventListener:(name,fn)=>(events[name]??=[]).push(fn)},location={hash:'#home?region=ON&topic=all&relationship=all&period=all&layer=summary'};
 const context={window,document,location,history:{replaceState(a,b,url){location.hash=url;}},Intl,Date,Event,URLSearchParams,console,fetch:async url=>({ok:true,json:async()=>url==='evidence-records.json'?evidence:url==='canada-map.json'?geometry:statistics})};vm.createContext(context);
 for(const file of ['impact-model.js','regional-trade-model.js','regional-trade.js','impact-explorer.js'])vm.runInContext(read('app/'+file),context);
 window.CanadaImpact.mount('overview','target');await window.CanadaImpact.ready;await new Promise(resolve=>setImmediate(resolve));
 const change=(key,value)=>(events.change||[]).forEach(fn=>fn({target:{matches:()=>true,dataset:{impactFilter:key},value}}));
 const attr=(tag,name)=>tag.match(new RegExp('(?:^|\\s)'+name+'="([^"]*)"'))?.[1];
 for(const layer of ['summary','observed','exposure','policy','trade'])for(const relationship of ['all','Canada-USA','Canada-China']){
  change('layer',layer);change('relationship',relationship);
  const html=node('target').innerHTML,paths=html.match(/<path\b[^>]*class="impact-province[^>]*>/g)||[];
  assert.equal(paths.length,13);assert.equal(new Set(paths.map(p=>attr(p,'data-impact-region'))).size,13);
  for(const path of paths){
   const code=attr(path,'data-impact-region'),fill=attr(path,'fill');
   assert.match(fill,/^#[0-9a-f]{6}$/);assert.equal(attr(path,'data-impact-colour'),fill);assert(attr(path,'style').includes('fill:'+fill));assert.equal(attr(path,'fill-rule'),'evenodd');
   assert(attr(path,'aria-label').startsWith(evidence.regions[code].name+': '));
   const swatch=html.match(new RegExp('data-impact-swatch="'+code+'"><i style="background-color:([^";]+)'));
   assert.equal(swatch?.[1],fill,code+' '+layer+' '+relationship);
   if(layer==='trade')assert.equal(window.RegionalTrade.paint(code,window.CanadaImpact.state,evidence.regions).fill,fill);
   else assert(html.includes('data-impact-legend="'+attr(path,'data-impact-category')+'"'));
  }
 }
 for(const code of Object.keys(evidence.regions)){
  change('region',code);const html=node('target').innerHTML,path=(html.match(/<path\b[^>]*class="impact-province[^>]*>/g)||[]).find(p=>attr(p,'data-impact-region')===code);
  assert.equal(attr(path,'aria-pressed'),'true');assert(attr(path,'class').includes('selected'));
  const selection=html.match(/<p class="impact-map-selection"><i[^>]*background-color:([^";]+)/);assert.equal(selection?.[1],attr(path,'fill'));
 }
 const css=read('app/impact.css');assert(css.includes('fill:var(--impact-region-fill'));assert(!/\.impact-province:hover\{[^}]*fill-opacity/.test(css));
});
