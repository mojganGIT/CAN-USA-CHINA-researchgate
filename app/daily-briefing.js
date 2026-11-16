(function dailyBriefing(global) {
 'use strict';

 const timeZone = 'America/Toronto';
 const visitKey = 'policy-dashboard-daily-visit';
 const calendar = new Intl.DateTimeFormat('en-CA', {
  timeZone, year: 'numeric', month: '2-digit', day: '2-digit'
 });
 const ranges = {today: 'Today', since: 'Since my last visit', week: 'Last seven days'};
 const relationships = {'Canada-China': 'Canada–China', 'Canada-USA': 'Canada–U.S.', 'USA-China': 'U.S.–China'};
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
   return [...dates].filter(Boolean).map(day => ({
    key: `${record.id}@${day}`, day, status: recordStatus(record, day), record
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

 function buildBriefing({feed = {}, register, range = 'today', previousVisit, now = Date.now()}) {
  const today = dayKey(now);
  const visitTime = timestamp(previousVisit?.at);
  const since = range === 'since' && visitTime < now;
  const firstVisit = range === 'since' && !since;
  const start = since ? dayKey(visitTime) : range === 'today' ? today : previousDay(today, 6);
  const seen = new Set(since && Array.isArray(previousVisit?.events) ? previousVisit.events : []);
  const events = reviewedEvents(register).filter(event => event.day <= today);
  const featured = events.filter(event => event.day >= start && !seen.has(event.key))
   .sort((a, b) => priority(a, today) - priority(b, today) || b.day.localeCompare(a.day));
  const changes = (Array.isArray(feed.changes) ? feed.changes : []).filter(item => timestamp(item.detectedAt) <= now);
  const groups = groupedObservations(changes, item => {
   const detected = timestamp(item.detectedAt);
   return since ? detected > visitTime : dayKey(item.detectedAt) >= start;
  });
  const runTime = timestamp(feed.lastAttempt);
  const scanCount = groups.reduce((count, group) =>
   count + group.observations.filter(item => timestamp(item.detectedAt) === runTime).length, 0);
  return {
   today, range, start, firstVisit, previousVisit: since ? previousVisit.at : null,
   featured, earlier: events.filter(event => event.day < start).slice(0, 6),
   groups, scanCount, next: nextDates(register, today)
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
  return `<article class="daily-story">
   <p class="daily-meta"><span class="daily-tag">${escape(status)}</span> ${formatDate(day, language)}
    <span>${escape(relationships[record.relationship] || record.relationship)}</span></p>
   <h4>${escape(record.title)}</h4>
   <dl class="daily-questions">
    <dt>What changed?</dt><dd>${escape(record.changed)}</dd>
    <dt>Why does it matter to Canada?</dt><dd>${escape(record.canada)}</dd>
    <dt>What should I watch next?</dt><dd>${escape(watchText(record))}</dd>
   </dl>
   <p class="daily-actions">${officialLink(sources[0].url, 'Open original source')}
    ${mapLink(record, 'Explore on the Canada map')}</p>
   <details class="daily-detail" data-daily-detail="${escape(`evidence-${key}`)}">
    <summary>Sources, dates and evidence limits</summary>
    ${record.limit ? `<p>${escape(record.limit)}</p>` : ''}
    <dl class="daily-questions">
     <dt>Record date</dt><dd>${formatDate(record.date, language)}</dd>
     ${record.effectiveDate ? `<dt>Recorded effective date</dt><dd>${formatDate(record.effectiveDate, language)}</dd>` : ''}
     ${record.through ? `<dt>Announced end date</dt><dd>${formatDate(record.through, language)}</dd>` : ''}
     <dt>Reviewed</dt><dd>${formatDate(record.reviewedAt, language)}</dd>
     ${record.referencePeriod || record.period ? `<dt>Reference period</dt><dd>${escape(record.referencePeriod || record.period)}</dd>` : ''}
    </dl>
    ${regions.length ? `<p class="daily-meta">Regional exposure</p><ul class="daily-region-links">${regions.map(code =>
     `<li>${mapLink(record, provinces[code], code)}</li>`).join('')}</ul>` : ''}
    <ul>${sources.map(source => `<li>${officialLink(source.url, source.publisher)}
     ${source.publicationDate ? `<span class="daily-meta">Source publication</span> ${formatDate(source.publicationDate, language)}` : ''}</li>`).join('')}</ul>
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
  const checked = feed.lastRunStatus === 'success' || feed.lastRunStatus === 'partial';
  const summary = checked
   ? (model.scanCount ? `<span>New observations</span> <strong>${model.scanCount}</strong>` : 'No new observations recorded')
   : '';
  return `<div class="daily-scan">
   <p class="daily-scan-line" role="status">
    <span>Latest scan</span> ${formatDate(feed.lastAttempt, language)}
    <strong class="daily-tag" data-status="${escape(feed.lastRunStatus)}">${escape(status)}</strong>
    ${summary ? `<span class="daily-scan-result">${summary}</span>` : ''}
   </p>
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
   <h2 id="daily-heading">Daily briefing</h2>
   <p>What changed and why it matters to Canada.</p>
  </header>
  ${monitorSummary(model, feed, language)}
  <div class="daily-range" role="group" aria-label="Briefing period">
   ${Object.entries(ranges).map(([id, label]) => `<button type="button" data-daily-range="${id}" aria-pressed="${id === model.range}">${label}</button>`).join('')}
  </div>
  <p class="daily-meta" role="status">${model.firstVisit ? '<span>First visit. Showing the last seven days.</span> ' : ''}
   <span>Briefing window</span> ${formatDate(model.previousVisit || model.start, language)}
   ${model.start !== model.today || model.previousVisit ? ` <span aria-hidden="true">–</span> ${formatDate(model.today, language)}` : ''}
  </p>
  <div class="daily-columns">
   <section class="daily-lead" aria-labelledby="daily-reviewed-title">
    <h3 id="daily-reviewed-title">Reviewed developments</h3>
    ${model.featured.length ? model.featured.slice(0, 3).map(event => reviewedCard(event, language)).join('') :
     '<p class="daily-empty">No reviewed developments recorded for this period.</p>'}
    ${model.featured.length > 3 ? `<details class="daily-detail" data-daily-detail="more-reviewed"><summary>More reviewed developments</summary>
     ${model.featured.slice(3).map(event => reviewedCard(event, language)).join('')}</details>` : ''}
    ${model.earlier.length ? `<details class="daily-detail" data-daily-detail="earlier-reviewed"><summary>Earlier reviewed developments</summary>
     ${model.earlier.map(event => reviewedCard(event, language)).join('')}</details>` : ''}
   </section>
   ${watchPanel(model, language)}
  </div>
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
  const model = buildBriefing({feed: currentFeed, register: global.PolicyResearchRegister, previousVisit, range, now});
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
  const events = reviewedEvents(global.PolicyResearchRegister).filter(event => event.day === day).map(event => event.key);
  try {
   global.localStorage.setItem(visitKey, JSON.stringify({at: openedAt, events}));
  } catch {
   // The period controls still work when a browser blocks site storage.
  }
  range = 'today';
  root.innerHTML = '<section class="wrap daily-briefing" aria-labelledby="daily-heading"></section>';
  page = root.querySelector('.daily-briefing');
  page.addEventListener('click', event => {
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
