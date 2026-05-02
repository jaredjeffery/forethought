# Farfield: Platform Build Plan

## Purpose of this document

This is a comprehensive technical and product specification for building Farfield — a performance-tracked marketplace for economic forecasters and analysts. In the data model, `users` are login identities and `forecasters` are the canonical entities that issue forecasts or sell analysis. It is intended to serve as the primary reference document for development, including when working with Claude Code or similar AI-assisted development tools.

The builder has deep domain expertise (Oxford Economics, S&P Global) and will be developing the platform primarily using Claude Code, with support from developer friends as complexity increases. The plan prioritises getting to a functional, near-production-quality product that can be seeded with publicly available forecast data before forecaster recruitment begins.

**Current execution note for Claude/Codex:** this file is the product and technical build plan. For live implementation status, read `docs/PROGRESS.md` first, especially the "Claude handoff snapshot — 2026-05-02" section. As of that snapshot, Phase 0.5 is implemented and Phase 1 is near completion; the next recommended work is public-page polish and resolving the remaining actual-source fallback policy.

---

## 1. Platform overview

### What Farfield is

Farfield has three connected functions:

1. **Forecast discovery** — users find forecasters, institutions, variables, articles, and research products by topic, geography, variable, institution, ranking, products offered, and reviews.
2. **Forecast accountability** — Farfield tracks forecast performance against actual outcomes and publishes platform-controlled rankings, accuracy metrics, and methodology. Forecasters and institutions cannot edit these records.
3. **Forecast commerce** — forecasters sell subscriptions, reports, data products, calls, and bespoke analysis. Subscribers access premium forecast charts, consensus data, data exports, and forecaster feeds.

The platform supports six user states: logged-out public users, free logged-in users, paying subscribers, forecasters (with their own Studio workspace), institutional profile owners, and Farfield admins.

The platform feels like a hybrid of institutional forecast database, research marketplace, premium analytical media site, and forecaster reputation layer.

### What makes it distinctive

The core differentiator is transparent, standardised performance tracking. Existing players (Oxford Economics, EIU, bank research departments, independent consultancies) sell forecasts and analysis on the strength of brand and credentials. None of them publish systematic records of forecast accuracy. Farfield makes accuracy visible, which shifts the basis of competition from reputation to demonstrated skill.

### Seeding strategy

The platform launches pre-populated with publicly available forecasts from the IMF (World Economic Outlook), World Bank (Global Economic Prospects), OECD (Economic Outlook), major central banks, and national statistics offices. These are tracked passively — the institutions don't need to create accounts. This provides an immediate baseline consensus, content for the public-facing showcase, and a benchmark that early forecaster members can position themselves against.

---

## 2. Technical architecture

### 2.1 Recommended stack

**Framework: Next.js (App Router)**

Reasoning: Next.js provides server-side rendering (important for the public showcase and SEO), API routes (eliminating the need for a separate backend initially), and a mature React ecosystem. The App Router architecture supports server components, which improve performance for data-heavy pages like forecast charts and forecaster profiles. For a solo builder using Claude Code, having frontend and backend in a single codebase dramatically reduces complexity.

**Language: TypeScript throughout**

Reasoning: Type safety prevents a large class of bugs, especially important when modelling financial data where a mistyped field can produce subtly wrong calculations. TypeScript also produces better results when working with AI coding assistants because the type definitions serve as implicit documentation.

**Database: PostgreSQL**

Reasoning: Forecast data is inherently relational — forecasters submit predictions on variables, which are scored against actuals, aggregated into consensus products, and linked to forecaster profiles. PostgreSQL handles this naturally. It also supports time-series queries well (important for charting forecast histories), has excellent JSON support (useful for flexible metadata on variables and reports), and scales to the volumes Farfield will need for years. Use a managed PostgreSQL service (Supabase, Neon, or Railway) to avoid database administration overhead.

**ORM: Drizzle**

Reasoning: Drizzle provides type-safe database queries that integrate well with TypeScript and Next.js. It's lighter-weight than Prisma, produces more predictable SQL (important when you need to optimise time-series queries), and has a simpler migration system. For a platform where the database schema will evolve as features are added, Drizzle's migration workflow is more forgiving.

**Authentication: Auth.js (NextAuth v5)**

Reasoning: Supports email/password, Google, LinkedIn, and institutional SSO. Free, open-source, and well-integrated with Next.js. LinkedIn auth is particularly relevant — forecasters may want to link their Farfield profile to their professional identity, and corporate buyers are likely to authenticate via work accounts.

**Payments: Stripe (with Stripe Connect for marketplace payouts)**

Reasoning: Industry standard for marketplace payments. Stripe Connect supports the specific model Farfield needs — the platform takes a commission on transactions between forecasters and buyers. Stripe also handles subscription billing (for forecaster content subscriptions) and one-off payments (for individual report purchases or research briefs).

*Caveat on Stripe Connect for international forecaster payouts:* Connect's onboarding for payout recipients is non-trivial when forecasters are international (SA, UK, EU, US mix expected). Tax form collection (W-8BEN for non-US, W-9 for US), KYC identity checks, sometimes business registration documents. Budget roughly one week of build + integration time plus input from an accountant/lawyer on tax withholding rules per jurisdiction. Decide early whether forecasters get paid in their local currency (Stripe handles FX, takes a spread) or everything settles USD (simpler but pushes FX risk to forecasters). This work should be scheduled at the start of Phase 3, not discovered when the first forecaster is ready to be paid.

**File storage: S3-compatible object storage (e.g. Cloudflare R2 or AWS S3)**

Reasoning: Reports, PDFs, datasets, and other forecaster-uploaded content need durable, scalable storage with CDN delivery. R2 is cheaper (no egress fees) and simpler if the rest of the infrastructure isn't heavily AWS-dependent.

**Charting: Recharts or D3.js**

Reasoning: Forecast data needs to be presented as interactive time-series charts — showing individual forecaster forecasts against the consensus, actual outcomes, and historical accuracy. Recharts is simpler for standard chart types; D3 provides more control for custom visualisations like accuracy heatmaps or ranking trajectories. Start with Recharts and move to D3 for specialised views.

**Deployment: Vercel**

Reasoning: Native deployment target for Next.js. Handles scaling, CDN, serverless functions, and preview deployments automatically. For a solo builder, the operational simplicity is worth any premium over self-hosting.

**Search: Postgres full-text first; Meilisearch/Algolia in Phase 3 if limits bite**

Reasoning: Phase 1 and 2 search needs (variables, forecasters, content, forecast topics) are comfortably served by Postgres's built-in full-text search — `tsvector` with GIN indexes for text, `pg_trgm` for fuzzy matching, and standard SQL for faceting (filter by country, variable type, horizon). This keeps the stack to one service fewer, eliminates a cross-system sync, and is plenty fast at the row counts Farfield will see in the first year.

Move to a dedicated search service (Meilisearch preferred: open-source, self-hostable, lower cost than Algolia) only when one of the following becomes true: (a) the content corpus exceeds ~100k rows and Postgres query times degrade, (b) ranking quality limits conversion on the public showcase, or (c) faceted browsing needs features (typo tolerance, multi-language stemming, instant-search UI) that Postgres doesn't offer well. None of those are Phase 1 concerns.

### 2.2 High-level architecture

```
┌──────────────────────────────────────────────────────┐
│                    Next.js App                        │
│                                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐ │
│  │ Public       │  │ Forecaster  │  │ Buyer        │ │
│  │ Showcase     │  │ Studio      │  │ Dashboard    │ │
│  │ (SSR)        │  │ (Client)    │  │ (Client)     │ │
│  └─────────────┘  └─────────────┘  └──────────────┘ │
│                                                      │
│  ┌──────────────────────────────────────────────────┐│
│  │              API Routes Layer                     ││
│  │  /api/forecasts  /api/forecasters /api/consensus ││
│  │  /api/reports    /api/briefs    /api/scoring      ││
│  └──────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────┘
          │              │              │
          ▼              ▼              ▼
    ┌──────────┐  ┌──────────┐  ┌──────────┐
    │PostgreSQL│  │  S3/R2   │  │  Stripe  │
    │          │  │ (files)  │  │(payments)│
    └──────────┘  └──────────┘  └──────────┘
```

### 2.3 Core database schema

The schema below covers the essential entities. It will expand as features are added, but this foundation now prioritises the data integrity kernel: source provenance, immutable forecast/actual vintages, versioned scoring, as-of consensus snapshots, and server-side access control before broader marketplace features.

```sql
-- USERS AND ROLES

-- All platform users. The roles array determines which dashboards they see.
-- A single user may hold multiple roles simultaneously (e.g. a forecaster who also subscribes is
-- ['forecaster', 'buyer']) — modelling roles as an array rather than a single TEXT avoids the
-- single-role bug-in-waiting where a user upgrades from viewer→buyer and loses forecaster status.
--
-- Verification is split into two independent flags because they serve different purposes:
--   identity_verified — we've confirmed the person/entity exists (LinkedIn verification, ID, or
--     institutional email). Required for any public activity beyond viewing (publishing content,
--     selling reports, applying to briefs).
--   scoring_opted_in  — forecaster has consented to public accuracy scoring. Unlocks the "Verified
--     Forecaster" badge, priority placement, and the weighted consensus contribution.
-- A forecaster can be identity_verified without being scoring_opted_in (e.g. wants to publish
-- content and build a subscriber base before exposing forecasts to public scoring).
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           TEXT UNIQUE NOT NULL,
    display_name    TEXT NOT NULL,
    bio             TEXT,
    avatar_url      TEXT,
    institution     TEXT,           -- Optional: "IMF", "Oxford Economics", etc.
    is_anonymous    BOOLEAN DEFAULT FALSE,  -- Professionals who want pseudonymous profiles
    roles           TEXT[] NOT NULL DEFAULT ARRAY['viewer'],  -- one or more of: 'viewer', 'forecaster', 'buyer', 'admin'
    identity_verified BOOLEAN DEFAULT FALSE,  -- Identity confirmed (LinkedIn/ID/institutional email)
    identity_verified_at TIMESTAMPTZ,
    scoring_opted_in  BOOLEAN DEFAULT FALSE,  -- Opted into public accuracy scoring
    scoring_opted_in_at TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- FORECASTERS (institutional and individual)

-- Holds the public profile of any entity that issues forecasts: institutions (IMF, OECD, World
-- Bank, ECB, central banks, treasuries) and individual forecasters. Individual forecasters have a 1:1
-- link to a users row via user_id; institutional forecasters do not (they have no account).
--
-- This is the canonical reference for all forecast-issuing entities — forecasts.forecaster_id,
-- content.forecaster_id, subscriptions.forecaster_id, etc. all point here, not at users.
-- (The live code already follows this model — 10 institutional forecasters were seeded in
-- Increment 3, none with user accounts.)
CREATE TABLE forecasters (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug            TEXT NOT NULL UNIQUE,    -- "imf", "oecd", "jane-doe-macro"
    display_name    TEXT NOT NULL,
    forecaster_type TEXT NOT NULL,           -- 'institutional', 'individual', 'institutional_claimed'
    description     TEXT,
    bio             TEXT,                    -- Long-form for individual profiles
    logo_url        TEXT,
    avatar_url      TEXT,
    home_url        TEXT,                    -- External website / institution homepage
    region          TEXT,
    country         TEXT,                    -- ISO 3166-1 alpha-3
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,  -- NULL for institutional/unclaimed
    is_managed      BOOLEAN DEFAULT FALSE,   -- TRUE = Farfield-managed (e.g. seeded institutional profile)
    is_verified     BOOLEAN DEFAULT FALSE,   -- Identity verified (LinkedIn/ID/institutional email/claim)
    scoring_opted_in BOOLEAN DEFAULT FALSE,  -- Opted into public accuracy scoring
    ranked_status   TEXT,                    -- 'ranked', 'building_track_record', 'not_ranked', 'institution_benchmark'
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- VARIABLES AND FORECASTS

-- The universe of forecastable variables.
-- Each variable is a specific measurable quantity (e.g. "South Africa CPI YoY %")
CREATE TABLE variables (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug            TEXT NOT NULL UNIQUE,    -- URL-friendly: "gdp-growth-rate-usa" (derived from name + country)
    name            TEXT NOT NULL,           -- "GDP growth rate"
    country         TEXT,                    -- ISO 3166-1 alpha-3, e.g. "ZAF"
    region          TEXT,                    -- "Sub-Saharan Africa", "Global", etc.
    category        TEXT NOT NULL,           -- "macro", "commodity", "political", "financial"
    unit            TEXT NOT NULL,           -- "% YoY", "USD/bbl", "index", "probability"
    frequency       TEXT NOT NULL,           -- "quarterly", "annual", "event"
    description     TEXT,
    source_for_actuals TEXT,                 -- Where the actual outcome data comes from
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Individual forecast submissions.
-- Each row is one forecaster's prediction for one variable at one target period.
CREATE TABLE forecasts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    forecaster_id   UUID NOT NULL REFERENCES forecasters(id),
    variable_id     UUID NOT NULL REFERENCES variables(id),
    target_period     TEXT NOT NULL,         -- Display string: "2026-Q3", "2027", "2026-11-03"
    target_start_date DATE NOT NULL,         -- Canonical start of the target period (for horizon math, sorting, joining)
    target_end_date   DATE NOT NULL,         -- Canonical end of the target period (= start for event forecasts)
    value           DECIMAL NOT NULL,        -- The predicted value
    confidence_low  DECIMAL,                 -- Optional: lower bound of confidence interval
    confidence_high DECIMAL,                 -- Optional: upper bound of confidence interval
    forecast_made_at TIMESTAMPTZ NOT NULL,   -- When the forecast was *made* (for ingested institutional forecasts, this is the publication date of the vintage, NOT the ingestion time). Used for horizon calculation and fair scoring.
    submitted_at    TIMESTAMPTZ DEFAULT NOW(), -- When the row was written to the platform (ingestion timestamp)
    is_update       BOOLEAN DEFAULT FALSE,   -- TRUE if this revises a previous forecast
    previous_id     UUID REFERENCES forecasts(id),  -- Links to the forecast being revised
    source_type     TEXT DEFAULT 'platform', -- 'platform' (submitted by forecaster) or 'public' (scraped/ingested)
    source_vintage  TEXT,                    -- For ingested forecasts: "IMF WEO 2025-10", "OECD EO 2026-05", etc.
    notes           TEXT                     -- Forecaster's reasoning (optional but encouraged)
);

-- Why target_start_date / target_end_date alongside target_period:
-- The string form is for display and exact equality joins; the date fields are what scoring,
-- horizon analysis (1y-ahead vs 3y-ahead), and chronological sorting actually need. Keeping both
-- avoids re-parsing strings in every query and handles fiscal-vs-calendar-year mismatches
-- (store canonical dates per variable; show whatever label makes sense per source).
--
-- Why forecast_made_at is distinct from submitted_at:
-- For institutional forecasts ingested in bulk, submitted_at is NOW() at the time the scraper
-- ran. But the IMF's April 2025 WEO forecast of 2026 GDP was *made* in April 2025, and that is
-- the timestamp that matters for horizon calculation and for being fair to the forecaster.
-- Every ingestion script must populate forecast_made_at from the publication date of the vintage.

-- Actual outcomes, used to score forecasts.
-- CRITICAL: a single variable/period has MANY actuals — initial release, first revision, second
-- revision, annual benchmark revision, sometimes base-year rebase. We store them all and choose
-- a vintage policy at scoring time.
CREATE TABLE actuals (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variable_id     UUID NOT NULL REFERENCES variables(id),
    target_period   TEXT NOT NULL,           -- Display string, as on forecasts
    target_start_date DATE NOT NULL,
    target_end_date DATE NOT NULL,
    value           DECIMAL NOT NULL,
    source          TEXT NOT NULL,           -- "IMF WEO April 2027", "Stats SA", etc.
    vintage_date    DATE NOT NULL,           -- When this specific value was published by the source
    release_number  INTEGER NOT NULL,        -- 1 = initial release, 2 = first revision, etc.
    is_latest       BOOLEAN DEFAULT FALSE,   -- Convenience flag; recomputed when a newer vintage arrives
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(variable_id, target_start_date, source, release_number)
);

-- SOURCE PROVENANCE AND INGESTION AUDIT

-- Every source file, API response, or publication used to create forecasts or actuals.
-- The file_hash lets Farfield prove exactly which document was parsed and detect silent
-- source changes when a provider replaces a file at the same URL.
CREATE TABLE source_documents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_name     TEXT NOT NULL,           -- "IMF", "OECD", "World Bank", "ECB"
    publication_name TEXT NOT NULL,          -- "World Economic Outlook", "Economic Outlook"
    publication_date DATE NOT NULL,
    vintage_label   TEXT NOT NULL,           -- "2026-Apr", "EO-118", etc.
    source_url      TEXT,
    storage_url     TEXT,                    -- Optional R2/S3 copy for reproducibility
    file_hash       TEXT,
    ingested_at     TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(source_name, vintage_label)
);

-- One row per ingestion attempt. Failed runs are first-class records, not just console output.
CREATE TABLE ingestion_runs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_document_id UUID REFERENCES source_documents(id),
    source_name     TEXT NOT NULL,
    status          TEXT NOT NULL,           -- 'started', 'succeeded', 'failed', 'partial'
    records_created INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    records_skipped INTEGER DEFAULT 0,
    errors          JSONB,
    started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at     TIMESTAMPTZ
);

-- Explicit mapping from source-native codes to Farfield variables.
-- Unit transforms must be recorded here rather than hidden inside parser logic.
CREATE TABLE variable_source_mappings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_name     TEXT NOT NULL,
    source_variable_code TEXT NOT NULL,
    source_variable_name TEXT,
    farfield_variable_id UUID NOT NULL REFERENCES variables(id),
    unit_transform  TEXT,                    -- e.g. "index_to_yoy_percent", "identity"
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(source_name, source_variable_code, farfield_variable_id)
);

-- Reviewable data quality issues discovered during ingestion, scoring, or manual QA.
CREATE TABLE data_quality_flags (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type     TEXT NOT NULL,           -- 'forecast', 'actual', 'variable_mapping', 'source_document', 'score'
    entity_id       UUID,
    severity        TEXT NOT NULL,           -- 'info', 'warning', 'error', 'blocker'
    status          TEXT NOT NULL DEFAULT 'open', -- 'open', 'reviewed', 'resolved', 'ignored'
    message         TEXT NOT NULL,
    source_document_id UUID REFERENCES source_documents(id),
    ingestion_run_id UUID REFERENCES ingestion_runs(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    resolved_at     TIMESTAMPTZ
);

-- Scoring policy (to be published under section 4 Key design principles):
-- Primary score is against the FIRST release for each (variable, target_period, source) — this is
-- what forecasters could plausibly have been judged against in real time. A secondary
-- "benchmark-revised" score is computed against the latest available release and shown alongside.
-- Never silently switch policies — version the scoring methodology if it changes.

-- SCORING

-- The versioned scoring methodology. Every forecast_scores row references the version it was
-- computed under. If formulae change, rescoring produces new rows; old rows remain under their
-- original methodology version. This is what makes "we improved the methodology" safe.
CREATE TABLE scoring_methodologies (
    version         TEXT PRIMARY KEY,        -- "v1.0", "v1.1", etc.
    effective_from  DATE NOT NULL,
    description     TEXT NOT NULL,           -- Human-readable explanation
    code_ref        TEXT NOT NULL,           -- Git SHA or file path to the canonical implementation
    vintage_policy  TEXT NOT NULL,           -- e.g. "score against first-release actuals (release_number = 1)"
    published_at    TIMESTAMPTZ NOT NULL
);

-- Computed scores for each forecast once actuals are available.
CREATE TABLE forecast_scores (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    forecast_id     UUID NOT NULL REFERENCES forecasts(id),
    actual_id       UUID NOT NULL REFERENCES actuals(id),
    methodology_version TEXT NOT NULL REFERENCES scoring_methodologies(version),
    horizon_months  INTEGER NOT NULL,        -- Derived from actuals.target_start_date - forecasts.forecast_made_at
    brier_score     DECIMAL,                 -- For probability-type forecasts
    absolute_error  DECIMAL,                 -- |forecast - actual|
    signed_error    DECIMAL,                 -- forecast - actual (positive = forecaster was too high); used for bias
    percentage_error DECIMAL,                -- For continuous variables
    score_vs_consensus DECIMAL,              -- How much better/worse than consensus (negative = better)
    information_contribution DECIMAL,        -- Marginal improvement to weighted consensus (Phase 3)
    scored_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Aggregate forecaster performance across variables and time.
-- Recomputed periodically (daily or on new actuals).
--
-- NOTE: we store component scores, not a single composite. Composite scores invite weight
-- disputes ("why does consistency count 30%?") and can always be computed at query time from
-- the components. Rank is also computed at query time via a window function over the chosen
-- sort column — storing rank would require re-ranking every row whenever a new actual arrives.
CREATE TABLE forecaster_performance (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    forecaster_id   UUID NOT NULL REFERENCES forecasters(id),
    variable_id     UUID REFERENCES variables(id),  -- NULL = aggregate across category
    category        TEXT,                    -- NULL = aggregate across all, or "macro", "commodity", etc.
    horizon_months  INTEGER,                 -- NULL = all horizons; otherwise 3, 6, 12, 24, 36…
    mae             DECIMAL,                 -- Mean absolute error
    rmse            DECIMAL,                 -- Root mean square error
    mae_vs_consensus DECIMAL,                -- MAE relative to the basic consensus (negative = beats consensus)
    directional_accuracy DECIMAL,            -- % of forecasts with correct sign of change
    bias            DECIMAL,                 -- Mean signed error (positive = systematically optimistic)
    brier_score     DECIMAL,                 -- For probability-type forecasts
    calibration_error DECIMAL,               -- For probability-type forecasts
    revision_quality DECIMAL,                -- Do revisions move toward the eventual outturn?
    information_contribution DECIMAL,        -- Average marginal improvement to weighted consensus (Phase 3)
    consistency     DECIMAL,                 -- Variance of accuracy over time (component, not bundled)
    sample_size     INTEGER NOT NULL,        -- Number of scored forecasts underlying these numbers
    period          TEXT NOT NULL,           -- "all_time", "trailing_12m", "trailing_3m"
    computed_at     TIMESTAMPTZ DEFAULT NOW()
);

-- CONTENT AND MARKETPLACE

-- Reports, articles, and other content published by forecasters.
CREATE TABLE content (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    forecaster_id   UUID NOT NULL REFERENCES forecasters(id),
    title           TEXT NOT NULL,
    abstract        TEXT,                    -- Public preview
    body            TEXT,                    -- Full content (for on-platform reading)
    file_url        TEXT,                    -- S3 link for downloadable reports
    content_type    TEXT NOT NULL,           -- 'report', 'article', 'video', 'podcast', 'dataset'
    access_level    TEXT DEFAULT 'paid',     -- 'free', 'subscriber', 'paid'
    price_cents     INTEGER,                -- For one-off purchases (NULL = subscription-only)
    currency        TEXT DEFAULT 'USD',
    tags            TEXT[],                  -- For search and discovery
    variables       UUID[],                 -- Links to variables this content discusses
    featured        BOOLEAN DEFAULT FALSE,   -- Promoted on the showcase page
    published_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Articles published by Farfield or forecasters.
-- Distinct from marketplace content products (reports, datasets) in the content table.
-- Articles drive top-of-funnel discovery; they link to forecasters, variables, and products.
CREATE TABLE articles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug            TEXT NOT NULL UNIQUE,
    title           TEXT NOT NULL,
    excerpt         TEXT,                    -- Public preview paragraph
    body            TEXT,                    -- Full content (markdown)
    cover_image_url TEXT,
    author_type     TEXT NOT NULL,           -- 'farfield', 'forecaster', 'institution'
    forecaster_id   UUID REFERENCES forecasters(id) ON DELETE SET NULL,  -- NULL for Farfield-authored
    article_type    TEXT NOT NULL,           -- 'editorial', 'forecaster_insight', 'methodology_note',
                                             --   'variable_explainer', 'premium_analysis', 'institutional_update'
    access_level    TEXT NOT NULL DEFAULT 'free',   -- 'free', 'subscriber'
    status          TEXT NOT NULL DEFAULT 'draft',  -- 'draft', 'submitted', 'approved', 'published',
                                                    --   'rejected', 'archived'
    published_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE article_tags (
    article_id      UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    tag             TEXT NOT NULL,
    PRIMARY KEY (article_id, tag)
);

-- Links articles to the variables they discuss (for discovery on variable pages)
CREATE TABLE article_variables (
    article_id      UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    variable_id     UUID NOT NULL REFERENCES variables(id) ON DELETE CASCADE,
    PRIMARY KEY (article_id, variable_id)
);

-- Links articles to featured forecasters (for discovery on profile pages)
CREATE TABLE article_forecasters (
    article_id      UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    forecaster_id   UUID NOT NULL REFERENCES forecasters(id) ON DELETE CASCADE,
    PRIMARY KEY (article_id, forecaster_id)
);

-- Ad hoc research briefs posted by corporate buyers.
CREATE TABLE research_briefs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id        UUID NOT NULL REFERENCES users(id),
    title           TEXT NOT NULL,
    description     TEXT NOT NULL,
    required_expertise TEXT[],              -- "oil_markets", "south_africa_macro", etc.
    budget_range    TEXT,                    -- "5000-10000 USD" (shown to forecasters)
    deadline        DATE,
    status          TEXT DEFAULT 'open',     -- 'open', 'in_progress', 'completed', 'cancelled'
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Applications from forecasters to research briefs.
CREATE TABLE brief_applications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brief_id        UUID NOT NULL REFERENCES research_briefs(id),
    forecaster_id   UUID NOT NULL REFERENCES forecasters(id),
    proposal        TEXT NOT NULL,           -- How they'd approach the work
    proposed_fee    INTEGER NOT NULL,        -- In cents
    currency        TEXT DEFAULT 'USD',
    status          TEXT DEFAULT 'pending',  -- 'pending', 'accepted', 'rejected', 'completed'
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- SUBSCRIPTIONS AND TRANSACTIONS

CREATE TABLE subscriptions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscriber_id   UUID NOT NULL REFERENCES users(id),
    forecaster_id   UUID NOT NULL REFERENCES forecasters(id),
    tier            TEXT NOT NULL,           -- Defined by the forecaster
    price_cents     INTEGER NOT NULL,
    currency        TEXT DEFAULT 'USD',
    stripe_sub_id   TEXT,
    status          TEXT DEFAULT 'active',   -- 'active', 'cancelled', 'expired'
    started_at      TIMESTAMPTZ DEFAULT NOW(),
    expires_at      TIMESTAMPTZ,
    cancelled_at    TIMESTAMPTZ
);

CREATE TABLE transactions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id        UUID NOT NULL REFERENCES users(id),
    seller_forecaster_id UUID REFERENCES forecasters(id),  -- NULL for platform purchases (e.g. consensus data)
    content_id      UUID REFERENCES content(id),
    brief_id        UUID REFERENCES research_briefs(id),
    amount_cents    INTEGER NOT NULL,
    currency        TEXT DEFAULT 'USD',
    platform_fee    INTEGER NOT NULL,        -- Farfield's cut in cents
    stripe_payment_id TEXT,
    type            TEXT NOT NULL,           -- 'content_purchase', 'subscription', 'brief_payment', 'consensus_subscription'
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- CONSENSUS PRODUCTS

-- Computed consensus forecasts (basic and premium/weighted).
-- Consensus is always an as-of snapshot: "what did the contributor set imply on date X
-- for target period Y?" New runs insert new rows rather than overwriting history.
CREATE TABLE consensus_forecasts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variable_id     UUID NOT NULL REFERENCES variables(id),
    target_period   TEXT NOT NULL,
    target_start_date DATE NOT NULL,
    target_end_date DATE NOT NULL,
    as_of_date      DATE NOT NULL,
    consensus_type  TEXT NOT NULL,           -- 'basic' (simple average) or 'weighted' (performance-adjusted)
    methodology_version TEXT NOT NULL,        -- Consensus methodology version, distinct from scoring methodology
    value           DECIMAL NOT NULL,
    included_forecast_count INTEGER NOT NULL,
    high            DECIMAL,                 -- Range
    low             DECIMAL,
    source_document_id UUID REFERENCES source_documents(id),
    computed_at     TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(variable_id, target_start_date, as_of_date, consensus_type, methodology_version)
);
```

---

## 2.4 Navigation and user states

### User states

| State | Access |
|-------|--------|
| **Logged-out public** | Public articles, forecaster/institution profiles, actuals-only variable pages, headline ranking tables (institution + forecaster MAE/RMSE/bias), methodology, pricing |
| **Free logged-in** | Above + personalised home, watchlist, followed forecasters, saved articles, forecast coverage indicators, source labels, and legally safe public-source teasers |
| **Subscriber** | Above + full forecast time series, vintage history, individual forecaster series, forecast dispersion, detailed premium rankings, reports, data exports, subscriber dashboard |
| **Forecaster** | Full Studio workspace: profile editor, products, articles, forecast submission, analytics, revenue |
| **Institution owner** | Profile description, logo, links — cannot edit scoring, history, or methodology |
| **Admin** | Full platform: users, data, scoring, content, moderation |

The free tier is a discovery and trust layer, not a substitute for the data product. It may show coverage, source labels, public-source institutional teasers where legally safe, and locked modules, but it must not expose real consensus values, private forecaster values, paid consensus values, vintage history, or chart geometry that lets users reconstruct the paid product.

### Navigation by user state

**Logged-out:** Home · Articles · Forecasters · Variables · Methodology · Pricing · Sign in

**Free logged-in:** Home · Articles · Forecasters · Variables · Watchlist · Upgrade · Account

**Subscriber:** Dashboard · Feed · Variables · Forecasters · Reports · Data · Account

**Forecaster (Studio):** Studio · Profile · Products · Articles · Forecasts · Subscribers · Analytics · Revenue

### Route structure

**Public**
```
/                           Homepage (media-style)
/articles                   Article listing
/articles/[slug]            Article detail
/forecasters                Directory
/forecasters/[slug]         Forecaster or institution profile
/variables                  Directory
/variables/[slug]           Variable detail (actuals only for public)
/methodology                Overview
/methodology/scoring
/methodology/data-sources
/methodology/institutions
/pricing
/about
/sign-in    /sign-up
```

**Free logged-in**
```
/home                       Personalised home
/watchlist
/saved
/account    /account/preferences
```

**Subscriber**
```
/dashboard
/feed
/reports    /reports/[slug]
/data       /data/downloads    /data/api
/subscriptions
/billing
```

**Forecaster studio**
```
/studio
/studio/profile
/studio/products            /studio/products/new    /studio/products/[id]/edit
/studio/articles            /studio/articles/new    /studio/articles/[id]/edit
/studio/forecasts           /studio/forecasts/submit
/studio/subscribers
/studio/analytics
/studio/revenue
/studio/settings
```

**Admin**
```
/admin
/admin/users    /admin/forecasters    /admin/institutions
/admin/variables    /admin/actuals    /admin/forecasts
/admin/source-documents    /admin/ingestion-runs    /admin/data-quality
/admin/scoring    /admin/articles    /admin/products
/admin/reviews    /admin/moderation    /admin/settings
```

### Access control and data leakage rules

**All access control must be enforced server-side.** Never rely on client-side hiding, blurred charts, or frontend-only gating. Premium data must not appear in page source, JSON payloads, chart props, API responses, hydration data, or metadata for unauthorised requests. The role-aware data-fetching layer (Phase 0.5, build step 3) is what enforces this; every server component and API route flows through it.

**Logged-out public pages must never show:**
- Consensus forecast values (any vintage)
- Individual forecaster forecast values or time series
- Forecast chart geometry derived from real forecast data
- Forecast ranges, distributions, or dispersion data
- Detailed premium ranking tables (per-horizon, per-vintage, full per-forecaster history)

**Logged-out public pages may show:**
- Latest actuals and actuals history
- Headline ranking tables (institution / forecaster MAE / RMSE / bias against scored variables)
- Number of forecasters covering a variable
- Whether forecast coverage exists for a variable (as a fact, not a value)
- "Sign up to see the latest forecast" CTAs in place of the gated content
- Article excerpts (for subscriber-only articles)

**Free logged-in pages additionally may show:**
- Personalised home, watchlist, followed forecasters, and saved articles
- Number of forecasters covering a variable
- Source labels and target periods where no forecast value is exposed
- Legally safe public-source institutional teaser values only when explicitly marked safe for free display
- Locked premium modules that explain what subscribers can access without embedding hidden data

**Free logged-in pages must still NOT show:**
- Paid consensus values or real consensus series
- Private or paid forecaster forecast values
- Per-forecaster commercial forecast values
- Forecast time series (any vintage history beyond the most recent value)
- Individual forecaster forecast trajectories or revisions
- Reconstructive chart geometry derived from forecast values
- Forecast dispersion / distribution analytics
- Vintage-progression charts
- Data exports or API access
- Detailed premium ranking tables (per-horizon, per-vintage)

**Subscriber pages may show everything paywalled above** after server-side plan checks: full time series, consensus values, vintage history, individual trajectories, dispersion, exports, API.

---

## 3. Build phases

### Phase 0.5: Data integrity hardening

**Goal:** Make the existing forecast observatory trustworthy before expanding the public surface. This phase hardens provenance, access control, consensus history, and QA around the data already ingested.

**0.5.1 Ingestion/source/audit schema**

Add `source_documents`, `ingestion_runs`, `variable_source_mappings`, and `data_quality_flags`. Every ingestion script records the source document, run status, created/updated/skipped counts, parser errors, and any mapping or quality issues that need review.

**0.5.2 Consensus as-of/vintage model**

Change consensus from latest-only rows to immutable as-of snapshots. Queries must be able to answer: "What was the consensus as of date X for target period Y?" New consensus computations insert new snapshots rather than overwriting historical rows.

**0.5.3 Server-side access policy helpers**

Create a shared access/data-fetching layer that every API route and server component uses. Public/free/subscriber boundaries are enforced before data is queried or serialized, not hidden after the fact.

**0.5.4 Leakage and integrity tests**

Add tests that prove logged-out and free logged-in responses contain no forecast values, paid consensus values, private forecaster values, vintage series, reconstructive chart geometry, or hidden payload data. Scoring tests must prove every score links to an exact forecast, exact actual vintage, and methodology version.

**0.5.5 Minimal internal data QA**

Before building a full admin console, add minimal internal scripts or admin-only pages to review ingestion runs, variable mappings, failed parses, quality flags, and scored outputs before publication.

---

### Phase 1: Public showcase MVP

**Goal:** A credible public platform where visitors can understand Farfield, inspect forecaster and institution profiles, read Farfield editorial, view actuals, and see non-leaky trust signals. Public users can see what a variable is, what has happened historically, who forecasts it, and how Farfield evaluates forecasters. Subscribers see what the market thinks now.

**1.1 Variable slug migration**

Add `slug` to the `variables` table, generated from name and country code (e.g. "GDP Growth Rate" + "USA" → `gdp-growth-rate-usa`). Update all routes from `/variables/[id]` to `/variables/[slug]`.

**1.2 Public homepage (`/`)**

Media-style landing page. Explains Farfield, surfaces articles, highlights forecasters, and converts visitors. Sections: hero, featured articles, spotlight forecasters, trending variables with actuals-only previews, how scoring works, and conversion block. Do not show real consensus values, individual forecast values, or chart geometry derived from forecast data to public or free users.

**1.3 Articles section (`/articles`, `/articles/[slug]`)**

Phase 1 scope is Farfield editorial only: editorial, methodology notes, and variable explainers with simple draft → published states. Forecaster submissions, moderation queues, and premium forecaster-authored content wait for Phase 3.

**1.4 Forecasters directory and profiles**

Directory cards and profiles show public identity, topics covered, ranked status, sample non-leaky trust signals, and a Farfield-controlled trust panel. Profiles keep a strict split between forecaster-controlled storefront fields and Farfield-controlled scoring/performance fields.

**1.5 Variable pages (`/variables`, `/variables/[slug]`)**

Public/free pages show actuals history, variable explanation, forecast coverage counts, source labels, forecasters covering the variable, and locked premium modules. No public/free page may expose real consensus values, private or paid forecaster values, vintage history, dispersion, or reconstructive chart data.

**1.6 Methodology section (`/methodology`)**

Four pages: overview, `/scoring` (metrics, bias, horizons, revisions, consensus, data sufficiency thresholds, ranked vs building track record), `/data-sources` (source documents, actuals sources, revision policy, update frequency), `/institutions` (Farfield-managed vs claimed profiles, what each can and cannot edit).

**1.7 Pricing page**

Pricing page at `/pricing`, written around the subscriber value: current consensus, forecast history, vintage changes, premium rankings, exports, and alerts.

---

### Phase 2: Subscriber data product

**Goal:** Paying subscribers can access something materially better than the public site: current consensus, full forecast history, vintage progression, premium ranking depth, and exports.

**2.1 Stripe subscription billing**

Stripe plans, webhook handling, webhook idempotency, plan-gated access checks, and subscription status sync.

**2.2 Premium variable pages**

Subscribers see forecast charts, consensus as-of history, individual series, forecast dispersion, vintage history, ranked forecasters, and export options.

**2.3 Subscriber dashboard and watchlist**

Dashboard answers "what changed since I last visited?" Watchlist shows consensus updates, forecast changes, new actuals, and alert settings for followed variables.

**2.4 Data section (`/data`)**

Consensus forecast downloads, actuals datasets, API access, download history, and plan limits.

---

### Phase 3: Forecaster supply side

**Goal:** One independent forecaster can submit forecasts, publish analysis, sell something, and be scored later.

**3.1 Studio home and profile editor (`/studio`, `/studio/profile`)**

Studio home: profile status, ranked status, forecasts due, products live, subscribers, revenue, recent activity. Profile editor controls only forecaster-owned fields and never the Farfield trust panel.

**3.2 Forecast submission (`/studio/forecasts`)**

Variable selection, horizon, forecast values, confidence intervals, notes, submission history, and immutable timestamping. Submissions connect to the scoring pipeline once actuals arrive.

**3.3 Products, paid reports, and forecaster-authored articles**

Creation and management of subscriptions, reports, data products, consulting, events/webinars, and forecaster article submissions with moderation.

**3.4 Stripe Connect**

Forecaster onboarding, KYC/tax collection, payout accounts, platform fees, and revenue reporting.

---

### Phase 4: Marketplace/admin scale

**Goal:** Farfield staff can manage data quality, content, scoring, claimed institutions, marketplace integrity, and payouts without touching production code.

**4.1 Rich admin console (`/admin`)**

Covers users, forecasters, institutions, variables, actuals, source documents, ingestion runs, mappings, quality flags, scoring, articles, products, moderation, and settings.

**4.2 Institution profiles**

Two types: *Farfield-managed* (created from public data, clearly labelled as such) and *claimed* (institution-verified, can edit description/logo/links, cannot edit scoring or history).

**4.3 Marketplace and advanced analytics**

Research briefs, richer moderation, payout analytics, claimed institution workflows, revision behaviour analysis, exportable ranking depth, and advanced performance analytics.

**4.4 Ongoing ingestion**

Continue expanding forecast sources per the ingestion wave plan (Philly Fed SPF, Fed SEP, central banks). Migrate actuals from IMF-provisional to national statistical authorities (Stats SA, BEA, ONS, Eurostat) as coverage warrants. See FORECAST_GATHERING_PLAN.md for the full wave strategy.

## 4. Key design principles

### 4.1 Data integrity above all

Every forecast, every actual, every source document, every ingestion run, and every score must be traceable and immutable. Forecasters cannot delete or retroactively modify submitted forecasts. Actuals are sourced and cited (with vintage and release number — never silently overwritten when a source revises). Trust in the data is Farfield's entire value proposition — any compromise here is existential.

### 4.2 Scoring methodology is public, versioned, and pre-committed

The full scoring methodology — formulae, thresholds, vintage policy (primary score against first release of actuals; secondary score against latest benchmark-revised actuals), horizon handling, handling of missing values, and the code that implements it — is published openly **before any named entity is scored**. This is what turns "disputes" into "standard analysis." When a forecaster or institution asks "how did you arrive at my score?" the answer is already public and predates their objection.

Every change to the methodology is versioned. Old scores are preserved under the old methodology and relabelled; new scores are labelled with the new methodology version. Never silently change formulae. The versioning promise is what lets the methodology evolve without invalidating the platform's credibility.

Practical implication: a `scoring_methodology` table (or versioned file in the repo) records version, effective date, and the canonical description/code. Every `forecast_scores` row references the methodology version it was computed under. If the formula changes, rescoring produces new rows; old rows remain.

### 4.3 Forecaster experience drives supply

If the platform is annoying, slow, or unrewarding for forecasters, they won't submit forecasts and they won't publish content. Every interaction — from submitting a forecast to checking their ranking to uploading a report — should be fast, clear, and satisfying. Show them their impact in subscriber-only contexts: "Your latest forecast moved the consensus by 0.3 percentage points." Show them their trajectory: "Your accuracy on oil prices has improved from the 40th to the 65th percentile over six months."

### 4.4 Public showcase drives demand

The showcase must be genuinely useful to a visitor who never creates an account. It should answer: "What is this variable, what has happened historically, who forecasts it, and how does Farfield evaluate forecasters?" Subscribers answer the separate premium question: "What does the market think now?" If someone googles "South Africa GDP forecast 2027" and your showcase page ranks, that's a potential buyer or forecaster seeing Farfield for the first time. Optimise for this without leaking the paid data product.

### 4.5 Revenue follows value

Don't paywall actuals, methodology, profile trust signals, or non-reconstructive public teasers aggressively in Phase 1. Do paywall current consensus values, private/commercial forecast values, vintage history, dispersion, exports, and premium ranking depth. Revenue comes from premium consensus subscriptions, data access, forecaster subscriptions, reports, and marketplace commissions — all of which require a credible data core before a broader marketplace.

---

## 5. Technical notes for Claude Code

### 5.1 Project structure

```
farfield/
├── src/
│   ├── app/
│   │   ├── (public)/                    # Logged-out public pages
│   │   │   ├── page.tsx                 # / homepage
│   │   │   ├── layout.tsx
│   │   │   ├── articles/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [slug]/page.tsx
│   │   │   ├── forecasters/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [slug]/page.tsx
│   │   │   ├── variables/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [slug]/page.tsx
│   │   │   ├── methodology/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── scoring/page.tsx
│   │   │   │   ├── data-sources/page.tsx
│   │   │   │   └── institutions/page.tsx
│   │   │   ├── pricing/page.tsx
│   │   │   └── about/page.tsx
│   │   ├── (auth)/
│   │   │   ├── signin/page.tsx
│   │   │   └── signup/page.tsx
│   │   ├── (free)/                      # Free logged-in routes
│   │   │   ├── home/page.tsx
│   │   │   ├── watchlist/page.tsx
│   │   │   └── saved/page.tsx
│   │   ├── (subscriber)/                # Subscriber-only routes
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── feed/page.tsx
│   │   │   ├── reports/
│   │   │   ├── data/
│   │   │   ├── subscriptions/page.tsx
│   │   │   └── billing/page.tsx
│   │   ├── studio/                      # Forecaster studio
│   │   │   ├── page.tsx
│   │   │   ├── profile/page.tsx
│   │   │   ├── products/
│   │   │   ├── articles/
│   │   │   ├── forecasts/
│   │   │   ├── subscribers/page.tsx
│   │   │   ├── analytics/page.tsx
│   │   │   ├── revenue/page.tsx
│   │   │   └── settings/page.tsx
│   │   ├── admin/                       # Admin console
│   │   │   └── [module]/
│   │   ├── api/                         # API routes
│   │   │   ├── auth/
│   │   │   ├── articles/
│   │   │   ├── forecasters/
│   │   │   ├── variables/
│   │   │   ├── forecasts/
│   │   │   ├── consensus/
│   │   │   └── scoring/
│   │   └── layout.tsx
│   ├── components/
│   │   ├── articles/                    # ArticleCard, ArticleBody, Paywall
│   │   ├── forecasters/                 # ForecasterCard, TrustPanel, Storefront
│   │   ├── variables/                   # VariableCard, ActualsChart, LockedModule
│   │   ├── charts/                      # ForecastChart and data visualisations
│   │   ├── ui/                          # Design system: Card, MetricCard, SectionLabel
│   │   └── forms/                       # Forecast submission, article editor, products
│   ├── lib/
│   │   ├── db/                          # Drizzle schema, migrations, queries
│   │   ├── scoring/                     # Scoring engine
│   │   ├── consensus/                   # Consensus computation
│   │   ├── ingestion/                   # Institutional data import
│   │   ├── access/                      # Server-side access policy and data-shaping helpers
│   │   ├── auth/                        # Auth.js config
│   │   ├── payments/                    # Stripe integration
│   │   └── storage/                     # Cloudflare R2
│   └── types/
├── scripts/                             # Data ingestion and admin scripts
├── drizzle/                             # Database migrations
└── public/
```
### 5.2 Environment variables

```env
# Database
DATABASE_URL=postgresql://...

# Auth
AUTH_SECRET=...
AUTH_GOOGLE_ID=...
AUTH_GOOGLE_SECRET=...
AUTH_LINKEDIN_ID=...
AUTH_LINKEDIN_SECRET=...

# Stripe
STRIPE_SECRET_KEY=...
STRIPE_PUBLISHABLE_KEY=...
STRIPE_WEBHOOK_SECRET=...

# Storage
S3_BUCKET=...
S3_REGION=...
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
S3_ENDPOINT=...  # For R2 or other S3-compatible

# Search (Phase 3+ only — Phase 1/2 uses Postgres full-text)
# MEILISEARCH_HOST=...
# MEILISEARCH_API_KEY=...
```

### 5.3 Key dependencies

```json
{
  "dependencies": {
    "next": "^15",
    "react": "^19",
    "typescript": "^5",
    "drizzle-orm": "latest",
    "drizzle-kit": "latest",
    "@auth/core": "latest",
    "@auth/drizzle-adapter": "latest",
    "next-auth": "latest",
    "stripe": "latest",
    "@stripe/stripe-js": "latest",
    "recharts": "latest",
    "@aws-sdk/client-s3": "latest",
    "zod": "latest",
    "date-fns": "latest"
  }
}
```

### 5.4 Coding standards

- All database queries through Drizzle (no raw SQL except for complex analytical queries in the scoring engine)
- All API inputs validated with Zod schemas
- All financial amounts stored as integers (cents) to avoid floating-point issues
- All timestamps in UTC
- All forecast values stored as DECIMAL, not FLOAT, for precision
- Server components by default; client components only when interactivity is required
- Error handling: every API route returns structured error responses with appropriate HTTP status codes
- Logging: structured JSON logs for all forecast submissions, scoring events, and transactions
- Access control: forecast/consensus data must pass through server-side policy helpers before being queried or serialized
- Testing: every public/free forecast-adjacent route needs leakage tests for HTML, JSON, chart props, hydration data, and metadata

### 5.5 Build sequence for Claude Code

Build in this order, deploying and verifying each increment before moving to the next.

**Phase 0.5 — Data integrity hardening**

1. **Provenance schema** — add `source_documents`, `ingestion_runs`, `variable_source_mappings`, and `data_quality_flags`; update existing ingestion scripts to record source/run metadata and quality issues.
2. **Consensus as-of migration** — add `as_of_date`, `methodology_version`, and `included_forecast_count`; preserve historical consensus snapshots instead of overwriting latest-only rows.
3. **Server-side access layer** — centralise public/free/subscriber data policies in `src/lib/access/`; require every API route and server component that touches forecast data to use it.
4. **Leakage and integrity tests** — verify public/free responses contain no forecast values, paid consensus, private values, vintage series, reconstructive chart props, or hidden payload data; verify scores link to forecast, actual vintage, and methodology.
5. **Minimal internal QA** — add scripts or admin-only pages for ingestion runs, mappings, failed parses, data quality flags, and score review.

**Phase 1 — Public showcase MVP**

6. **Variable slug migration** — add slug to variables schema, populate from name + country_code, update all routes from `/variables/[id]` to `/variables/[slug]`.
7. **Public homepage rebuild** — media-style landing, actuals-only variable cards, article previews, forecaster spotlight, methodology links, and locked premium modules.
8. **Farfield editorial articles** — public listing/detail pages for Farfield-authored editorial, methodology notes, and variable explainers.
9. **Forecaster directory and profiles** — filters, ranked status badges, storefront/trust-panel split, and non-leaky performance teasers.
10. **Public variable pages** — actuals, coverage indicators, source labels, forecasters covering the variable, and locked premium modules; no real consensus or forecast values for public/free users unless explicitly approved as a legally safe public-source teaser.
11. **Methodology and pricing pages** — methodology overview/scoring/data-sources/institutions plus pricing focused on subscriber data value.

**Phase 2 — Subscriber data product**

12. **Stripe billing** — subscription plans, webhook handling, webhook idempotency, plan-gated access checks.
13. **Premium variable pages** — forecast chart, consensus as-of history, individual series, vintage history, dispersion, ranking table, export.
14. **Subscriber dashboard and watchlist** — forecast updates, new actuals, consensus changes, watched variables, alerts.
15. **Data section** — downloads, API keys, plan limits, download history.

**Phase 3 — Forecaster supply side**

16. **Studio home and routing** — middleware to gate `/studio` on forecaster role.
17. **Forecast submission** — variable selection, horizon, values, notes, immutable timestamps, history.
18. **Profile editor** — forecaster-controlled fields only, public profile preview.
19. **Products, paid reports, and articles** — subscriptions, reports, data products, consulting/events, forecaster article submission with moderation.
20. **Stripe Connect** — KYC/tax collection, payout accounts, platform fees, revenue reporting.

**Phase 4 — Marketplace/admin scale**

21. **Rich admin console** — users, forecasters, variables, actuals, source documents, ingestion runs, mappings, quality flags, scoring, articles, products.
22. **Claimed institution profiles** — verification workflow and profile controls that never touch scoring/history.
23. **Research briefs and moderation** — buyer briefs, applications, moderation workflow, marketplace integrity checks.
24. **Advanced analytics and ongoing ingestion** — payout analytics, revision behaviour, richer ranking exports, Philly Fed SPF, Fed SEP, Stats SA actuals, per `FORECAST_GATHERING_PLAN.md`.

Each step should be a working increment — deploy after each one and verify it works in production before moving to the next.
---

## 6. Risks and mitigations

**Risk: Data ingestion is harder than expected.** Institutional forecasts are published in inconsistent formats (PDFs, Excel files, web pages, APIs). Each source requires custom parsing logic, and formats change without notice.

*Mitigation:* Start with the most structured sources (IMF WEO publishes machine-readable datasets). Accept that some sources will require manual data entry initially. Build alerting so you know when an ingestion script breaks due to a format change.

**Risk: Forecasters don't join.** The platform launches with institutional data but no independent forecasters.

*Mitigation:* Use your OE and S&P network to recruit the first 10–20 forecasters personally. Offer the first cohort zero platform commission for their first year. Their early participation seeds the marketplace and generates the social proof needed to attract others.

**Risk: Buyers don't post research briefs.** The matchmaking function requires corporate demand.

*Mitigation:* Again, your network is the asset here. Identify 5–10 potential corporate clients from your professional contacts and approach them directly. Offer the first few matchmaking engagements commission-free to demonstrate the model. One successful engagement creates a case study that sells the next ten.

**Risk: Scoring methodology is contested.** Forecasters or institutions disagree with how they're being scored.

*Mitigation:* Publish the methodology in full, including the code. Invite feedback. Be transparent about the limitations (e.g. "scoring on annual GDP forecasts requires waiting for revised actuals, which can take 12–18 months"). Versioning the methodology means you can improve it without invalidating historical scores.

**Risk: Legal challenges from institutions being scored without consent.** An institution could argue that publicly scoring their forecasts constitutes misuse of their data.

*Mitigation:* The forecasts being scored are publicly published by the institutions themselves. Scoring them is commentary and analysis of public information — well within fair use and freedom of expression protections. However, consult a lawyer before launch to confirm this for the jurisdictions you're operating in. Don't reproduce the forecasts themselves in bulk; present scores and comparative analysis.

---

## 7. Success metrics

**Phase 0.5 — Data integrity hardening:**
- Source documents and ingestion runs recorded for every new ingestion
- Variable source mappings explicit and reviewable
- Data quality flags visible in minimal internal QA tooling
- Consensus rows queryable by variable + target period + as-of date
- Public/free leakage tests pass for HTML, JSON, chart props, hydration data, and metadata
- Scores link to exact forecast, exact actual vintage, and methodology version

**Phase 1 — Public showcase MVP:**
- Public homepage live with articles, forecaster spotlight, and actuals-only variable cards
- Articles section live with at least three published pieces (IMF WEO vintage-progression analysis as launch editorial)
- Forecaster directory and profiles live with ranked status badges, trust panel, and storefront layer
- Variable pages show actuals, coverage indicators, source labels, and locked premium modules without exposing forecast values
- Methodology section complete (all four pages)
- Zero forecast/consensus data accessible to logged-out or free users unless explicitly approved as a legally safe public-source teaser
- 500+ monthly visitors
- At least three forecasters expressing interest in joining

**Phase 2 — Subscriber data product:**
- First paying subscriber
- Subscriber dashboard, watchlist, and premium variable pages live
- Consensus as-of history and vintage history visible to subscribers
- At least one data export or API key issued
- Stripe billing live and end-to-end tested

**Phase 3 — Forecaster supply side:**
- Five or more active independent forecasters with live profiles
- At least one forecaster product (report or subscription) sold
- Forecast submission flow working end-to-end with scoring integration

**Phase 4 — Marketplace/admin scale:**
- Admin console covering users, forecasters, source documents, ingestion runs, mappings, scoring, and articles
- At least one non-IMF institutional profile claimed and verified
- Scoring methodology v1.0 publicly documented across all four methodology pages
- Monthly revenue covering basic operating costs (hosting, Stripe fees)
