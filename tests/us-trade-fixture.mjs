// Synthetic observations for deterministic tests. Never used by the application.
export function tradeFixture(latestMonth=9){
 if(!Number.isInteger(latestMonth)||latestMonth<1||latestMonth>12)throw Error('Invalid fixture month');
 return {schemaVersion:1,status:'success',basis:'Synthetic test data, USD million',partners:['Canada','China'].map(id=>{
  const factor=id==='Canada'?2:1,monthly=[],totals=[];
  for(let year=2018;year<=2026;year++){
   const months=year===2026?latestMonth:12,base=1000+(year-2018)*100,rows=[];
   for(let month=1;month<=months;month++){
    const exports=factor*(base+month*10),imports=factor*(base+month*20);
    rows.push({period:year+'-'+String(month).padStart(2,'0'),exports,imports,balance:exports-imports});
   }
   monthly.push(...rows);totals.push({period:String(year),exports:rows.reduce((n,r)=>n+r.exports,0),imports:rows.reduce((n,r)=>n+r.imports,0),balance:rows.reduce((n,r)=>n+r.balance,0),months,completeYear:months===12});
  }
  return {id,url:'https://www.census.gov/foreign-trade/balance/'+(id==='Canada'?'c1220':'c5700')+'.html',status:'success',retrievedAt:'2026-11-04T12:00:00Z',dataThrough:'2026-'+String(latestMonth).padStart(2,'0'),monthly,totals};
 })};
}
