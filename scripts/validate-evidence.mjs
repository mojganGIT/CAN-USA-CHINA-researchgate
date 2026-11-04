import fs from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export function validateEvidence(d){
 assert.equal(d.schemaVersion,1);assert.match(d.asOf,/^\d{4}-\d{2}-\d{2}$/);assert.equal(Object.keys(d.regions).length,13);
 assert.equal(d.assessments.filter(t=>t.status==='assessed').length,7);assert.equal(d.assessments.find(t=>t.id==='technology').status,'pending');
 const ids=new Set(),topics=new Set(d.assessments.map(t=>t.id)),metrics=new Set([...d.metrics.map(t=>t.id),'resilience']);
 for(const r of d.records){
  assert(!ids.has(r.id),'Duplicate record '+r.id);ids.add(r.id);assert(r.title&&r.summary&&r.limitation&&r.geography,'Missing explanation '+r.id);
  assert(r.value===null||Number.isFinite(r.value),'Invalid numeric value '+r.id);assert(r.unit&&r.period&&r.periodStart,'Missing units or dates '+r.id);
  assert(r.periodStart<=d.asOf,'Future observation '+r.id);assert(metrics.has(r.metric),'Unknown metric '+r.id);assert(r.topics.every(t=>topics.has(t)));
  assert(r.regions.every(c=>d.regions[c]));assert(r.observationRegions.every(c=>d.regions[c]));assert(r.relationships.every(p=>d.relationships.includes(p)));assert(r.sourceIds.length);
  assert.equal(r.reviewStatus,'reviewed_snapshot');assert.equal(r.reviewedAt,d.asOf);
  for(const id of r.sourceIds){const s=d.sources[id];assert(s,'Missing source '+id);const u=new URL(s.url);assert.equal(u.protocol,'https:');assert(s.publisher&&s.publicationLabel&&s.reviewedAt);}
 }
 for(const r of Object.values(d.regions))assert(r.recordIds.every(id=>ids.has(id)));
 for(const t of d.assessments){if(t.status==='assessed'){assert.equal(t.criteria.length,5);assert.deepEqual(t.criteria.map(c=>c.metric),d.metrics.map(m=>m.id));}for(const c of t.criteria)assert(c.recordIds.every(id=>ids.has(id)));}
 for(const p of d.policies){assert(p.eventDate&&p.stage&&p.summary&&p.attribution);assert(p.recordIds.every(id=>ids.has(id)));assert(p.sourceIds.every(id=>d.sources[id]));if(p.stage==='in_force')assert(p.effectiveDate&&p.effectiveDate<=d.asOf);}
 return {records:ids.size,sources:Object.keys(d.sources).length,policies:d.policies.length};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const file=fs.readFileSync(path.join(root,'app/evidence-records.json'),'utf8'),d=JSON.parse(file),summary=validateEvidence(d);
 if(process.argv.includes('--sync'))fs.writeFileSync(path.join(root,'api/evidence-records.json'),file);
 else assert.equal(fs.readFileSync(path.join(root,'api/evidence-records.json'),'utf8'),file,'Browser and API evidence snapshots differ. Run npm run evidence:sync.');
 console.log(JSON.stringify({version:d.version,...summary}));
}
