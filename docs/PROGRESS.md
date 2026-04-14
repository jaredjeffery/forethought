# Forethought — Progress Log

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

- **Live site**: forethought-two.vercel.app
- **Database**: 23,744 forecasts, 5,174 scored against actuals, 198 variables, 10 forecasters
- **GitHub**: github.com/jaredjeffery/forethought (auto-deploys on push to main)
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
