# Daily policy monitoring and Bring Your Own LLM

## What runs automatically

`Daily Policy Monitor` runs at 11:17 UTC daily and supports **Run workflow** in GitHub Actions. It also runs when its source registry or workflow changes. GitHub may delay scheduled runs and can disable schedules on inactive public repositories; inspect the dashboard’s last successful check rather than assume a run happened.

The monitor reads the official sites listed in `monitor/sources.json`, checks the existing source inventory and the shared outcomes source register, discovers a bounded set of additional publications, and compares normalized main-content hashes. It retains source versions, first-detected time, source-reported publication date when available, errors and the last successful scan. Existing inventory sources are baselined, not announced as new policies. A source edit is labelled a source revision, not a legal amendment. PDF-only, inaccessible and unregistered sources are coverage gaps. This is not a guarantee of detecting every government action.

Observations are committed to `app/policy-updates.json` and `api/policy-updates.json`. Azure deployment listens for the monitor workflow’s completion and checks out the latest main branch. This avoids relying on a `GITHUB_TOKEN` commit to trigger another push workflow. No customer LLM keys are involved in daily monitoring.

## Enable the AI extraction agent

In **GitHub repository → Settings → Secrets and variables → Actions**:

1. Add repository secret `POLICY_MONITOR_API_KEY`: an owner-controlled OpenAI or Anthropic API key with a spending limit.
2. Add repository variable `POLICY_MONITOR_MODEL`: an exact model ID available to that account.
3. Optionally add variable `POLICY_MONITOR_PROVIDER`: `openai` (default) or `anthropic`.
4. Run **Actions → Daily Policy Monitor → Run workflow** to test.

Without these settings, source observation and deterministic source-backed analyst briefings still run. AI extraction is optional. With them, the agent classifies topic/relationship/subtopic, extracts a concise finding and uncertainty, and must supply an exact source quotation of at most 25 words. Source bodies are untrusted data and cannot choose tools or endpoints. Invalid quotations/classifications are rejected; automated findings remain visibly unreviewed and do not overwrite the curated inventory. A matching topic, subtopic and relationship lets an automated extraction appear in question 3 of the Relationship Explorer.

The default budget is eight model requests and sixty newly discovered pages per run. Registry limits are editable in `monitor/sources.json`. Model use is billed by the configured provider. No API key is present in source, output files or logs.

## Customers: Bring Your Own LLM

The top navigation opens a customer model panel. Customers sign in with the Azure Static Web Apps GitHub or Microsoft login, choose OpenAI or Anthropic, enter their own model ID and API key, and explicitly consent before sending their question and public evidence to their provider. They can search relevant evidence or restrict context to the explorer selection. Their provider bills them directly.

The password field and key exist only in page memory. Clear removes the key and answer. Refresh/close clears the key. The key is posted over HTTPS to the authenticated `/api/llm` endpoint and then forwarded to a fixed official provider endpoint. Application code does not store or log keys, questions or answers; Azure infrastructure and the provider still process the request. Provider retention policies apply; OpenAI requests set `store:false`.

The endpoint accepts bounded questions and record selections, supplies repository evidence rather than arbitrary URLs, limits output, and rejects missing or unmatched citations when explaining reviewed outcome records. It does not let customer prompts edit the public inventory. Source context and model interpretation remain distinct. No paid provider request has been tested without a customer/owner key.

## Azure deployment

The existing Azure workflow now deploys `api/` as managed HTTP Functions with Node 22. `api/package.json` supplies the Functions entrypoint. `/api/llm` requires the authenticated role; existing public pages remain public. No Azure subscription upgrade, paid service provisioning or stored owner model key is required for customer BYO requests. The daily schedule runs in GitHub Actions, because managed Static Web Apps Functions support HTTP triggers rather than timer triggers.

Tests: `npm run evidence:validate` and `npm test`. See `CANADA_OUTCOMES.md` for the shared-record schema, regional map and source-review workflow. Tests use mock provider responses, not paid API calls. Browser rendering, sign-in and live provider billing calls require end-to-end verification with an account.


## Provincial statistics

The same daily workflow now checks Statistics Canada WDS table 12-10-0175-01 before the source scan and publishes `app/regional-statistics.json`. The map, value bars and regional tables read the new vintage when published. Failed retrievals preserve the last valid vintage and expose a failure label. Data availability currently extends through August 2026. These monthly domestic-export observations are separate from the reviewed 3 November assessment; monitoring does not advance its substantive review date. See CANADA_OUTCOMES.md for coordinate matching, product scope, calculation rules and gaps. No LLM key is needed for this statistical collector.

## U.S. trade and investment feeds

The daily workflow also collects U.S. Census goods trade with Canada/China and the official BEA 2020–2025 detailed-country investment workbooks. It publishes the two U.S. statistical feeds and source-review flags for the reviewed U.S. register. See US_TRADE.md for measurement definitions, parser validation, retained vintages and limits. Neither collector requires a paid model or a customer API key.

## Weekly briefing and email signup

After the daily scan, the monitor prepares a weekly source-linked edition on Monday and publishes its Atom feed and archive. Visitors can subscribe from the new weekly-updates tab. To connect email signup, set Azure application setting `WEEKLY_SIGNUP_URL` to a hosted HTTPS newsletter signup page; configure that mailing service to deliver the digest or import its RSS feed. No addresses are collected by this dashboard, and email delivery is unavailable until a real provider is connected. See POLICY_READING_AND_WEEKLY_UPDATES.md.

## Validation across new statistical releases

The test suite validates live Census vintages by period coverage, unique monthly observations, source-total reconciliation and same-month comparisons. Exact numerical and rendering expectations use synthetic test fixtures, so a valid new month or source revision does not fail deployment by changing an old row count or dollar amount. The daily workflow reruns validation after refreshing the statistical feeds and before publishing them.


## Daily policy decision support (22 November 2026)

`#daily-updates` combines dated reviewed records with `policy-updates.json.briefings`. New official publications can enter the visible daily briefing without an owner model key. Each source report retains its publication and detection dates, issuing source, bounded verbatim excerpt, hash, reported instrument type, Canadian decision question and next verification action. Automated source reports remain marked **analyst review pending**; they do not change the reviewed Canada outcome assessments.

The page keeps the latest evidence for Canada–China, Canada–U.S. and U.S.–China visible on quiet days. Relationship, subject and evidence-type filters apply to the comparisons, developments, agreement watch and upcoming dates. MOUs are distinct from dialogues, proposals, regulations and measured data. Newly reviewed evidence is labelled as added to the briefing on its review date, with the original event/publication date retained.

Discovery supports official HTML, Canada.ca embedded JSON/Atom news feeds, PM news RSS, dated USTR release pages, White House releases and MOFCOM/State Council publications. Requests and redirects stay inside the fixed HTTPS allowlist. Issuing-country discovery status, failed sources and the last successful discovery survive outages. Scans older than 36 hours show an overdue warning. Historical first reads are baselines, not newly implemented policies; unknown publication dates stay in the source-review queue.

The nine additional reviewed records cover the November finance MOU, business/university MOUs, expanded future China tariff relief, the updated realized-shipment backgrounder, both sides’ implementation readouts, Canada’s trade advisory meeting, the gazetted U.S. surtax-remission amendment, and the distinct trilateral security declaration. The source register records publication, event, modification and effective dates separately.

Validate with `npm test` and `npm run evidence:validate`. Offline integration tests cover all-country discovery, no-key publication, a second revision and a complete source outage. Live source availability remains a monitored dependency; a successful workflow does not imply complete policy coverage.


## Production daily intelligence briefing (22 November 2026)

The existing 11:17 UTC daily workflow remains the unattended writer. It checks Canadian, U.S. and Chinese discovery hubs, refreshes the official statistical vintages, saves per-source retrieval status and hashes, then commits `app/daily-editions.json` alongside the policy feeds. The Azure `workflow_run` deployment publishes the resulting main branch even when the commit was made using `GITHUB_TOKEN`. No new hosting service, model key or parallel reminder is required.

`daily-intelligence.js` is shared by the collector and browser. It preserves one latest edition per Toronto calendar day for 45 days. Yesterday means the exact preceding Toronto date, not the most recent available run. The comparison distinguishes newly added reviewed evidence, amended reviewed records, source-hash revisions and first indexing. The first edition establishes a baseline; unavailable days and failed coverage never imply that no policy changed. Same-day reruns replace that day's edition without overwriting earlier dates.

Each development shows implementation stage, last source check, analyst-review date, evidence confidence, attribution limits and a next analyst action. First indexing, parser migrations and reached dates never promote an agreement to implementation. A source check establishes retrieval and a hash comparison; it is not substantive re-verification of every claim. Reviewed historical status retains its source date and scope. PDFs, executed contracts and realized deliveries require separate evidence. The CCC T400 entry is an official award report, with no invented contract value, delivery count or provincial production allocation; the USTR maritime entry links the published legal notice and its limited coverage.

The seven briefing sections share relationship, sector, instrument-type and policy-priority controls. Province and chart controls apply to the Canadian trade context, with twelve monthly observations, exact table alternatives and complete same-month YTD comparisons. Suppressed or missing values stay unavailable; U.S.–China trade is not allocated to Canadian provinces, and unsupported services topics explicitly retain all-merchandise context. Daily checking does not change a statistical reference period. Source outages and pending analyst classifications remain visible. Core briefings and charts do not require an LLM.

Validation: `npm run evidence:validate && npm test`. The offline monitor integration exercises successful retrieval, parser migration, source revision, outage preservation and persisted edition writing; the pure-model tests cover Toronto day boundaries, missing baselines, contract stages, source confidence and chart suppression.
