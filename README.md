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
