# U.S. state trade map

The U.S.–China Policy and Trade main tab opens the new State trade map view. Existing national overview, sectors, policy timeline and evidence views remain in the same tab. The map covers all 50 states plus Washington, D.C., with Alaska and Hawaii insets and callouts for small northeastern jurisdictions.

The initial snapshot uses 2025 annual goods-export figures from the canonical USTR pages under /countries-regions/united-states-trade-data/. It includes total state goods exports, explicitly reported Canada/China leading-market values and the largest manufacturing export category. It does not copy numbers from the older /map/state-benefits/ pages, which can carry a different vintage.

All 50 state profiles supplied a total; the DC profile was unavailable. Canada values were explicitly reported for 47 states, and China values for 25. An unreported country in a leading-market profile is not zero trade. The map therefore includes neutral missing-data shading, a reference-year selector and a coverage count for the active layer.

Value shading uses nominal USD bands. Share shading calculates the selected destination’s share of the same state’s rounded total goods exports. The legend, state paths and table swatches use the same model function. This is descriptive export exposure, not a score of gains/losses or a causal policy result. State export origin of movement is not necessarily manufacturing origin; the source does not supply complete state imports, services or monthly partner data.

Map geometry comes from the U.S. Census Bureau CitySDK 2022 generalized state boundaries. Albers projections and inset placement are stored as SVG paths in app/us-state-map.json. State codes, names, shapes and data are joined by postal abbreviation, never row order.

Every state is accessible from its SVG shape, a native select and an expandable all-state table. The selected panel compares both partners, explains the Canadian policy connection, identifies evidence and uncertainty, and links to the original source and national comparisons. English, French and Simplified Chinese labels are provided. On narrow screens the map can scroll horizontally while the state selector and table remain available.

The state statistics are a stateTrade object in app/us-trade-statistics.json. The existing daily U.S. goods collector refreshes canonical USTR profiles with four concurrent requests, validates state identity/reference periods and retains previously published values when a source fails. The existing workflow already tracks the national JSON file, so the state object is published through that pipeline without adding a new service or API key.

Validation checks 51-state geometry/data joins, missing-value handling, share/value bins, original source parsing, state/period mismatches, refresh outages, concurrency limits, all state fills, table colours, language switching and the map route when national evidence is unavailable. A static boundary render was inspected; live browser preview remains restricted by saved browser permissions.
