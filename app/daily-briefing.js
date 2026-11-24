(function dailyBriefing(global) {
 'use strict';

 const common=typeof module!=='undefined'&&module.exports;
 const I=common?require('./daily-intelligence.js'):global.DailyIntelligence;
 const F=common?require('./stronger-canada-framework.js'):global.StrongerCanadaFramework;
 const RM=common?require('./regional-trade-model.js'):null;
 const N=common?require('./policy-narrative.js'):global.PolicyNarrative;
 const V=common?require('./source-media.js'):global.SourceMedia;
 const timeZone = 'America/Toronto';
 const visitKey = 'policy-dashboard-daily-visit';
 const calendar = new Intl.DateTimeFormat('en-CA', {
  timeZone, year: 'numeric', month: '2-digit', day: '2-digit'
 });
 const ranges = {today: 'Today', since: 'Since my last visit', week: 'Last seven days'};
 const sections = Object.freeze({summary:'Executive summary',developments:'Priority developments',sectors:'Sector updates',relationships:'Country and relationship updates',strategy:'Strategic outlook',watch:'What to watch next',implications:'Implications for Canadian policy'});
 const relationships = {'Canada-China': 'Canada–China', 'Canada-USA': 'Canada–U.S.', 'USA-China': 'U.S.–China'};
 const topics = {agreements:'Agreements and MOUs',vehicles:'Vehicles and batteries',agriculture:'Agriculture and seafood',energy:'Energy and minerals',finance:'Finance',technology:'Technology',security:'Security',investment:'Investment'};
 const stages = {all:'All evidence',MOU:'MOUs',contract:'Signed contracts and awards',policy:'Policy and tariffs',meeting:'Dialogues and readouts',statistics:'Measured data',recommendation:'Statements and frameworks'};
 const provinces = {
  AB: 'Alberta', BC: 'British Columbia', MB: 'Manitoba', NB: 'New Brunswick',
  NL: 'Newfoundland and Labrador', NS: 'Nova Scotia', NT: 'Northwest Territories',
  NU: 'Nunavut', ON: 'Ontario', PE: 'Prince Edward Island', QC: 'Quebec',
  SK: 'Saskatchewan', YT: 'Yukon'
 };
 const escape = value => String(value ?? '').replace(/[&<>"']/g, c =>
  ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));

 function timestamp(value) {
  return typeof value === 'number' ? value : value ? Date.parse(value) : NaN;
 }

 function dayKey(value) {
  const time = timestamp(value);
  if (!Number.isFinite(time)) return '';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parts = Object.fromEntries(calendar.formatToParts(time).map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
 }

 function previousDay(day, offset) {
  return new Date(timestamp(day) - offset * 86_400_000).toISOString().slice(0, 10);
 }

 function sourceURL(value) {
  try {
   const url = new URL(value);
   if (url.protocol !== 'https:' || url.username || url.password) return '';
   url.hash = '';
   return url.href;
  } catch {
   return '';
  }
 }

 function recordStatus(record, day) {
  if (record.kind === 'policy' && record.effectiveDate === day) return I.stage(record,day).label;
  if(record.status)return record.status;
  return ({
   extension: 'Extension announced',
   statistics: 'Data released',
   MOU: 'Signed MOU',
   meeting: 'Meeting documented',
   recommendation: 'Proposal or framework',
   analysis: 'Research published'
  })[record.kind] || 'Policy update';
 }

 function reviewedEvents(register) {
  return (register?.records || []).flatMap(record => {
   if (!record.reviewedAt || !record.sources?.some(s => sourceURL(s.url))) return [];
   if (record.dateType === 'reference_period_end') return [];
   const dates = new Set([dayKey(record.date)]);
   if (record.kind === 'policy') dates.add(dayKey(record.effectiveDate));
   if (record.reviewedAt > record.date && timestamp(record.reviewedAt)-timestamp(record.date) < 31*86400000) dates.add(dayKey(record.reviewedAt));
   return [...dates].filter(Boolean).map(day => ({
    key: `${record.id}@${day}`, day, status: recordStatus(record,day), entryType:day===record.reviewedAt&&day!==record.date&&day!==record.effectiveDate?'review':'event',record
   }));
  }).sort((a, b) => b.day.localeCompare(a.day) || a.key.localeCompare(b.key));
 }

 function priority(event, today) {
  const record = event.record;
  const canada = record.relationship !== 'USA-China';
  const effectiveSoon = record.kind === 'policy' && record.effectiveDate >= today &&
   timestamp(record.effectiveDate) - timestamp(today) <= 30 * 86_400_000;
  if (canada && (I.stage(record,today).id === 'in_force' || effectiveSoon)) return 0;
  if (canada && record.kind !== 'analysis' && record.kind !== 'statistics') return 1;
  if (canada && record.kind === 'statistics') return 2;
  if (event.status === 'Took effect') return 3;
  return record.kind === 'analysis' ? 5 : 4;
 }

 function groupedObservations(changes, selected) {
  const groups = new Map();
  for (const item of changes) {
   const url = sourceURL(item.url);
   if (!url || !dayKey(item.detectedAt)) continue;
   if (!groups.has(url)) groups.set(url, {url, observations: [], count: 0});
   const group = groups.get(url);
   group.observations.push(item);
   if (selected(item)) group.count += 1;
  }
  for (const group of groups.values()) {
   group.observations.sort((a, b) => timestamp(b.detectedAt) - timestamp(a.detectedAt));
   group.latest = group.observations[0];
  }
  return [...groups.values()].sort((a, b) => timestamp(b.latest.detectedAt) - timestamp(a.latest.detectedAt));
 }

 function nextDates(register, today) {
  const dates = [];
  for (const record of register?.records || []) {
   if (!record.reviewedAt || dayKey(record.date) > today) continue;
   const official = record.sources?.find(source => sourceURL(source.url));
   if (!official) continue;
   const add = (date, label, title, detail, source = official) => {
    if (dayKey(date) >= today && sourceURL(source?.url)) {
     dates.push({date, label, title, detail, source, record});
    }
   };
   if (record.kind === 'policy' && record.effectiveDate) {
    add(record.effectiveDate, 'Recorded effective date', record.title, record.followUp);
   }
   if (record.through) add(record.through, 'Announced end date', record.title, record.followUp);
   for (const deadline of record.announcedDeadlines || []) {
    add(deadline.date, 'Announced deadline', deadline.description, record.followUp);
   }
   for (const item of record.watchDates || []) {
    add(item.date, 'Scheduled data release', item.title, item.detail, item.source);
   }
  }
  return dates.sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
 }

 function automaticEvents(feed, register, today) {
  const known=new Map();
  for(const r of register?.records||[])for(const source of r.sources||[]){const url=sourceURL(source.url);if(url)known.set(url,[...(known.get(url)||[]),r]);}
  return (feed.briefings||[]).filter(r=>r.reviewState==='source_reported' && r.changeType!=='parser_refresh' && r.sources?.some(x=>sourceURL(x.url))).flatMap(record=>{
   const day=dayKey(record.detectedAt),published=dayKey(record.publicationDate);
   if(!day||day>today||!published||published>today)return [];
   const reviewed=(known.get(sourceURL(record.sources[0].url))||[]).some(r=>r.reviewedAt>=day);
   if(reviewed)return [];
   // First discovery of an old release belongs in provenance, not today's policy developments.
   if(record.changeType!=='source_revision' && timestamp(today)-timestamp(published)>31*86400000)return [];
   return [{key:`${record.id}@${record.versionId}`,day,status:record.changeType==='source_revision'?'Source text revised':record.changeType==='parser_refresh'?'Source re-indexed':record.status||'Official announcement',record}];
  });
 }

 function buildBriefing({feed = {}, register, range = 'today', previousVisit, filters = {}, now = Date.now(),history,tradeData,framework=F}) {
  const today = dayKey(now);
  const visitTime = timestamp(previousVisit?.at);
  const since = range === 'since' && visitTime < now;
  const firstVisit = range === 'since' && !since;
  const start = since ? dayKey(visitTime) : range === 'today' ? today : previousDay(today, 6);
  const seen = new Set(since && Array.isArray(previousVisit?.events) ? previousVisit.events : []);
  const selected={relationship:filters.relationship||'all',topic:filters.topic||'all',stage:filters.stage||'all',priority:Object.hasOwn(I.dimensions,filters.priority)?filters.priority:'all',region:Object.hasOwn(provinces,filters.region)?filters.region:'CA',chart:filters.chart==='share'?'share':'value',partner:['United States','China'].includes(filters.partner)?filters.partner:'all'};
  const matches=event=>{
   const r=event.record;
   return (selected.relationship==='all'||r.relationship===selected.relationship)&&
    (selected.topic==='all'||r.topics?.includes(selected.topic))&&
    (selected.stage==='all'||r.kind===selected.stage||(selected.stage==='policy'&&r.kind==='extension'))&&
    (selected.priority==='all'||I.priorities(r,framework).includes(selected.priority));
  };
  const allEvents=[...reviewedEvents(register),...automaticEvents(feed,register,today)].filter(event=>event.day<=today&&(!event.record.reviewedAt||dayKey(event.record.reviewedAt)<=today));
  const events=allEvents.filter(matches);
  const inWindow=events.filter(event => event.day >= start && !seen.has(event.key));
  const featured=inWindow.sort((a,b)=>b.day.localeCompare(a.day)).filter((e,i,a)=>a.findIndex(x=>x.record.id===e.record.id)===i)
   .sort((a,b)=>priority(a,today)-priority(b,today)||b.day.localeCompare(a.day));
  const latest=Object.keys(relationships).map(relationship=>({relationship,event:events.filter(e=>e.record.relationship===relationship)
   .sort((a,b)=>(b.record.date||b.record.publicationDate||'').localeCompare(a.record.date||a.record.publicationDate||'')||
    Number(!!a.record.reviewState)-Number(!!b.record.reviewState)||b.day.localeCompare(a.day))[0]}));
  const instruments=[...new Map(events.filter(e=>['MOU','contract','policy','extension','recommendation'].includes(e.record.kind))
   .sort((a,b)=>(b.record.date||'').localeCompare(a.record.date||''))
   .map(e=>[e.record.id,e])).values()];
  const matchingURLs=new Set(events.flatMap(e=>(e.record.sources||[]).map(s=>sourceURL(s.url))));
  const changes = (Array.isArray(feed.changes) ? feed.changes : []).filter(item => timestamp(item.detectedAt) <= now)
   .filter(item=>(selected.relationship==='all'||item.relationships?.includes(selected.relationship))&&(selected.topic==='all'||item.topics?.includes(selected.topic))&&(selected.stage==='all'||item.sourceReport?.kind===selected.stage||matchingURLs.has(sourceURL(item.url)))&&(selected.priority==='all'||matchingURLs.has(sourceURL(item.url))));
  const groups = groupedObservations(changes, item => {
   const detected = timestamp(item.detectedAt);
   return since ? detected > visitTime : dayKey(item.detectedAt) >= start;
  });
  const runTime = timestamp(feed.lastAttempt);
  const scanCount = groups.reduce((count, group) =>
   count + group.observations.filter(item => timestamp(item.detectedAt) === runTime).length, 0);
  const freshness=Number.isFinite(runTime)&&now-runTime<=36*3600000;
  return {
   today, range, start, firstVisit, previousVisit: since ? previousVisit.at : null,filters:selected,
   featured, latest, instruments, stale:!freshness,framework,
   comparison:I.compare(history,today,selected),trade:I.trade(tradeData,selected,RM||global?.RegionalTradeModel),
   sectorRows:Object.entries(topics).map(([topic,name])=>({topic,name,events:events.filter(e=>e.record.topics?.includes(topic)),fresh:featured.filter(e=>e.record.topics?.includes(topic))})),
   earlier: [...new Map(events.filter(event=>event.day<start).sort((a,b)=>b.day.localeCompare(a.day)).map(e=>[e.record.id,e])).values()].slice(0,8),
   groups, scanCount, next:nextDates({records:(register?.records||[]).filter(r=>matches({record:r}))},today)
  };
 }

 function formatDate(value, language) {
  const time = timestamp(value);
  if (!Number.isFinite(time)) return '';
  const dateOnly = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
  const locale = {fr: 'fr-CA', 'zh-Hans': 'zh-CN'}[language] || 'en-CA';
  const options = {dateStyle: 'medium', timeZone: dateOnly ? 'UTC' : timeZone};
  if (!dateOnly) options.timeStyle = 'short';
  const formatted = new Intl.DateTimeFormat(locale, options).format(time);
  const zone = {fr: 'HE', 'zh-Hans': '东部时间'}[language] || 'ET';
  return `<time datetime="${escape(value)}" data-no-translate>${escape(formatted + (dateOnly ? '' : ` ${zone}`))}</time>`;
 }

 function officialLink(url, label) {
  const href = sourceURL(url);
  if (!href) return '';
  return `<a href="${escape(href)}" target="_blank" rel="noopener noreferrer">${escape(label)} <span class="sr-only"> (new tab)</span></a>`;
 }

 function mapLink(record, label, region = 'CA') {
  const relationship = Object.hasOwn(relationships, record.relationship) ? record.relationship : 'all';
  const query = new URLSearchParams({
   region, topic: record.topics?.[0] || 'all', relationship,
   period: 'all', metric: 'all', layer: 'exposure'
  });
  const target = `canada-implications?${query}`;
  return `<a href="#${escape(target)}" data-hub="${escape(target)}">${escape(label)}</a>`;
 }

 function watchText(record) {
  if (record.followUp) return record.followUp;
  if (record.kind === 'statistics') return 'Compare matching reference periods and check revisions in the next release.';
  if (record.kind === 'policy' || record.kind === 'extension') {
   return 'Check the implementation guidance and the next Canadian trade or production figures for the affected products or sectors.';
  }
  if (record.kind === 'analysis') return 'Check how the next release changes the indicators discussed in the research.';
  return 'Watch for a published measure that specifies the effective date and coverage.';
 }

 function summaryParagraph(summary){
  const extracted=summary.method==='source_excerpt';
  return `<p class="daily-summary-text"${summary.automatic?' data-no-translate':''}>${extracted?'<q>':''}${escape(summary.text)}${summary.truncated?'…':''}${extracted?'</q>':''}</p>`;
 }

 function sourceSummaryHTML(record,feed,language,{relevance=true}={}){
  const s=I.summary(record,feed);
  return `<div class="daily-source-summary"><p class="daily-meta"><strong>${escape(s.label)}</strong>${s.automatic?' · Analyst review pending':''}${s.method==='source_excerpt'?' · Automatically selected source passage':''}</p>${N.memo({changed:s.text,why:relevance?record.canada:'',next:relevance?watchText(record):'',whyLabel:'Canadian relevance',sourceExcerpt:s.method==='source_excerpt',truncated:s.truncated,automatic:s.automatic})}</div>`;
 }

 function recordMemo(record,feed={}){
  const s=I.summary(record,feed);
  return N.memo({changed:s.text,why:record.canada,next:watchText(record),automatic:s.automatic,sourceExcerpt:s.method==='source_excerpt',truncated:s.truncated});
 }

 function reviewedCard(event, language,feed={},framework=F) {
  const {record, day, key, status} = event;
  const proof=I.evidence(record,feed,dayKey(Date.now())),priorityIds=I.priorities(record,framework);
  const regions = (record.regions || []).filter(code => Object.hasOwn(provinces, code));
  const sources = record.sources.filter(source => sourceURL(source.url));
  return `<article class="daily-story" data-evidence="${record.reviewState?'source-reported':'reviewed'}">
   <p class="daily-meta"><span class="daily-tag">${escape(status)}</span> ${event.entryType==='review'?'<span>Evidence added to briefing</span>':record.reviewState?'<span>Detected</span>':''} ${formatDate(day, language)}
    <span>${escape(relationships[record.relationship] || record.relationship)}</span></p>
   <h4>${escape(record.title)}</h4>
   <p class="daily-memo-status"><span class="daily-tag" data-stage="${escape(proof.stage.id)}">${escape(proof.stage.label)}</span><span>Evidence confidence: ${escape(proof.observationConfidence)}</span></p>
   <p class="daily-meta">${record.reviewState?'Official source · analyst review pending':record.kind==='analysis'?'Reviewed research source':'Reviewed primary source'} · ${escape(proof.attribution)}</p>
   ${proof.changed?`<p class="daily-stale">${escape(proof.confidenceReason)}</p>`:''}
   ${recordMemo(record,feed)}${V?.recordHTML(record,{},feed,{keyPrefix:'daily-'+key})||''}
   <p class="daily-actions">${officialLink(sources[0].url, 'Open original source')}
    ${mapLink(record, 'Explore on the Canada map')}</p>
   <details class="daily-detail" data-daily-detail="${escape(`evidence-${key}`)}">
    <summary>Sources, dates and evidence limits</summary>
    <div class="daily-proof-grid"><div><span>Implementation status</span><strong>${escape(proof.stage.label)}</strong></div><div><span>Evidence confidence</span><strong>${escape(proof.observationConfidence)}</strong><span>${escape(proof.confidence)}</span></div><div><span>Last source check</span>${formatDate(proof.checkedAt,language)||'<strong>Not recorded</strong>'}<span>${escape(proof.freshness)}</span></div><div><span>Analyst reviewed</span>${formatDate(proof.reviewedAt,language)||'<strong>Analyst review pending</strong>'}</div></div>
    ${priorityIds.length?`<p class="daily-priority-tags">${priorityIds.map(id=>`<span class="daily-tag">${escape(I.dimensions[id])}</span>`).join('')}</p>`:'<p class="daily-meta">Policy-priority classification awaits analyst review.</p>'}
    ${record.quote&&record.quote!==record.changed?`<blockquote data-no-translate>${escape(record.quote)}</blockquote>`:''}
    ${record.limit ? `<p class="daily-evidence-limit">${escape(record.limit)}</p>` : ''}<p><strong>Confidence basis</strong>: ${escape(proof.confidenceReason)}</p>
    <p class="daily-meta">Canadian outcome attribution requires shipment, investment or employment evidence and a comparison that addresses other causes.</p>
    <dl class="daily-questions">
     <dt>Record date</dt><dd>${formatDate(record.date, language)}</dd>
     ${record.effectiveDate ? `<dt>Recorded effective date</dt><dd>${formatDate(record.effectiveDate, language)}</dd>` : ''}
     ${record.through ? `<dt>Announced end date</dt><dd>${formatDate(record.through, language)}</dd>` : ''}
     ${record.reviewedAt?`<dt>Reviewed</dt><dd>${formatDate(record.reviewedAt,language)}</dd>`:`<dt>Detected</dt><dd>${formatDate(record.detectedAt,language)}</dd><dt>Review status</dt><dd>Analyst review pending</dd>`}
     ${record.modifiedDate?`<dt>Source modified</dt><dd>${formatDate(record.modifiedDate,language)}</dd>`:''}
     ${record.eventDate?`<dt>Meeting date</dt><dd>${formatDate(record.eventDate,language)}</dd>`:''}
     ${record.referencePeriod || record.period ? `<dt>Reference period</dt><dd>${escape(record.referencePeriod || record.period)}</dd>` : ''}
    </dl>
    ${regions.length ? `<p class="daily-meta">Regional exposure</p><ul class="daily-region-links">${regions.map(code =>
     `<li>${mapLink(record, provinces[code], code)}</li>`).join('')}</ul>` : ''}
    <ul>${sources.map(source => `<li>${officialLink(source.url, source.publisher)}
     ${source.publicationDate ? `<span class="daily-meta">Source publication</span> ${formatDate(source.publicationDate, language)}` : ''}${source.modifiedDate?` <span class="daily-meta">Source modified</span> ${formatDate(source.modifiedDate,language)}`:''}${source.documentType?` <span class="daily-tag">${escape(source.documentType)}</span>`:''}${source.identifier?` <span translate="no">${escape(source.identifier)}</span>`:''}</li>`).join('')}</ul>
   </details>
  </article>`;
 }

 function groupCard(group, language) {
  const x = group.latest;
  return `<details class="daily-detail daily-source" data-daily-detail="${escape(`source-${group.url}`)}">
   <summary>${escape(x.title || new URL(group.url).hostname)} <span class="daily-meta" translate="no">(${group.observations.length})</span> ${formatDate(x.detectedAt, language)}</summary>
   <p class="daily-meta" translate="no">${escape(new URL(group.url).hostname)}</p>
   <p>${officialLink(group.url, 'Open monitored source')}</p>
   <ol class="daily-revision-list">${group.observations.map(item => `<li>
    <p class="daily-meta"><span>${item.changeType === 'source_revision' ? '' : item.changeType==='parser_refresh'?'Source re-indexed':'Source first indexed'}</span>
     <span>Detected</span> ${formatDate(item.detectedAt, language)}
     ${item.publicationDate ? `<span>Source publication</span> ${formatDate(item.publicationDate, language)}` : ''}</p>
    ${!item.ai&&item.sourceReport?`<p><strong>Official source · analyst review pending</strong></p><p>${escape(item.sourceReport.status)}</p><blockquote data-no-translate>${escape(item.sourceReport.quote)}</blockquote>`:''}
    ${item.ai ? `<p><strong>Automated extraction · unreviewed</strong></p><p>${escape(item.ai.summary)}</p>
     ${item.ai.quote ? `<blockquote>${escape(item.ai.quote)}</blockquote>` : ''}${item.ai.uncertainty ? `<p>${escape(item.ai.uncertainty)}</p>` : ''}` : ''}
    <details data-daily-detail="${escape(`version-${item.id}`)}"><summary>Version and provenance</summary>
     <dl class="daily-questions"><dt>Record</dt><dd><code translate="no">${escape(item.id)}</code></dd>
      <dt>Content hash</dt><dd><code translate="no">${escape(item.digest)}</code></dd>
      <dt>Previous hash</dt><dd><code translate="no">${escape(item.previousDigest || '')}</code></dd></dl>
    </details>
   </li>`).join('')}</ol>
  </details>`;
 }

 function monitorSummary(model, feed, language) {
  const status = ({
   success: 'Scan completed',
   partial: 'Partial coverage',
   failed: 'Latest scan failed',
   not_run: 'First scan pending',
   unavailable: 'Update feed unavailable',
   loading: 'Loading scan status'
  })[feed.lastRunStatus] || 'Scan status unavailable';
  const checked = !model.stale && (feed.lastRunStatus === 'success' || feed.lastRunStatus === 'partial');
  const summary = checked
   ? (model.scanCount ? `<span>New observations</span> <strong>${model.scanCount}</strong>` : 'No new observations recorded')
   : '';
  return `<div class="daily-scan">
   ${model.stale?'<p class="daily-stale" role="status">Monitoring is overdue or has not run. Coverage must be checked before using this briefing.</p>':''}
   <p class="daily-scan-line" role="status">
    <span>Latest scan</span> ${formatDate(feed.lastAttempt, language)}
    <strong class="daily-tag" data-status="${escape(feed.lastRunStatus)}">${escape(status)}</strong>
    ${summary ? `<span class="daily-scan-result">${summary}</span>` : ''}
   </p>
   <p class="daily-meta daily-cadence">Scheduled daily at 11:17 UTC. Publication follows source checks; source failures remain visible.</p>
   ${countryCoverage(feed,language)}
   <details class="daily-detail" data-daily-detail="coverage"><summary>Source coverage and scan details</summary>
    <dl class="daily-questions">
     <dt>Last successful scan</dt><dd>${formatDate(feed.lastSuccessfulRun, language) || 'Pending'}</dd>
     <dt>Source pages read</dt><dd>${Number(feed.sourcesChecked) || 0}</dd>
     <dt>Source errors</dt><dd>${feed.sourceFailures?.length || 0}</dd>
    </dl>
    ${(feed.sourceFailures || []).length ? `<ul class="daily-errors">${feed.sourceFailures.map(item =>
     `<li>${officialLink(item.url, item.url)} <span>${escape(item.error)}</span></li>`).join('')}</ul>` : ''}
    <p>${officialLink(feed.workflowURL, 'Open monitoring run')}</p>
   </details>
  </div>`;
 }

 function countryCoverage(feed,language){
  return `<div class="daily-country-coverage" aria-label="Issuing-country coverage">${['Canada','United States','China'].map(country=>{
   const c=feed.coverage?.[country],status=c?.status||'pending';
   return `<div><strong>${escape(country)}</strong><span class="daily-tag" data-status="${escape(status)}">${escape({success:'Discovery checked',partial:'Partial coverage',failed:'Discovery failed',pending:'Coverage not yet recorded'}[status])}</span>
    <p class="daily-meta"><span>Last successful discovery</span> ${formatDate(c?.lastSuccessfulDiscovery,language)||'Pending'}</p></div>`;
  }).join('')}</div>`;
 }
 function comparisonPanel(model,language,feed){
  return `<section class="daily-relationship-section" aria-labelledby="daily-relationships-title"><h3 id="daily-relationships-title">Country and relationship updates</h3>
   <p class="daily-meta">Latest dated records remain visible on quiet days. Dates below are source or event dates, not today’s news.</p>
   <div class="daily-relationships">${model.latest.map(({relationship,event})=>`<article class="daily-relationship">
    <h4><img class="daily-flag" src="flags/${relationship==='USA-China'?'us':'ca'}.svg" alt=""><span aria-hidden="true"> / </span><img class="daily-flag" src="flags/${relationship==='Canada-USA'?'us':'cn'}.svg" alt=""> ${escape(relationships[relationship])}</h4>${event?`<p class="daily-meta">${formatDate(event.record.date,language)} <span class="daily-tag">${escape(event.record.status||recordStatus(event.record,event.record.date))}</span></p>
     <h4>${escape(event.record.title)}</h4>${sourceSummaryHTML(event.record,feed,language)}
     <p class="daily-meta">${event.record.reviewState?'Official source · analyst review pending':event.record.kind==='analysis'?'Reviewed research source':'Reviewed primary source'}</p>
     <details class="daily-detail" data-daily-detail="latest-${relationship}"><summary>Evidence and next action</summary>${reviewedCard(event,language,feed,model.framework)}</details>`:'<p>No matching dated evidence is recorded.</p>'}</article>`).join('')}</div>
  </section>`;
 }
 function filterPanel(model){
  const select=(id,label,options)=>`<label>${label}<select data-daily-filter="${id}">${Object.entries(options).map(([value,name])=>`<option value="${value}"${model.filters[id]===value?' selected':''}>${escape(name)}</option>`).join('')}</select></label>`;
  return `<div class="daily-filters" role="group" aria-label="Policy monitoring filters">${select('relationship','Relationship',{all:'All relationships',...relationships})}${select('topic','Sector or subject',{all:'All sectors and subjects',...topics})}${select('stage','Evidence type',stages)}${select('priority','Policy priority',{all:'All priorities',...I.dimensions})}<button type="button" data-daily-reset>Reset filters</button></div>`;
 }
 function instrumentPanel(model,language){
  return `<section class="daily-instruments" aria-labelledby="daily-instruments-title"><h3 id="daily-instruments-title">Agreements and implementation watch</h3>
   <p class="daily-meta">A signed MOU, a proposed measure and an implemented tariff have different evidence requirements.</p>
   <div class="daily-table-scroll" tabindex="0" role="region" aria-label="Agreement and implementation records"><table><thead><tr><th scope="col">Instrument / relationship</th><th scope="col">Evidence stage</th><th scope="col">Next analyst action</th></tr></thead><tbody>${model.instruments.map(({record:r})=>`<tr><td>${officialLink(r.sources[0].url,r.title)}<p class="daily-meta">${escape(relationships[r.relationship]||r.relationship)} · ${formatDate(r.date,language)}</p></td><td><span class="daily-tag">${escape(I.stage(r,model.today).label)}</span><p class="daily-meta">${r.reviewState?'Analyst review pending':'Reviewed primary source'}</p>${r.effectiveDate?`<p class="daily-meta"><span>Recorded effective date</span> ${formatDate(r.effectiveDate,language)}</p>`:''}</td><td>${escape(watchText(r))}</td></tr>`).join('')||'<tr><td colspan="3">No matching instrument is recorded.</td></tr>'}</tbody></table></div>
  </section>`;
 }

 function watchPanel(model, language) {
  const card = item => `<li class="daily-watch-item"><p class="daily-meta"><span>${escape(item.label)}</span>
   ${formatDate(item.date, language)}</p><h4>${escape(item.title)}</h4>
   ${item.detail ? `<p>${escape(item.detail)}</p>` : ''}<p>${officialLink(item.source.url, item.source.publisher)}</p></li>`;
  return `<aside class="daily-watch" aria-labelledby="daily-watch-title">
   <h3 id="daily-watch-title">What to watch next</h3>
   ${model.next.length ? `<ul>${model.next.slice(0, 1).map(card).join('')}</ul>` :
    '<p>No upcoming dates are recorded in the reviewed sources.</p>'}
   ${model.next.length > 1 ? `<details class="daily-detail" data-daily-detail="later-dates">
    <summary>Later dates</summary><ul>${model.next.slice(1, 5).map(card).join('')}</ul></details>` : ''}
  </aside>`;
 }

 function deltaPanel(model,language,feed){
  const c=model.comparison;
  return `<section class="daily-delta" aria-labelledby="daily-delta-title"><h3 id="daily-delta-title">What changed since yesterday?</h3>
   ${c.ready?`<p class="daily-meta">${formatDate(c.previous.generatedAt,language)} <span>compared with</span> ${formatDate(c.current.generatedAt,language)} · Toronto calendar editions</p>
    <div class="daily-metrics">${[['Newly added evidence',c.newRecords.length],['Reviewed records amended',c.updatedRecords.length],['Monitored source revisions',c.sourceRevisions.length],['Newly indexed sources',c.newSources.length]].map(([name,value])=>`<div><strong translate="no">${value}</strong><span>${name}</span></div>`).join('')}</div>
    ${changeSummaries(model,feed,language)}
    <details class="daily-detail" data-daily-detail="yesterday-comparison"><summary>Inspect the comparison evidence</summary><p class="daily-meta">Newly indexed sources are discoveries, not proof that a policy changed yesterday. A source revision requires review before an instrument or outcome is changed.</p>
     ${c.newRecords.length?`<h4>Newly added evidence</h4><ul>${c.newRecords.map(r=>`<li>${officialLink(r.sourceURLs[0],r.title)} · ${formatDate(r.date,language)}</li>`).join('')}</ul>`:''}
     ${c.updatedRecords.length?`<h4>Reviewed records amended</h4>${c.updatedRecords.map(({before,after})=>`<article class="daily-diff"><h4>${escape(after.title)}</h4><dl class="daily-questions"><dt>Yesterday</dt><dd>${escape(before.changed)} <span class="daily-tag">${escape(before.stage)}</span></dd><dt>Current edition</dt><dd>${escape(after.changed)} <span class="daily-tag">${escape(after.stage)}</span></dd></dl>${officialLink(after.sourceURLs[0],'Open original source')}</article>`).join('')}`:''}
     ${c.sourceRevisions.length?`<h4>Monitored source revisions</h4><ul>${c.sourceRevisions.map(r=>`<li>${officialLink(r.url,new URL(r.url).hostname)} · ${formatDate(r.checkedAt,language)}<details><summary>Content hashes</summary><p class="daily-hash" translate="no">${escape(r.beforeDigest)} / ${escape(r.digest)}</p></details></li>`).join('')}</ul>`:''}
     ${c.newSources.length?`<h4>Newly indexed sources</h4><ul>${c.newSources.map(r=>`<li>${officialLink(r.url,new URL(r.url).hostname)} · ${formatDate(r.checkedAt,language)}</li>`).join('')}</ul>`:''}
     ${!c.newRecords.length&&!c.updatedRecords.length&&!c.sourceRevisions.length?'<p>No differences in matched reviewed records or previously checked source hashes. Check coverage before concluding that no external policy changed.</p>':''}
    </details>`:`<p class="daily-stale"><strong>Comparison baseline pending</strong> · ${escape(c.reason)}. The first saved edition establishes a baseline; an exact comparison requires a saved edition for the preceding Toronto calendar day.</p>${changeSummaries(model,feed,language)}`}
  </section>`;
 }

 function changeSummaries(model,feed,language){
  const c=model.comparison;
  if(c.ready){
   const same=(a,b)=>String(a?.text||'').replace(/\s+/g,' ').replace(/[.…]+$/,'').trim()===String(b?.text||'').replace(/\s+/g,' ').replace(/[.…]+$/,'').trim();
   const cards=[],seen=new Set();
   const add=(url,html)=>{const key=sourceURL(url);if(!key||seen.has(key))return;seen.add(key);cards.push(html);};
   for(const r of c.newRecords)add(r.sourceURLs[0],`<article class="daily-change-summary"><h4>${officialLink(r.sourceURLs[0],r.title)}</h4>${sourceSummaryHTML(r,feed,language,{relevance:false})}</article>`);
   for(const {after:r} of c.updatedRecords)add(r.sourceURLs[0],`<article class="daily-change-summary"><h4>${officialLink(r.sourceURLs[0],r.title)}</h4>${sourceSummaryHTML(r,feed,language,{relevance:false})}</article>`);
   for(const r of c.sourceRevisions){if(!r.after?.summary||same(r.before?.summary,r.after.summary))continue;add(r.url,`<article class="daily-change-summary"><h4>${officialLink(r.url,r.after.title||new URL(r.url).hostname)}</h4>${summaryParagraph(r.after.summary)}</article>`);}
   for(const r of c.newSources){if(!r.after?.summary)continue;add(r.url,`<article class="daily-change-summary"><h4>${officialLink(r.url,r.after.title)}</h4>${summaryParagraph(r.after.summary)}</article>`);}
   return `<div class="daily-change-brief"><h4>Summary of recorded changes</h4>${cards.slice(0,3).join('')||'<p>No new or substantively different source summary is recorded in these editions.</p>'}${cards.length>3?`<details class="daily-detail" data-daily-detail="more-change-summaries"><summary>More change summaries</summary>${cards.slice(3).join('')}</details>`:''}</div>`;
  }
  const items=[...new Map([...model.featured,...model.latest.map(x=>x.event).filter(Boolean)].map(e=>[sourceURL(e.record.sources[0].url),e])).values()].slice(0,3);
  return `<div class="daily-change-brief"><h4>Latest source summaries</h4><p class="daily-meta">These summaries describe the current evidence. A comparison with yesterday is not available yet.</p>${items.map(e=>`<article class="daily-change-summary"><p class="daily-meta">${escape(e.entryType==='review'?'Evidence added to briefing':e.record.reviewState?'Source report · review pending':'Retained context')} · ${formatDate(e.record.date,language)}</p><h4>${officialLink(e.record.sources[0].url,e.record.title)}</h4>${sourceSummaryHTML(e.record,feed,language,{relevance:false})}</article>`).join('')||'<p>No matching source summary is recorded.</p>'}</div>`;
 }

 function executivePanel(model,feed,language){
  const normalized=value=>String(value||'').replace(/\s+/g,' ').replace(/[.…]+$/,'').trim();
  const unchanged=new Set((model.comparison?.sourceRevisions||[]).filter(r=>!r.after?.summary||normalized(r.before?.summary?.text)===normalized(r.after.summary.text)).map(r=>sourceURL(r.url)));
  const active=model.featured.filter(e=>!e.record.reviewState||e.record.changeType!=='source_revision'||!unchanged.has(sourceURL(e.record.sources[0].url)));
  const activeIds=new Set(active.map(e=>e.record.id));
  const pool=[...new Map([...active,...model.latest.map(x=>x.event).filter(Boolean)].map(e=>[sourceURL(e.record.sources[0].url),e])).values()].sort((a,b)=>b.record.date.localeCompare(a.record.date));
  const items=[],relationshipsSeen=new Set();
  for(const e of pool){if(items.length===3)break;if(relationshipsSeen.has(e.record.relationship))continue;relationshipsSeen.add(e.record.relationship);items.push(e);}
  for(const e of pool){if(items.length===3)break;if(!items.includes(e))items.push(e);}
  const lead=items[0],relevance=r=>r.reviewState&&/[?]$/.test(r.canada||'')?N.describe(r).why:r.canada;


  return `<div class="daily-takeaway"><p class="daily-eyebrow">Executive takeaway</p><p>${lead?`<strong>${escape(lead.record.title)}</strong><br>${escape(relevance(lead.record))}`:'No new matching evidence is recorded for this period. The dated developments below provide the context for Canada’s next policy decisions.'}</p>${lead?`<p class="daily-meta">${formatDate(lead.record.date,language)} · ${escape(activeIds.has(lead.record.id)?'In this briefing window':'Retained policy context')}</p>`:''}</div>
   <section class="daily-section" id="daily-summary" aria-labelledby="daily-summary-title"><h3 id="daily-summary-title">Executive summary</h3>
    ${items.length?`<div class="daily-executive-narrative">${items.map((e,i)=>{const r=e.record,summary=I.summary(r,feed),extracted=summary.method==='source_excerpt';return `<article class="daily-executive-story"><p class="daily-executive-context">${escape(!activeIds.has(r.id)?'Retained policy context':i===0?'The lead development':i===1?'Alongside this':'The wider context')} · ${escape(relationships[r.relationship]||r.relationship)} · ${formatDate(r.date,language)}</p><p class="daily-executive-prose"><span${summary.automatic?' data-no-translate':''}>${extracted?'<q>':''}${escape(summary.text)}${summary.truncated?'…':''}${extracted?'</q>':''}</span></p><p class="daily-executive-prose daily-summary-relevance" aria-label="Canadian relevance">${escape(relevance(r))}</p><p class="daily-meta">${escape(summary.label)}${summary.automatic&&!/review pending/i.test(I.stage(r,model.today).label)?' · Analyst review pending':''} · ${escape(I.stage(r,model.today).label)} · ${officialLink(r.sources[0].url,r.title)}</p><details class="daily-detail" data-daily-detail="executive-${escape(r.id)}"><summary>Next analyst action and evidence details</summary><p>${escape(watchText(r))}</p>${r.limit?`<p>${escape(r.limit)}</p>`:''}<p>${escape(I.evidence(r,feed,model.today).attribution)}</p>${V?.recordHTML(r,{},feed,{keyPrefix:'executive-'+r.id})||''}</details></article>`;}).join('')}</div>`:'<p>No new matching evidence in this window.</p>'}
    ${deltaPanel(model,language,feed)}
   </section>`;
 }

 function sectorPanel(model,language,feed={}){
  return `<section class="daily-section" id="daily-sectors" aria-labelledby="daily-sectors-title"><h3 id="daily-sectors-title">Sector updates</h3><p class="daily-meta">All eight categories use the same evidence register. A report may concern several sectors; record counts are not additive economic effects.</p>
   <div class="daily-sector-grid">${model.sectorRows.map(row=>{const latest=[...row.events].sort((a,b)=>b.record.date.localeCompare(a.record.date))[0];return `<article class="daily-sector"><h4>${escape(model.framework?.sectors[row.topic]?.name||row.name)}</h4><p class="daily-tag">${row.fresh.length?'Evidence in selected window':'Retained context'}</p>${latest?`<p>${officialLink(latest.record.sources[0].url,latest.record.title)}</p><p class="daily-meta">${formatDate(latest.record.date,language)} · ${escape(I.stage(latest.record,model.today).label)}</p>${model.framework?.sectors[row.topic]?.overall?`<p class="daily-sector-story">${escape(model.framework.sectors[row.topic].overall)}</p><p class="daily-meta">National sector context · Reviewed: ${formatDate(model.framework.reviewedAt,language)}</p>`:''}<details class="daily-detail" data-daily-detail="sector-memo-${row.topic}"><summary>Read the latest record memo</summary>${recordMemo(latest.record)}<p>${officialLink(latest.record.sources[0].url,'Open original source')}</p></details>`:'<p>No matching dated evidence is recorded.</p>'}<button type="button" class="daily-text-button" data-daily-topic="${row.topic}">Focus this sector</button></article>`;}).join('')}</div>
   ${tradePanel(model,language)}${V?.collection(model.filters,feed,{keyPrefix:'daily-library'})||''}
  </section>`;
 }

 function tradePanel(model,language){
  const s=model.trade,selected=model.filters;
  const select=(id,label,options)=>`<label>${label}<select data-daily-filter="${id}">${Object.entries(options).map(([value,name])=>`<option value="${value}"${selected[id]===value?' selected':''}>${escape(name)}</option>`).join('')}</select></label>`;
  const locale={fr:'fr-CA','zh-Hans':'zh-CN'}[language]||'en-CA';
  const money=n=>n===null?'Not available':new Intl.NumberFormat(locale,{style:'currency',currency:'CAD',maximumFractionDigits:0}).format(n);
  const number=n=>n===null?'Not available':new Intl.NumberFormat(locale,{maximumFractionDigits:1}).format(n);
  const percent=n=>n===null?'Not available':number(n)+'%';
  const month=p=>new Intl.DateTimeFormat(locale,{month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(p+'-01'));
  const indices=selected.partner==='United States'?[0]:selected.partner==='China'?[1]:[0,1];
  const name=i=>i===0?'USA':'China';
  let chart='',cards='';
  if(s.available){
   cards=`<div class="daily-trade-countries">${indices.map(i=>{const p=s.partners[i],latest=s.points.at(-1);return `<article class="daily-trade-country" data-daily-trade-country="${escape(p.partner)}"><h5><img class="daily-flag" src="flags/${i?'cn':'us'}.svg" alt=""> ${name(i)}</h5><p class="daily-meta">Canadian domestic exports to ${escape(p.partner)}</p>${N.memo(N.tradeMemo(s,p,{locale,translate:v=>global?.DashboardI18n?.t(v)||v}))}<details class="daily-detail" data-daily-detail="trade-metrics-${escape(p.partner)}"><summary>Figures behind this memo</summary><dl><div><dt>Latest month</dt><dd>${money(latest.values[i])}<span class="daily-meta">${escape(month(latest.period))}</span></dd></div><div><dt>Year-to-date exports</dt><dd>${money(p.current)}<span class="daily-meta">January–${escape(month(s.year+'-'+String(s.month).padStart(2,'0')))}</span></dd></div><div><dt>Change from prior year</dt><dd>${p.change===null?'Not available':(p.change>0?'+':'')+percent(p.change)}<span class="daily-meta">Same complete months</span></dd></div><div><dt>Share of all destinations</dt><dd>${percent(p.share)}<span class="daily-meta">Year-to-date</span></dd></div></dl></details></article>`;}).join('')}</div>`;
   if(selected.chart==='share'){
    const world=s.partners[2].current,us=s.partners[0].current,china=s.partners[1].current;
    chart=`<div class="daily-share-bars" role="img" aria-label="Export destination shares from the same complete year-to-date period">${indices.map(i=>{const p=s.partners[i];return `<div><p><strong>${name(i)}</strong><span>${percent(p.share)}</span></p><div class="daily-share-track"><span style="width:${p.share!==null&&p.share>=0&&p.share<=100?p.share:0}%" class="${i?'daily-china':'daily-us'}"></span></div></div>`;}).join('')}</div><p class="daily-meta">${world!==null&&us!==null&&china!==null&&world>0&&world>=us+china?`Other destinations: ${number((world-us-china)/world*100)}% · `:''}Shares use all-destination domestic exports as the denominator.</p>`;
   }else{
    const values=s.points.flatMap(p=>indices.map(i=>p.values[i])).filter(n=>n!==null),max=Math.max(...values,1),scale=max>=1e9?1e9:max>=1e6?1e6:max>=1e3?1e3:1,unit=scale===1e9?'CAD billion':scale===1e6?'CAD million':scale===1e3?'CAD thousand':'CAD',x=i=>58+i*62,y=n=>242-n/max*194;
    const line=index=>{let d='',started=false;for(let i=0;i<s.points.length;i++){const n=s.points[i].values[index];if(n===null){started=false;continue;}d+=(started?' L':' M')+x(i)+' '+y(n);started=true;}return d;};
    chart=`<div class="daily-chart-scroll" tabindex="0" role="region" aria-label="Monthly export chart; exact values follow in the data table"><svg class="daily-line-chart" viewBox="0 0 780 292" role="img" aria-labelledby="daily-chart-title daily-chart-desc"><title id="daily-chart-title">Monthly Canadian domestic exports · ${indices.map(name).join(' / ')}</title><desc id="daily-chart-desc">${escape(s.region)} · ${escape(s.commodity)} · current CAD. Missing values create gaps; exact values are in the expandable table.</desc>${[0,.5,1].map(t=>`<line x1="58" x2="740" y1="${y(t*max)}" y2="${y(t*max)}" class="daily-grid-line"/><text x="49" y="${y(t*max)+5}" text-anchor="end">${number(t*max/scale)}</text>`).join('')}<text x="58" y="23">${unit}</text>${indices.map(i=>`<path d="${line(i)}" class="daily-line-${i?'china':'us'}"/>`).join('')}${s.points.map((p,i)=>`${indices.map(k=>p.values[k]===null?'':`<circle cx="${x(i)}" cy="${y(p.values[k])}" r="4" tabindex="0" class="${k?'daily-point-china':'daily-point-us'}" aria-label="${escape(name(k)+' · '+month(p.period)+' · '+money(p.values[k]))}"><title>${escape(name(k)+' · '+month(p.period)+' · '+money(p.values[k]))}</title></circle>`).join('')}${i%3===0||i===11?`<text x="${x(i)}" y="274" text-anchor="middle">${escape(month(p.period))}</text>`:''}`).join('')}</svg></div><div class="daily-chart-legend">${indices.map(i=>`<span class="daily-legend-${i?'china':'us'}">${name(i)}</span>`).join('')}</div>`;
   }
  }
  return `<section class="daily-chart-panel" aria-labelledby="daily-chart-heading"><h4 id="daily-chart-heading">Monthly Canadian domestic exports</h4><div class="daily-filters">${select('region','Province / territory',{CA:'Canada — all regions',...provinces})}${select('partner','Chart view',{all:'USA and China', 'United States':'USA',China:'China'})}${select('chart','Measure',{value:'Export value',share:'Destination share'})}</div>
   ${s.available?`<p><strong>${escape(s.region)} · ${escape(s.commodity)}</strong> · ${selected.chart==='share'?'January–'+escape(month(s.year+'-'+String(s.month).padStart(2,'0'))):escape(month(s.points[0].period)+'–'+month(s.points.at(-1).period))}</p>${s.contextOnly?'<p class="daily-stale">All-merchandise context: this table does not separately measure the selected services, investment, defence or digital sector.</p>':''}${s.status!=='success'?'<p class="daily-stale">Latest statistical refresh did not complete successfully. Values retain their previous retrieval date.</p>':''}${cards}${chart}<details class="daily-detail" data-daily-detail="chart-data"><summary>Show chart data</summary><div class="daily-table-scroll" tabindex="0" role="region" aria-label="Exact monthly exports"><table><caption>${escape(s.region)} · ${escape(s.commodity)} · CAD · monthly, unadjusted</caption><thead><tr><th scope="col">Month</th>${indices.map(i=>`<th scope="col">${name(i)}</th>`).join('')}</tr></thead><tbody>${s.points.map(p=>`<tr><th scope="row">${escape(month(p.period))}</th>${indices.map(i=>`<td>${money(p.values[i])}</td>`).join('')}</tr>`).join('')}</tbody></table><table><caption>Complete year-to-date comparison · same months of prior year · CAD</caption><thead><tr><th scope="col">Destination</th><th scope="col">Current period</th><th scope="col">Prior period</th><th scope="col">Destination share</th></tr></thead><tbody>${[...indices.map(i=>s.partners[i]),s.partners[2]].map(p=>`<tr><th scope="row">${escape(p.partner)}</th><td>${money(p.current)}</td><td>${money(p.prior)}</td><td>${percent(p.share)}</td></tr>`).join('')}</tbody></table></div></details><p class="daily-meta">Data checked: ${formatDate(s.retrievedAt,language)} · ${officialLink(s.url,'Statistics Canada 12-10-0175-01')}</p><p class="daily-meta">${escape(s.basis)}</p>`:`<p class="daily-empty">${escape(s.reason||'A complete comparable period is unavailable. Missing values are not replaced with zero.')}</p>`}
   <p class="daily-evidence-limit">Monthly releases do not become daily observations. Export values do not establish net Canadian benefit, local employment or a causal effect of an agreement.</p></section>`;
 }

 function strategicPanel(model,language){
  const sectors=Object.entries(model.framework?.sectors||{}).filter(([id])=>model.filters.topic==='all'||id===model.filters.topic);
  return `<section class="daily-section" id="daily-strategy" aria-labelledby="daily-strategy-title"><h3 id="daily-strategy-title">Strategic outlook | Building Canada Strong</h3><p class="daily-meta">Assessment framework, not an official four-priority government classification. New source reports do not automatically change reviewed findings.</p><p class="daily-meta">Retained cross-relationship context: these national sector assessments cover Canada’s wider relationships. Daily filters do not create a new sector finding.</p><div class="daily-lenses">${Object.entries(I.dimensions).filter(([id])=>model.filters.priority==='all'||id===model.filters.priority).map(([id,name])=>`<article><h4>${name}</h4><details class="daily-detail" data-daily-detail="lens-${id}"><summary>Evidence and assessment</summary>${sectors.map(([topic,s])=>{const a=s.assessments[id];return `<div class="daily-lens-finding"><h5>${escape(s.name)}</h5><p><strong>Decision question</strong>: ${escape(a.question)}</p><p>${escape(a.finding)}</p><p class="daily-meta">Reviewed: ${formatDate(a.reviewedAt,language)} · National assessment; regional outcomes require local evidence.</p><a href="#stronger-canada?view=directions&amp;topic=${topic}&amp;region=${escape(model.filters.region)}&amp;dimension=${id}" data-hub="stronger-canada?view=directions&amp;topic=${topic}&amp;region=${escape(model.filters.region)}&amp;dimension=${id}">Inspect linked assessment and sources</a></div>`;}).join('')||'<p>No reviewed assessment available for this selection.</p>'}</details></article>`).join('')}</div></section>`;
 }

 function implicationsPanel(model,language){
  const records=[...new Map([...model.featured,...model.latest.map(x=>x.event).filter(Boolean)].map(e=>[e.record.id,e.record])).values()];
  return `<section class="daily-section" id="daily-implications" aria-labelledby="daily-implications-title"><h3 id="daily-implications-title">Implications for Canadian policy</h3><div class="daily-policy-implications"><article><h4>Economic</h4><p>Test whether changed access or awarded work produces Canadian shipments, completed spending, supplier participation and employment. Compare matching periods and separate prices from quantities.</p></article><article><h4>Diplomatic</h4><p>Compare the parties’ official texts, signatories, scope and implementation notices. A dialogue or MOU records cooperation; it does not establish regulatory permission or fulfilled purchases.</p></article><article><h4>Strategic</h4><p>Assess market concentration, substitute suppliers and Canadian productive capacity. Additional access to one market may change exposure without reducing overall dependence.</p></article></div>
   <h4>Next analyst action</h4>${records.length?`<ol class="daily-action-list">${records.slice(0,4).map(r=>`<li><strong>${escape(r.title)}</strong><p>${escape(watchText(r))}</p><p class="daily-meta">${officialLink(r.sources[0].url,'Open original source')} · ${escape(I.evidence(r).attribution)}</p></li>`).join('')}</ol>`:'<p>Verify country coverage and collect an operative instrument before drawing a Canadian policy conclusion.</p>'}
   <p class="daily-evidence-limit">These are analyst questions and monitoring directions, not adopted government recommendations. Observation confidence and attribution are assessed separately.</p></section>`;
 }

 function renderBriefing(model, feed, language = 'en') {
  const newGroups=model.groups.filter(group=>group.count),olderGroups=model.groups.filter(group=>!group.count);
  return `<header class="daily-heading"><p class="daily-eyebrow">Canada · United States · China</p><h2 id="daily-heading">Daily Policy Intelligence Brief</h2><p>Verified source records, implementation monitoring and Canadian decision questions.</p></header>
   <nav class="daily-jump" aria-label="Jump to a briefing section">${Object.entries(sections).map(([id,name])=>`<button type="button" data-daily-jump="${id}"${id===(model.activeSection||'summary')?' aria-current="location"':''}>${name}</button>`).join('')}</nav>
   ${filterPanel(model)}
   <div class="daily-range" role="group" aria-label="Briefing period">${Object.entries(ranges).map(([id,label])=>`<button type="button" data-daily-range="${id}" aria-pressed="${id===model.range}">${label}</button>`).join('')}</div>
   <p class="daily-meta" role="status">${model.firstVisit?'<span>First visit. Showing the last seven days.</span> ':''}<span>Briefing window</span> ${formatDate(model.previousVisit||model.start,language)} ${model.start!==model.today||model.previousVisit?`– ${formatDate(model.today,language)}`:''}</p>
   ${executivePanel(model,feed,language)}
   ${monitorSummary(model,feed,language)}
   <section class="daily-section" id="daily-developments" aria-labelledby="daily-reviewed-title"><h3 id="daily-reviewed-title">Priority developments</h3>
    ${model.featured.length?model.featured.slice(0,3).map(e=>reviewedCard(e,language,feed,model.framework)).join(''):'<p class="daily-empty">No matching developments recorded for this period. Use the latest evidence below and check country coverage before concluding that nothing changed.</p>'}
    ${model.featured.length>3?`<details class="daily-detail" data-daily-detail="more-reviewed"><summary>More developments</summary>${model.featured.slice(3).map(e=>reviewedCard(e,language,feed,model.framework)).join('')}</details>`:''}
    ${model.earlier.length?`<details class="daily-detail" data-daily-detail="earlier-reviewed"><summary>Earlier evidence</summary>${model.earlier.map(e=>reviewedCard(e,language,feed,model.framework)).join('')}</details>`:''}
    <details class="daily-detail" data-daily-detail="instruments"><summary>Agreements and implementation watch</summary>${instrumentPanel(model,language)}</details>
   </section>
   ${sectorPanel(model,language,feed)}
   <section class="daily-section" id="daily-relationships">${comparisonPanel(model,language,feed)}</section>
   ${strategicPanel(model,language)}${V?.collection({...model.filters,framework:true},feed,{keyPrefix:'daily-framework'})||''}
   <section class="daily-section" id="daily-watch">${watchPanel(model,language)}<p class="daily-meta">A scheduled date requests verification; it does not establish that a measure entered into force or a contract was fulfilled.</p></section>
   ${implicationsPanel(model,language)}
   <details class="daily-detail daily-review" data-daily-detail="review-queue"><summary>Source changes to review <span class="daily-count" translate="no">${newGroups.reduce((total,group)=>total+group.count,0)}</span></summary><p>These observations await review. Expand a source to see its revision history.</p>${newGroups.map(group=>groupCard(group,language)).join('')||'<p>No source changes recorded for this period.</p>'}${olderGroups.length?`<details class="daily-detail" data-daily-detail="source-archive"><summary>Earlier monitored sources <span class="daily-count" translate="no">${olderGroups.length}</span></summary>${olderGroups.map(group=>groupCard(group,language)).join('')}</details>`:''}</details>
   <details class="daily-detail" data-daily-detail="methods"><summary>Evidence and verification method</summary><p>Automatic retrieval verifies access to a registered source and compares its content hash. It does not establish that every statement is accurate or that a policy is legally operative. Analyst review, source checks, publication dates and statistical reference periods remain separate.</p><p>First indexing and parser refreshes are not new policy events. A signed MOU, a contract award, implementation and realized commercial outcomes are separate evidence stages. PDFs and unpublished executed contracts require document review.</p><p>Observation confidence and attribution are assessed separately. No gains or losses are inferred from news counts, agreement counts or export concentration alone.</p><p>Confidence concerns the stated source claim: High for a reviewed published legal record; Moderate for other reviewed reports; Unassessed for pending or changed sources. It does not rate Canadian economic gains.</p></details>
   <p class="daily-footer"><a href="#findings-trends" data-hub="findings-trends">Open the research archive</a><a href="#weekly-updates" data-hub="weekly-updates">Subscribe to weekly updates</a></p>
   <footer class="daily-edition-footer"><p class="daily-verification-strip" role="status"><strong>Daily source checks</strong> · ${escape(feed.lastRunStatus||'not_run')} · ${formatDate(feed.lastAttempt,language)||'Not recorded'}${model.stale?' · Monitoring is overdue':''}</p>
   <div class="daily-edition-meta"><p><strong>Briefing date</strong> ${formatDate(model.today,language)}</p><p><strong>Assessment scope</strong> ${escape(relationships[model.filters.relationship]||'All relationships')} · ${escape(topics[model.filters.topic]||'All sectors and subjects')} · ${escape(I.dimensions[model.filters.priority]||'All priorities')}</p></div>
   <div class="daily-toolbar"><button type="button" data-daily-refresh>Refresh monitored evidence</button><button type="button" data-daily-print>Print briefing</button><a href="daily-editions.json" download>Download edition data</a></div></footer>`;
 }

 let page = null;
 let stickyObserver=null;
 let activeSection='summary',sectionFrame=null;
 function highlightSection(id,reveal=false){
  if(!Object.hasOwn(sections,id))return;
  activeSection=id;
  for(const button of page?.querySelectorAll('[data-daily-jump]')||[]){if(button.dataset.dailyJump===id)button.setAttribute('aria-current','location');else button.removeAttribute('aria-current');}
  for(const link of global?.document?.querySelectorAll?.('[data-daily-section]')||[]){if(link.dataset.dailySection===id)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');}
  if(reveal){const bar=page?.querySelector('.daily-jump'),button=page?.querySelector(`[data-daily-jump="${id}"]`),bounds=bar?.getBoundingClientRect?.(),rect=button?.getBoundingClientRect?.();if(bounds&&rect){const left=rect.left<bounds.left?rect.left-bounds.left-8:rect.right>bounds.right?rect.right-bounds.right+8:0;if(left)bar.scrollBy?.({left,behavior:'smooth'});}}
 }
 function syncSection(){
  sectionFrame=null;if(!page?.isConnected)return;
  const main=global.document?.getElementById?.('site-navigation'),bar=page.querySelector('.daily-jump'),edge=(main?.offsetHeight||0)+(bar?.offsetHeight||0)+40;
  let current='summary';for(const id of Object.keys(sections)){const rect=page.querySelector('#daily-'+id)?.getBoundingClientRect?.();if(rect&&rect.top<=edge)current=id;}
  if(current!==activeSection)highlightSection(current,true);
 }
 function queueSectionSync(){if(!sectionFrame&&page?.isConnected&&global?.requestAnimationFrame)sectionFrame=global.requestAnimationFrame(syncSection);}
 function updateStickyLayout(){if(!page?.isConnected)return;const main=global.document?.getElementById?.('site-navigation'),tabs=page.querySelector('.daily-jump');const top=main?.offsetHeight||0;page.style?.setProperty('--daily-main-nav-height',top+'px');page.style?.setProperty('--daily-scroll-offset',((tabs?.offsetHeight||60)+20)+'px');}
 function observeStickyLayout(){stickyObserver?.disconnect();updateStickyLayout();if(global.ResizeObserver&&page?.isConnected){stickyObserver=new global.ResizeObserver(updateStickyLayout);for(const el of [global.document?.getElementById?.('site-navigation'),page.querySelector('.daily-jump')])if(el)stickyObserver.observe(el);}}
 function jumpToSection(id,{behavior='smooth'}={}){
  if(!Object.hasOwn(sections,id)||!page?.isConnected)return false;
  const section=page.querySelector('#daily-'+id);if(!section)return false;
  updateStickyLayout();highlightSection(id,true);section.scrollIntoView({block:'start',behavior});
  const heading=section.querySelector('h3');if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}return true;
 }
 let currentFeed = {};
 let previousVisit = null;
 let range = 'today';
 let filters = {relationship:'all',topic:'all',stage:'all',priority:'all',region:'CA',chart:'value',partner:'all'};
 let resources={history:null,tradeData:null},resourcesLoading=false,resourcesAt=0;
 async function refreshResources(){if(resourcesLoading||Date.now()-resourcesAt<60000)return;resourcesLoading=true;const rs=await Promise.allSettled(['daily-editions.json','regional-statistics.json'].map(async path=>{const response=await fetch(path,{cache:'no-store'});if(!response.ok)throw Error();return response.json();}));resources={history:rs[0].status==='fulfilled'?rs[0].value:null,tradeData:rs[1].status==='fulfilled'?rs[1].value:null};resourcesAt=Date.now();resourcesLoading=false;render();}
 let displayedDay = '';

 function readVisit() {
  try {
   return JSON.parse(global.localStorage.getItem(visitKey));
  } catch {
   return null;
  }
 }

 function render() {
  if (!page?.isConnected) return;
  const now = Date.now();
  const model = buildBriefing({feed: currentFeed, register: global.PolicyResearchRegister, previousVisit, range, filters, now,...resources});
  model.activeSection=activeSection;
  displayedDay = model.today;
  const language = global.DashboardI18n?.language || 'en';
  const open = new Set([...page.querySelectorAll('details[open][data-daily-detail]')].map(item => item.dataset.dailyDetail));
  const focused = global.document.activeElement?.dataset?.dailyRange;
  page.innerHTML = renderBriefing(model, currentFeed, language);
  for (const detail of page.querySelectorAll('details[data-daily-detail]')) {
   if (open.has(detail.dataset.dailyDetail)) detail.open = true;
  }
  if (focused && Object.hasOwn(ranges, focused)) page.querySelector(`[data-daily-range="${focused}"]`)?.focus({preventScroll: true});
  V?.hydrate(page);
  global.DashboardI18n?.translateTree(page);
  observeStickyLayout();
  highlightSection(activeSection);
 }

 function show(root, feed) {
  const unchanged = JSON.stringify(feed) === JSON.stringify(currentFeed);
  currentFeed = feed;
  if (page?.isConnected && page.parentNode === root) {
   if (!unchanged || displayedDay !== dayKey(Date.now())){render();if(global.fetch||typeof fetch==='function')refreshResources();}
   return;
  }
  previousVisit = readVisit();
  const openedAt = Date.now();
  const day = dayKey(openedAt);
  const events = [...reviewedEvents(global.PolicyResearchRegister),...automaticEvents(feed,global.PolicyResearchRegister,day)].filter(event => event.day === day).map(event => event.key);
  try {
   global.localStorage.setItem(visitKey, JSON.stringify({at: openedAt, events}));
  } catch {
   // The period controls still work when a browser blocks site storage.
  }
  range = 'today';
  const requested=new URLSearchParams(global.location?.hash?.split('?')[1]||'').get('section');activeSection=Object.hasOwn(sections,requested)?requested:'summary';
  filters = {relationship:'all',topic:'all',stage:'all',priority:'all',region:'CA',chart:'value',partner:'all'};
  root.innerHTML = '<section class="wrap daily-briefing" aria-labelledby="daily-heading"></section>';
  page = root.querySelector('.daily-briefing');
  page.addEventListener('change',event=>{const id=event.target.dataset.dailyFilter;if(!Object.hasOwn(filters,id))return;filters[id]=event.target.value;render();page.querySelector(`[data-daily-filter="${id}"]`)?.focus({preventScroll:true});});
  page.addEventListener('click', event => {
   const jump=event.target.closest('[data-daily-jump]')?.dataset.dailyJump;
   if(jump){jumpToSection(jump);return;}
   if(event.target.closest('[data-daily-print]')){global.print?.();return;}
   if(event.target.closest('[data-daily-refresh]')){resourcesAt=0;global.PolicyLive?.refresh?.();refreshResources();return;}
   const topic=event.target.closest('[data-daily-topic]')?.dataset.dailyTopic;
   if(topic&&Object.hasOwn(topics,topic)){filters.topic=topic;render();page.querySelector('[data-daily-filter="topic"]')?.focus({preventScroll:true});return;}
   if(event.target.closest('[data-daily-reset]')?.dataset?.dailyReset!==undefined){filters={relationship:'all',topic:'all',stage:'all',priority:'all',region:'CA',chart:'value',partner:'all'};render();return;}
   const button = event.target.closest('[data-daily-range]');
   const next = button?.dataset.dailyRange;
   if (!Object.hasOwn(ranges, next) || next === range) return;
   range = next;
   render();
  });
  render();
  if(global.fetch||typeof fetch==='function')refreshResources();
 }

 const api = {buildBriefing, renderBriefing, show, sections, jumpToSection, get activeSection(){return activeSection;}};
 if (typeof module !== 'undefined' && module.exports) module.exports = api;
 if (global) {
  global.DailyBriefing = api;
  global.addEventListener('dashboard-language-changed', render);
  global.addEventListener('resize',updateStickyLayout);
  global.addEventListener('scroll',queueSectionSync,{passive:true});
  global.addEventListener('regional-statistics-loaded',()=>{if(global.RegionalTrade?.data){resources.tradeData=global.RegionalTrade.data;render();}});
 }
})(typeof window === 'undefined' ? null : window);

