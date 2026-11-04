# Canada Implications Explorer

The first release answers: **What changed in this province, which evidence demonstrates it, and how confidently can we connect it to the new arrangements?**

## Stage 1 — Shared evidence and the Canada map

`app/evidence-records.json` is the canonical reviewed snapshot. It contains 59 observations, 28 original sources, seven completed topic assessments, a pending technology assessment, eight policy events, and 13 regional profiles. The 3 November 2026 assessment is the starting snapshot; reference periods are retained separately. The browser and authenticated LLM API use the same records. `api/evidence-records.json` is a generated mirror validated byte for byte.

The overview implements the Canada map from the assessment as native SVG, with published province/territory geometry in `app/canada-map.json`. No external map or visualization service is required. Regions support pointer, Enter/Space and a native select. Every record expands to its original source, reference period, publication date, review date, geographic scope and attribution limits. The original policy map and relationship research remain in Research tools.

`regions` on an evidence record means **documented relevance**. `observationRegions` means the region in which a project/employer/provincial observation actually occurred. This distinction prevents a Kitimat asset with upstream Alberta relevance from being presented as an observed Alberta project. National values remain national wherever they are displayed.

## Stage 2 — Connected comparisons, timelines and resilience

The overview, comparisons, timeline and evidence register share region, topic, relationship, period and measure filters. State is encoded in the URL hash for repeatable links and is retained when navigating the four main areas. The map additionally offers evidence-summary, observed-outcome, exposure and policy-coverage layers. Policy-coverage colours indicate relevant records; users must inspect the documented implementation stage.

Each assessed topic has the same five tests: shipments/business delivered, Canadian supply chains, completed investment, implemented tariffs/policy, and regional employment. Investment stocks, financial flows, investment decisions, foreign-affiliate measures and quota utilization are labelled context and cannot become completed capex or shipments through presentation alone. Investment and agreements are cross-cutting views and are not added to industry totals. Technology's earlier research remains accessible while its outcome assessment is pending.

Policy status, effective/expiry dates and observed commercial results are separate fields. Linked evidence can predate a policy and does not prove a causal connection. Resilience indicators retain concentration measures, operating export alternatives, historical domestic supply-chain participation and treaty-review uncertainty separately. There is no invented net-benefit, jobs or confidence score.

## Stage 3 — Daily monitoring and optional customer LLM

The existing **Daily Policy Monitor** GitHub Actions workflow runs at 11:17 UTC daily, and when the monitor registry/code or canonical evidence snapshot changes. It reads registered official and primary-source HTML pages and publishes versioned observations and coverage status. The existing Azure workflow deploys after successful monitor workflow completion so updates do not depend on a bot commit triggering another push workflow. GitHub schedules can be delayed or disabled for repository inactivity.

`monitor/assessment-review.mjs` maps source checks back to affected reviewed records. The first read establishes a content baseline. Later hash changes set a persistent review flag for that snapshot version. A source outage preserves the last successful read and reviewed values. A source change never automatically promotes a policy stage, replaces a number, or advances the substantive review date. PDF-only and structured-statistical sources require dedicated parsers or substantive review. Coverage and errors are visible in Evidence & Methods.

Owner AI extraction remains optional and is visibly unreviewed. Configure `POLICY_MONITOR_API_KEY` as a GitHub Actions secret and `POLICY_MONITOR_MODEL` / optional `POLICY_MONITOR_PROVIDER` as Actions variables to enable it. Without these settings the scheduled source observation still runs. This release provisions no additional Azure service.

**Explain selected evidence with my LLM** transfers the active evidence selection into the existing authenticated BYLLM panel. OpenAI and Anthropic have fixed provider endpoints. Customers supply a model and session-only key and explicitly consent before sending a request. At most 12 relevant source records are supplied. The reviewed record payload includes units, geography, periods, original sources and limitations. Explanations based on reviewed records with missing or unknown citation IDs are rejected. The model cannot edit the public dataset. An empty explicit selection cannot silently fall back to unrelated evidence. No live paid provider request is made during automated tests.

## Updating reviewed findings

1. Read the original source and determine reference period, geographic scope, measurement type and implementation status.
2. Update `app/evidence-records.json`, including its version, review date and affected assessments/policies. Do not treat every source read as a substantive review.
3. Run `npm run evidence:sync` and `npm test`.
4. Commit the canonical file and generated API mirror together. Azure deployment validates both before publishing.

The data file is downloadable from Evidence & Methods. Historical snapshots and source-observation revisions remain in Git history; monitor state retains current/previous content hashes.

## Verification

`npm test` covers the existing research tools plus geography preservation, five-test/source integrity, historical-period filtering, exclusion of decisions/stocks from local outcomes, synchronized rendering/state, input escaping, source-change/outage behaviour and grounded LLM citation boundaries. Provider responses are mocked. Browser interaction and responsive layout have not been rechecked for the provincial statistics addition; customer sign-in and billed provider calls also need an account-specific live check.

## Official provincial merchandise statistics

`monitor/refresh-regional-stats.mjs` checks Statistics Canada table 12-10-0175-01 daily in the existing monitor workflow. It discovers dimension members from official metadata and retrieves 168 series: Canada plus 13 provinces/territories × United States, China and all countries × total merchandise, farm/fishing/intermediate food products, energy products, and motor vehicles/parts. It retains the latest 24 monthly points per series. The initial successful vintage contains 4,032 points through August 2026. Monthly series can be revised; checking daily does not create daily observations.

WDS responses may arrive in a different order from requests. Each result is matched by its official coordinate, and duplicate, missing or unrecognized coordinates reject the new vintage. `mappingVersion: 2` identifies this validated mapping. A failed refresh preserves only a previously valid vintage and its retrieval date. Source scale/status/security/revision codes remain in `app/regional-statistics.json`.

The separate **Measured export dependence** map layer shades each region by U.S. share (All relationships or Canada–U.S.) or China share (Canada–China) of matching all-destination domestic exports. The same regional selection drives the paired value bars, 13-region statistical table and monthly value table. The table includes national totals read directly from the source, rather than calculated from provincial figures. These unadjusted customs-basis domestic-export values exclude re-exports and services and are not interchangeable with the reviewed assessment's seasonally adjusted balance-of-payments figures. Broad merchandise categories are not exact EV/battery or seafood industries. Unsupported service/policy topics retain an explicit all-merchandise context label; U.S.–China trade is not allocated to Canadian regions.

Year-to-date calculations require all January-to-reference-month values. Missing, suppressed, rounded-to-zero and unpublished values remain unavailable. True zeros remain zero; zero comparison bases do not produce an infinite growth rate. Tests reverse simulated API responses, verify monetary scales and geography, preserve the last valid vintage on failure and check rendered regional controls. Printing opens evidence drawers and restores their prior state afterward.


## Regional map colour correction

The SVG, current-layer legend, selected-region key and 13-region register now use one `mapPresentation` result per region code. The measured-export layer uses its statistical percentage in the register rather than an unrelated qualitative category. Legends show categories actually present in the active layer. Explicit SVG fills, stronger colours and borders preserve the meaning during hover and selection; versioned map assets prevent stale styles after deployment. A regression test checks all 13 region codes across five map layers and three relationship selections, and verifies the selected-region key. File-based SVG rendering confirms the published geometry and colour fills. Live browser inspection and preview were blocked by network/saved browser permission restrictions for this correction.

## Restored home entry point

The home hub precedes the complete embedded map and retains all statistical and evidence panels. Home and Briefing Overview are distinct primary-navigation destinations. `#canada-implications` opens the full map workspace directly and retains shared filters. This change updates presentation and routes only; no underlying dataset or policy finding changes. See HOME_PAGE.md.
