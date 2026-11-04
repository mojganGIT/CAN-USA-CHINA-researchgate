# Office palette and three-language dashboard

The dashboard uses dark navy (`#122b49`), gold (`#d6af60`) and beige (`#f2eadc`), with warm paper surfaces. Text, navigation, forms, evidence drawers, research tools and print styles share the palette. U.S./Canada/China comparison charts and measured-exposure map layers use matching navy/gold palettes. Outcome-map colours still retain their distinct analytical meaning and agree with their legend and region table.

## English, French and Simplified Chinese

The header exposes **English / Français / 简体中文**. A language can also be selected by URL: `/?lang=fr#home` or `/?lang=zh-Hans#home`. The choice is saved as the single local preference `policy-dashboard-language`; no model keys, form answers or evidence are stored by this feature.

`app/translations-ui.js` and `app/translations-content.js` contain the authored French/Chinese terminology, interface copy, reviewed findings and policy narratives. `app/i18n.js` applies these translations to visible text, placeholders, titles and accessible labels. Dynamic statistical statements use templates that preserve their actual numbers, currencies, periods and geographic scope. All 220 reviewed records, eight assessments and 72 research relationship briefings retain their English source data; the translation layer does not rewrite the data registers or API source context. New source titles and quotations can retain their publication language. Source links, JSON/CSV downloads and citations remain unchanged.

Language switching changes text in place, without rerendering the selected view. It preserves open evidence, filters, route keys, entered questions and session-only provider keys. The document `lang` attribute and CJK font stack follow the selection. Newly rendered views and daily updates are handled by a bounded DOM observer. Script, code, source quotations, user input and model-generated answers are not translated by the text walker. English can be restored from each node's original text.

French and Chinese search aliases match the original English evidence. Multiword U.S. evidence queries match all search terms. The customer LLM request includes a supported language code and an optional bounded retrieval query. Only fixed English/French/Simplified-Chinese response instructions are accepted; source IDs, authentication, key handling and citation validation remain unchanged. No paid model call was used for translation or testing.

The weekly briefing also fixes date-only review dates at midday before formatting, so a November 3 review is not displayed as November 2 in Toronto. Weekly RSS editions are available in English, French and Simplified Chinese. Source titles, source URLs and external documents retain their publication identity. The selected dashboard language updates the subscription link and copied address without replacing open edition content.

## Maintenance and verification

When changing a user-facing phrase, add its French and Chinese forms to the translation dictionaries. Preserve source identifiers, units and interpretation limits. Newly reviewed findings should include matching translations; new live statistical months continue to use dynamic templates rather than fixed totals.

`tests/i18n.test.mjs` checks reviewed-record and subtopic coverage, numerical/period preservation, language restoration, filter and form retention, accessible labels, search aliases, fixed customer-model language instructions and text contrast. Existing map/legend, monitoring, data-vintage, source-integrity, navigation and subscription tests remain active. Text/attribute snapshots were inspected across the 15 routes, eight topics and 72 relationship briefings. Browser visual QA remains restricted by the saved browser permission.

## Weekly language feeds and refreshes

`monitor/build-weekly-digest.mjs` publishes `weekly-updates.xml`, `weekly-updates.fr.xml` and `weekly-updates.zh.xml`. All three keep the canonical issue date, reference periods, source URLs and separate labels for reviewed baselines, source observations and statistical revisions. Each language has stable feed and entry identities; the original English entry IDs remain unchanged. Missing or revised translations regenerate between weekly editions without creating a new issue. The daily workflow publishes all feed files together, and the document head advertises each language.

Common French and Simplified Chinese locale aliases are accepted. Browser back/forward navigation restores an explicit URL language without clearing filters or form entries. Missing-data, unchanged-export and year-end investment statements have native-language templates rather than partially translated sentences.
