# U.S. Trade & Policy

The main `#us-trade` tab compares U.S. trade and policy toward Canada and China. Its four views are Trade overview, Compare sectors, Policy timeline, and Evidence & methods. Home remains concise and does not embed this analysis.

## Evidence and research

`app/us-trade-evidence.json` is the reviewed 3 November 2026 snapshot: 161 typed records from 46 primary government sources. Eight sector/policy views retain four research questions, a five-test comparison and explicitly identified Canadian implications. Records distinguish observed shipments, broad services context, historical-cost stock, net financial flows, investment income, model estimates, rules, agreements, proposals, enforcement, institutions and risk advisories. Proposal and framework values cannot become implemented outcomes through filtering.

The register includes USTR/Census trade, USDA FAS commodity values and volumes, EIA energy data, BEA investment workbooks, USITC modelling, BIS rules, Treasury/OFAC/CFIUS measures, NORAD, joint counternarcotics statements and both governments’ September 2026 framework statements. The linked Canadian fentanyl dashboard is explicitly identified as a Canadian report citing CBP; border seizure locations do not identify drug manufacturing origin or total trafficking volumes.

Research notes preserve conflicts and vintages: Census revisions, FAS versus ERS agricultural estimates, a small positive detailed EIA LNG figure versus rounded near-zero narrative language, and investment stocks versus net transaction flows. All-industry services and investment figures remain distinct from financial-services-only or digital-only trade. The review does not establish an exhaustive legal inventory, state-level employment totals, completed 2026 capex or causal welfare/job effects of the September arrangements.

## Statistical feeds

`monitor/refresh-us-trade.mjs` collects the two official Census country balance tables without an API key. `monitor/us-trade-core.mjs` maps explicit month labels, validates numeric exports/imports/balance and rejects incomplete historical years and duplicate periods. The initial successful file has 208 monthly rows and 18 annual/year-to-date rows for 2018–August 2026. Values are nominal USD millions, goods only, not seasonally adjusted; exports include re-exports. Complete-year charts exclude partial 2026. Year-to-date growth compares identical months in the prior year. Public CSV and JSON downloads retain the original values and units.

`monitor/discover-us-investment.py` reads the two official BEA detailed-country XLSX files with Python standard-library ZIP/XML processing. It reads cached numeric cells without executing workbook formulas or macros. Year columns and country rows are matched by labels; 36 unique country/year/measure observations are required per workbook. The feed contains 72 observations for Canada/China, inward/outward direction, 2020–2025 and stock/financial transactions/income. Raw disclosure markers and source cell references are preserved; missing/suppressed cells are never coerced to zero. A failed source retains its prior successful data and retrieval date.

These feeds are checked daily in the existing Daily Policy Monitor workflow and published to `app/us-trade-statistics.json` and `app/us-investment-statistics.json`. Statistical releases remain monthly or annual; daily checks do not create daily economic observations. The fixed research window remains 2018–2026, with BEA’s selected workbooks covering 2020–2025. Current services estimates remain part of the reviewed snapshot.

## Source monitoring and review

The monitor reads the additional registered HTML sources and attaches `usTradeReview` flags to affected records. BEA workbook digests feed the same review mechanism through the dedicated parser. Binary PDFs and workbooks are not mistaken for ordinary HTML. A changed source flags substantive review, preserves numeric reviewed records and does not advance the snapshot date. No customer key or owner LLM key is needed for Census/BEA collection. Optional AI source extraction retains its existing unreviewed labels.

This release does not add the U.S. snapshot to the customer LLM’s Canadian reviewed-record selection; the U.S. tab links directly to its source register and downloads.

## Validation

`npm test` covers source links/types and four-question coverage, country/topic filters, monthly/annual reconciliation, missing/zero handling, incomplete-year exclusion, comparable-month growth, markup escaping and rendered policy stages. Existing Canadian map, evidence, LLM and monitor tests remain intact. Source imports and data collection have been checked through GitHub Actions; browser preview remains restricted by saved browser permissions.
