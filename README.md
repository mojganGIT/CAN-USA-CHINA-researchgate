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
