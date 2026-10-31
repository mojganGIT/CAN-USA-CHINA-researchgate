# Canada–U.S.–China Policy Intelligence Replacement Package

This package replaces the prior deployment with one authoritative master dataset.

## Azure Static Web Apps settings
- App location: `./app`
- API location: `api`
- Output location: leave blank

## Fixes
- Populated Executive Summary is rendered on load.
- Frontend Search/Ask and API use the same master record content.
- Search supports phrases, keywords, acronyms, years, instrument names, and fentanyl typo aliases (`fentalyn`, `fentynal`, `fentinal`, `fentanly`).
- All 21 relationship × policy-field cells contain indexed records.
- Primary-source buttons are normal clickable external links.

## Deployment
Replace the existing repository `app/` and `api/` folders with these folders, commit to `main`, and let the existing Azure Static Web Apps workflow redeploy.
