# Forecaster Profile Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build redesigned public forecaster profiles with a universal modular layout, Farfield-controlled score rail, flexible widgets, and a fixed verified-recommendations section without exposing locked forecast data.

**Architecture:** Add a public-safe profile model layer that converts existing forecaster coverage data into a view model, then render it through focused forecaster components. The first implementation uses default widget configuration and an empty-state recommendations carousel; database-backed profile editing and transaction-backed recommendations stay out of this slice.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript 5, Drizzle ORM, Tailwind CSS v4, existing Farfield Prism design tokens.

---

## Scope

This plan implements the public read-only redesign. It does not add Studio profile editing, marketplace transactions, or real customer recommendations. Those require separate implementation plans after the public profile shape is stable.

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/lib/forecaster-profile.ts` | Create | Public-safe profile types, default widget definitions, and default profile builder |
| `src/lib/forecaster-queries.ts` | Modify | Add a public profile view-model query helper that joins existing safe data with the default profile model |
| `src/components/forecasters/ForecasterScoreRail.tsx` | Create | Farfield-controlled score/status side rail |
| `src/components/forecasters/ForecasterProfileHero.tsx` | Create | Hero section with forecaster-owned intro and score rail |
| `src/components/forecasters/ForecasterWidgetRenderer.tsx` | Create | Renders approved middle widgets using existing public-safe coverage data |
| `src/components/forecasters/VerifiedRecommendationsCarousel.tsx` | Create | Client component for the bottom manual recommendations carousel and empty state |
| `src/app/(public)/forecasters/[slug]/page.tsx` | Modify | Replace the current profile layout with the new hero, widgets, and recommendations section |
| `scripts/qa-forecaster-profile-model.ts` | Create | Verifies the default profile model has known widgets and no star-rating field |
| `scripts/qa-forecaster-profile-view-model.ts` | Create | Verifies the DB-backed view model returns safe defaults for a real forecaster |
| `scripts/leakage-tests.ts` | Modify | Add public profile assertions for the redesigned page |
| `docs/PROGRESS.md` | Modify | Record implementation progress at the end of the session |

---

## Task 1: Public Profile Model

**Files:**
- Create: `src/lib/forecaster-profile.ts`
- Create: `scripts/qa-forecaster-profile-model.ts`

- [ ] **Step 1: Write the failing QA script**

Create `scripts/qa-forecaster-profile-model.ts`:

```typescript
// QA checks for the public forecaster profile model.

import {
  DEFAULT_PROFILE_WIDGET_ORDER,
  PROFILE_WIDGET_DEFINITIONS,
  buildDefaultForecasterProfile,
  isProfileWidgetKey,
} from "../src/lib/forecaster-profile";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

const profile = buildDefaultForecasterProfile({
  id: "00000000-0000-0000-0000-000000000001",
  slug: "maya-ndlovu",
  name: "Maya Ndlovu",
  type: "ANALYST",
  forecastCount: 286,
  scoredCount: 172,
  variableCount: 14,
  countryCount: 9,
  latestVintage: "2026-Apr",
});

assert(profile.hero.name === "Maya Ndlovu", "Hero name should use forecaster name");
assert(profile.scoreRail.items.length >= 4, "Score rail should expose at least four safe items");
assert(profile.recommendations.mode === "manual-carousel", "Recommendations should use manual carousel mode");
assert(profile.recommendations.customerRating == null, "Profile model must not expose a customer rating");
assert(profile.recommendations.emptyState === "No verified client recommendations yet.", "Empty state copy changed unexpectedly");
assert(DEFAULT_PROFILE_WIDGET_ORDER.every(isProfileWidgetKey), "Default widget order contains an unknown widget");

for (const widget of DEFAULT_PROFILE_WIDGET_ORDER) {
  assert(Boolean(PROFILE_WIDGET_DEFINITIONS[widget]), `Missing widget definition for ${widget}`);
}

console.log("Forecaster profile model QA passed.");
```

- [ ] **Step 2: Run the QA script and confirm it fails**

Run:

```powershell
node --env-file=.env.local node_modules/tsx/dist/cli.mjs scripts/qa-forecaster-profile-model.ts
```

Expected: FAIL with an import error for `../src/lib/forecaster-profile`.

- [ ] **Step 3: Create the profile model**

Create `src/lib/forecaster-profile.ts`:

```typescript
// Public-safe forecaster profile model and default widget configuration.

export type ForecasterKind = "INSTITUTION" | "ANALYST";

export type ProfileWidgetKey =
  | "track_record"
  | "coverage"
  | "latest_analysis"
  | "products"
  | "specialties"
  | "methodology_note"
  | "media_credentials"
  | "team_bio";

export type ForecasterProfileSummary = {
  id: string;
  slug: string;
  name: string;
  type: ForecasterKind;
  forecastCount: number;
  scoredCount: number;
  variableCount: number;
  countryCount: number;
  latestVintage: string | null;
};

export type ScoreRailTone = "cobalt" | "teal" | "amber" | "neutral";

export type ScoreRailItem = {
  label: string;
  value: string;
  detail: string;
  tone: ScoreRailTone;
};

export type ForecasterProfileViewConfig = {
  hero: {
    name: string;
    headline: string;
    summary: string;
    badges: string[];
    featuredWidgetKey: ProfileWidgetKey;
  };
  scoreRail: {
    label: string;
    items: ScoreRailItem[];
  };
  widgets: ProfileWidgetKey[];
  recommendations: {
    mode: "manual-carousel";
    count: number;
    emptyState: string;
    customerRating: null;
  };
};

export type ProfileWidgetDefinition = {
  key: ProfileWidgetKey;
  label: string;
  description: string;
};

export const DEFAULT_PROFILE_WIDGET_ORDER: ProfileWidgetKey[] = [
  "track_record",
  "coverage",
  "latest_analysis",
  "products",
  "specialties",
  "methodology_note",
];

export const PROFILE_WIDGET_DEFINITIONS: Record<ProfileWidgetKey, ProfileWidgetDefinition> = {
  track_record: {
    key: "track_record",
    label: "Track record",
    description: "Farfield-controlled performance and sample-depth summary.",
  },
  coverage: {
    key: "coverage",
    label: "Coverage",
    description: "Indicators, countries, and vintages tracked for this forecaster.",
  },
  latest_analysis: {
    key: "latest_analysis",
    label: "Latest analysis",
    description: "Public analysis, notes, and research updates.",
  },
  products: {
    key: "products",
    label: "Products",
    description: "Subscriptions, reports, datasets, calls, and bespoke research.",
  },
  specialties: {
    key: "specialties",
    label: "Specialties",
    description: "Forecaster-owned focus areas and domain strengths.",
  },
  methodology_note: {
    key: "methodology_note",
    label: "Methodology note",
    description: "How the forecaster thinks about evidence, uncertainty, and revisions.",
  },
  media_credentials: {
    key: "media_credentials",
    label: "Media and credentials",
    description: "Restrained professional proof and external references.",
  },
  team_bio: {
    key: "team_bio",
    label: "Team",
    description: "Author or team context for institutions and research houses.",
  },
};

export function isProfileWidgetKey(value: string): value is ProfileWidgetKey {
  return Object.prototype.hasOwnProperty.call(PROFILE_WIDGET_DEFINITIONS, value);
}

function formatCount(value: number) {
  return value.toLocaleString("en-US");
}

export function buildProfileStatus(scoredCount: number, forecastCount: number) {
  if (scoredCount >= 100) {
    return {
      label: "Ranked benchmark",
      detail: "Large scored sample",
      tone: "cobalt" as const,
    };
  }

  if (scoredCount > 0) {
    return {
      label: "Building track record",
      detail: "Scored sample forming",
      tone: "amber" as const,
    };
  }

  if (forecastCount > 0) {
    return {
      label: "Tracked, awaiting scores",
      detail: "Forecasts logged",
      tone: "violet" as const,
    };
  }

  return {
    label: "Not yet tracked",
    detail: "No public forecast sample",
    tone: "neutral" as const,
  };
}

export function buildDefaultForecasterProfile(
  summary: ForecasterProfileSummary,
): ForecasterProfileViewConfig {
  const status = buildProfileStatus(summary.scoredCount, summary.forecastCount);
  const kindLabel = summary.type === "INSTITUTION" ? "Institution" : "Independent forecaster";

  return {
    hero: {
      name: summary.name,
      headline:
        summary.type === "INSTITUTION"
          ? `${summary.name} public forecast record`
          : `${summary.name} forecast profile`,
      summary:
        summary.type === "INSTITUTION"
          ? "Public forecast coverage, source depth, and Farfield-controlled performance evidence."
          : "Forecast work, public track record, and Farfield-controlled performance evidence.",
      badges: [kindLabel, status.label],
      featuredWidgetKey: summary.scoredCount > 0 ? "track_record" : "coverage",
    },
    scoreRail: {
      label: "Farfield record",
      items: [
        {
          label: "Status",
          value: status.label,
          detail: status.detail,
          tone: status.tone === "violet" ? "amber" : status.tone,
        },
        {
          label: "Scored sample",
          value: summary.scoredCount > 0 ? formatCount(summary.scoredCount) : "-",
          detail: "Rows matched to actuals",
          tone: summary.scoredCount > 0 ? "teal" : "neutral",
        },
        {
          label: "Coverage",
          value:
            summary.variableCount > 0 || summary.countryCount > 0
              ? `${formatCount(summary.variableCount)} / ${formatCount(summary.countryCount)}`
              : "-",
          detail: "Indicators / geographies",
          tone: summary.variableCount > 0 ? "cobalt" : "neutral",
        },
        {
          label: "Latest vintage",
          value: summary.latestVintage ?? "-",
          detail: "Most recent public source",
          tone: summary.latestVintage ? "neutral" : "neutral",
        },
      ],
    },
    widgets: DEFAULT_PROFILE_WIDGET_ORDER,
    recommendations: {
      mode: "manual-carousel",
      count: 0,
      emptyState: "No verified client recommendations yet.",
      customerRating: null,
    },
  };
}
```

- [ ] **Step 4: Run the QA script and confirm it passes**

Run:

```powershell
node --env-file=.env.local node_modules/tsx/dist/cli.mjs scripts/qa-forecaster-profile-model.ts
```

Expected: PASS with:

```text
Forecaster profile model QA passed.
```

- [ ] **Step 5: Commit**

Run:

```powershell
git add src/lib/forecaster-profile.ts scripts/qa-forecaster-profile-model.ts
git commit -m "Add public forecaster profile model"
```

---

## Task 2: Public View Model Query

**Files:**
- Modify: `src/lib/forecaster-queries.ts`
- Create: `scripts/qa-forecaster-profile-view-model.ts`

- [ ] **Step 1: Write the failing QA script**

Create `scripts/qa-forecaster-profile-view-model.ts`:

```typescript
// QA checks for the DB-backed public forecaster profile view model.

import { getForecasterPublicProfileViewModel } from "../src/lib/forecaster-queries";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

async function main() {
  const profile = await getForecasterPublicProfileViewModel("imf");

  assert(profile !== null, "Expected IMF profile view model");
  assert(profile.forecaster.slug === "imf", "Expected IMF slug");
  assert(profile.profile.scoreRail.items.length >= 4, "Score rail should include safe public items");
  assert(profile.profile.recommendations.customerRating == null, "Customer rating must stay absent");
  assert(profile.profile.widgets.includes("track_record"), "Track record widget should be present");
  assert(Array.isArray(profile.coverageByIndicator), "Indicator coverage should be an array");
  assert(Array.isArray(profile.coverageByCountry), "Country coverage should be an array");

  const serialized = JSON.stringify(profile);
  for (const forbidden of [
    "absoluteError",
    "percentageError",
    "signedError",
    "scoreVsConsensus",
    "simpleMean",
    "weightedMean",
  ]) {
    assert(!serialized.includes(forbidden), `Forbidden metric leaked through view model: ${forbidden}`);
  }

  console.log("Forecaster profile view-model QA passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

- [ ] **Step 2: Run the QA script and confirm it fails**

Run:

```powershell
node --env-file=.env.local node_modules/tsx/dist/cli.mjs scripts/qa-forecaster-profile-view-model.ts
```

Expected: FAIL because `getForecasterPublicProfileViewModel` is not exported.

- [ ] **Step 3: Add the view-model query helper**

Modify `src/lib/forecaster-queries.ts` by adding this import near the existing imports:

```typescript
import {
  buildDefaultForecasterProfile,
  type ForecasterKind,
  type ForecasterProfileSummary,
} from "./forecaster-profile";
```

Then add this function after `getForecasterPublicProfileData`:

```typescript
export async function getForecasterPublicProfileViewModel(slug: string) {
  const forecaster = await getForecasterBySlug(slug);
  if (!forecaster) return null;

  const publicProfile = await getForecasterPublicProfileData(forecaster.id);
  const summary = publicProfile.summary;

  const safeSummary: ForecasterProfileSummary = {
    id: forecaster.id,
    slug: forecaster.slug,
    name: forecaster.name,
    type: forecaster.type as ForecasterKind,
    forecastCount: Number(summary.forecastCount),
    scoredCount: Number(summary.scoredCount),
    variableCount: Number(summary.variableCount),
    countryCount: Number(summary.countryCount),
    latestVintage: summary.latestVintage,
  };

  return {
    forecaster,
    profile: buildDefaultForecasterProfile(safeSummary),
    summary: safeSummary,
    coverageByIndicator: publicProfile.coverageByIndicator,
    coverageByCountry: publicProfile.coverageByCountry,
    vintages: publicProfile.vintages,
  };
}
```

- [ ] **Step 4: Run the QA script and confirm it passes**

Run:

```powershell
node --env-file=.env.local node_modules/tsx/dist/cli.mjs scripts/qa-forecaster-profile-view-model.ts
```

Expected: PASS with:

```text
Forecaster profile view-model QA passed.
```

- [ ] **Step 5: Commit**

Run:

```powershell
git add src/lib/forecaster-queries.ts scripts/qa-forecaster-profile-view-model.ts
git commit -m "Add public forecaster profile view model"
```

---

## Task 3: Forecaster Profile Components

**Files:**
- Create: `src/components/forecasters/ForecasterScoreRail.tsx`
- Create: `src/components/forecasters/ForecasterProfileHero.tsx`
- Create: `src/components/forecasters/ForecasterWidgetRenderer.tsx`
- Create: `src/components/forecasters/VerifiedRecommendationsCarousel.tsx`

- [ ] **Step 1: Create the score rail component**

Create `src/components/forecasters/ForecasterScoreRail.tsx`:

```typescript
// Farfield-controlled score rail for public forecaster profiles.

import type { ForecasterProfileViewConfig, ScoreRailTone } from "@/lib/forecaster-profile";
import { Card } from "@/components/ui/Card";

const toneClass: Record<ScoreRailTone, string> = {
  cobalt: "text-cobalt",
  teal: "text-teal",
  amber: "text-amber",
  neutral: "text-muted",
};

interface ForecasterScoreRailProps {
  scoreRail: ForecasterProfileViewConfig["scoreRail"];
}

export function ForecasterScoreRail({ scoreRail }: ForecasterScoreRailProps) {
  return (
    <Card padding="lg" raised className="h-fit">
      <p className="section-label">{scoreRail.label}</p>
      <div className="mt-5 space-y-4">
        {scoreRail.items.map((item) => (
          <div key={item.label} className="border-b border-border pb-4 last:border-b-0 last:pb-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
              {item.label}
            </p>
            <p
              className={`mt-1 font-mono text-2xl font-bold tabular-nums ${toneClass[item.tone]}`}
            >
              {item.value}
            </p>
            <p className="mt-1 text-xs leading-5 text-muted">{item.detail}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
```

- [ ] **Step 2: Create the hero component**

Create `src/components/forecasters/ForecasterProfileHero.tsx`:

```typescript
// Public forecaster profile hero with forecaster-owned positioning and Farfield score rail.

import type { ForecasterProfileViewConfig } from "@/lib/forecaster-profile";
import { ForecasterScoreRail } from "./ForecasterScoreRail";

interface ForecasterProfileHeroProps {
  profile: ForecasterProfileViewConfig;
}

export function ForecasterProfileHero({ profile }: ForecasterProfileHeroProps) {
  return (
    <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
      <div className="min-h-[320px] py-2">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {profile.hero.badges.map((badge) => (
            <span key={badge} className="badge badge-cobalt">
              {badge}
            </span>
          ))}
        </div>
        <h1
          className="max-w-3xl text-5xl leading-[1.04] tracking-tight text-ink"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {profile.hero.name}
        </h1>
        <span className="accent-rule" />
        <p className="mt-5 max-w-2xl text-xl leading-8 text-ink-2">
          {profile.hero.headline}
        </p>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted">
          {profile.hero.summary}
        </p>
      </div>

      <ForecasterScoreRail scoreRail={profile.scoreRail} />
    </section>
  );
}
```

- [ ] **Step 3: Create the widget renderer**

Create `src/components/forecasters/ForecasterWidgetRenderer.tsx`:

```typescript
// Renders approved public-safe widgets for forecaster profile middle sections.

import Link from "next/link";
import type { ProfileWidgetKey, ForecasterProfileViewConfig } from "@/lib/forecaster-profile";
import { PROFILE_WIDGET_DEFINITIONS } from "@/lib/forecaster-profile";
import { Card } from "@/components/ui/Card";
import { SectionLabel } from "@/components/ui/SectionLabel";

type CoverageIndicatorRow = {
  indicatorName: string;
  forecastCount: number | string;
  scoredCount: number | string;
  countryCount: number | string;
};

type CoverageCountryRow = {
  countryCode: string;
  forecastCount: number | string;
  scoredCount: number | string;
  variableCount: number | string;
};

type VintageRow = {
  vintage: string | null;
};

interface ForecasterWidgetRendererProps {
  profile: ForecasterProfileViewConfig;
  coverageByIndicator: CoverageIndicatorRow[];
  coverageByCountry: CoverageCountryRow[];
  vintages: VintageRow[];
}

function CoverageBar({ value, max }: { value: number; max: number }) {
  const ratio = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="h-2 overflow-hidden rounded-full bg-bg-alt">
      <div className="h-full rounded-full bg-cobalt" style={{ width: `${Math.max(ratio, 2)}%` }} />
    </div>
  );
}

function TrackRecordWidget({
  coverageByIndicator,
}: {
  coverageByIndicator: CoverageIndicatorRow[];
}) {
  const indicatorMax = coverageByIndicator.reduce(
    (max, row) => Math.max(max, Number(row.forecastCount)),
    0,
  );

  return (
    <Card padding="lg">
      <SectionLabel>Track Record</SectionLabel>
      {coverageByIndicator.length === 0 ? (
        <p className="text-sm leading-6 text-muted">No public tracked forecasts yet.</p>
      ) : (
        <div className="space-y-4">
          {coverageByIndicator.slice(0, 6).map((row) => {
            const value = Number(row.forecastCount);
            return (
              <div key={row.indicatorName} className="grid gap-3 md:grid-cols-[1fr_120px_1.4fr_80px] md:items-center">
                <span className="text-sm font-semibold text-ink">{row.indicatorName}</span>
                <span className="font-mono text-xs tabular-nums text-muted">
                  {Number(row.countryCount)} geos
                </span>
                <CoverageBar value={value} max={indicatorMax} />
                <span className="text-right font-mono text-sm tabular-nums text-ink">
                  {value.toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function CoverageWidget({
  coverageByCountry,
  vintages,
}: {
  coverageByCountry: CoverageCountryRow[];
  vintages: VintageRow[];
}) {
  return (
    <Card padding="lg">
      <SectionLabel>Coverage</SectionLabel>
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="grid gap-2 sm:grid-cols-3 md:grid-cols-4">
          {coverageByCountry.slice(0, 16).map((row) => (
            <div key={row.countryCode} className="rounded-md border border-border bg-bg px-3 py-3">
              <p className="font-mono text-sm font-bold text-ink">{row.countryCode}</p>
              <p className="mt-1 font-mono text-[10px] tabular-nums text-muted">
                {Number(row.forecastCount)} forecasts / {Number(row.variableCount)} indicators
              </p>
            </div>
          ))}
          {coverageByCountry.length === 0 && (
            <p className="text-sm leading-6 text-muted">No geography coverage is recorded yet.</p>
          )}
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
            Latest vintages
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {vintages.length > 0 ? (
              vintages.map((row) => (
                <span key={row.vintage} className="badge badge-neutral">
                  {row.vintage}
                </span>
              ))
            ) : (
              <p className="text-sm text-muted">No vintage labels recorded.</p>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

function TextWidget({ widget }: { widget: ProfileWidgetKey }) {
  const definition = PROFILE_WIDGET_DEFINITIONS[widget];

  if (widget === "latest_analysis") {
    return (
      <Card padding="lg">
        <SectionLabel>{definition.label}</SectionLabel>
        <p className="text-sm leading-6 text-muted">
          Public analysis and paid research modules will appear here as the editorial and product systems expand.
        </p>
        <Link href="/articles" className="btn-secondary mt-5">
          Browse Farfield analysis
        </Link>
      </Card>
    );
  }

  if (widget === "products") {
    return (
      <Card padding="lg">
        <SectionLabel>{definition.label}</SectionLabel>
        <p className="text-sm leading-6 text-muted">
          Subscriptions, reports, datasets, calls, and bespoke research will be listed here when forecaster products are live.
        </p>
        <Link href="/pricing" className="btn-primary mt-5">
          Request access
        </Link>
      </Card>
    );
  }

  return (
    <Card padding="lg">
      <SectionLabel>{definition.label}</SectionLabel>
      <p className="text-sm leading-6 text-muted">{definition.description}</p>
    </Card>
  );
}

export function ForecasterWidgetRenderer({
  profile,
  coverageByIndicator,
  coverageByCountry,
  vintages,
}: ForecasterWidgetRendererProps) {
  return (
    <section className="space-y-5">
      {profile.widgets.map((widget) => {
        if (widget === "track_record") {
          return (
            <TrackRecordWidget
              key={widget}
              coverageByIndicator={coverageByIndicator}
            />
          );
        }

        if (widget === "coverage") {
          return (
            <CoverageWidget
              key={widget}
              coverageByCountry={coverageByCountry}
              vintages={vintages}
            />
          );
        }

        return <TextWidget key={widget} widget={widget} />;
      })}
    </section>
  );
}
```

- [ ] **Step 4: Create the recommendations carousel**

Create `src/components/forecasters/VerifiedRecommendationsCarousel.tsx`:

```typescript
"use client";
// Manual text-only carousel for verified Farfield customer recommendations.

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { SectionLabel } from "@/components/ui/SectionLabel";

export type VerifiedRecommendation = {
  id: string;
  body: string;
  transactionType: string;
  publishedAt: string;
};

interface VerifiedRecommendationsCarouselProps {
  recommendations: VerifiedRecommendation[];
  emptyState: string;
}

function seededOrder(items: VerifiedRecommendation[]) {
  return [...items].sort((a, b) => a.id.localeCompare(b.id));
}

export function VerifiedRecommendationsCarousel({
  recommendations,
  emptyState,
}: VerifiedRecommendationsCarouselProps) {
  const ordered = useMemo(() => seededOrder(recommendations), [recommendations]);
  const [index, setIndex] = useState(0);
  const current = ordered[index];

  function previous() {
    setIndex((value) => (value === 0 ? ordered.length - 1 : value - 1));
  }

  function next() {
    setIndex((value) => (value + 1) % ordered.length);
  }

  return (
    <section>
      <Card padding="lg">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <SectionLabel>Verified Recommendations</SectionLabel>
            <h2
              className="text-3xl leading-tight text-ink"
              style={{ fontFamily: "var(--font-display)" }}
            >
              From paid Farfield customers
            </h2>
          </div>
          <p className="font-mono text-sm tabular-nums text-muted">
            {ordered.length.toLocaleString()} verified
          </p>
        </div>

        {current ? (
          <div className="mt-7">
            <blockquote className="max-w-3xl border-l-4 border-cobalt pl-5 text-lg leading-8 text-ink">
              "{current.body}"
            </blockquote>
            <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-muted">
              {current.transactionType} / Moderated by Farfield
            </p>
            <div className="mt-6 flex items-center justify-between">
              <button type="button" className="btn-secondary" onClick={previous}>
                Previous
              </button>
              <span className="font-mono text-xs tabular-nums text-muted">
                {index + 1} / {ordered.length}
              </span>
              <button type="button" className="btn-secondary" onClick={next}>
                Next
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-7 text-sm leading-6 text-muted">{emptyState}</p>
        )}
      </Card>
    </section>
  );
}
```

- [ ] **Step 5: Run the TypeScript compiler**

Run:

```powershell
npx tsc --noEmit
```

Expected: PASS with no TypeScript errors.

- [ ] **Step 6: Commit**

Run:

```powershell
git add src/components/forecasters/ForecasterScoreRail.tsx src/components/forecasters/ForecasterProfileHero.tsx src/components/forecasters/ForecasterWidgetRenderer.tsx src/components/forecasters/VerifiedRecommendationsCarousel.tsx
git commit -m "Add forecaster profile components"
```

---

## Task 4: Public Profile Page Redesign

**Files:**
- Modify: `src/app/(public)/forecasters/[slug]/page.tsx`

- [ ] **Step 1: Replace the page implementation**

Replace `src/app/(public)/forecasters/[slug]/page.tsx` with:

```typescript
// Public forecaster profile with modular widgets and Farfield-controlled trust signals.

import { getForecasterPublicProfileViewModel } from "@/lib/forecaster-queries";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ForecasterProfileHero } from "@/components/forecasters/ForecasterProfileHero";
import { ForecasterWidgetRenderer } from "@/components/forecasters/ForecasterWidgetRenderer";
import { VerifiedRecommendationsCarousel } from "@/components/forecasters/VerifiedRecommendationsCarousel";

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function ForecasterProfilePage({ params }: PageProps) {
  const { slug } = await params;
  const data = await getForecasterPublicProfileViewModel(slug);
  if (!data) notFound();

  return (
    <div className="space-y-12">
      <nav className="flex items-center gap-1.5 text-sm text-muted">
        <Link href="/forecasters" className="transition-colors hover:text-ink">
          Forecasters
        </Link>
        <span>/</span>
        <span className="text-ink">{data.forecaster.name}</span>
      </nav>

      <ForecasterProfileHero profile={data.profile} />

      <ForecasterWidgetRenderer
        profile={data.profile}
        coverageByIndicator={data.coverageByIndicator}
        coverageByCountry={data.coverageByCountry}
        vintages={data.vintages}
      />

      <VerifiedRecommendationsCarousel
        recommendations={[]}
        emptyState={data.profile.recommendations.emptyState}
      />
    </div>
  );
}
```

- [ ] **Step 2: Run the TypeScript compiler**

Run:

```powershell
npx tsc --noEmit
```

Expected: PASS with no TypeScript errors.

- [ ] **Step 3: Run the view-model QA script**

Run:

```powershell
node --env-file=.env.local node_modules/tsx/dist/cli.mjs scripts/qa-forecaster-profile-view-model.ts
```

Expected: PASS with:

```text
Forecaster profile view-model QA passed.
```

- [ ] **Step 4: Commit**

Run:

```powershell
git add "src/app/(public)/forecasters/[slug]/page.tsx"
git commit -m "Redesign public forecaster profile page"
```

---

## Task 5: Leakage Coverage For Redesigned Profiles

**Files:**
- Modify: `scripts/leakage-tests.ts`

- [ ] **Step 1: Add profile-specific public HTML assertions**

In `scripts/leakage-tests.ts`, find the block that fetches `forecasterHtml`. Immediately after `assertNoSampleValues("public forecaster page sample values", forecasterHtml, premiumSampleValues);`, add:

```typescript
    check(
      "public forecaster page shows redesigned profile sections",
      forecasterHtml.includes("Farfield record")
        && forecasterHtml.includes("Verified Recommendations")
        && forecasterHtml.includes("No verified client recommendations yet."),
      "Expected redesigned public profile sections were missing",
    );
    check(
      "public forecaster page avoids customer star ratings",
      !forecasterHtml.includes("★★★★★")
        && !forecasterHtml.includes("customer rating")
        && !forecasterHtml.includes("Customer rating"),
      "Customer star/rating language found in public forecaster HTML",
    );
```

- [ ] **Step 2: Run leakage tests against the existing build and confirm the expected failure**

Run:

```powershell
node --env-file=.env.local node_modules/tsx/dist/cli.mjs scripts/leakage-tests.ts
```

Expected: FAIL if the app has not been rebuilt since Task 4. The failure should mention missing redesigned public profile sections.

- [ ] **Step 3: Build the app**

Run:

```powershell
npm run build
```

Expected: PASS with a successful Next.js production build.

- [ ] **Step 4: Run leakage tests against the fresh build**

Run:

```powershell
node --env-file=.env.local node_modules/tsx/dist/cli.mjs scripts/leakage-tests.ts
```

Expected: PASS with:

```text
Leakage tests passed.
```

- [ ] **Step 5: Commit**

Run:

```powershell
git add scripts/leakage-tests.ts
git commit -m "Extend leakage tests for profile redesign"
```

---

## Task 6: Browser Review And Polish

**Files:**
- Modify only files touched in Tasks 1-5 if visual review shows a specific issue.

- [ ] **Step 1: Start the local dev server**

Run:

```powershell
npm run dev
```

Expected: dev server starts and prints a local URL, usually `http://localhost:3000`.

- [ ] **Step 2: Open a sample profile**

Open:

```text
http://localhost:3000/forecasters/imf
```

Expected:

- Hero appears with IMF name and profile copy.
- Right side rail appears on desktop.
- Middle widgets render track record and coverage.
- Bottom verified recommendations section appears with the empty state.
- No star rating appears.

- [ ] **Step 3: Check a narrow viewport**

Resize to a mobile-width viewport or use browser device mode.

Expected:

- Score rail stacks below the hero intro.
- Widget grids do not overflow horizontally.
- Previous and Next buttons in the recommendation section fit their container.
- No text overlaps.

- [ ] **Step 4: Apply only necessary polish**

If text overflow or spacing issues appear, edit the component that owns the issue. Use the smallest local change. Examples:

```typescript
// If a long score-rail value overflows, reduce the value size in ForecasterScoreRail:
<p className={`mt-1 font-mono text-xl font-bold tabular-nums ${toneClass[item.tone]}`}>
```

```typescript
// If widget rows overflow, keep the mobile layout single-column in ForecasterWidgetRenderer:
<div key={row.indicatorName} className="grid gap-3 md:grid-cols-[1fr_120px_1.4fr_80px] md:items-center">
```

- [ ] **Step 5: Run verification**

Run:

```powershell
npx tsc --noEmit
npm run build
node --env-file=.env.local node_modules/tsx/dist/cli.mjs scripts/qa-forecaster-profile-model.ts
node --env-file=.env.local node_modules/tsx/dist/cli.mjs scripts/qa-forecaster-profile-view-model.ts
node --env-file=.env.local node_modules/tsx/dist/cli.mjs scripts/leakage-tests.ts
```

Expected:

- TypeScript passes.
- Production build passes.
- Both profile QA scripts pass.
- Leakage tests pass.

- [ ] **Step 6: Commit visual polish if any files changed**

Run:

```powershell
git add src/components/forecasters src/app/(public)/forecasters/[slug]/page.tsx
git commit -m "Polish forecaster profile responsive layout"
```

If Step 4 made no edits, skip this commit.

---

## Task 7: Progress Note

**Files:**
- Modify: `docs/PROGRESS.md`

- [ ] **Step 1: Add session notes**

At the top of `docs/PROGRESS.md`, under the existing 2026-05-06 session or as a new `## Session 2026-05-06` entry if needed, add:

```markdown
### Completed

- Implemented the first read-only public forecaster profile redesign.
- Added a public-safe profile model and DB-backed view-model helper.
- Added modular profile components for hero, Farfield score rail, widgets, and verified recommendations empty state.
- Extended leakage tests for redesigned public profile sections and no-star customer proof.

### Current state

- `/forecasters/[slug]` renders the universal modular profile design using existing public-safe data.
- Recommendations render as a fixed bottom empty state until transaction-backed recommendations exist.
- Public profile pages still avoid locked forecast values, paid consensus values, private series, and detailed score tables.

### Known issues

- Profile customisation is default-config only; Studio editing is not implemented.
- Customer recommendations are not stored yet because marketplace transactions are not live.
- Public score/rank labels may need copy tuning once more profiles are reviewed.

### Next steps

1. Review several real seeded institution profiles in-browser.
2. Decide which public score/rank labels should ship in Phase 1.
3. Plan Studio profile editing after the public profile model is stable.
```

- [ ] **Step 2: Commit the progress note**

Run:

```powershell
git add docs/PROGRESS.md
git commit -m "Update progress for profile redesign"
```

---

## Final Verification

Run all commands before handing work back:

```powershell
npx tsc --noEmit
npm run build
node --env-file=.env.local node_modules/tsx/dist/cli.mjs scripts/qa-forecaster-profile-model.ts
node --env-file=.env.local node_modules/tsx/dist/cli.mjs scripts/qa-forecaster-profile-view-model.ts
node --env-file=.env.local node_modules/tsx/dist/cli.mjs scripts/leakage-tests.ts
```

Expected final output:

- `npx tsc --noEmit` exits 0.
- `npm run build` exits 0.
- `Forecaster profile model QA passed.`
- `Forecaster profile view-model QA passed.`
- `Leakage tests passed.`

---

## Self-Review Against Spec

Spec coverage:

- Universal profile system: Tasks 1, 2, 4.
- Fixed side score rail: Tasks 1, 3, 4.
- Flexible middle widgets: Tasks 1, 3, 4.
- Fixed bottom recommendations section: Tasks 1, 3, 4.
- No stars or numeric customer rating: Tasks 1, 3, 5.
- Public data safety: Tasks 2, 5, Final Verification.
- Server components by default: Tasks 3 and 4 use server components except the manual carousel.
- Customer recommendation storage deferred until transaction-backed proof exists: Task 3 implements empty state only.

Known gaps left intentionally outside this plan:

- Studio profile editor.
- Database-backed profile layout configuration.
- Marketplace transaction and recommendation tables.
- Real moderated recommendations.

Completeness scan:

- No open-marker strings or incomplete implementation steps.
- No arbitrary HTML widget support.
- No customer star-rating model.

Type consistency:

- `ProfileWidgetKey` is defined once in `src/lib/forecaster-profile.ts`.
- Component props consume `ForecasterProfileViewConfig` from the same source.
- Query helper returns `profile`, `coverageByIndicator`, `coverageByCountry`, and `vintages`, matching the page props.
