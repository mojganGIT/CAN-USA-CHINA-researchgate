# Canada-US-China Policy Intelligence Dashboard update

Azure Static Web Apps-ready static package containing the revised executive summary, three relationship tabs, Ask/Search box, and seven policy-field cards.

## Apply to an existing GitHub-connected Azure Static Web App
1. Upload/replace `index.html` and `staticwebapp.config.json` in the repository path configured as the Static Web Apps app location.
2. Commit the changes to the branch used by the Azure Static Web Apps workflow (commonly `main`).
3. GitHub Actions should run the Static Web Apps deployment workflow after the push.
4. When the workflow completes, refresh the Azure site.

Note: this package implements local category search. Connecting the Ask/Search control to a live research backend requires the existing backend endpoint/configuration, which was not available in the retrieved files.
