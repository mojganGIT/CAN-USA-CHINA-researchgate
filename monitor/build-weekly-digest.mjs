import fs from 'node:fs/promises';
import {buildWeeklyDigest,atomFeed} from './weekly-digest-core.mjs';
const read=async name=>{try{return JSON.parse(await fs.readFile(new URL('../app/'+name,import.meta.url),'utf8'));}catch(e){if(e.code==='ENOENT')return undefined;throw e;}};
const [previous,feed,canada,us,goods,investment,regional]=await Promise.all(['weekly-updates.json','policy-updates.json','evidence-records.json','us-trade-evidence.json','us-trade-statistics.json','us-investment-statistics.json','regional-statistics.json'].map(read));
const digest=buildWeeklyDigest({previous,feed,canada,us,goods,investment,regional});
if(digest!==previous){await fs.writeFile(new URL('../app/weekly-updates.json',import.meta.url),JSON.stringify(digest,null,2)+'\n');await fs.writeFile(new URL('../app/weekly-updates.xml',import.meta.url),atomFeed(digest));console.log('Published weekly briefing '+digest.issues[0].id);}else console.log('Weekly briefing unchanged; next issue is due Monday.');
