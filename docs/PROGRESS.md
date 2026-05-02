# Farfield — Progress Log

## Claude handoff snapshot — 2026-05-02

Read this before continuing work:

- Primary build reference: `docs/BUILD_PLAN.md`
- Live execution/status reference: this file, `docs/PROGRESS.md`
- Current branch: `codex/phase-0-5-data-integrity`
- Latest pushed commit at handoff: `4a6481c Add methodology subpages`
- Local dev URL: `http://127.0.0.1:3000`
- Current phase: Phase 1 public showcase MVP, near completion
- Current priority: final Phase 1 public-page polish, then decide whether Phase 1 is complete enough to move toward Phase 2 planning

### Current product surface

Public routes currently implemented:

- `/` — editorial-first homepage with lead story, top stories, Leading Indicators, Forecaster Spotlight, Farfield Blog, public actuals chart, compact source/coverage record strip, and locked subscriber preview
- `/articles` and `/articles/[slug]` — static Farfield editorial/mock article pages using `src/lib/content.ts` and `ArticleVisual`
- `/variables` and `/variables/[slug]` — public actuals-only variable directory/detail pages using slugs, with forecast coverage counts and locked premium modules
- `/forecasters` and `/forecasters/[slug]` — public non-leaky institution/forecaster directory and profiles with coverage/trust signals, not detailed score tables
- `/methodology` — methodology overview
- `/methodology/scoring` — scoring, horizon, vintage, and public-vs-subscriber score publication rules
- `/methodology/data-sources` — source documents, ingestion runs, variable mappings, WEO actuals policy, and data quality boundaries
- `/methodology/institutions` — Farfield-managed vs claimed profile rules and protected trust-panel fields
- `/methodology/[slug]` — supporting methodology notes from the content registry
- `/pricing` — public early-access/subscriber promise page, no Stripe checkout yet
- `/admin/data-qa` — admin/dev-only QA page for provenance, ingestion runs, mappings, flags, and score references

### What is done

- Phase 0.5 data integrity foundation is implemented:
  - `source_documents`
  - `ingestion_runs`
  - `variable_source_mappings`
  - `data_quality_flags`
  - source-document links on forecasts/actuals
  - consensus as-of snapshots with methodology version and included forecast count
  - server-side access helpers for forecast/consensus endpoints
  - leakage tests for public/free boundaries
  - internal data QA script/page
- Phase 1 public showcase is mostly implemented:
  - slugged variable routes
  - editorial homepage
  - articles
  - forecaster directory/profiles
  - variable pages
  - methodology overview/subpages
  - pricing page
  - public CTAs for subscriber access

### Data/scoring state

- Current DB uses WEO-carried national-authority/historical observations as the preferred actuals baseline for core macro scoring where available.
- WEO 2026-Apr ingestion was rerun after parser fixes.
- WEO is now the scoring actual for 5,906 scored rows.
- World Bank-coded scoring fallback is down to 45 rows.
- Remaining 45 fallback rows are narrow cases where WEO does not currently provide an unambiguous matching actual under current rules:
  - Malaysia/Thailand/India unemployment
  - Thailand fiscal variables
- OECD and ECB ingestion now records provenance metadata.
- World Bank ingestion still needs a decision:
  - either wire it into Phase 0.5 provenance/audit tables if it remains active, or
  - mark it legacy/reference-only for core macro scoring.

### Verification commands

Run these before handing work back:

```powershell
npx tsc --noEmit
npm run build
$env:QA_STRICT='1'; node --env-file=.env.local node_modules/tsx/dist/cli.mjs scripts/qa-data-integrity.ts
node --env-file=.env.local node_modules/tsx/dist/cli.mjs scripts/leakage-tests.ts
```

Optional actual-source QA:

```powershell
node --env-file=.env.local node_modules/tsx/dist/cli.mjs scripts/qa-actuals-sources.ts
```

Recent verification status:

- `npx tsc --noEmit` passes
- `npm run build` passes
- strict data QA passes with 0 attention runs, 0 running imports, 0 open quality flags, 0 score reference issues, 0 latest source docs missing hashes, and 0 latest source docs without linked rows
- leakage tests pass against the built app and current database

### Access-control rules to preserve

Public/free pages must not expose:

- forecast values
- paid consensus values
- private/commercial forecaster values
- vintage history values
- dispersion values
- reconstructive chart data
- detailed per-forecaster score tables
- hidden JSON/chart props/hydration payloads containing the above

Public pages may show:

- actual outcomes and actuals history
- source labels
- coverage counts
- whether forecast coverage exists
- institution/forecaster profiles
- methodology
- public editorial
- locked premium modules

### Next recommended steps

1. Final Phase 1 public-page polish pass:
   - Homepage: tune editorial spacing/order after browser review
   - Articles: decide whether mock content is enough for Phase 1 or should be pared down
   - Variables: make locked premium modules and pricing CTA feel consistent
   - Forecasters: review profiles for profile text, trust panels, and non-leaky coverage presentation
   - Methodology/pricing: quick copy polish and link audit
2. Decide the 45 World Bank-coded score fallback policy:
   - keep as explicit fallback exceptions,
   - convert to data quality flags,
   - or wait for direct national-authority ingestion.
3. Decide whether World Bank ingestion remains active:
   - if yes, add Phase 0.5 provenance/audit support to it;
   - if no, document it as legacy/reference-only for core macro scoring.
4. If Phase 1 is accepted, prepare Phase 2 planning:
   - Stripe subscription billing,
   - subscriber access checks,
   - premium variable pages,
   - consensus as-of charts,
   - vintage history,
   - exports/downloads,
   - dashboard/watchlist.

### Worktree warning

The repo has unrelated modified/untracked files that predate or sit outside the latest scoped commits. Do not revert them without explicit approval. Before making a new PR or release branch, inspect:

```powershell
git status --short
```

Key recent commits on `codex/phase-0-5-data-integrity`:

- `8a2a8fe` Add Phase 0.5 data integrity foundation
- `045fe23` Use WEO metadata actuals for scoring baseline
- `a7bbb6a` Make public forecaster pages non-leaky
- `4bb74c2` Add public leakage test script
- `20569b0` Align landing page with public access model
- `60bedca` Add OECD and ECB ingestion provenance
- `fc87660` Add internal data QA checks
- `2b62e0b` Allow local data QA preview
- `5e22055` Fix WEO CSV actual parsing
- `fd845ed` Add variable slugs
- `c5e2610` Rebuild public homepage
- `edcecc5` Add public editorial and methodology pages
- `ac37148` Mock editorial front page
- `d71f7fb` Make homepage editorial first
- `4921fc0` Add public pricing page
- `4a6481c` Add methodology subpages

## Session 2026-05-02

### Completed

**BUILD_PLAN.md revised around data integrity and non-leaky public trust**
- Added Phase 0.5: Data Integrity Hardening before the public showcase phase
- Updated stale schema references: `analyst_performance` -> `forecaster_performance`; `transactions.analyst_id` -> `transactions.seller_forecaster_id`
- Added source/audit schema guidance: `source_documents`, `ingestion_runs`, `variable_source_mappings`, `data_quality_flags`
- Strengthened consensus model with `as_of_date`, `methodology_version`, `included_forecast_count`, and historical snapshot preservation
- Replaced free-tier latest-forecast exposure with a stricter teaser/coverage model
- Reworked build sequence, acceptance tests, and success metrics around leakage prevention, ingestion auditability, and subscriber value

**Phase 0.5 code started**
- Added Drizzle schema and migration `0003_phase_0_5_data_integrity` for source documents, ingestion runs, variable source mappings, data quality flags, source document links, and consensus as-of snapshots
- Updated consensus computation to write `as_of_date`, `methodology_version`, and `included_forecast_count` while preserving the legacy `n_forecasters` column for compatibility
- Added server-side forecast data access helper and gated `/api/forecasts` plus `/api/consensus` behind subscriber/admin access
- Changed `/api/variables/[id]` and public variable detail pages to expose actuals plus coverage counts, not forecast values or consensus chart data
- Fixed existing TypeScript/lint issues in `oecd-eo.ts` and `apply-migration.ts` so the build can pass

**Forecast gathering plan tightened around actuals sources**
- Updated `FORECAST_GATHERING_PLAN.md` to make WEO-carried national-authority/historical observations the default actuals source for the core cross-country macro panel until direct national-authority ingestion exists
- Clarified that WEO actual rows should come from WEO source/status metadata, not target-year inference alone or undifferentiated IMF values
- Added a guardrail that World Bank Indicators are not the default actuals provider for core macro scoring
- Added a correction item to replace legacy World Bank actuals with WEO/national-authority actual vintages and rescore affected forecasts

**WEO actuals baseline corrected**
- Updated `src/lib/ingestion/imf-weo.ts` to ingest WEO-carried actuals when metadata supports actual/historical classification
- WEO ingestion now records `source_documents`, `ingestion_runs`, `variable_source_mappings`, and source-document links on forecasts/actuals
- Added `scripts/qa-actuals-sources.ts` for actual-source and score-baseline QA
- Updated scoring to prefer `IMF-WEO` first-release actuals over legacy World Bank rows when both exist for the same variable/period
- Ran latest WEO ingestion for 2026-Apr: 6,773 WEO actual rows upserted, 0 new forecasts, 752 rows skipped for no matching variable
- Ran bulk rescore: 5,697 scored, 7,478 skipped because no matching actual exists
- QA after rescore: 5,194 scores now use `IMF-WEO`; 503 still use World Bank rows where WEO-carried actuals did not win for that variable/period

**Public institution pages de-leaked**
- Reworked `/forecasters` to show public coverage signals only: status, forecasts tracked, scored sample, variables, and countries
- Reworked `/forecasters/[slug]` to show a public trust panel, coverage by indicator/country, latest vintages, and locked subscriber-detail modules
- Updated `/api/forecasters/[slug]` so public JSON no longer returns MAE, bias, or score-vs-consensus fields
- Added `getForecasterPublicProfileData()` for non-leaky public profile data while leaving detailed profile metrics available for future subscriber/admin surfaces
- Verified IMF public profile helper output contains counts/coverage/vintages only; `npm run build` passes

**Leakage tests added**
- Added `scripts/leakage-tests.ts`, which starts a local production Next server and checks public HTTP responses against real DB samples
- Tests verify public forecaster API/page responses do not expose sampled forecast/consensus values or detailed accuracy fields
- Tests verify public variable API/page responses do not expose forecast/consensus fields while still allowing actuals
- Tests verify `/api/forecasts` and `/api/consensus` return 403 for public access
- Verified with `node --env-file=.env.local node_modules/tsx/dist/cli.mjs scripts/leakage-tests.ts` and `npx tsc --noEmit`

**Landing page aligned with revised public model**
- Removed the public accuracy leaderboard and MAE exposure from `/`
- Rebuilt the landing page around actuals-only GDP previews, institution coverage counts, scored sample sizes, and locked subscriber-detail framing
- Updated landing copy so public users see source depth and methodology while current forecast values, consensus history, dispersion, rankings, and exports remain premium
- Extended leakage tests to cover the landing page and fail on old leaderboard/MAE terms
- Verified with `npm run build` and `node --env-file=.env.local node_modules/tsx/dist/cli.mjs scripts/leakage-tests.ts`

**OECD/ECB ingestion provenance added**
- Added shared ingestion provenance helpers for source-document upserts, ingestion-run lifecycle records, variable-source mappings, response hashing, and parse-error serialization
- Updated OECD Economic Outlook ingestion to create/update `source_documents`, write `ingestion_runs`, refresh `source_document_id` on forecasts, and preserve explicit variable mappings
- Updated ECB MPD ingestion to create/update `source_documents`, write `ingestion_runs`, refresh `source_document_id` on forecasts, and preserve explicit variable mappings
- Changed OECD/ECB import scripts to report created and updated forecast counts separately
- Smoke-tested OECD EO 118 and ECB MPD A25 re-ingestion: 0 new rows, 111 existing forecast rows refreshed with provenance
- Verified with `npx tsc --noEmit`, `npm run build`, and `node --env-file=.env.local node_modules/tsx/dist/cli.mjs scripts/leakage-tests.ts`

**Minimal internal data QA added**
- Added admin-only `/admin/data-qa` page for reviewing source documents, ingestion runs, variable mappings, data quality flags, and recent score outputs
- Added shared `getDataQaSnapshot()` helper so QA checks can be reused by UI and scripts
- Added `scripts/qa-data-integrity.ts` with normal and `QA_STRICT=1` modes for terminal review before publishing/scoring work
- Extended leakage tests so logged-out users must be redirected away from `/admin/data-qa`
- Current QA result: 0 failed/skipped attention runs, 0 running imports, 0 open quality flags, 0 score reference issues, 0 latest source docs missing hashes, 0 latest source docs without linked rows
- Verified with `npx tsc --noEmit`, `QA_STRICT=1 node --env-file=.env.local node_modules/tsx/dist/cli.mjs scripts/qa-data-integrity.ts`, `npm run build`, and `node --env-file=.env.local node_modules/tsx/dist/cli.mjs scripts/leakage-tests.ts`

**WEO parser fixed for missing national-authority actuals**
- Fixed new WEO CSV parsing so quoted multiline fields no longer cause country rows to be skipped
- Fixed WEO country-group detection so ISO country codes beginning with `G` (for example `GBR`) are not mistaken for group codes
- Added conservative fiscal-year latest-actual parsing, including `FY(t-1/t) = CY(t)` handling from WEO methodology notes
- Re-ingested WEO 2026-Apr and rescored all forecasts
- Result: World Bank-coded scored rows fell from 503 to 45; IMF-WEO scored rows rose to 5,906
- Remaining World Bank-scored rows are narrow fallback cases: Malaysia/Thailand/India unemployment and Thailand fiscal variables where WEO does not provide an unambiguous matching actual under the current rules
- Verified with `scripts/qa-actuals-sources.ts`, `QA_STRICT=1 node --env-file=.env.local node_modules/tsx/dist/cli.mjs scripts/qa-data-integrity.ts`, `npm run build`, and `node --env-file=.env.local node_modules/tsx/dist/cli.mjs scripts/leakage-tests.ts`

**Phase 1 variable slug migration started**
- Added `variables.slug`, generated from variable name plus country code, with a backfilled unique migration
- Updated public variable route from `/variables/[id]` to `/variables/[slug]`
- Updated variable API route from `/api/variables/[id]` to `/api/variables/[slug]`
- Updated homepage, variable directory links, seed data, commodity ingestion, and leakage tests to use variable slugs
- Applied migration `0004_variable_slug_migration` to the configured database
- Restarted the local dev server and verified `/variables/gdp-growth-rate-wld` returns 200
- Verified with `npx tsc --noEmit`, `npm run build`, `QA_STRICT=1 node --env-file=.env.local node_modules/tsx/dist/cli.mjs scripts/qa-data-integrity.ts`, and `node --env-file=.env.local node_modules/tsx/dist/cli.mjs scripts/leakage-tests.ts`

**Phase 1 homepage rebuild started**
- Rebuilt `/` around the revised Phase 1 public showcase model: Farfield hero, live source/coverage metrics, editorial preview cards, actuals-only macro cards, institution spotlight, methodology notes, and locked premium modules
- Homepage data now uses actuals, source documents, coverage counts, and scored-row counts without exposing forecast values, consensus values, MAE, bias, or reconstructive chart payloads
- Restarted the local dev server and verified `http://127.0.0.1:3000/` returns 200
- Verified with `npx tsc --noEmit`, `npm run build`, `QA_STRICT=1 node --env-file=.env.local node_modules/tsx/dist/cli.mjs scripts/qa-data-integrity.ts`, and `node --env-file=.env.local node_modules/tsx/dist/cli.mjs scripts/leakage-tests.ts`

**Phase 1 articles, methodology, and homepage visuals added**
- Added static public content registry for launch articles and methodology notes until a content schema/CMS exists
- Added `/articles`, `/articles/[slug]`, `/methodology`, and `/methodology/[slug]`
- Added public navigation links for Articles and Methodology
- Added an actuals-only homepage chart for a featured macro variable
- Added a locked subscriber carousel preview for forecast-versus-consensus analysis without exposing real forecast or consensus values
- Extended leakage tests to cover public article and methodology routes
- Restarted the local dev server and verified `/`, `/articles`, `/articles/first-public-forecast-record`, `/methodology`, and `/methodology/weo-national-authority-actuals` return 200
- Verified with `npx tsc --noEmit`, `npm run build`, `QA_STRICT=1 node --env-file=.env.local node_modules/tsx/dist/cli.mjs scripts/qa-data-integrity.ts`, and `node --env-file=.env.local node_modules/tsx/dist/cli.mjs scripts/leakage-tests.ts`

**Phase 1 editorial mock front page added**
- Expanded mock article slate with oil price forecast volatility, African GDP forecasting difficulty, satellite crop-yield indicators, shipping/freight signals, and a recurring Forecaster Spotlight concept
- Added `ArticleVisual` to give article cards chart-like public visuals without using paid forecast or consensus values
- Reworked the homepage editorial area into a lead story, top stories, Leading Indicators row, Forecaster Spotlight feature, and Farfield Blog strip
- Updated `/articles` and article detail pages to use the same visual system
- Restarted the local dev server and verified `/`, `/articles`, `/articles/oil-price-forecast-volatility`, `/articles/forecasting-gdp-in-african-states`, and `/articles/satellite-data-crop-yields` return 200
- Verified with `npx tsc --noEmit`, `npm run build`, `QA_STRICT=1 node --env-file=.env.local node_modules/tsx/dist/cli.mjs scripts/qa-data-integrity.ts`, and `node --env-file=.env.local node_modules/tsx/dist/cli.mjs scripts/leakage-tests.ts`

**Phase 1 pricing page added**
- Added `/pricing` as a public early-access/subscriber promise page
- Added public navigation link for Pricing
- Defined public reader, Farfield subscriber, and team access plan cards without enabling Stripe checkout yet
- Added public/subscriber comparison table for actuals, methodology, coverage counts, consensus, forecast series, vintage history, comparisons, and exports
- Added pricing CTAs from the homepage subscriber preview, public variable detail pages, and article detail pages
- Extended leakage tests to include `/pricing`
- Restarted the local dev server and verified `/`, `/pricing`, `/articles/oil-price-forecast-volatility`, and `/variables/gdp-growth-rate-wld` return 200
- Verified with `npx tsc --noEmit`, `npm run build`, `QA_STRICT=1 node --env-file=.env.local node_modules/tsx/dist/cli.mjs scripts/qa-data-integrity.ts`, and `node --env-file=.env.local node_modules/tsx/dist/cli.mjs scripts/leakage-tests.ts`

**Phase 1 methodology subpages added**
- Added `/methodology/scoring` for score links, forecast/actual/methodology references, horizon handling, and public-vs-subscriber score publication rules
- Added `/methodology/data-sources` for source documents, ingestion runs, variable mappings, data quality flags, WEO-carried national-authority actuals, fiscal-year handling, and public access boundaries
- Added `/methodology/institutions` for Farfield-managed profiles, claimed institution profiles, independent forecaster profiles, editable fields, and protected trust-panel fields
- Updated `/methodology` to feature the three core methodology pages above the supporting notes
- Extended leakage tests to cover the new methodology routes
- Restarted the local dev server and verified `/methodology`, `/methodology/scoring`, `/methodology/data-sources`, and `/methodology/institutions` return 200
- Verified with `npx tsc --noEmit`, `npm run build`, `QA_STRICT=1 node --env-file=.env.local node_modules/tsx/dist/cli.mjs scripts/qa-data-integrity.ts`, and `node --env-file=.env.local node_modules/tsx/dist/cli.mjs scripts/leakage-tests.ts`

### Current state

- Build plan now prioritises provenance, access control, consensus history, and minimal internal QA before expanding public UI
- Phase 0.5 schema/access/code changes are implemented locally
- `npm run build` passes
- `npm run score` has no pending forecasts after the WEO baseline correction
- Migration `0003_phase_0_5_data_integrity` applied successfully to the configured database
- Consensus recomputed after migration: 2,513 snapshot rows
- Database actuals after WEO correction: 10,954 `IMF-WEO` actual rows plus legacy World Bank rows retained for comparison/exceptions
- Public institution pages now match the Phase 1 non-leaky teaser model
- Leakage test script passes against the built app and current database
- Landing page now matches the Phase 1 non-leaky public showcase model
- OECD and ECB forecast ingestion now records source documents, ingestion runs, source hashes, and reviewable variable mappings
- Admin data QA page and terminal QA script are available for internal review
- WEO is now the scoring actual for 5,906 scored rows; World Bank-coded scoring fallback is down to 45 narrow cases
- Variable public URLs now use readable slugs instead of UUIDs
- Homepage now reflects the Phase 1 public showcase direction with article previews, actuals-only variable cards, institution trust signals, and locked premium detail modules
- Articles and methodology now have real public routes backed by a static content registry
- Homepage has a public actuals-only chart and a locked subscriber forecast-versus-consensus carousel preview
- Homepage now has a stronger editorial front-page structure with mock analysis, Leading Indicators, Forecaster Spotlight, and Farfield Blog sections
- Pricing page is live as a non-checkout early-access page that explains subscriber value and links locked modules to the future paid data product
- Methodology section now has overview, scoring, data sources, institutions, and supporting methodology-note pages
- Existing worktree already had unrelated modified/untracked files before this session

### Known issues

- World Bank ingestion still needs the Phase 0.5 provenance/audit treatment, or it should be explicitly downgraded to a legacy/reference-only source for core macro scoring
- 45 scores still use World Bank-coded actuals where WEO does not currently provide an unambiguous matching actual under the current rules
- Leakage tests currently cover public forecaster and variable pages/APIs; extend them as new public/free routes are added

### Next steps

1. Decide whether the remaining 45 World Bank-scored rows should stay as explicit fallback exceptions, become data quality flags, or wait for direct national-authority ingestion
2. Do a final Phase 1 public-page polish pass across homepage, articles, methodology, pricing, variables, and forecaster profiles
3. Extend leakage tests as new public/free routes are added
4. Wire World Bank ingestion into provenance/audit tables only if it remains part of the active data pipeline
5. Prepare a clean branch/commit/PR once unrelated working-tree changes are separated

## Session 2026-05-01

### Completed

**Platform renamed: Forethought → Farfield**
- All source code, config, and documentation updated
- External resources (GitHub repo, Vercel project) to be renamed separately when convenient

**Navigation and page architecture defined**
- Full site brief written covering: six user states, complete route structure, access control matrix, data leakage rules, and four-phase MVP build priority
- BUILD_PLAN.md updated: platform description revised, Section 2.4 (navigation and user states) added, build phases revised to four phases, project structure and build sequence updated, success metrics revised
- Articles confirmed as Phase 1 scope
- Variable slugs confirmed: add slug field to variables table, derive from name + countryCode

### Current state

- **Live site**: forethought-two.vercel.app (URL to be updated when Vercel project is renamed)
- **Database**: ~17,000 forecasts, ~6,800 actuals, 272 variables, 10 forecasters, 4,116 scored
- **WEO vintages**: 12 (Apr 2007 – Apr 2026)
- **Build**: clean, zero errors
- **Auth**: Google OAuth live

### Known issues

- Public pages currently expose forecast data that should be subscriber-only (landing page MAE leaderboard, variable detail forecast charts)
- Variable URLs use UUIDs — migration to slugs required before Phase 1 ships

### Next steps (ordered by priority)

1. **Variable slug migration** — add slug to variables schema, populate from name + countryCode, update /variables/[id] routes to /variables/[slug]
2. **Articles schema** — new tables (articles, article_tags, article_variables, article_forecasters), Drizzle migration
3. **Public homepage rebuild** — media-style, strip all forecast data, articles/forecaster spotlight/actuals-only variables
4. **Article listing and detail pages**
5. **Forecaster directory and profile redesign** — storefront + Farfield trust panel separation, four ranked status states
6. **Public variable pages** — actuals only, locked premium modules
7. **Methodology pages** — all four
8. **Pricing page**
9. **Server-side access gating** — enforce throughout, audit for data leakage

## Session 2026-04-21

### Completed

**Apr 2026 WEO ingested**
- 1,025 forecasts inserted (WEO 2026-Apr vintage)
- Aggregate actuals backfill updated to use latest WEO file dynamically + upsert (not skip) — now includes 2025 actuals confirmed by Apr 2026 WEO
- Rescore: 4,057 → 4,116

**Consensus engine fixed**
- `computeAllConsensus()` rewrote N+1 pattern to single bulk GROUP BY query + batch upsert
- Previous version hung on Neon serverless with >2,500 variable+period pairs

**Actuals policy established**
- WEO is now the default actuals source for all variables/countries
- Only override with data directly from a national authority (ONS, BEA, Stats SA, etc.)
- Not from secondary compilers like World Bank
- `backfill-aggregate-actuals.ts` now auto-detects the latest WEO file

### Current state

- **Live site**: Farfield-two.vercel.app
- **Database**: ~17,000 forecasts, ~6,800 actuals, 272 variables, 10 forecasters, 4,116 scored
- **WEO vintages**: 12 (Apr 2007 – Apr 2026)
- **Build**: clean, zero errors

### Next steps (ordered by priority)

1. **Philly Fed SPF** — next Wave 2 source; clean Excel downloads, deep US history
2. **Analyst onboarding** — Phase 2: registration flow, profile pages, forecast submission form

## Session 2026-04-20

### Completed

**OECD Economic Outlook ingestion**
- Built `src/lib/ingestion/oecd-eo.ts` + `scripts/ingest-oecd-eo.ts`
- 5 editions (EO-114 to EO-118, Nov 2023 – Dec 2025): GDP Growth Rate, CPI, Unemployment Rate, Government Balance, Current Account Balance
- 990 forecasts inserted; 457 new scores (total now 3,796)
- Key fix: Node.js fetch blocked by Cloudflare — replaced with `execSync(curl)` subprocess
- Key fix: CPI is a price level index; computed % YoY change as `((t / t-1) - 1) * 100`

**World Bank GEP ingestion**
- Built `src/lib/ingestion/wb-gep.ts` + `scripts/ingest-wb-gep.ts`
- Uses WB Indicators API source 27 (JSON, no Cloudflare issues)
- One indicator: GDP Growth Rate (`NYGDPMKTPKDZ`). Vintage auto-detected from API `lastupdated`
- 66 forecasts inserted for WB-GEP-2026-01 (Jan 2026 GEP, 22 countries × 3 forecast years)
- Limitation: API only serves the latest vintage — no historical archive

**ECB/Eurosystem Macroeconomic Projection Database (MPD) ingestion**
- Built `src/lib/ingestion/ecb-mpd.ts` + `scripts/ingest-ecb-mpd.ts`
- 33 vintages (Autumn/Spring/Winter 2015–2025): GDP Growth Rate, Inflation (CPI), Unemployment Rate for Euro Area
- 315 forecasts inserted; 0 new scores (no EA actuals in DB yet — WB actuals pipeline covers individual countries only)
- Uses ECB SDW SDMX REST API; path-based dimension filter + CSV format; no auth/Cloudflare issues
- `ECB_ALL=1` flag available to extend back to 2001 (109 total vintages)

### Current state

- **Live site**: Farfield-two.vercel.app
- **Database**: ~15,000 forecasts (WEO + OECD EO + WB GEP + ECB MPD + commodity), 272 variables, 10 forecasters, 3,796 scored
- **Forecasters with data**: IMF WEO (11 vintages), OECD EO (5 editions), World Bank GEP (1 vintage), ECB MPD (33 vintages)
- **Build**: clean, zero errors

**Aggregate actuals backfill**
- `scripts/backfill-aggregate-actuals.ts` — extracts historical years from WEO Oct-2025 xlsx for EA, WLD, G7, ADV, EME
- 915 actuals inserted (source: IMF-WEO, 6 variables × up to ~45 years per aggregate)
- Rescore: 3,796 → 4,057 (+261 new scores)
- Fixes: ECB MPD forecasts now score; World GDP "—" on landing page resolved

### Current state

- **Live site**: Farfield-two.vercel.app
- **Database**: ~16,000 forecasts, ~5,900 actuals, 272 variables, 10 forecasters, 4,057 scored
- **Forecasters with data**: IMF WEO (11 vintages), OECD EO (5 editions), World Bank GEP (1 vintage), ECB MPD (33 vintages)
- **Build**: clean, zero errors

### Known issues

- Apr 2026 WEO not yet ingested (expected ~April 22)

### Next steps (ordered by priority)

1. **Ingest Apr 2026 WEO** when published (~April 22) — run ingest, consensus, rescore, backfill-aggregate-actuals
2. **Analyst onboarding** — Phase 2: registration flow, profile pages, forecast submission form
3. **Philly Fed SPF** — next Wave 2 source; clean Excel downloads, deep US history

## Session 2026-04-18 / 2026-04-19

### Completed

**Schema migrations (migration 0002)**
- Added `scoring_methodologies` table (version, effectiveFrom, description, codeRef, vintagePolicy); seeded v1.0
- Extended `actuals`: `vintage_date`, `release_number` (default 1), `is_latest`; unique constraint changed to `(variableId, targetPeriod, source, releaseNumber)` to support initial-release vs revision tracking
- Extended `forecasts`: `forecast_made_at` (nullable timestamp)
- Extended `forecast_scores`: `actual_id`, `methodology_version`, `horizon_months`, `signed_error`
- Applied via custom `scripts/apply-migration.ts` + `scripts/fix-migration-hash.ts` (drizzle-kit migrate hangs on Neon serverless)

**Scoring engine updates**
- Scoring policy: always score against `release_number = 1` actuals
- Every score row now stores `actual_id`, `methodology_version: "v1.0"`, `signed_error` (forecast − actual), `horizon_months`
- `rescoreAll()` rewritten from N+1 to 4 bulk queries — avoids Neon ECONNRESET under sequential load

**Premium UI redesign (8 tasks, subagent-driven)**
- New design tokens: `--bg: #F7F8FA`, `--surface: #FFFFFF`, `--ink: #111827`, `--accent: #1D4ED8`; `.card` / `.card-raised` CSS classes; shadow + radius tokens
- Font: Inter (400/500/600), display font via CSS variable
- New shared components: `Card`, `MetricCard`, `SectionLabel`
- Rebuilt pages: landing hero (two-column, live leaderboard), `/variables` (larger chart at 480px, card-wrapped), `/forecasters` (metric grid strip, performance highlights), `/forecasters/[slug]` (bias colour-coded), `/variables/[id]` (actuals strip, hover table)
- `ForecastChart`: no cobalt, consensus always solid blue, actuals bold with dots
- Layout: max-width expanded to 1200–1280px

**Phase 1 data completion**
- `backfill-forecast-made-at.ts`: one UPDATE per vintage label using WEO_VINTAGES publication dates; 9,864 rows updated
- `rescore-all.ts`: rescored 3,339 forecasts with new fields via bulk query
- `ingest-commodity-prices.ts`: parsed Commodity Prices sheet from WEOOct2025all.xlsx; created 74 COMMODITY variables, inserted 3,243 actuals (1980–2024) and 450 IMF forecasts (2025–2030)

**Auth**
- Google OAuth via Auth.js v5 (NextAuth); session-aware public layout header (Sign in / Dashboard / Sign out)

### Current state

- **Live site**: Farfield-two.vercel.app
- **Database**: ~13,000 forecasts (macro + commodity), 272 variables, 10 forecasters, 3,339 scored, 74 commodity variables
- **Scoring**: all existing forecast/actual pairs scored with signed_error, horizon_months, methodology_version v1.0
- **Auth**: Google OAuth live; sign-in/out working
- **Build**: clean, zero errors

### Known issues

- Apr 2026 WEO not yet ingested (expected ~April 22 publication)
- WLD (World) shows "—" on landing page — World Bank has no aggregate actuals
- `forecast_made_at` populated for WEO vintages only; other forecasters still null
- Commodity variables have actuals but no scoring (no WEO-sourced actuals to score commodity forecasts against)

### Next steps (ordered by priority)

1. **Ingest Apr 2026 WEO** when published (~April 22) — run ingest, consensus, rescore
2. **Analyst onboarding** — Phase 2: registration flow, profile pages, forecast submission form
3. **Commodity scoring** — wire commodity forecast scoring once actuals pipeline is established

## Session 2026-04-14

### Completed

**Increment 9 — WEO data pipeline + deployment**
- Added xlsx parser for IMF's new Oct-2025 Excel format (Countries + Country Groups sheets)
- Fixed UTF-16 LE encoding detection for newer legacy files (IMF changed encoding ~2024, no BOM)
- Updated `download_weo.py` to fetch `alla.txt` (Country Groups) files for all legacy editions
- Added `WEO_ALL=1` flag to ingest runner for one-shot backfill across all vintages
- Expanded `WEO_VINTAGES` to cover 2021–2025 (10 legacy vintages + Oct-2025 xlsx)
- Backfilled 11 WEO vintages: 23,744 forecasts, 23,744 consensus rows, 5,174 scored
- Deployed to Vercel; connected GitHub repo for auto-deploy on push
- Fixed GDP decimal formatting on landing page (2 d.p.)

### Current state

- **Live site**: Farfield-two.vercel.app
- **Database**: 23,744 forecasts, 5,174 scored against actuals, 198 variables, 10 forecasters
- **GitHub**: github.com/jaredjeffery/Farfield (auto-deploys on push to main)
- **Build**: clean, zero errors

### Known issues

- WLD (World) shows "—" on landing page — World Bank has no aggregate actuals; will populate once Apr 2026 WEO is ingested
- Apr 2026 WEO not yet published (expected ~April 22)
- Filter dropdowns on `/variables` require form submit (no JS auto-submit — Phase 2)
- Government debt data from World Bank covers central government only; WEO covers general government

### Next steps (ordered by priority)

1. **Auth setup** — configure Auth.js (Google + LinkedIn), AUTH_SECRET in Vercel env vars
2. **Analyst onboarding** — Phase 2: registration, profile pages, forecast submission form
3. **Ingest Apr 2026 WEO** when published (~April 22) — run `WEO_ALL=1 npm run ingest:weo` then consensus + score

## Session 2026-04-13

### Completed

**Increment 1 — Project scaffold + Git**
- `git init` with local identity (Jared Jeffery)
- Next.js 15 (App Router), TypeScript, Tailwind v4 scaffolded
- All Phase 1 dependencies installed: drizzle-orm, next-auth v5, stripe, recharts, meilisearch, zod, date-fns, postgres
- `.env.example` template and `.env.local` (gitignored)

**Increment 2 — Database schema + migrations**
- 7 tables: `users`, `forecasters`, `variables`, `forecasts`, `actuals`, `forecast_scores`, `consensus_forecasts`
- 4 enums: `user_role`, `forecaster_type`, `variable_category`, `variable_frequency`
- All value fields DECIMAL(20,6), all timestamps UTC with timezone
- Migration generated and applied to Neon (PostgreSQL)

**Increment 3 — Variable taxonomy seed**
- 6 core indicators (GDP growth, CPI, unemployment, current account, government balance, government debt)
- 33 country/region codes (aggregates + top economies + key EMs)
- 198 variable rows seeded
- 10 institutional forecasters seeded (IMF, World Bank, OECD, ECB, Fed, BoE, etc.)

**Increment 4 — Data ingestion pipelines**
- **World Bank actuals** (`npm run ingest:wb`): fetches historical data via open JSON API for 28 countries, 2010–present. 1,913 actuals inserted across 5 indicators. Government balance uses `GC.NLD.TOTL.GD.ZS` (net lending/borrowing).
- **IMF WEO forecasts** (`npm run ingest:weo`): local file parser for tab-delimited WEO downloads. IMF blocks automated HTTP access — download files manually per `data/weo/README.md` and place in `data/weo/`. Supports multiple vintages with vintage tracking.

**Increment 5 — API routes (read-only)**
- `GET /api/variables` — list with country/category filters
- `GET /api/variables/[id]` — variable + forecasts + actuals + scores
- `GET /api/forecasters` — list by type
- `GET /api/forecasters/[slug]` — profile + accuracy summary
- `GET /api/forecasts` — filtered list with scores
- `GET /api/consensus` — consensus + actuals for a variable/period

**Increment 6 — Scoring engine**
- `src/lib/scoring/index.ts`: absolute error, percentage error, directional accuracy, score vs consensus
- `scoreAllPending()` and `rescoreAll()` for batch operations
- `npm run score` (or `WEO_RESCORE=1 npm run score` to rescore all)

**Increment 7 — Consensus computation**
- `src/lib/scoring/consensus.ts`: simple mean across all forecasters per variable+period
- `computeAllConsensus()` for batch processing
- `npm run consensus`

**Increment 8 — Public showcase pages**
- `/` — landing: GDP snapshot, institution chips, how-it-works explainer
- `/variables` — filterable table with latest actuals
- `/variables/[id]` — forecast chart (Recharts), actuals grid, accuracy table
- `/forecasters` — institution and analyst tables with accuracy stats
- `/forecasters/[slug]` — profile with per-variable accuracy breakdown
- All SSR server components, 1h revalidation

### Current state

- **Database**: live on Neon (see .env.local), 198 variables, 10 forecasters, 1,913 actuals
- **Dev server**: run `npm run dev` → http://localhost:3000
- **Build**: clean (`npm run build` passes with zero errors)
- **Forecasts**: none yet — requires downloading WEO files (see data/weo/README.md)
- **Scoring**: 0 scored (no forecasts to score against actuals)
- **Deployed**: not yet — Vercel deployment is the next step

### Known issues

- IMF WEO forecasts require manual download (IMF blocks automation). Instructions in `data/weo/README.md`.
- Government debt data from World Bank (`GC.DOD.TOTL.GD.ZS`) covers central government only — WEO covers general government. These will differ.
- Filter dropdowns on `/variables` require a form submit (no JS auto-submit yet — Phase 2 enhancement).
- World Bank has no data for aggregate regions (WLD, ADV, EME, EA, G7) — those actuals will only come from WEO.

### Next steps (ordered by priority)

1. **Deploy to Vercel** — connect GitHub or push directly; set DATABASE_URL in Vercel env vars
2. **Download WEO data** — get October 2025 and April 2026 WEO files from IMF, run `npm run ingest:weo`, then `npm run consensus`, then `npm run score`
3. **Auth setup** — configure Auth.js (Google + LinkedIn), AUTH_SECRET in .env.local
4. **Analyst onboarding** — Phase 2 begins: registration, profile pages, forecast submission form
