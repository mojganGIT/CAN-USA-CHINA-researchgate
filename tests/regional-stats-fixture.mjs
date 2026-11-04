import fs from 'node:fs';
const metadata=JSON.parse(fs.readFileSync(process.env.STATSCAN_FIXTURE_METADATA,'utf8'));
globalThis.fetch=async (url,options)=>{
 const requests=JSON.parse(options.body);
 if(url.endsWith('getCubeMetadata'))return Response.json([{status:'SUCCESS',object:metadata}]);
 const rows=requests.map(r=>{
  const [geo,,commodity,partner]=r.coordinate.split('.').map(Number);
  const base=10000+geo*1000+commodity*100,value=base*(partner===1?1:partner===2?.7:.1);
  return {status:'SUCCESS',object:{coordinate:r.coordinate,vectorId:geo*10000+commodity*100+partner,vectorDataPoint:Array.from({length:8},(_,i)=>({refPer:'2026-'+String(i+1).padStart(2,'0')+'-01',value,scalarFactorCode:3,statusCode:0,symbolCode:0,securityLevelCode:0,releaseTime:'2026-10-06T08:30'}))}};
 }).reverse();
 if(process.env.STATSCAN_FIXTURE_FAIL)rows[0].object.coordinate='99.99.99.99.0.0.0.0.0.0';
 return Response.json(rows);
};
