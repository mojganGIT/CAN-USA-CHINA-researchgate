// Source observation is independent of substantive review. A hash change cannot
// promote a policy stage, replace a numeric record, or advance reviewedAt.
export function assessmentReview(evidence,state,failures=[],previous){
 const sameVersion=previous?.dataVersion===evidence.version;
 const checks=Object.values(evidence.sources).map(source=>{
  const page=state.pages[source.url],old=sameVersion?previous.checks?.find(c=>c.sourceId===source.id):null;
  const changed=!!(old?.digest&&page?.digest&&old.digest!==page.digest);
  const failed=failures.some(f=>f.url===source.url);
  return {sourceId:source.id,lastChecked:page?.lastChecked||null,digest:page?.digest||null,status:failed?'failed':page?'read':'not_checked',reviewRequired:!!(old?.reviewRequired||changed),changedAt:changed?page.lastChanged:old?.changedAt||null,recordIds:evidence.records.filter(r=>r.sourceIds.includes(source.id)).map(r=>r.id)};
 });
 return {dataVersion:evidence.version,reviewedAt:evidence.asOf,checks};
}
