# Deployment-safe Azure Static Web Apps package

This version has no Azure Functions API and no frontend build step. Search/Ask runs directly against the single browser-side master dataset.

Azure/GitHub workflow settings:
- app_location: ./app
- api_location: leave blank or remove the line
- output_location: leave blank
- skip_app_build: true (recommended)

The `app/` folder is the deployable artifact and contains `index.html` directly.


## Canada outcomes release

The overview includes the interactive 13-region Canada map, seven five-test assessments, synchronized comparisons, policy timeline and resilience indicators. The same dated source records ground the optional customer LLM. Daily source monitoring flags revisions without inventing new outcomes. See [CANADA_OUTCOMES.md](CANADA_OUTCOMES.md) and [AUTOMATION_SETUP.md](AUTOMATION_SETUP.md).

Validation: `npm run evidence:validate && npm test`.


## U.S. Trade & Policy

The `#us-trade` tab compares the United States’ trade and policy approaches toward Canada and China across eight topics. It provides Census monthly/annual goods data, services and investment snapshots, policy milestones and a source-searchable evidence register. See US_TRADE.md for definitions, provenance, update behaviour and verification.

Policy explanations and weekly subscriptions: see [POLICY_READING_AND_WEEKLY_UPDATES.md](POLICY_READING_AND_WEEKLY_UPDATES.md). The RSS feed works now; email delivery requires a configured newsletter service.

The navy/gold/beige dashboard supports English, French and Simplified Chinese. See [TRILINGUAL_DASHBOARD.md](TRILINGUAL_DASHBOARD.md) for language selection, translation maintenance, data preservation and verification.

Weekly feeds are available in [English](https://ambitious-field-09c66cd10.1.azurestaticapps.net/weekly-updates.xml), [French](https://ambitious-field-09c66cd10.1.azurestaticapps.net/weekly-updates.fr.xml) and [Simplified Chinese](https://ambitious-field-09c66cd10.1.azurestaticapps.net/weekly-updates.zh.xml). The dashboard selects the matching feed automatically.


## Daily policy briefing

Daily Updates uses the supplied seven-section briefing structure: executive summary, priority developments, sector updates, country/relationship updates, the four Stronger Canada dimensions, monitoring and Canadian policy implications. It combines automatic primary-source reports with reviewed evidence, agreements/MOUs/contract-award filters, implementation stages, separate claim confidence and attribution, source-check timestamps and next analyst actions. Interactive Statistics Canada charts support all 13 jurisdictions, exact data tables, export values and destination shares. A 45-edition archive supports exact comparisons with yesterday; missing calendar-day baselines are disclosed. Country-level discovery status and overdue warnings expose coverage gaps. Core briefings run without an LLM key. See [AUTOMATION_SETUP.md](AUTOMATION_SETUP.md#daily-policy-decision-support-22-november-2026).

## Stronger Canada

`#stronger-canada` opens eight sector pages, each with the same five sections: overview, current developments, policy alignment, strategic implications and monitoring. Four expandable assessments apply trade diversification, domestic capacity, supply-chain resilience and economic security to every sector. Findings are favourable, adverse, mixed or insufficient evidence, with dated shared records and separate observation and attribution confidence. These four dimensions are the dashboard's analytical framework, not a claim that the government plan has only four priorities.

The eight-by-four comparison matrix opens the same supporting assessments and can filter shared dependencies. Province/territory selections carry into the Canada map. National, foreign and other-province observations remain labelled context; provincial findings require explicitly linked local evidence and a reviewed regional assessment. Provincial goods statistics are used only for the three matching goods categories. Finance covers financial services and financing; investment covers ownership, productive projects and screening. Energy now includes a separately sourced critical-minerals project observation, without treating energy totals or future jobs as mineral production or current employment.

`app/stronger-canada-framework.js` stores the trilingual sector framework, typed research/outcome references, per-assessment review dates, explicit regional signals and dimension-specific watch items. `app/stronger-canada-data.js` retains direction text, primary references and the plan/fiscal crosswalk. Additional records merge into `PolicyResearchRegister`; outcome references resolve to the existing evidence objects. The national-security plan's eight capabilities remain distinguished from the dashboard's eight categories, including the pharmaceuticals/biotech coverage gap. The April 2026 fiscal update remains a dated commitment baseline.

The existing daily monitor maps linked source revisions and reached milestones to affected dimensions. Unclassified new reports enter an analyst queue without guessed dimension labels. Review flags never change a finding or upgrade a signed agreement to implemented access. Monitoring failures, stale coverage and pending statistical-source reviews remain visible; PDFs require separate document review. After substantive review, update the affected shared records and the specific assessment's `reviewedAt`, and resolve pending source-review records through the existing monitoring workflow. A framework-wide review date alone does not clear statistical-source flags. No new LLM credentials, hosting resources or domain changes are required.
