export const PARTNERS=[{id:'Canada',code:'1220',url:'https://www.census.gov/foreign-trade/balance/c1220.html'},{id:'China',code:'5700',url:'https://www.census.gov/foreign-trade/balance/c5700.html'}];
const months=['January','February','March','April','May','June','July','August','September','October','November','December'];
const text=s=>s.replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/&minus;|&#8722;|−/g,'-').replace(/\s+/g,' ').trim();
const number=s=>{const t=text(s).replaceAll(',','');if(!/^-?\d+(?:\.\d+)?$/.test(t))throw Error('A Census number was missing or not numeric.');return Number(t);};
export function parseCensus(html,{minYear=2018,maxYear=2026}={}){
 const monthly=[],totals=[],seen=new Set();
 for(const tr of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)){
  const cells=[...tr[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(m=>m[1]);if(cells.length!==4)continue;
  const label=text(cells[0]),m=label.match(/^(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})$/),t=label.match(/^TOTAL\s+(\d{4})$/i);
  if(!m&&!t)continue;const year=Number(m?m[2]:t[1]);if(year<minYear||year>maxYear)continue;
  const [exports,imports,balance]=cells.slice(1).map(number);if(exports<0||imports<0||Math.abs(exports-imports-balance)>.21)throw Error('Census exports, imports and balance do not reconcile within rounding.');
  const period=m?year+'-'+String(months.indexOf(m[1])+1).padStart(2,'0'):String(year),key=(m?'month:':'total:')+period;
  if(seen.has(key))throw Error('Duplicate Census period '+key);seen.add(key);
  (m?monthly:totals).push({period,exports,imports,balance});
 }
 monthly.sort((a,b)=>a.period.localeCompare(b.period));totals.sort((a,b)=>a.period.localeCompare(b.period));
 for(let year=minYear;year<maxYear;year++)if(monthly.filter(p=>p.period.startsWith(year+'-')).length!==12||!totals.some(p=>p.period===String(year)))throw Error('Incomplete historical Census year '+year);
 if(!monthly.some(p=>p.period.startsWith(maxYear+'-')))throw Error('No current-year Census monthly observations.');
 return {monthly,totals:totals.map(t=>({...t,months:monthly.filter(p=>p.period.startsWith(t.period+'-')).length,completeYear:monthly.filter(p=>p.period.startsWith(t.period+'-')).length===12})),dataThrough:monthly.at(-1).period};
}
