# Dashboard home and navigation

The root URL opens the home hub. A persistent navigation bar links Home, Executive Summary, Compare Topics, Policy Product Map, Relationship Explorer, Daily Updates, Research Search, Evidence & Methods, and Your LLM. All destinations have real hash URLs, support direct links and are keyboard reachable. The eight home section cards and eight topic cards open their corresponding views.

The home page displays the latest monitoring result, last successful scan, source count, coverage-error link and daily source observations. It marks checks older than 48 hours as overdue. The Executive Summary view separates the dated curated assessment from a daily developments feed. Daily updates never silently replace the reviewed assessment or turn an indexing observation into a policy fact. AI extraction still requires the owner settings documented in AUTOMATION_SETUP.md.

The existing daily workflow publishes the feed and deploys it automatically. An open page refreshes the feed without cache every five minutes while visible and when the browser tab is revisited. Home status and developments update in place. Refreshing feed data does not reset customer LLM inputs or store their keys. Research search and the original map include a bounded set of recent, explicitly labelled source observations while preserving the original records.

`app/home.js` implements the hub and shared navigation; `app/home.css` provides responsive layouts. The legacy app supplies the executive assessment, map and curated search; the relationship and customer tools retain their existing implementations.

Validation: `node tests/home.test.cjs`, `node tests/explorer.test.cjs`, `node --test tests/monitor.test.mjs`. These cover route targets, all nine navigation tabs, eight topic links, live observation mapping, daily rendering, preservation of curated content, existing interaction checks and the monitor boundaries. Browser rendering, real screen-reader interaction and native print review remain unverified.
