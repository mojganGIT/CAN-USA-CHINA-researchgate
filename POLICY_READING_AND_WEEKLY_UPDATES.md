# Policy reading and weekly subscriptions

The dashboard keeps the reviewed Canadian and U.S. registers unchanged. `app/policy-narrative.js` adds three short answers wherever an evidence item is opened: what changed, why Canada should care, and how provincial exposure may differ. The first answer retains the source finding and distinguishes a level, a proposal, a model estimate, an administrative permit, a stock or an implemented measure. The implications are explicitly analytical interpretation. No provincial outcome is allocated from national data.

Underlined statistical values are native buttons. They open a keyboard-accessible dialog with the same three answers, reference period and original source. This includes the provincial export table and monthly data, Canadian assessment statistics, U.S. annual/monthly goods values, headline goods cards and the services/investment snapshot. Comparable prior-period values are used only when available. Missing, suppressed and unavailable values stay unavailable. Existing map colours, filters, downloads, record IDs and dates are preserved.

Home remains concise. Detailed narratives stay in evidence drawers and statistic dialogs. Tab introductions explain how an advisor can move from a question to a comparison, implemented policy or measured trend.

## Weekly editions

The main navigation includes **Subscribe to receive weekly updates** (`#weekly-updates`). Visitors can read an edition, choose older editions, copy the feed address and subscribe using an RSS/Atom reader:

https://ambitious-field-09c66cd10.1.azurestaticapps.net/weekly-updates.xml

`monitor/build-weekly-digest.mjs` runs after the daily monitor. It creates one edition on Monday, or an opening edition when no archive exists; it preserves an edition once published and retains up to 52 editions. Scheduling may be delayed by GitHub. It does not create or send personal ChatGPT notifications.

The digest distinguishes:

- Source discoveries/revisions detected in the preceding seven days, with the source publication date kept separate. Up to eight observations are shown; the full count and daily-history link remain visible.
- Up to six changed reviewed records, identified by record fingerprints. An opening selection is labelled a baseline, not new policy. Original sources, review date, period and the three policy answers accompany each item.
- Changes in collected statistical values or coverage, kept separate from reviewed findings. A data revision is not presented as a new economic or policy effect.

The Atom feeds in English, French and Simplified Chinese include the narrative and direct evidence links. The subscription URL follows the selected dashboard language. Its identifiers are stable across retrievals. The JSON archive preserves dates, coverage errors and the analytical interpretations used for that edition. The normal monitor commit and its existing Azure deployment publish these files.

## Connect an email signup service

RSS subscriptions work without an email provider. Email signup is deliberately unavailable until the owner supplies a real hosted newsletter signup URL. There is no form that appears to collect an address without delivering a subscription.

To enable email signup, set Azure Static Web App application setting `WEEKLY_SIGNUP_URL` to the mailing provider's public **HTTPS** signup page. The public GET endpoint `/api/weekly-subscription` returns only that URL and whether it is available. The tab then links to the provider for address entry, consent, confirmation, preferences and unsubscribe. No subscriber data or mailing credentials pass through this dashboard. Connecting a signup link does not by itself schedule provider emails: the mailing provider must send the weekly digest or support RSS-to-email from the feed above.

No newsletter account, mailing list or paid service has been provisioned, and no email messages have been sent. Email delivery remains dependent on that provider configuration.

## Validation

`npm test` validates all 220 reviewed records' three-answer coverage, evidence preservation, measurement distinctions, statistical direction/comparable periods, HTML escaping, navigation, digest cadence/idempotency, detection windows, baseline labels, source coverage, safe email-link configuration and asynchronous route preservation. Existing geography, map colour, monitor and customer-model checks remain in place. The generated Atom XML is also parsed before publication. Browser visual QA remains restricted by the saved browser permission.
