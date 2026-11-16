import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import briefing from '../app/daily-briefing.js';
import register from '../app/research-register.js';

const now = Date.parse('2026-11-16T15:30:00Z');
const original = {publisher: 'Official source', url: 'https://example.gov/policies/trade'};
function record(id, date, fields = {}) {
 return {
  id, date, kind: 'policy', relationship: 'Canada-China', topics: ['agriculture'],
  title: id, changed: 'Source text about the decision.', canada: 'Documented Canadian exposure.',
  reviewedAt: date, sources: [original], ...fields
 };
}

test('Toronto calendar days keep a quiet partial scan separate from older revisions', () => {
 const run = '2026-11-16T12:26:55.064Z';
 const feed = {
  lastAttempt: run, lastSuccessfulRun: run, lastRunStatus: 'partial', sourcesChecked: 146,
  changes: [
   {id: 'yesterday', url: original.url, title: 'Policy page', detectedAt: '2026-11-16T04:59:00Z'},
   {id: 'today', url: original.url + '#details', title: 'Policy page', detectedAt: '2026-11-16T05:01:00Z'}
  ],
  sourceFailures: [{url: original.url, error: 'HTTP 503'}]
 };
 const schedule = {records: [register.records.find(item => item.id === 'canada-september-merchandise')]};
 const model = briefing.buildBriefing({feed, register: schedule, now});
 assert.equal(model.today, '2026-11-16');
 assert.equal(model.scanCount, 0);
 assert.equal(model.groups.length, 1);
 assert.deepEqual(model.groups[0].observations.map(item => item.id), ['today', 'yesterday']);
 assert.equal(model.groups[0].count, 1);
 const html = briefing.renderBriefing(model, feed);
 assert.match(html, /No new observations recorded/);
 assert.match(html, /Partial coverage/);
 assert.match(html, /Source pages read<\/dt><dd>146/);
 assert.match(html, /HTTP 503/);
 assert.equal(model.featured.length, 0);
 assert.equal(model.next[0].date, '2026-12-08');
 assert.match(html, /October Canadian merchandise trade/);
});

test('since last visit respects exact detection times and includes new date-only records on the same day', () => {
 const first = record('already-available', '2026-11-16');
 const newRecord = record('added-same-day', '2026-11-16', {effectiveDate: '2026-11-16'});
 const data = {records: [first, newRecord, record('earlier', '2026-11-10'), record('outside', '2026-11-09')]};
 const previousVisit = {at: Date.parse('2026-11-16T14:15:00Z'), events: ['already-available@2026-11-16']};
 const feed = {changes: [
  {id: 'before', url: original.url, detectedAt: '2026-11-16T14:14:00Z'},
  {id: 'after', url: original.url, detectedAt: '2026-11-16T14:16:00Z'}
 ]};
 const since = briefing.buildBriefing({feed, register: data, range: 'since', previousVisit, now});
 assert.equal(since.groups[0].count, 1);
 assert.deepEqual(since.featured.map(item => item.record.id), ['added-same-day']);
 assert.equal(since.featured[0].status, 'Took effect');
 const firstVisit = briefing.buildBriefing({feed, register: data, range: 'since', now});
 assert.equal(firstVisit.firstVisit, true);
 assert.equal(firstVisit.start, '2026-11-10');
 assert(firstVisit.featured.some(item => item.record.id === 'earlier'));
 assert(!firstVisit.featured.some(item => item.record.id === 'outside'));
});

test('reviewed cards keep announcement status and link directly to regional evidence', () => {
 const model = briefing.buildBriefing({register, range: 'week', now: Date.parse('2026-11-06T16:00:00Z')});
 const extension = model.featured.find(item => item.record.id === 'canada-china-relief-extension');
 assert(extension);
 assert.equal(extension.status, 'Extension announced');
 const html = briefing.renderBriefing(model, {});
 assert.match(html, /What changed\?/);
 assert.match(html, /Why does it matter to Canada\?/);
 assert.match(html, /Confirm customs implementation/);
 assert.match(html, /#canada-implications\?region=SK&amp;topic=agriculture&amp;relationship=Canada-China/);
 assert.match(html, /href="https:\/\/www.canada.ca\/en\/global-affairs\/news\/2026\/11\/minister-sidhu/);
});

test('unsafe feed fields are escaped and a failed scan does not render an all-clear message', () => {
 const feed = {lastRunStatus: 'failed', changes: [
  {id: 'bad', url: 'javascript:alert(1)', title: 'unsafe link', detectedAt: '2026-11-16T14:30:00Z'},
  {id: 'observation', url: original.url, title: '<img src=x onerror=bad()>', detectedAt: '2026-11-16T14:30:00Z',
   ai: {summary: '<script>bad()</script>'}}
 ]};
 const model = briefing.buildBriefing({feed, register, now});
 assert.equal(model.groups.length, 1);
 const html = briefing.renderBriefing(model, feed, 'fr');
 assert.match(html, /Latest scan failed/);
 assert.doesNotMatch(html, /No new observations recorded|href="javascript:|<img src=|<script>bad\(\)<\/script>/);
 assert.match(html, /&lt;script&gt;bad\(\)&lt;\/script&gt;/);
 assert.match(html, / HE<\/time>/);
});

test('the normal updates entry point keeps the date selection through a feed refresh', () => {
 const stored = new Map();
 let page, pageClick;
 const root = {
  set innerHTML(value) {
   if (page) page.isConnected = false;
   page = {
    parentNode: this, isConnected: true, innerHTML: value,
    querySelectorAll: () => [], querySelector: () => null,
    addEventListener(type, handler) { if (type === 'click') pageClick = handler; }
   };
  },
  querySelector: () => page
 };
 const window = {
  document: {}, addEventListener() {}, PolicyResearchRegister: register,
  localStorage: {getItem: key => stored.get(key) || null, setItem: (key, value) => stored.set(key, value)}
 };
 const context = vm.createContext({window, URL, URLSearchParams, Date: class extends Date { static now() { return now; } }});
 vm.runInContext(fs.readFileSync(new URL('../app/daily-briefing.js', import.meta.url), 'utf8'), context);
 window.DailyBriefing.show(root, {changes: [], lastRunStatus: 'loading'});
 pageClick({target: {closest: () => ({dataset: {dailyRange: 'week'}})}});
 window.DailyBriefing.show(root, {changes: [], lastRunStatus: 'partial'});
 assert.match(page.innerHTML, /data-daily-range="week" aria-pressed="true"/);
 assert.match(page.innerHTML, /Partial coverage/);
 assert.equal(stored.size, 1);
 const html = fs.readFileSync(new URL('../app/index.html', import.meta.url), 'utf8');
 assert(html.indexOf('daily-briefing.js') < html.indexOf('agent-tools.js'));
 const agent = fs.readFileSync(new URL('../app/agent-tools.js', import.meta.url), 'utf8');
 assert(agent.includes('function updates(){window.DailyBriefing.show(root,feed);}'));
});
