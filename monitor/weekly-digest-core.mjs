import {createHash} from 'node:crypto';
import PN from '../app/policy-narrative.js';
export const SITE='https://ambitious-field-09c66cd10.1.azurestaticapps.net';
const hash=x=>createHash('sha256').update(JSON.stringify(x??null)).digest('hex');
const xml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const day=s=>s.toISOString().slice(0,10);
const sourceURL=s=>{try{const u=new URL(s);return u.protocol==='https:'?u.href:null;}catch{return null;}};
export function buildWeeklyDigest({now=new Date(),previous={issues:[]},feed={},canada,us,goods,investment,regional,force=false}){
 const monday=new Date(now);monday.setUTCHours(0,0,0,0);monday.setUTCDate(monday.getUTCDate()-((monday.getUTCDay()+6)%7));
 const id='week-'+day(monday),old=previous.issues||[];
 if(old.some(i=>i.id===id)||old.length&&!force&&now.getUTCDay()!==1)return previous;
 const publishedAt=now.toISOString(),from=new Date(now-7*86400000).toISOString();
 const observations=(feed.changes||[]).filter(c=>Date.parse(c.detectedAt)>=Date.parse(from)&&Date.parse(c.detectedAt)<=now.getTime()).sort((a,b)=>b.detectedAt.localeCompare(a.detectedAt));
 const signatures=Object.fromEntries([...(canada?.records||[]).map(r=>['ca:'+r.id,hash(r)]),...(us?.records||[]).map(r=>['us:'+r.id,hash(r)])]);
 const prior=previous.recordSignatures||{};
 const changedRecords=old.length?[...(canada?.records||[]).map(r=>({r,d:canada,prefix:'ca:'})),...(us?.records||[]).map(r=>({r,d:us,prefix:'us:'}))].filter(x=>prior[x.prefix+x.r.id]!==signatures[x.prefix+x.r.id]):[];
 const baselineIds=['energy-exports-ytd','vehicles-exports-ytd','canola-oil-us-share','lng-jobs'];
 const reviewed=(old.length?changedRecords.slice(0,6):baselineIds.map(id=>({r:canada?.records.find(r=>r.id===id),d:canada}))).filter(x=>x.r).map(({r,d})=>({id:r.id,title:r.title,period:r.period,reviewedAt:r.reviewedAt,baseline:!old.length,story:PN.describe(r),sources:r.sourceIds.map(id=>({title:d.sources[id].title,url:d.sources[id].url}))}));
 const vintages={goods:hash(goods?.partners?.map(p=>({id:p.id,monthly:p.monthly,totals:p.totals}))),investment:hash(investment?.series),regional:hash(regional?.series)};
 const statisticalUpdates=[];
 for(const [key,label,data,url] of [['goods','U.S. goods trade',goods,'us-trade?view=overview'],['investment','U.S. investment',investment,'us-trade?view=overview'],['regional','Canadian provincial exports',regional,'canada-implications?layer=trade']]){
  if(!data||old.length&&previous.statisticalSignatures?.[key]===vintages[key])continue;
  const periods=key==='goods'?(data.partners||[]).map(p=>p.id+': '+(p.dataThrough||'unavailable')):key==='investment'?[...new Set((data.series||[]).map(r=>r.year))].sort().slice(-1):(data.series||[]).flatMap(s=>(s.points||[]).map(p=>p.period?.slice(0,7))).filter(Boolean).sort().slice(-1);
  statisticalUpdates.push({key,title:label,baseline:!old.length,periods:[...new Set(periods)],status:data.status||'see source vintage',url:SITE+'/#'+url,note:old.length?'Collected statistical values or coverage changed. Compare the source vintages before treating this as an economic change; revisions may affect earlier periods.':'Opening data baseline. A recent retrieval date is not a new economic observation or evidence of a policy effect.'});
 }
 const issue={id,publishedAt,windowStart:from,windowEnd:publishedAt,title:'Canada policy briefing · week of '+day(monday),lead:old.length?'Follow this week’s source developments, then ask whether implemented rules or measured Canadian outcomes changed.':'Start with Canada’s mixed commercial picture, then follow the evidence behind it. This opening issue establishes a baseline; it does not present old findings as new developments.',sourceStatus:feed.lastRunStatus||'unavailable',sourceLastSuccessfulRun:feed.lastSuccessfulRun||null,sourceFailures:feed.sourceFailures?.length||0,observationCount:observations.length,observations:observations.slice(0,8).map(c=>({id:c.id,title:c.title,url:sourceURL(c.url),detectedAt:c.detectedAt,publicationDate:c.publicationDate||null,kind:c.changeType==='source_revision'?'Source revision · substantive review pending':'Source first indexed · not necessarily a new policy',story:PN.describe({...c,unreviewed:true})})),reviewedChangeCount:changedRecords.length,reviewed,statisticalUpdates,watch:'For comparative analysis, match units, scope and reference periods. For policy analysis, check the operative instrument. For trend analysis, separate revisions and price changes from volumes and outcomes.'};
 return {schemaVersion:1,generatedAt:publishedAt,cadence:'Weekly, Monday after the daily monitor; GitHub scheduling may be delayed.',feedURL:SITE+'/weekly-updates.xml',recordSignatures:signatures,statisticalSignatures:vintages,issues:[issue,...old].slice(0,52)};
}
export function atomFeed(digest){
 const entries=(digest.issues||[]).map(i=>{
  const text=[i.lead,'Source monitoring: '+i.sourceStatus+'. '+i.sourceFailures+' source errors.',...i.observations.map(o=>o.kind+': '+o.title+'. What changed: '+o.story.changed+' Why Canada: '+o.story.why+' Provincial exposure: '+o.story.regions+' Source: '+(o.url||'unavailable')),...i.reviewed.map(r=>(r.baseline?'Reviewed baseline: ':'Reviewed evidence update: ')+r.title+' ('+r.period+'). '+r.story.changed+' Why Canada: '+r.story.why+' Provincial exposure: '+r.story.regions+' Sources: '+r.sources.map(s=>s.url).join(', ')),...i.statisticalUpdates.map(s=>s.title+': '+s.periods.join(', ')+'. '+s.note+' '+s.url),i.watch].join('\n\n');
  return `<entry><id>${SITE}/weekly/${xml(i.id)}</id><title>${xml(i.title)}</title><updated>${xml(i.publishedAt)}</updated><published>${xml(i.publishedAt)}</published><link href="${SITE}/#weekly-updates?issue=${xml(i.id)}"/><summary type="text">${xml(i.lead)}</summary><content type="text">${xml(text)}</content></entry>`;
 }).join('\n');
 return `<?xml version="1.0" encoding="utf-8"?>\n<feed xmlns="http://www.w3.org/2005/Atom"><id>${SITE}/weekly-updates.xml</id><title>Canada–U.S.–China weekly policy briefing</title><subtitle>Source-linked changes, Canadian implications and provincial exposure.</subtitle><updated>${xml(digest.generatedAt)}</updated><author><name>Canada–U.S.–China Policy Intelligence</name></author><link rel="self" href="${SITE}/weekly-updates.xml" type="application/atom+xml"/><link href="${SITE}/#weekly-updates"/>${entries}</feed>\n`;
}
