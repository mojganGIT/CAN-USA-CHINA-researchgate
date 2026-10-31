# Deployment-safe Azure Static Web Apps package

This version has no Azure Functions API and no frontend build step. Search/Ask runs directly against the single browser-side master dataset.

Azure/GitHub workflow settings:
- app_location: ./app
- api_location: leave blank or remove the line
- output_location: leave blank
- skip_app_build: true (recommended)

The `app/` folder is the deployable artifact and contains `index.html` directly.
