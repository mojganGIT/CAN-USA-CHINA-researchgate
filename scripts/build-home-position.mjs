import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import Trade from '../app/regional-trade-model.js';

const sourceURL='https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1210017501';
function shares(partners,key){
 const world=partners.find(p=>p.partner==='All countries')?.[key];
 const us=partners.find(p=>p.partner==='United States')?.[key],china=partners.find(p=>p.partner==='China')?.[key];
 if(![world,us,china].every(Number.isFinite)||world<=0||us<0||china<0||us+china>world)return null;
 return [{id:'us',partner:'United States',value:us,share:us/world*100},{id:'china',partner:'China',value:china,share:china/world*100},{id:'other',partner:'Other markets',value:world-us-china,share:(world-us-china)/world*100}];
}
export function buildHomePosition(evidence,statistics){
 if(evidence?.schemaVersion!==1||Object.keys(evidence.regions||{}).length!==13)throw Error('The Home overview requires the shared 13-region evidence register.');
 const national=Trade.snapshot(statistics,{region:'CA',topic:'all'},evidence.regions);
 const valid=Number.isInteger(national.year)&&national.month>=1&&national.month<=12;
 const row=code=>{
  const s=Trade.snapshot(statistics,{region:code,topic:'all'},evidence.regions);
  const current=shares(s.partners,'current');
  return {shares:current,priorShares:shares(s.partners,'prior'),changes:Object.fromEntries(s.partners.filter(p=>p.partner!=='All countries').map(p=>[p.partner,p.change]))};
 };
 return {schemaVersion:1,evidenceVersion:evidence.version,reviewedAt:evidence.asOf,pendingTopics:evidence.assessments.filter(t=>t.status==='pending').map(t=>t.id),statistics:{sourceURL,table:'12-10-0175-01',retrievedAt:statistics.retrievedAt||null,lastAttempt:statistics.lastAttempt||null,status:statistics.status||'unavailable',period:valid?{year:national.year,month:national.month}:null,basis:'Domestic merchandise exports · customs basis · current CAD · unadjusted'},national:row('CA'),regions:Object.entries(evidence.regions).map(([code,r])=>({code,name:r.name,summary:r.summary,limitation:r.limitation,...row(code)}))};
}
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const read=name=>JSON.parse(fs.readFileSync(path.join(root,'app',name),'utf8'));
 const result=buildHomePosition(read('evidence-records.json'),read('regional-statistics.json'));
 fs.writeFileSync(path.join(root,'app/home-position.json'),JSON.stringify(result)+'\n');
 console.log(JSON.stringify({regions:result.regions.length,period:result.statistics.period,statisticsStatus:result.statistics.status,reviewedAt:result.reviewedAt}));
}
