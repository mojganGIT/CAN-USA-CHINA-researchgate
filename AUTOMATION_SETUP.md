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

Without these settings, source observation still runs and the dashboard reports AI extraction as off. With them, the agent classifies topic/relationship/subtopic, extracts a concise finding and uncertainty, and must supply an exact source quotation of at most 25 words. Source bodies are untrusted data and cannot choose tools or endpoints. Invalid quotations/classifications are rejected; automated findings remain visibly unreviewed and do not overwrite the curated inventory. A matching topic, subtopic and relationship lets an automated extraction appear in question 3 of the Relationship Explorer.

The default budget is eight model requests and thirty newly discovered pages per run. Registry limits are editable in `monitor/sources.json`. Model use is billed by the configured provider. No API key is present in source, output files or logs.

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
