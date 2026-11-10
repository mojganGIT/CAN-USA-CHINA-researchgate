(function(g){
 'use strict';
 const bins={share:[5,15,30],value:[1e9,5e9,10e9]};
 const colours=['#eee2c4','#d7bb79','#ad8536','#6d4b16'];
 const missing={fill:'#dce1e4',text:'#334455',bin:'missing',value:null};
 function normalize(data,s={}){
  const counts=new Map();for(const r of data?.rows||[])if(r.year)counts.set(String(r.year),(counts.get(String(r.year))||0)+1);
  const years=[...counts.keys()].sort().reverse();
  const preferred=[...counts].sort((a,b)=>b[1]-a[1]||b[0].localeCompare(a[0]))[0]?.[0]||'2025';
  return {state:data?.rows.some(r=>r.code===s.state)?s.state:'MI',partner:s.partner==='China'?'China':'Canada',metric:s.metric==='value'?'value':'share',year:years.includes(String(s.year))?String(s.year):preferred};
 }
 function measure(row,s){
  if(!row||String(row.year)!==String(s.year))return null;
  const value=row.partners?.[s.partner]?.value;
  if(!Number.isFinite(value)||value<0)return null;
  if(s.metric==='value')return value;
  return Number.isFinite(row.totalExports)&&row.totalExports>0?value/row.totalExports*100:null;
 }
 function paint(row,s){
  const value=measure(row,s);if(value===null)return {...missing};
  const bin=bins[s.metric].filter(bound=>value>=bound).length;
  return {fill:colours[bin],text:bin>=2?'#ffffff':'#172b41',bin,value};
 }
 function validate(d){
  if(d?.schemaVersion!==1||d.rows?.length!==51||new Set(d.rows.map(r=>r.code)).size!==51)throw Error('Invalid state coverage');
  for(const r of d.rows){
   if(!/^[A-Z]{2}$/.test(r.code)||!r.name||new URL(r.sourceURL).hostname!=='ustr.gov')throw Error('Invalid state source');
   if(r.totalExports!==null&&(!Number.isFinite(r.totalExports)||r.totalExports<=0))throw Error('Invalid total');
   for(const partner of ['Canada','China']){
    const p=r.partners?.[partner];if(!p||p.value!==null&&(!Number.isFinite(p.value)||p.value<0||p.value>r.totalExports))throw Error('Invalid partner value');
    if(p.value!==null&&(!r.year||p.year!==r.year))throw Error('Mixed reference periods');
   }
  }
  return true;
 }
 const api={normalize,measure,paint,validate,colours,bins,missing};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(g)g.USStateModel=api;
})(typeof window==='undefined'?null:window);
