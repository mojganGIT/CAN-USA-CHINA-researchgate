(function dailyBriefing(global) {
 'use strict';

 const timeZone = 'America/Toronto';
 const visitKey = 'policy-dashboard-daily-visit';
 const calendar = new Intl.DateTimeFormat('en-CA', {
  timeZone, year: 'numeric', month: '2-digit', day: '2-digit'
 });
 const ranges = {today: 'Today', since: 'Since my last visit', week: 'Last seven days'};
 const relationships = {'Canada-China': 'Canada–China', 'Canada-USA': 'Canada–U.S.', 'USA-China': 'U.S.–China'};
 const topics = {agreements:'Agreements and MOUs',vehicles:'Vehicles and batteries',agriculture:'Agriculture and seafood',energy:'Energy and minerals',finance:'Finance',technology:'Technology',security:'Security',investment:'Investment'};
 const stages = {all:'All evidence',MOU:'MOUs',policy:'Policy and tariffs',meeting:'Dialogues and readouts',statistics:'Measured data',recommendation:'Statements and frameworks'};
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
  if (record.kind === 'policy' && record.effectiveDate === day) return 'Took effect';
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
  if (canada && (event.status === 'Took effect' || effectiveSoon)) return 0;
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
  return (feed.briefings||[]).filter(r=>r.reviewState==='source_reported' && r.sources?.some(x=>sourceURL(x.url))).flatMap(record=>{
   const day=dayKey(record.detectedAt),published=dayKey(record.publicationDate);
   if(!day||day>today||!published||published>today)return [];
   const reviewed=(known.get(sourceURL(record.sources[0].url))||[]).some(r=>r.reviewedAt>=day);
   if(reviewed)return [];
   // First discovery of an old release belongs in provenance, not today's policy developments.
   if(record.changeType!=='source_revision' && timestamp(today)-timestamp(published)>31*86400000)return [];
   return [{key:`${record.id}@${record.versionId}`,day,status:record.changeType==='source_revision'?'Source text revised':record.status||'Official announcement',record}];
  });
 }

 function buildBriefing({feed = {}, register, range = 'today', previousVisit, filters = {}, now = Date.now()}) {
  const today = dayKey(now);
  const visitTime = timestamp(previousVisit?.at);
  const since = range === 'since' && visitTime < now;
  const firstVisit = range === 'since' && !since;
  const start = since ? dayKey(visitTime) : range === 'today' ? today : previousDay(today, 6);
  const seen = new Set(since && Array.isArray(previousVisit?.events) ? previousVisit.events : []);
  const selected={relationship:filters.relationship||'all',topic:filters.topic||'all',stage:filters.stage||'all'};
  const matches=event=>{
   const r=event.record;
   return (selected.relationship==='all'||r.relationship===selected.relationship)&&
    (selected.topic==='all'||r.topics?.includes(selected.topic))&&
    (selected.stage==='all'||r.kind===selected.stage||(selected.stage==='policy'&&r.kind==='extension'));
  };
  const allEvents=[...reviewedEvents(register),...automaticEvents(feed,register,today)].filter(event=>event.day<=today);
  const events=allEvents.filter(matches);
  const inWindow=events.filter(event => event.day >= start && !seen.has(event.key));
  const featured=inWindow.sort((a,b)=>b.day.localeCompare(a.day)).filter((e,i,a)=>a.findIndex(x=>x.record.id===e.record.id)===i)
   .sort((a,b)=>priority(a,today)-priority(b,today)||b.day.localeCompare(a.day));
  const latest=Object.keys(relationships).map(relationship=>({relationship,event:events.filter(e=>e.record.relationship===relationship)
   .sort((a,b)=>(b.record.date||b.record.publicationDate||'').localeCompare(a.record.date||a.record.publicationDate||'')||
    Number(!!a.record.reviewState)-Number(!!b.record.reviewState)||b.day.localeCompare(a.day))[0]}));
  const instruments=[...new Map(events.filter(e=>['MOU','policy','extension','recommendation'].includes(e.record.kind))
   .sort((a,b)=>(b.record.date||'').localeCompare(a.record.date||''))
   .map(e=>[e.record.id,e])).values()].slice(0,10);
  const changes = (Array.isArray(feed.changes) ? feed.changes : []).filter(item => timestamp(item.detectedAt) <= now);
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
   featured, latest, instruments, stale:!freshness,
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
  return `<a href="${escape(href)}" target="_blank" rel="noopener noreferrer">${escape(label)} <span aria-hidden="true">↗</span><span class="sr-only"> (new tab)</span></a>`;
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

 function reviewedCard(event, language) {
  const {record, day, key, status} = event;
  const regions = (record.regions || []).filter(code => Object.hasOwn(provinces, code));
  const sources = record.sources.filter(source => sourceURL(source.url));
  return `<article class="daily-story" data-evidence="${record.reviewState?'source-reported':'reviewed'}">
   <p class="daily-meta"><span class="daily-tag">${escape(status)}</span> ${event.entryType==='review'?'<span>Evidence added to briefing</span>':record.reviewState?'<span>Detected</span>':''} ${formatDate(day, language)}
    <span>${escape(relationships[record.relationship] || record.relationship)}</span></p>
   <h4>${escape(record.title)}</h4>
   <p class="daily-meta"><span class="daily-tag">${record.reviewState?'Official source · analyst review pending':record.kind==='analysis'?'Reviewed research source':'Reviewed primary source'}</span><span>${escape(record.status||recordStatus(record,record.date))}</span></p>
   <dl class="daily-questions">
    <dt>What changed?</dt><dd>${escape(record.changed)}${record.quote?`<blockquote data-no-translate>${escape(record.quote)}</blockquote>`:''}</dd>
    <dt>Why does it matter to Canada?</dt><dd>${escape(record.canada)}</dd>
    <dt>What should I watch next?</dt><dd>${escape(watchText(record))}</dd>
   </dl>
   <p class="daily-actions">${officialLink(sources[0].url, 'Open original source')}
    ${mapLink(record, 'Explore on the Canada map')}</p>
   <details class="daily-detail" data-daily-detail="${escape(`evidence-${key}`)}">
    <summary>Sources, dates and evidence limits</summary>
    ${record.limit ? `<p class="daily-evidence-limit">${escape(record.limit)}</p>` : ''}
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
     ${source.publicationDate ? `<span class="daily-meta">Source publication</span> ${formatDate(source.publicationDate, language)}` : ''}${source.modifiedDate?` <span class="daily-meta">Source modified</span> ${formatDate(source.modifiedDate,language)}`:''}</li>`).join('')}</ul>
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
    <p class="daily-meta"><span>${item.changeType === 'source_revision' ? 'Source page revised' : 'Source first indexed'}</span>
     <span>Detected</span> ${formatDate(item.detectedAt, language)}
     ${item.publicationDate ? `<span>Source publication</span> ${formatDate(item.publicationDate, language)}` : ''}</p>
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
 function comparisonPanel(model,language){
  return `<section class="daily-relationship-section" aria-labelledby="daily-relationships-title"><h3 id="daily-relationships-title">Latest evidence by relationship</h3>
   <p class="daily-meta">Latest dated records remain visible on quiet days. Dates below are source or event dates, not today’s news.</p>
   <div class="daily-relationships">${model.latest.map(({relationship,event})=>`<article class="daily-relationship">
    <h4>${escape(relationships[relationship])}</h4>${event?`<p class="daily-meta">${formatDate(event.record.date,language)} <span class="daily-tag">${escape(event.record.status||recordStatus(event.record,event.record.date))}</span></p>
     <h4>${escape(event.record.title)}</h4><p>${escape(event.record.canada)}</p>
     <p class="daily-meta">${event.record.reviewState?'Official source · analyst review pending':event.record.kind==='analysis'?'Reviewed research source':'Reviewed primary source'}</p>
     <details class="daily-detail" data-daily-detail="latest-${relationship}"><summary>Evidence and next action</summary>${reviewedCard(event,language)}</details>`:'<p>No matching dated evidence is recorded.</p>'}</article>`).join('')}</div>
  </section>`;
 }
 function filterPanel(model){
  const select=(id,label,options)=>`<label>${label}<select data-daily-filter="${id}">${Object.entries(options).map(([value,name])=>`<option value="${value}"${model.filters[id]===value?' selected':''}>${escape(name)}</option>`).join('')}</select></label>`;
  return `<div class="daily-filters" role="group" aria-label="Policy monitoring filters">${select('relationship','Relationship',{all:'All relationships',...relationships})}${select('topic','Sector or subject',{all:'All sectors and subjects',...topics})}${select('stage','Evidence type',stages)}<button type="button" data-daily-reset>Reset filters</button></div>`;
 }
 function instrumentPanel(model,language){
  return `<section class="daily-instruments" aria-labelledby="daily-instruments-title"><h3 id="daily-instruments-title">Agreements and implementation watch</h3>
   <p class="daily-meta">A signed MOU, a proposed measure and an implemented tariff have different evidence requirements.</p>
   <div class="daily-table-scroll" tabindex="0" role="region" aria-label="Agreement and implementation records"><table><thead><tr><th scope="col">Instrument / relationship</th><th scope="col">Evidence stage</th><th scope="col">Next analyst action</th></tr></thead><tbody>${model.instruments.slice(0,6).map(({record:r})=>`<tr><td>${officialLink(r.sources[0].url,r.title)}<p class="daily-meta">${escape(relationships[r.relationship]||r.relationship)} · ${formatDate(r.date,language)}</p></td><td><span class="daily-tag">${escape(r.status||recordStatus(r,r.date))}</span><p class="daily-meta">${r.reviewState?'Analyst review pending':'Reviewed primary source'}</p>${r.effectiveDate?`<p class="daily-meta"><span>Recorded effective date</span> ${formatDate(r.effectiveDate,language)}</p>`:''}</td><td>${escape(watchText(r))}</td></tr>`).join('')||'<tr><td colspan="3">No matching instrument is recorded.</td></tr>'}</tbody></table></div>
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

 function renderBriefing(model, feed, language = 'en') {
  const newGroups = model.groups.filter(group => group.count);
  const olderGroups = model.groups.filter(group => !group.count);
  return `<header class="daily-heading">
   <p class="daily-eyebrow">Canada · United States · China</p>
   <h2 id="daily-heading">Daily policy briefing</h2>
   <p>Policy changes, agreements and implementation evidence for Canadian decisions.</p>
  </header>
  ${monitorSummary(model, feed, language)}
  ${filterPanel(model)}
  ${comparisonPanel(model,language)}
  <div class="daily-range" role="group" aria-label="Briefing period">
   ${Object.entries(ranges).map(([id, label]) => `<button type="button" data-daily-range="${id}" aria-pressed="${id === model.range}">${label}</button>`).join('')}
  </div>
  <p class="daily-meta" role="status">${model.firstVisit ? '<span>First visit. Showing the last seven days.</span> ' : ''}
   <span>Briefing window</span> ${formatDate(model.previousVisit || model.start, language)}
   ${model.start !== model.today || model.previousVisit ? ` <span aria-hidden="true">–</span> ${formatDate(model.today, language)}` : ''}
  </p>
  <div class="daily-columns">
   <section class="daily-lead" aria-labelledby="daily-reviewed-title">
    <h3 id="daily-reviewed-title">Developments and analyst actions</h3>
    ${model.featured.length ? model.featured.slice(0, 3).map(event => reviewedCard(event, language)).join('') :
     '<p class="daily-empty">No matching developments recorded for this period. Use the latest evidence above and check country coverage before concluding that nothing changed.</p>'}
    ${model.featured.length > 3 ? `<details class="daily-detail" data-daily-detail="more-reviewed"><summary>More developments</summary>
     ${model.featured.slice(3).map(event => reviewedCard(event, language)).join('')}</details>` : ''}
    ${model.earlier.length ? `<details class="daily-detail" data-daily-detail="earlier-reviewed"><summary>Earlier evidence</summary>
     ${model.earlier.map(event => reviewedCard(event, language)).join('')}</details>` : ''}
   </section>
   ${watchPanel(model, language)}
  </div>
  ${instrumentPanel(model,language)}
  <details class="daily-detail daily-review" data-daily-detail="review-queue">
   <summary>Source changes to review <span class="daily-count" translate="no">${newGroups.reduce((total, group) => total + group.count, 0)}</span></summary>
   <p>These observations await review. Expand a source to see its revision history.</p>
   ${newGroups.map(group => groupCard(group, language)).join('') || '<p>No source changes recorded for this period.</p>'}
   ${olderGroups.length ? `<details class="daily-detail" data-daily-detail="source-archive">
    <summary>Earlier monitored sources <span class="daily-count" translate="no">${olderGroups.length}</span></summary>
    ${olderGroups.map(group => groupCard(group, language)).join('')}</details>` : ''}
  </details>
  <p class="daily-footer"><a href="#findings-trends" data-hub="findings-trends">Open the research archive</a>
   <a href="#weekly-updates" data-hub="weekly-updates">Subscribe to weekly updates</a></p>`;
 }

 let page = null;
 let currentFeed = {};
 let previousVisit = null;
 let range = 'today';
 let filters = {relationship:'all',topic:'all',stage:'all'};
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
  const model = buildBriefing({feed: currentFeed, register: global.PolicyResearchRegister, previousVisit, range, filters, now});
  displayedDay = model.today;
  const language = global.DashboardI18n?.language || 'en';
  const open = new Set([...page.querySelectorAll('details[open][data-daily-detail]')].map(item => item.dataset.dailyDetail));
  const focused = global.document.activeElement?.dataset?.dailyRange;
  page.innerHTML = renderBriefing(model, currentFeed, language);
  for (const detail of page.querySelectorAll('details[data-daily-detail]')) {
   if (open.has(detail.dataset.dailyDetail)) detail.open = true;
  }
  if (focused && Object.hasOwn(ranges, focused)) page.querySelector(`[data-daily-range="${focused}"]`)?.focus({preventScroll: true});
  global.DashboardI18n?.translateTree(page);
 }

 function show(root, feed) {
  const unchanged = JSON.stringify(feed) === JSON.stringify(currentFeed);
  currentFeed = feed;
  if (page?.isConnected && page.parentNode === root) {
   if (!unchanged || displayedDay !== dayKey(Date.now())) render();
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
  filters = {relationship:'all',topic:'all',stage:'all'};
  root.innerHTML = '<section class="wrap daily-briefing" aria-labelledby="daily-heading"></section>';
  page = root.querySelector('.daily-briefing');
  page.addEventListener('change',event=>{const id=event.target.dataset.dailyFilter;if(!Object.hasOwn(filters,id))return;filters[id]=event.target.value;render();page.querySelector(`[data-daily-filter="${id}"]`)?.focus({preventScroll:true});});
  page.addEventListener('click', event => {
   if(event.target.closest('[data-daily-reset]')?.dataset?.dailyReset!==undefined){filters={relationship:'all',topic:'all',stage:'all'};render();return;}
   const button = event.target.closest('[data-daily-range]');
   const next = button?.dataset.dailyRange;
   if (!Object.hasOwn(ranges, next) || next === range) return;
   range = next;
   render();
  });
  render();
 }

 const api = {buildBriefing, renderBriefing, show};
 if (typeof module !== 'undefined' && module.exports) module.exports = api;
 if (global) {
  global.DailyBriefing = api;
  global.addEventListener('dashboard-language-changed', render);
 }
})(typeof window === 'undefined' ? null : window);

