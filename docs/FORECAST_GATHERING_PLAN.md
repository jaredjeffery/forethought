# Forethought — Public Macro Forecast Gathering Plan

Companion to `BUILD_PLAN.md` and `public_macro_forecast_sources.xlsx`.

Last updated: 2026-04-20.

## Purpose

Define how Forethought will (a) assemble an initial back-catalogue of public institutional forecasts for scoring and consensus, (b) keep that catalogue current on an ongoing release cadence, and (c) map forecasts to actuals in a way that is defensible and version-stable.

The plan is scoped to deliver the Phase 1 Forecast Observatory described in `BUILD_PLAN.md` §1 and to prepare rails for Phase 2 expansion.

## Guiding principles

Sequence sources by ingestion leverage, not by prestige. A forecast series is only worth scoring if (a) its historical vintages are recoverable, (b) it covers a variable with a defensible actuals source, and (c) parsing is tractable at the solo-with-AI build scale. IMF WEO clears all three; most bank research pages do not.

Every scored forecast must be tied to a specific vintage of both forecast and actual. This means storing `forecast_made_at`, `source_vintage`, `target_start_date`, `target_end_date` on the forecast side, and `vintage_date`, `release_number`, `is_latest` on the actuals side (schema already aligned in `BUILD_PLAN.md` §3).

Build the cheapest complete pipeline first, then add sources in descending order of ingestion cost per scored observation. Premature coverage looks impressive but generates low-quality scoring if the vintage machinery underneath is incomplete.

Distinguish between first-release actuals (for pure out-of-sample scoring) and benchmark-revised actuals (for retrospective analytical work). Publish the policy on which is used for scoring, per `BUILD_PLAN.md` §4.2.

## Ingestion wave plan

### Wave 1 — "IMF WEO end-to-end" (already underway, complete by end of Phase 1 month 2)

IMF WEO is the spine. It gives global and country-level forecasts across GDP, CPI, unemployment, fiscal balance, current account, commodity assumptions, at 5-year horizon, with a clean historical archive of 11+ vintages from 2021 onward already ingested and a longer archive available back to the 1990s.

Tasks for Wave 1: finalise the vintage-aware ingestion for all 11 already-downloaded WEO releases; normalise variable codes against the platform taxonomy; resolve fiscal-vs-calendar-year target period metadata; build the scoring engine against this single source; publish scoring for at least two variables (headline GDP growth and CPI) across the full country panel. This is the "walking skeleton" for everything that follows.

Actuals for Wave 1: IMF WEO itself as a provisional source of truth. A "WEO-scored-against-WEO" note in the methodology is acceptable so long as it is transparent and the plan to graduate onto national-stats-office actuals in Wave 3 is stated publicly.

### Wave 2 — "Major multilaterals + Eurosystem anchor" (Phase 1 months 2–3, into early Phase 2)

Targets, in order:

OECD Economic Outlook via SDMX API. **DONE (2026-04-20).** 5 editions (EO-114 to EO-118, Dec 2023 – Dec 2025) ingested: 990 forecasts across GDP, CPI, unemployment, government balance, current account for 33 countries. `src/lib/ingestion/oecd-eo.ts` + `scripts/ingest-oecd-eo.ts`. Note: Node.js fetch blocked by Cloudflare; uses curl subprocess. CPI computed as % YoY change from price level index. To extend back to EO-113 and earlier, older edition-specific dataflows need confirming via SDMX catalogue.

World Bank Global Economic Prospects. **DONE (2026-04-20).** `src/lib/ingestion/wb-gep.ts` + `scripts/ingest-wb-gep.ts`. Uses WB Indicators API source 27 (JSON). One indicator only: `NYGDPMKTPKDZ` = GDP Growth Rate. 66 forecasts for current vintage (WB-GEP-2026-01, Jan 2026 GEP). Vintage auto-detected from `lastupdated` in API response — re-running when June 2026 GEP publishes will create a new vintage automatically. Limitation: API only exposes the latest published vintage (no historical archive via API).

European Commission AMECO database + quarterly forecasts. AMECO is API-friendly for historical series; forecast vintages require pulling spring/autumn forecast XLSX annexures from the EC economic forecasts archive. High payoff for euro-area country coverage and fiscal projections.

ECB SPF via ECB data portal. Long-running survey consensus; easy structured download; excellent cross-check against official projections. Adds forecast-density data for euro-area headline variables.

Philly Fed SPF via downloadable files. US equivalent of ECB SPF with 1968-onwards depth. Single most mineable public survey in the world for US variables.

Fed SEP, ECB/Eurosystem projections, BoE MPR. Central-bank official views for the three largest DM economies. These are PDF-heavy but there are few vintages per year and the format is stable enough that a per-publication parser is tractable. Anchor series for Phase 1 credibility.

### Wave 3 — "Actuals migration + the South Africa wedge" (early Phase 2)

Replace provisional WEO-as-actuals with country-authoritative sources for the countries where Forethought wants to compete hardest. Priority:

South Africa — Stats SA for GDP and CPI, SARS + National Treasury for fiscal, SARB for BOP/monetary aggregates. All public and well-documented. Since SA is Jared's stated wedge, actuals quality matters more here than anywhere else.

United States — BEA (NIPA), BLS (CPI/unemployment), Treasury (fiscal). First-release and revisions both available; Philly Fed real-time dataset already aligns forecast vintages to actuals vintages and is worth copying wholesale.

Euro area — Eurostat, with ECB data portal as a secondary.

United Kingdom — ONS.

For every other country, hold on IMF WEO as provisional actuals and migrate as scoring demand grows. Document the migration schedule in the methodology page; users deserve to know what their score is being measured against.

Also in Wave 3, ingest SARB MPR and the full set of SA Treasury Budget Review and MTBPS macro annexures (XLSX structured tables). These are two of the highest-leverage additions for an SA-focused platform because (a) they generate opinionated sovereign forecasts that can be scored against each other and against the IMF/OECD/World Bank consensus, and (b) they demonstrate the platform's SA depth to analysts browsing the verified forecaster proposition.

### Wave 4 — "Country central banks + fiscal councils at scale" (Phase 2 months 4–6)

Bulk coverage of the P2 central banks in the workbook — BoC, RBA, RBNZ, Norges, Riksbank, CNB, NBP, BCCh, BCB, Banxico, Banrep, BCRP, CBRT, BoJ, SNB, Bundesbank, Banque de France, Banca d'Italia, BoK, RBI, BI, BoT, MNB, BoI, NBB, BdE. Most are PDF-heavy; parser effort amortises because the format is stable across vintages within each source. A realistic rate is one new central bank fully onboarded per week once tooling is mature.

Fiscal councils and treasuries: OBR, CBO, CPB, NZ Treasury, Aus Treasury, Finland MoF, Norway MoF, AIReF, Canadian PBO, IFAC, Portuguese CFP. These tend to carry XLSX companion tables which are structured enough to ingest without heavy scraping. Higher leverage per ingestion hour than central-bank PDFs.

UN regional commissions (ECLAC, ESCAP) and regional development banks (ADB, AfDB, EBRD, IADB) for regional coverage.

### Wave 5 — "Commodities + energy" (Phase 2 month 6, or earlier if analyst demand pulls it forward)

EIA STEO via the EIA Open Data API — best-in-class source for monthly short-horizon energy forecasts. Ingestion is trivial (JSON API). Pair with EIA first-release prices as actuals for the energy pieces.

IEA World Energy Outlook for long-horizon scenarios; treat as scenario forecasts rather than point forecasts (annotate in schema).

OPEC MOMR for monthly oil-market supply/demand forecasts; PDF-heavy.

USDA WASDE for agricultural commodities. Monthly release, structured XLSX, clean API-adjacent format.

World Bank Commodity Markets Outlook + Pink Sheet. Pink Sheet gives cross-commodity monthly price data; semi-annual outlook gives structured forecast tables.

Energy and commodities also open a useful Phase 2 revenue angle: commodity desks at banks and corporates will pay for a weighted consensus view across these sources if the scoring is credible.

### Wave 6 — "Commercial bank research" (Phase 3 or deferred)

ING, BBVA, SEB, Nordea, Danske, ABN AMRO, Scotiabank, Desjardins. Useful for breadth and for triangulation. Three reasons to defer:

1. Terms of use for redistribution need per-publisher review; safer to approach once Forethought has a verified-forecaster legal template.
2. Forecasts are often published on rolling web pages without stable vintages; requires a scrape-and-archive-at-release pipeline that is heavier than one-off parsing.
3. Commercial banks are also candidate analyst customers; scoring them unilaterally is a commercial risk that is better navigated after the platform's methodology has public credibility from Wave 1–2 institutions.

Flag these as P3 in the workbook. Do not ingest them systematically until Phase 3 or until a commercial-bank analyst asks to be onboarded as a verified forecaster and effectively consents.

## Historical back-fill strategy

For each Wave 1–3 source, the aim is the deepest defensible vintage history. Recommended back-fill depths, from best case to practical minimum:

IMF WEO: already have 2021–Oct 2025 (11 vintages). Extend to 1990 if bandwidth allows — IMF publishes legacy WEO archives. Priority extension target: 2011 onwards to cover two full business cycles.

OECD EO: SDMX supports structured historical. Target 1997 onwards; minimum 2010.

World Bank GEP: minimum 2006 (when GEP took its current form). PDFs before that; not worth the parsing cost for Phase 1.

EC AMECO + EC forecasts: AMECO historical trivially deep. Forecast annexures: target 2004 (EU-25 expansion) as a clean panel boundary; minimum 2010.

ECB SPF: 1999 onward is free; take all.

Philly Fed SPF: 1968 onward; take all.

Fed SEP: 2007 onward; take all (only 4 per year).

SA Treasury Budget Review + MTBPS: 2000 onwards where XLSX annexures exist; PDFs earlier if needed.

SARB MPR: 2001 onwards (when MPR began in current form).

National central banks (Wave 4): target 10 years minimum per source to allow scoring of at least one full business cycle.

For each source, document archive URL, file-pattern for vintage lookup, and any known gaps (missing issues, format changes) in the workbook's Access notes column.

## Actuals-source mapping

Policy per `BUILD_PLAN.md` §4.2: scoring uses first-release actuals by default; benchmark-revised actuals available on the scoring page as an alternate view. Mapping:

GDP real growth: national stats office first-release; IMF WEO provisional for countries without clean first-release archives.

CPI inflation: national stats office; ECB SDW / Eurostat for euro-area aggregates.

Unemployment: national stats office (BLS, ONS, Eurostat, Stats SA, etc.).

Policy rate: central bank series, end-of-period.

Fiscal balance (% GDP): national treasury / finance ministry for fiscal-year figures; IMF WEO for cross-country panel consistency.

Current account (% GDP): central bank BOP releases; IMF IFS / WEO as fallback.

Exchange rates: central bank / BIS for end-of-period and average; document daily fixing source per currency.

Oil prices (Brent, WTI): EIA first-release for monthly average.

For every scored variable, a `source_for_actuals` field in the `variables` table names the authoritative source. Wave 3 is the migration from IMF-provisional to national sources; variables table records the migration date to preserve audit trail.

## Cadence automation

The platform needs to know, per source, when to poll. Recommended implementation:

A `forecast_source_schedules` table with columns `source_id`, `expected_cadence`, `expected_release_month_pattern`, `last_ingested_vintage`, `next_expected_release_at`. A nightly job checks whether any source's expected release has passed without an ingestion; raises an ingestion task on an admin dashboard.

Most sources have fixed release windows in the workbook's Typical release timing column. Those windows are sufficient starting heuristics; refine with actual observed release latencies over time.

## Legal and redistribution posture

Public institutional forecasts are generally fair for scoring display under attribution, but aggregation into paid consensus products requires care. Summarising the workbook's Redistribution / terms column into actionable rules:

Multilateral (IMF, OECD, WB, EC, UN, regional development banks): attribution required, aggregation permitted for non-commercial and usually commercial purposes — verify per dataset on first use.

Central banks and government treasuries: almost always Public with attribution. No known examples of central banks asserting aggregation restrictions on published forecasts.

Energy institutions (EIA: public domain; IEA: more restrictive on data products; OPEC: public summaries only; USDA: public domain; World Bank CMO: public with attribution). IEA is the one to review carefully before folding into a paid weighted-consensus product.

Commercial banks: per-publisher review required. Most permit attribution-only display of forecast tables but not verbatim aggregation into a competing consensus product. This is the strongest reason to defer Wave 6 until legal templates are in place.

Action: add a `redistribution_reviewed_at` and `redistribution_terms_verified_by` column in the platform's sources admin UI (not the starter workbook) and do not expose any source in a paid product until both are populated.

## How this plan maps to BUILD_PLAN phases

Phase 1 (BUILD_PLAN §1.1): Waves 1 and 2.

Phase 2 (BUILD_PLAN §1.1 Phase 2): Waves 3, 4, and Wave 5 if commodity demand materialises.

Phase 3: Wave 6 plus Wave-4 long-tail.

## Open questions to resolve before Wave 3

How much SA revenue-data vs IMF-data reconciliation work is necessary up front vs ongoing? A two-hour spike is probably enough to answer.

Should Forethought publish a separate "SA Forecast Scorecard" as content ahead of broader launch? This fits Jared's editorial workstream (BUILD_PLAN §1.7) and exercises the full vintage-aware scoring pipeline on a constrained scope.

Is there value in reaching out to SARB or SA Treasury ahead of ingestion for an informal heads-up about the platform? This is a relationship question more than a legal one; public data is fair to use, but goodwill matters when the platform later wants named analyst collaborators.
