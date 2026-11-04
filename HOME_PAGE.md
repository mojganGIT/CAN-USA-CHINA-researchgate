# Dashboard home and navigation

The root URL and `#home` open an explicit Home page. Persistent navigation exposes **Home** plus the four main areas: Briefing Overview, Compare Topics, Policy Tracker, and Evidence & Methods. Executive Summary, Canada Implications Explorer, Policy Product Map, Relationship Explorer, Daily Updates, Research Search, and Your LLM remain in Research tools and are also reachable through home-page cards.

The home page starts with the Canada–U.S.–China research question, executive-summary and Canada-map shortcuts, daily monitoring status, and 11 clickable section cards. Eight topic cards open the corresponding Canada outcome comparison; the Relationship Explorer still provides the existing subtopic/relationship research. The latest source observations follow the topic links. The full Canada Implications Explorer stays embedded below, including all 13 regions, statistical tables, five evidence tests, regional outcomes, resilience information, expandable sources and limitations. It also has a dedicated `#canada-implications` route.

This restores a clear home without removing the map or moving evidence out of reach. Shared province, topic, relationship, period, measure and layer filters survive navigation between Home and the detailed assessment views. Direct links and keyboard navigation work throughout. Unknown routes recover the home page and mount its map.

The home page shows the last successful monitoring check, source count, coverage-error link and daily source observations. Checks older than 48 hours are marked overdue. Daily observations and statistical releases retain dates distinct from the reviewed assessment. AI extraction still requires the owner settings documented in AUTOMATION_SETUP.md.

The existing daily workflow publishes source observations and the provincial statistics feed and deploys them automatically. An open page refreshes the feed without cache every five minutes while visible and when revisited. Status and developments update in place. Customer model inputs and session keys are not stored or reset by a feed refresh.

No evidence, geometry, statistical, inventory or policy-update dataset changes are part of this home restoration. The 59 reviewed records, 28 sources, eight policies, 168 provincial statistical series, 13 map geometries, original policy inventory and 72 relationship briefings remain intact.

Validation: `npm run evidence:validate && npm test`. Routing checks cover 12 destinations, all home cards, eight topic links, home-before-map ordering, unique live/map containers, filter preservation, daily rendering and recovery routes. Existing evidence, geography, map-colour and monitor tests run unchanged. Browser inspection remains restricted by network and saved browser permissions.
