(function (g) {
 'use strict';
 const E = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const t = value => g.DashboardI18n?.t(value) || value;
 const tx = value => E(t(value));
 const reviewedAt = '2026-11-24';
 const sources = {
  march: {title:'Implemented market access · 4 March 2026',url:'https://www.canada.ca/en/global-affairs/news/2026/03/canada-secures-renewed-market-access-with-china-to-boost-exports-and-strengthen-economic-collaboration.html'},
  rates: {title:'Department of Finance · March 2026 tariff detail',url:'https://www.canada.ca/en/department-finance/corporate/transparency/briefing-materials/2026/briefing-binder-created-on-occasion-their-appearance-standing-senate-committee-on-national-finance-on-march-10-2026.html'},
  extension: {title:'Relief extension agreed · 4 November 2026',url:'https://www.canada.ca/en/global-affairs/news/2026/11/minister-sidhu-announces-extension-of-favourable-market-access-for-canadian-canola-meal-peas-lobsters-and-crab-through-2028.html'},
  leaders: {title:'Leaders’ meeting readout · 17 November 2026',url:'https://www.pm.gc.ca/en/news/readouts/2026/11/17/prime-minister-carney-meets-president-peoples-republic-china-xi-jinping'},
  expansion: {title:'Expanded arrangement · 17 November 2026',url:'https://www.pm.gc.ca/en/news/backgrounders/2026/11/17/prime-minister-carney-advances-canadas-strategic-partnership-china'},
  finance: {title:'Canada–China Financial Working Group · 3 April 2026',url:'https://www.canada.ca/en/department-finance/programs/financial-sector-policy/joint-statement-on-launch-canada-china-financial-working-group.html'}
 };
 const tariffRows = [
  {id:'canola-seed',topic:'agriculture',title:'Canola seed exported to China',basis:'Combined applied tariff',before:84.8,after:14.9,scope:'The combined rate includes the most-favoured-nation duty and anti-dumping duty.',status:'Implemented from 1 March 2026',sources:['rates','march']},
  {id:'canola-meal',topic:'agriculture',title:'Canola meal exported to China',basis:'Additional anti-discrimination tariff',before:100,after:0,scope:'The additional duty is suspended. The November agreement extends relief through 31 December 2028.',status:'Implemented March 2026 · extension agreed November 2026',sources:['march','extension']},
  {id:'lobster-crab',topic:'agriculture',title:'Lobster and crab exported to China',basis:'Additional anti-discrimination tariff',before:25,after:0,scope:'The additional duty is suspended. Product classifications and other import requirements still apply.',status:'Implemented March 2026 · extension agreed November 2026',sources:['rates','march','extension']},
  {id:'ev',topic:'vehicles',title:'China-origin EVs imported within Canada’s quota',basis:'Additional Canadian surtax',before:100,after:0,scope:'Within-quota imports pay the 6.1% MFN tariff. The initial annual quota is 49,000 vehicles; this chart does not describe out-of-quota treatment.',status:'Implemented from 1 March 2026',sources:['march']}
 ];
 const stories = {
  all: ['March implementation reopened selected agricultural access and introduced within-quota EV treatment. A November agreement extends existing relief through 2028; wider product coverage is scheduled to begin in January 2027.','More predictable access can widen Canadian exporters’ options while imported EVs change competitive conditions. Compare shipments, domestic production and employment before identifying a net Canadian gain.',['march','extension','expansion']],
  vehicles: ['Canada implemented a 49,000-vehicle initial annual quota at a 6.1% tariff from March 2026. Within that quota, the previous 100% surtax was removed.','Lower import barriers change consumer choice and competition. Canadian assembly, battery orders, completed investment and jobs determine whether domestic capacity also benefits.',['march']],
  agriculture: ['Tariff relief implemented in March was followed by a November agreement extending access for canola meal, peas, lobster and crab through the end of 2028.','The longer access window helps exporters plan. Prairie crops and coastal seafood need separate shipment, price and employment checks; relief alone does not establish realized gains.',['march','extension']],
  energy: ['Pacific LNG exports began in 2025, before the 2026 partnership. The original infrastructure map and dated project footage show the physical route to overseas markets.','Western Canadian production can reach additional buyers. Destinations, delivered volumes and Canadian supplier participation matter more than capacity announcements alone.',[]],
  finance: ['The Financial Working Group met in April 2026. The November leaders’ readout reports further financial and regulatory engagement.','Dialogue can identify access barriers. Track actual licences, delivered services and deployed capital to establish whether Canadian institutions benefit.',['finance','leaders']],
  technology: ['The November leaders’ readout identifies cooperation on AI governance. A measured bilateral technology outcome is not established by the reviewed sector assessment.','Monitor data rules, intellectual property and Canadian capability alongside cooperation. General trade charts remain background, not evidence of digital-sector gains.',['leaders']],
  security: ['The November leaders’ readout identifies continued security communication and border cooperation against illicit drugs.','Commercial engagement creates monitoring needs for sensitive technology, infrastructure and enforcement. A diplomatic commitment does not measure improved Canadian security.',['leaders']],
  investment: ['The original Statistics Canada chart distinguishes the ultimate owner of investment from the immediate investor country. Its reference period is year-end 2025.','Ownership concentration informs screening and diversification. Investment stocks must be separated from new spending, operational capacity and Canadian jobs.',[]],
  agreements: ['The November expansion adds product coverage scheduled for January 2027 and extends existing relief. The official recordings provide dated diplomatic context.','Separate signed commitments, implemented customs treatment and later commercial results when briefing Canadian decision makers.',['extension','expansion']]
 };
 const questions = {
  overview:'Start with the policy change, then inspect the original visual and Canadian outcome evidence.',
  compare:'Compare the same product, geography, reference period and evidence test across sectors.',
  policy:'Use the timeline to separate a meeting, an agreement and an implemented measure.',
  relationship:'Follow the selected mechanism from source to finding to Canadian implication.',
  evidence:'Open the provenance beneath each visual and compare it with the underlying records.',
  products:'Check which product is covered, which rate applies and when the treatment takes effect.',
  trends:'Read the chart’s original units and period before interpreting a trend.',
  map:'Use the provincial map to identify exposure; national source visuals keep their national scope.'
 };
 let selectedProduct = 'canola-seed';
 const link = key => `<a href="${E(sources[key].url)}" target="_blank" rel="noopener noreferrer">${tx(sources[key].title)} ↗</a>`;
 function summary(state, records = []) {
  const historical = state.year !== 'all' && state.year !== '2026';
  const story = stories[state.topic] || stories.all;
  const row = records.find(r => r.kind !== 'update' && r.summary);
  const changed = historical ? row?.summary || 'No reviewed summary matches this reference year and sector. Use the dated records below.' : story[0];
  const why = historical ? row?.why || 'Historical evidence describes its original period. Later agreements do not rewrite those outcomes.' : story[1];
  return `<section class="cc-briefing" data-no-translate aria-labelledby="cc-briefing-title"><p class="hub-eyebrow">${tx('CANADA–CHINA · ANALYST BRIEF')}</p><h3 id="cc-briefing-title">${tx('What Changed and Why It Matters')}</h3><div class="cc-briefing-reading"><div><h4>${tx('Summary')}</h4><p>${tx(changed)}</p></div><div><h4>${tx('Why It Matters to Canada')}</h4><p>${tx(why)}</p></div></div><p class="bilateral-meta">${tx(questions[state.view] || questions.overview)}</p>${!historical?`<details class="bilateral-source-details" data-bilateral-detail="cc-summary"><summary>${tx('Source, dates and evidence')}</summary><p>${tx('Summary reviewed')}: ${reviewedAt} · ${tx('Analyst interpretation')}</p>${story[2].length?`<ul>${story[2].map(k=>`<li>${link(k)}</li>`).join('')}</ul>`:`<p>${tx('The original visual and its reference dates are documented in the source panel below.')}</p>`}<p>${tx('Review dates do not change statistical reference periods or establish an agreement’s causal effect.')}</p></details>`:''}</section>`;
 }
 function availableTariffs(state) {
  if(state.year !== 'all' && state.year !== '2026') return [];
  return tariffRows.filter(r => ['all','agreements'].includes(state.topic) || state.topic === r.topic);
 }
 function tariff(state) {
  const rows = availableTariffs(state); if(!rows.length) return '';
  const row = rows.find(r=>r.id === selectedProduct) || rows[0];
  const pct = n => new Intl.NumberFormat(g.DashboardI18n?.locale || 'en-CA',{maximumFractionDigits:1}).format(n) + '%';
  const bars = [[row.before,'Before March 2026','before'],[row.after,'From March 2026','after']];
  return `<section class="cc-tariff" data-no-translate aria-labelledby="cc-tariff-title"><p class="hub-eyebrow">${tx('PRODUCT-SPECIFIC ACCESS')}</p><h3 id="cc-tariff-title">${tx('Canada–China Interactive Tariff Comparison')}</h3><p>${tx('Choose a product to compare the documented treatment before and after March 2026. Each selection identifies whether the chart shows a combined rate or an additional duty.')}</p><label for="cc-tariff-product">${tx('Tariff product')}<select id="cc-tariff-product" data-cc-tariff-product>${rows.map(r=>`<option value="${r.id}"${row.id===r.id?' selected':''}>${tx(r.title)}</option>`).join('')}</select></label><figure><figcaption><strong>${tx(row.title)}</strong><span>${tx(row.basis)}</span></figcaption><div class="cc-tariff-bars" role="img" aria-label="${E(t(row.title)+': '+t(row.basis)+'; '+bars.map(([v,label])=>t(label)+': '+pct(v)).join('; '))}">${bars.map(([v,label,key])=>`<div class="cc-tariff-row"><span>${tx(label)}</span><div class="cc-tariff-track"><i class="${key}" style="width:${v}%"></i></div><strong>${E(pct(v))}</strong></div>`).join('')}</div><p class="bilateral-meta">${tx('Rate shown (%) · fixed 0–100 scale · not a trade-weighted average')}</p></figure><p class="bilateral-badge">${tx(row.status)}</p><p>${tx(row.scope)}</p><div class="source-media-memo"><p><strong>${tx('Summary')}</strong><span>${tx('The chart shows a documented change in market access for the selected product.')}</span></p><p><strong>${tx('Why it matters to Canada')}</strong><span>${tx('Tariff relief changes trading conditions. Verify actual customs treatment, shipments and Canadian production before assessing gains or losses.')}</span></p></div><details class="bilateral-source-details" data-bilateral-detail="cc-tariff"><summary>${tx('Source, dates and evidence')}</summary><p>${tx('Dashboard chart calculated from official published rates; it is not a publisher graphic.')}</p><p>${tx('Effective date')}: 2026-03-01 · ${tx('Summary reviewed')}: ${reviewedAt}</p><ul>${row.sources.map(k=>`<li>${link(k)}</li>`).join('')}</ul><table><caption>${tx(row.basis)}</caption><thead><tr><th scope="col">${tx('Period')}</th><th scope="col">${tx('Rate shown (%)')}</th></tr></thead><tbody>${bars.map(([v,label])=>`<tr><th scope="row">${tx(label)}</th><td>${E(pct(v))}</td></tr>`).join('')}</tbody></table><p>${tx('The November expansion schedules additional products for 1 January 2027. Those prospective rates are not plotted as implemented 2026 treatment.')}</p></details></section>`;
 }
 function visuals(state, feed = {}) {
  const media = g.SourceMedia; if(!media) return tariff(state);
  const items = media.matching({relationship:'Canada-China',topic:state.topic,year:state.year},feed);
  const priority = ['gac-trade-partners-q2-2026','canada-china-apec-video-2026','statcan-fdi-2025','cer-gas-network-2026','canada-china-partnership-video-2026','lng-first-cargo-video','lng-site-video-2026'];
  const ranked = [...items].sort((a,b)=>(priority.includes(a.id)?priority.indexOf(a.id):99)-(priority.includes(b.id)?priority.indexOf(b.id):99));
  const options = {keyPrefix:'bilateral-canada-china-'+state.view,translate:t};
  return `<div class="cc-visuals" id="cc-visuals" data-no-translate>${tariff(state)}<section class="source-media-collection"><h3>${tx('Canada–China Source Visuals and Canadian Implications')}</h3><p>${tx('Original publisher graphics and official recordings are shown directly. Their reference periods and scope remain separate from the analyst brief.')}</p>${ranked.length?media.render(ranked.slice(0,4),options):`<p class="bilateral-meta">${tx('No verified source visual matches this sector and reference year. The evidence records remain available; no substitute illustration has been assigned.')}</p>`}${ranked.length>4?`<details data-bilateral-detail="cc-more-visuals"><summary>${tx('More source visuals')} (${ranked.length-4})</summary>${media.render(ranked.slice(4),options)}</details>`:''}</section></div>`;
 }
 function selectProduct(id) { if(!tariffRows.some(r=>r.id===id)) return false; selectedProduct=id; return true; }
 const api = {summary,visuals,tariff,availableTariffs,selectProduct,tariffRows,sources,stories,reviewedAt};
 if(typeof module!=='undefined' && module.exports) module.exports=api;
 if(g) g.CanadaChinaVisuals=api;
})(typeof window==='undefined'?null:window);
