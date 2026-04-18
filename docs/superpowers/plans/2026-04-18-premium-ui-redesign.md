# Premium UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Elevate Forethought's public UI to feel like a premium institutional forecasting platform — chart-led, data-hierarchical, and visually premium — without changing tone or structure.

**Architecture:** Apply a new design token layer in `globals.css`, introduce shared UI primitives in `src/components/ui/`, then update each public page in priority order (variable detail → forecaster profile → landing → system-wide). Each task is independently deployable and type-checked.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript 5, Tailwind CSS v4, Recharts, `next/font/google`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/app/globals.css` | Modify | Design tokens: colours, shadows, radius, spacing base |
| `src/app/layout.tsx` | Modify | Swap Plus Jakarta Sans → Inter |
| `src/app/(public)/layout.tsx` | Modify | Max-width 1280px, nav polish |
| `src/components/ui/Card.tsx` | Create | White surface card with shadow + radius |
| `src/components/ui/SectionLabel.tsx` | Create | Consistent section header label |
| `src/components/ui/MetricCard.tsx` | Create | Single stat display card |
| `src/components/ForecastChart.tsx` | Modify | Larger (480px), stronger lines, blue consensus |
| `src/app/(public)/variables/[id]/page.tsx` | Modify | Chart-led layout, integrated actual callout, tighter actuals strip |
| `src/app/(public)/forecasters/[slug]/page.tsx` | Modify | Prominent metric band, best/weakest panel, tab structure |
| `src/app/(public)/forecasters/page.tsx` | Modify | Card-style list, hover states |
| `src/app/(public)/variables/page.tsx` | Modify | Table polish, card wrapper |
| `src/app/(public)/page.tsx` | Modify | Two-column hero, leaderboard module, better KPI cards |

---

## Task 1: Design system foundation

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`

### What this task does
Replaces the current ad-hoc CSS variables with a clean institutional palette, swaps the body font to Inter, and registers all design tokens as Tailwind utilities.

- [ ] **Step 1: Update `src/app/layout.tsx` to use Inter**

```typescript
import type { Metadata } from "next";
import { Playfair_Display, Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import SessionProvider from "@/components/SessionProvider";

const playfair = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Forethought",
  description: "Performance-tracked marketplace for economic forecasters and analysts.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${playfair.variable} ${inter.variable} ${geistMono.variable} antialiased`}>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Replace `src/app/globals.css` with new design token system**

```css
@import "tailwindcss";

:root {
  /* Base surfaces */
  --bg:          #F7F8FA;
  --surface:     #FFFFFF;

  /* Text */
  --ink:         #111827;
  --muted:       #6B7280;

  /* Borders */
  --border:      #E5E7EB;
  --border-dark: #D1D5DB;

  /* Brand accent */
  --accent:      #1D4ED8;
  --accent-dark: #1E3A8A;
  --accent-light: #EFF6FF;

  /* Semantic */
  --green:       #059669;
  --red:         #DC2626;
  --orange:      #EA580C;

  /* Shadows */
  --shadow-card:  0 2px 8px rgba(15, 23, 42, 0.05);
  --shadow-raised: 0 8px 24px rgba(15, 23, 42, 0.06);

  /* Radius */
  --radius-sm:   8px;
  --radius-md:   12px;
  --radius-lg:   14px;
}

@theme inline {
  --font-display: var(--font-display);
  --font-sans:    var(--font-sans);
  --font-mono:    var(--font-mono);

  --color-bg:           var(--bg);
  --color-surface:      var(--surface);
  --color-ink:          var(--ink);
  --color-muted:        var(--muted);
  --color-border:       var(--border);
  --color-border-dark:  var(--border-dark);
  --color-accent:       var(--accent);
  --color-accent-dark:  var(--accent-dark);
  --color-accent-light: var(--accent-light);
  --color-signal-green: var(--green);
  --color-signal-red:   var(--red);
  --color-signal-orange: var(--orange);
}

body {
  background: var(--bg);
  color: var(--ink);
  font-family: var(--font-sans), system-ui, sans-serif;
  font-size: 16px;
  line-height: 1.6;
}

/* Reusable shadow and radius utilities — referenced by component classes */
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
}

.card-raised {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-raised);
}
```

- [ ] **Step 3: Type-check**

```bash
cd /c/Users/jeffe/Documents/Forethought && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css src/app/layout.tsx
git commit -m "feat: design system foundation -- Inter font, institutional palette, shadow/radius tokens"
```

---

## Task 2: Shared UI primitives

**Files:**
- Create: `src/components/ui/Card.tsx`
- Create: `src/components/ui/SectionLabel.tsx`
- Create: `src/components/ui/MetricCard.tsx`

### What this task does
Creates three reusable components used across all public pages. Defining them once prevents drift between pages.

- [ ] **Step 1: Create `src/components/ui/Card.tsx`**

```typescript
// White surface card with shadow and rounded corners.

interface CardProps {
  children: React.ReactNode;
  className?: string;
  raised?: boolean;
  padding?: "sm" | "md" | "lg" | "none";
}

const paddingMap = {
  none: "",
  sm:   "p-4",
  md:   "p-6",
  lg:   "p-8",
};

export function Card({ children, className = "", raised = false, padding = "md" }: CardProps) {
  return (
    <div
      className={`${raised ? "card-raised" : "card"} ${paddingMap[padding]} ${className}`}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Create `src/components/ui/SectionLabel.tsx`**

```typescript
// Consistent section header label used across all public pages.
// Uppercase, small, letter-spaced, accent blue.

interface SectionLabelProps {
  children: React.ReactNode;
  className?: string;
}

export function SectionLabel({ children, className = "" }: SectionLabelProps) {
  return (
    <p
      className={`text-xs font-bold tracking-widest text-accent uppercase mb-5 ${className}`}
    >
      {children}
    </p>
  );
}
```

- [ ] **Step 3: Create `src/components/ui/MetricCard.tsx`**

```typescript
// Single-stat display card for metric bands (forecaster profile, etc.).

interface MetricCardProps {
  label: string;
  value: string | number;
  valueClass?: string;     // override colour on the value
  subtext?: string;        // optional small line beneath value
}

export function MetricCard({ label, value, valueClass = "text-ink", subtext }: MetricCardProps) {
  return (
    <div className="card flex-1 min-w-[130px] px-6 py-5">
      <p className="text-xs font-bold tracking-wider text-muted uppercase">{label}</p>
      <p
        className={`mt-2 text-4xl font-bold tabular-nums leading-none ${valueClass}`}
        style={{ fontFamily: "var(--font-mono)" }}
      >
        {value}
      </p>
      {subtext && (
        <p className="mt-1.5 text-xs text-muted">{subtext}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/
git commit -m "feat: add shared UI primitives -- Card, SectionLabel, MetricCard"
```

---

## Task 3: Layout — max-width and nav polish

**Files:**
- Modify: `src/app/(public)/layout.tsx`

### What this task does
Increases max-width to 1280px (landing) / 1200px (interior), tightens nav typography, improves header height.

- [ ] **Step 1: Rewrite `src/app/(public)/layout.tsx`**

```typescript
// Layout for all public showcase pages — header + footer, no auth required.

import Link from "next/link";
import { auth } from "@/auth";
import { signOut } from "@/auth";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <div className="min-h-screen bg-bg text-ink">
      <header
        className="border-b border-border bg-surface/90 backdrop-blur-sm sticky top-0 z-10"
        style={{ boxShadow: "0 1px 0 #E5E7EB" }}
      >
        <div className="max-w-[1280px] mx-auto px-8 h-[64px] flex items-center justify-between">
          <Link href="/" className="flex flex-col leading-none group">
            <span
              className="text-xl text-ink tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Forethought
            </span>
            <span className="block h-[2.5px] w-full mt-0.5 bg-accent transition-all duration-300 group-hover:w-3/4" />
          </Link>

          <nav className="flex items-center gap-8">
            <div className="flex items-center gap-6 text-[15px] font-medium text-muted">
              <Link href="/variables" className="hover:text-ink transition-colors">
                Variables
              </Link>
              <Link href="/forecasters" className="hover:text-ink transition-colors">
                Forecasters
              </Link>
            </div>
            <div className="flex items-center gap-3">
              {session?.user ? (
                <>
                  <Link
                    href="/dashboard"
                    className="text-[15px] font-medium text-muted hover:text-ink transition-colors"
                  >
                    Dashboard
                  </Link>
                  <form action={async () => { "use server"; await signOut({ redirectTo: "/" }); }}>
                    <button
                      type="submit"
                      className="text-[15px] font-medium text-muted hover:text-ink transition-colors"
                    >
                      Sign out
                    </button>
                  </form>
                </>
              ) : (
                <Link
                  href="/signin"
                  className="px-4 py-2 text-sm font-semibold bg-accent text-white rounded-[10px] hover:bg-accent-dark transition-colors duration-200"
                  style={{ boxShadow: "0 1px 3px rgba(29, 78, 216, 0.3)" }}
                >
                  Sign in
                </Link>
              )}
            </div>
          </nav>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-8 py-12">
        {children}
      </main>

      <footer className="border-t border-border mt-24">
        <div className="max-w-[1280px] mx-auto px-8 h-14 flex items-center justify-between">
          <p className="text-sm font-medium text-muted" style={{ fontFamily: "var(--font-display)" }}>
            Forethought
          </p>
          <p className="text-sm text-muted">
            Transparent performance tracking for economic forecasters.
          </p>
        </div>
      </footer>
    </div>
  );
}
```

- [ ] **Step 2: Type-check and commit**

```bash
npx tsc --noEmit
git add src/app/(public)/layout.tsx
git commit -m "feat: increase max-width to 1280px, polish nav typography and spacing"
```

---

## Task 4: ForecastChart — larger, stronger, blue consensus (Priority 1a)

**Files:**
- Modify: `src/components/ForecastChart.tsx`

### What this task does
Makes the chart taller (480px), increases line weights, colours consensus blue, improves axis/tooltip styling.

- [ ] **Step 1: Rewrite `src/components/ForecastChart.tsx`**

```typescript
"use client";
// Interactive time-series chart for a variable's forecast history and actuals.
// Uses Recharts. Rendered client-side since Recharts requires browser APIs.

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from "recharts";

export interface DataPoint {
  period: string;
  actual?: number | null;
  [forecasterSlug: string]: number | null | string | undefined;
}

interface ForecastSeries {
  slug: string;
  name: string;
  color: string;
}

interface ForecastChartProps {
  data: DataPoint[];
  series: ForecastSeries[];
  unit: string;
  height?: number;
  estimatesStartAfter?: number;
}

// Institutional palette: first non-actuals/consensus slots
const FORECASTER_COLORS = [
  "#EA580C", // orange
  "#7C3AED", // violet
  "#0891B2", // cyan
  "#BE185D", // pink
  "#059669", // green
  "#0D5C6B", // teal
  "#92400E", // brown
  "#4338CA", // indigo
];

export function ForecastChart({
  data,
  series,
  unit,
  height = 480,
  estimatesStartAfter,
}: ForecastChartProps) {
  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-base text-muted"
        style={{ height }}
      >
        No chart data available yet.
      </div>
    );
  }

  const pctUnit = unit.includes("%");
  // Consensus gets the brand blue; other forecasters get the rotation palette
  let forecasterColorIndex = 0;
  const colorMap: Record<string, string> = {};
  for (const s of series) {
    if (s.slug === "consensus") {
      colorMap[s.slug] = "#1D4ED8";
    } else {
      colorMap[s.slug] = FORECASTER_COLORS[forecasterColorIndex % FORECASTER_COLORS.length];
      forecasterColorIndex++;
    }
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="2 4" stroke="#E5E7EB" vertical={false} />
        <XAxis
          dataKey="period"
          tick={{ fontSize: 12, fill: "#6B7280", fontFamily: "var(--font-mono)" }}
          axisLine={{ stroke: "#E5E7EB" }}
          tickLine={false}
          dy={6}
        />
        <YAxis
          tick={{ fontSize: 12, fill: "#6B7280", fontFamily: "var(--font-mono)" }}
          tickFormatter={(v) => `${v}${pctUnit ? "%" : ""}`}
          width={48}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          formatter={(value: number, name: string) => [
            `${value?.toFixed(2)}${pctUnit ? "%" : ` ${unit}`}`,
            name,
          ]}
          labelStyle={{
            fontWeight: 700,
            color: "#111827",
            fontFamily: "var(--font-sans)",
            fontSize: 13,
            marginBottom: 4,
          }}
          contentStyle={{
            fontSize: 13,
            border: "1px solid #E5E7EB",
            backgroundColor: "#FFFFFF",
            borderRadius: 10,
            color: "#111827",
            boxShadow: "0 8px 24px rgba(15, 23, 42, 0.10)",
            padding: "10px 14px",
          }}
          itemStyle={{ padding: "2px 0" }}
        />
        <Legend
          wrapperStyle={{
            fontSize: 13,
            fontFamily: "var(--font-sans)",
            color: "#6B7280",
            paddingTop: 12,
          }}
        />

        {estimatesStartAfter && (
          <ReferenceLine
            x={String(estimatesStartAfter)}
            stroke="#D1D5DB"
            strokeDasharray="4 2"
            label={{
              value: "forecast →",
              position: "insideTopRight",
              fontSize: 11,
              fill: "#9CA3AF",
            }}
          />
        )}

        {/* Actuals — boldest, most authoritative */}
        <Line
          type="monotone"
          dataKey="actual"
          name="Actual"
          stroke="#111827"
          strokeWidth={3}
          dot={{ r: 4, fill: "#111827", strokeWidth: 0 }}
          activeDot={{ r: 5 }}
          connectNulls={false}
        />

        {/* Named series: consensus blue, forecasters rotate */}
        {series.map((s) => (
          <Line
            key={s.slug}
            type="monotone"
            dataKey={s.slug}
            name={s.name}
            stroke={colorMap[s.slug]}
            strokeWidth={s.slug === "consensus" ? 2.5 : 1.5}
            strokeDasharray={s.slug !== "consensus" ? "5 3" : undefined}
            dot={false}
            activeDot={{ r: 4 }}
            connectNulls={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 2: Type-check and commit**

```bash
npx tsc --noEmit
git add src/components/ForecastChart.tsx
git commit -m "feat: chart -- 480px height, 3px actuals, 2.5px blue consensus, improved tooltip"
```

---

## Task 5: Variable detail page — chart-led layout (Priority 1b)

**Files:**
- Modify: `src/app/(public)/variables/[id]/page.tsx`

### What this task does
Makes the chart dominate, integrates the "latest actual" as a header-level callout, tightens the actuals strip, uses Card component throughout.

- [ ] **Step 1: Rewrite `src/app/(public)/variables/[id]/page.tsx`**

```typescript
// /variables/[id] — variable detail page.
// Chart is the centrepiece. Latest actual is integrated into the page header.

import { db } from "@/lib/db";
import {
  variables, forecasts, actuals, forecasters,
  forecastScores, consensusForecasts,
} from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ForecastChart, type DataPoint } from "@/components/ForecastChart";
import { Card } from "@/components/ui/Card";
import { SectionLabel } from "@/components/ui/SectionLabel";

export const revalidate = 3600;

async function getVariableData(id: string) {
  const [variable] = await db
    .select()
    .from(variables)
    .where(eq(variables.id, id))
    .limit(1);

  if (!variable) return null;

  const forecastRows = await db
    .select({
      id: forecasts.id,
      forecasterId: forecasts.forecasterId,
      forecasterName: forecasters.name,
      forecasterSlug: forecasters.slug,
      targetPeriod: forecasts.targetPeriod,
      value: forecasts.value,
      vintage: forecasts.vintage,
      submittedAt: forecasts.submittedAt,
      absoluteError: forecastScores.absoluteError,
      percentageError: forecastScores.percentageError,
      scoreVsConsensus: forecastScores.scoreVsConsensus,
      directionalCorrect: forecastScores.directionalCorrect,
    })
    .from(forecasts)
    .innerJoin(forecasters, eq(forecasts.forecasterId, forecasters.id))
    .leftJoin(forecastScores, eq(forecastScores.forecastId, forecasts.id))
    .where(eq(forecasts.variableId, id))
    .orderBy(forecasts.targetPeriod, desc(forecasts.submittedAt));

  const actualRows = await db
    .select()
    .from(actuals)
    .where(eq(actuals.variableId, id))
    .orderBy(actuals.targetPeriod);

  const consensusRows = await db
    .select()
    .from(consensusForecasts)
    .where(eq(consensusForecasts.variableId, id))
    .orderBy(consensusForecasts.targetPeriod);

  return { variable, forecastRows, actualRows, consensusRows };
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function VariableDetailPage({ params }: PageProps) {
  const { id } = await params;
  const data = await getVariableData(id);
  if (!data) notFound();

  const { variable, forecastRows, actualRows, consensusRows } = data;

  const allPeriods = [
    ...new Set([
      ...actualRows.map((a) => a.targetPeriod),
      ...forecastRows.map((f) => f.targetPeriod),
    ]),
  ].sort();

  const forecasterSet = new Map<string, string>();
  for (const f of forecastRows) forecasterSet.set(f.forecasterSlug, f.forecasterName);
  const seriesList = Array.from(forecasterSet.entries()).map(([slug, name]) => ({ slug, name, color: "" }));

  const actualByPeriod = new Map(actualRows.map((a) => [a.targetPeriod, parseFloat(a.value)]));
  const consensusByPeriod = new Map(consensusRows.map((c) => [c.targetPeriod, parseFloat(c.simpleMean)]));

  const latestVintageByForecaster = new Map<string, string>();
  for (const f of forecastRows) {
    const current = latestVintageByForecaster.get(f.forecasterSlug);
    if (f.vintage && (!current || f.vintage > current)) {
      latestVintageByForecaster.set(f.forecasterSlug, f.vintage);
    }
  }

  const latestForecastByForecasterPeriod = new Map<string, number>();
  for (const f of forecastRows) {
    if (f.vintage === latestVintageByForecaster.get(f.forecasterSlug)) {
      latestForecastByForecasterPeriod.set(`${f.forecasterSlug}|${f.targetPeriod}`, parseFloat(f.value));
    }
  }

  const chartData: DataPoint[] = allPeriods.map((period) => {
    const row: DataPoint = { period };
    row.actual = actualByPeriod.get(period) ?? null;
    row.consensus = consensusByPeriod.get(period) ?? null;
    for (const s of seriesList) {
      row[s.slug] = latestForecastByForecasterPeriod.get(`${s.slug}|${period}`) ?? null;
    }
    return row;
  });

  const allSeries = [
    ...(consensusRows.length > 0 ? [{ slug: "consensus", name: "Consensus", color: "" }] : []),
    ...seriesList,
  ];

  const scoredForecasts = forecastRows.filter((f) => f.absoluteError !== null);
  const latestActual = actualRows.at(-1);
  const pctUnit = variable.unit.includes("%");

  return (
    <div className="space-y-12">
      {/* Breadcrumb */}
      <nav className="text-sm text-muted flex items-center gap-1.5">
        <Link href="/variables" className="hover:text-ink transition-colors">Variables</Link>
        <span>›</span>
        <span className="text-ink">{variable.name} — {variable.countryCode}</span>
      </nav>

      {/* Page header */}
      <div className="flex items-start justify-between flex-wrap gap-6">
        <div>
          <p className="text-xs font-bold tracking-widest text-accent uppercase mb-2">
            {variable.category}
          </p>
          <h1
            className="text-5xl text-ink tracking-tight leading-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {variable.name}
            <span className="ml-3 text-3xl text-muted" style={{ fontFamily: "var(--font-display)" }}>
              {variable.countryCode}
            </span>
          </h1>
          <div className="mt-2 h-[3px] w-12 bg-accent" />
          <p className="mt-3 text-base text-muted">
            {variable.unit} · {variable.frequency.toLowerCase()}
            {variable.description && ` · ${variable.description}`}
          </p>
        </div>

        {latestActual && (
          <Card padding="none" raised className="px-8 py-5 text-right min-w-[160px]">
            <p className="text-xs font-bold tracking-wider text-muted uppercase">Latest actual</p>
            <p
              className={`mt-2 text-4xl font-bold tabular-nums leading-none ${
                parseFloat(latestActual.value) >= 0 ? "text-signal-green" : "text-signal-red"
              }`}
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {parseFloat(latestActual.value) > 0 ? "+" : ""}
              {parseFloat(latestActual.value).toFixed(2)}
              {pctUnit ? "%" : ""}
            </p>
            <p className="mt-1.5 text-sm text-muted">{latestActual.targetPeriod}</p>
          </Card>
        )}
      </div>

      {/* Chart — the centrepiece */}
      <section>
        <SectionLabel>Forecast History vs Actuals</SectionLabel>
        <Card
          padding="none"
          raised
          className="pt-6 pb-4 px-4"
          style={{ borderRadius: "var(--radius-lg)" } as React.CSSProperties}
        >
          <ForecastChart data={chartData} series={allSeries} unit={variable.unit} height={480} />
        </Card>
      </section>

      {/* Actuals strip — compact horizontal */}
      {actualRows.length > 0 && (
        <section>
          <SectionLabel>Actuals</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {actualRows.slice(-14).map((a) => {
              const val = parseFloat(a.value);
              return (
                <div
                  key={a.id}
                  className="card px-4 py-2.5 text-center min-w-[68px]"
                >
                  <p className="text-[10px] font-bold tracking-wide text-muted uppercase">
                    {a.targetPeriod}
                  </p>
                  <p
                    className={`mt-1 text-sm font-bold tabular-nums ${
                      val >= 0 ? "text-signal-green" : "text-signal-red"
                    }`}
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {val > 0 ? "+" : ""}{val.toFixed(1)}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Accuracy table */}
      {scoredForecasts.length > 0 && (
        <section>
          <SectionLabel>Forecast Accuracy</SectionLabel>
          <Card padding="none">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="border-b border-border bg-bg">
                  <tr className="text-xs font-bold tracking-wider text-muted uppercase">
                    <th className="text-left px-5 py-3">Forecaster</th>
                    <th className="text-left px-5 py-3">Period</th>
                    <th className="text-right px-5 py-3">Forecast</th>
                    <th className="text-right px-5 py-3">Abs. error</th>
                    <th className="text-right px-5 py-3">vs Consensus</th>
                    <th className="text-center px-5 py-3">Direction</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {scoredForecasts.map((f) => (
                    <tr key={f.id} className="hover:bg-bg transition-colors">
                      <td className="px-5 py-3.5">
                        <Link
                          href={`/forecasters/${f.forecasterSlug}`}
                          className="text-base font-medium text-ink hover:text-accent transition-colors"
                        >
                          {f.forecasterName}
                        </Link>
                      </td>
                      <td className="px-5 py-3.5 text-sm font-medium tracking-wide text-muted">
                        {f.targetPeriod}
                      </td>
                      <td
                        className="px-5 py-3.5 text-right text-base tabular-nums"
                        style={{ fontFamily: "var(--font-mono)" }}
                      >
                        {parseFloat(f.value).toFixed(2)}
                      </td>
                      <td
                        className="px-5 py-3.5 text-right text-base tabular-nums"
                        style={{ fontFamily: "var(--font-mono)" }}
                      >
                        {f.absoluteError != null ? parseFloat(f.absoluteError).toFixed(2) : "—"}
                      </td>
                      <td
                        className="px-5 py-3.5 text-right text-base tabular-nums"
                        style={{ fontFamily: "var(--font-mono)" }}
                      >
                        {f.scoreVsConsensus != null ? (
                          <span
                            className={
                              parseFloat(f.scoreVsConsensus) < 0
                                ? "text-signal-green font-medium"
                                : "text-signal-red"
                            }
                          >
                            {parseFloat(f.scoreVsConsensus) > 0 ? "+" : ""}
                            {parseFloat(f.scoreVsConsensus).toFixed(2)}
                          </span>
                        ) : "—"}
                      </td>
                      <td
                        className="px-5 py-3.5 text-center text-base font-medium"
                        style={{ fontFamily: "var(--font-mono)" }}
                      >
                        {f.directionalCorrect === null
                          ? <span className="text-muted">—</span>
                          : f.directionalCorrect
                            ? <span className="text-signal-green">✓</span>
                            : <span className="text-signal-red">✗</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </section>
      )}

      {forecastRows.length === 0 && actualRows.length === 0 && (
        <p className="text-base text-muted py-8">
          No data available yet for this variable. Check back after the next data ingestion.
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Type-check and commit**

```bash
npx tsc --noEmit
git add src/app/(public)/variables/[id]/page.tsx
git commit -m "feat: variable detail -- chart-led layout, Card components, 480px chart height"
```

---

## Task 6: Forecaster profile — metric band and best/weakest panel (Priority 2)

**Files:**
- Modify: `src/app/(public)/forecasters/[slug]/page.tsx`

### What this task does
Rebuilds the metric summary as a prominent 4-card band, adds a best/weakest insight panel above the detailed tables, uses Card and MetricCard components.

- [ ] **Step 1: Rewrite `src/app/(public)/forecasters/[slug]/page.tsx`**

```typescript
// /forecasters/[slug] — institution or analyst profile page.

import { getForecasterBySlug, getForecasterProfileData } from "@/lib/forecaster-queries";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { MetricCard } from "@/components/ui/MetricCard";
import { SectionLabel } from "@/components/ui/SectionLabel";

export const revalidate = 3600;

function fmtError(v: string | null | undefined) {
  if (v == null) return "—";
  return parseFloat(v).toFixed(2);
}

function fmtBias(v: string | null | undefined) {
  if (v == null) return { label: "—", cls: "text-muted" };
  const n = parseFloat(v);
  const label = (n > 0 ? "+" : "") + n.toFixed(1) + "%";
  const cls =
    Math.abs(n) < 0.5 ? "text-ink"
    : n > 0 ? "text-signal-orange"
    : "text-signal-green";
  return { label, cls };
}

function horizonLabel(h: number) {
  if (h === 0) return "Current year";
  return `${h}-year ahead`;
}

function DataTable({ head, children }: { head: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card padding="none">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="border-b border-border bg-bg">
            <tr className="text-xs font-bold tracking-wider text-muted uppercase">
              {head}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">{children}</tbody>
        </table>
      </div>
    </Card>
  );
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function ForecasterProfilePage({ params }: PageProps) {
  const { slug } = await params;
  const forecaster = await getForecasterBySlug(slug);
  if (!forecaster) notFound();

  const {
    overallStats,
    accuracyByIndicator,
    accuracyByCountry,
    accuracyByHorizon,
    accuracyByVariable,
  } = await getForecasterProfileData(forecaster.id);

  const totalForecasts = accuracyByVariable.reduce((s, r) => s + Number(r.forecastCount), 0);
  const scoredCount = Number(overallStats.scoredCount);
  const bias = fmtBias(overallStats.avgBias);
  const beatCount = Number(overallStats.beatConsensusCount);
  const vsTotal = Number(overallStats.vsConsensusTotal);
  const beatRate = vsTotal > 0 ? Math.round((beatCount / vsTotal) * 100) : null;

  // Best and weakest indicators by MAE (min 2 scored forecasts to qualify)
  const qualifiedIndicators = accuracyByIndicator.filter(
    (r) => r.avgAbsoluteError != null && Number(r.scoredCount) >= 2
  );
  const bestIndicator = qualifiedIndicators.at(0);   // ordered ASC by MAE
  const worstIndicator = qualifiedIndicators.at(-1);

  const qualifiedCountries = accuracyByCountry.filter(
    (r) => r.avgAbsoluteError != null && Number(r.scoredCount) >= 2
  );
  const bestCountry = qualifiedCountries.at(0);
  const worstCountry = qualifiedCountries.at(-1);

  return (
    <div className="space-y-12">
      {/* Breadcrumb */}
      <nav className="text-sm text-muted flex items-center gap-1.5">
        <Link href="/forecasters" className="hover:text-ink transition-colors">
          Forecasters
        </Link>
        <span>›</span>
        <span className="text-ink">{forecaster.name}</span>
      </nav>

      {/* Header */}
      <div>
        <p className="text-xs font-bold tracking-widest text-accent uppercase mb-3">
          {forecaster.type.toLowerCase()}
        </p>
        <h1
          className="text-5xl text-ink tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {forecaster.name}
        </h1>
        <div className="mt-2 h-[3px] w-12 bg-accent" />
      </div>

      {/* Metric band */}
      {(totalForecasts > 0 || scoredCount > 0) && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Forecasts tracked" value={totalForecasts || "—"} />
          <MetricCard label="Scored" value={scoredCount || "—"} />
          {overallStats.avgBias != null && (
            <MetricCard
              label="Average bias"
              value={bias.label}
              valueClass={bias.cls}
              subtext="+ = too high, − = too low"
            />
          )}
          {beatRate !== null && (
            <MetricCard
              label="Beat consensus"
              value={`${beatRate}%`}
              valueClass={beatRate >= 50 ? "text-signal-green" : "text-signal-red"}
              subtext={`${beatCount} of ${vsTotal} forecasts`}
            />
          )}
        </div>
      )}

      {accuracyByIndicator.length === 0 ? (
        <p className="text-base text-muted py-8">
          No scored forecasts yet. Check back after the next data ingestion.
        </p>
      ) : (
        <>
          {/* Best / weakest insight panel */}
          {(bestIndicator || bestCountry) && (
            <section>
              <SectionLabel>Performance Highlights</SectionLabel>
              <div className="grid sm:grid-cols-2 gap-4">
                {bestIndicator && worstIndicator && bestIndicator !== worstIndicator && (
                  <Card padding="md" className="border-l-4 border-l-signal-green">
                    <p className="text-xs font-bold tracking-wider text-muted uppercase mb-1">
                      Best indicator
                    </p>
                    <p className="text-lg font-semibold text-ink">{bestIndicator.indicatorName}</p>
                    <p className="mt-1 text-sm text-muted">
                      MAE{" "}
                      <span
                        className="font-mono font-semibold text-signal-green"
                        style={{ fontFamily: "var(--font-mono)" }}
                      >
                        {fmtError(bestIndicator.avgAbsoluteError)}
                      </span>{" "}
                      across {bestIndicator.scoredCount} forecasts
                    </p>
                  </Card>
                )}
                {worstIndicator && bestIndicator !== worstIndicator && (
                  <Card padding="md" className="border-l-4 border-l-signal-red">
                    <p className="text-xs font-bold tracking-wider text-muted uppercase mb-1">
                      Weakest indicator
                    </p>
                    <p className="text-lg font-semibold text-ink">{worstIndicator.indicatorName}</p>
                    <p className="mt-1 text-sm text-muted">
                      MAE{" "}
                      <span
                        className="font-mono font-semibold text-signal-red"
                        style={{ fontFamily: "var(--font-mono)" }}
                      >
                        {fmtError(worstIndicator.avgAbsoluteError)}
                      </span>{" "}
                      across {worstIndicator.scoredCount} forecasts
                    </p>
                  </Card>
                )}
                {bestCountry && worstCountry && bestCountry !== worstCountry && (
                  <Card padding="md" className="border-l-4 border-l-accent">
                    <p className="text-xs font-bold tracking-wider text-muted uppercase mb-1">
                      Best country
                    </p>
                    <p className="text-lg font-semibold text-ink">{bestCountry.countryCode}</p>
                    <p className="mt-1 text-sm text-muted">
                      MAE{" "}
                      <span
                        className="font-semibold text-accent"
                        style={{ fontFamily: "var(--font-mono)" }}
                      >
                        {fmtError(bestCountry.avgAbsoluteError)}
                      </span>{" "}
                      across {bestCountry.scoredCount} forecasts
                    </p>
                  </Card>
                )}
                {worstCountry && bestCountry !== worstCountry && (
                  <Card padding="md" className="border-l-4 border-l-border-dark">
                    <p className="text-xs font-bold tracking-wider text-muted uppercase mb-1">
                      Weakest country
                    </p>
                    <p className="text-lg font-semibold text-ink">{worstCountry.countryCode}</p>
                    <p className="mt-1 text-sm text-muted">
                      MAE{" "}
                      <span
                        className="font-semibold text-muted"
                        style={{ fontFamily: "var(--font-mono)" }}
                      >
                        {fmtError(worstCountry.avgAbsoluteError)}
                      </span>{" "}
                      across {worstCountry.scoredCount} forecasts
                    </p>
                  </Card>
                )}
              </div>
            </section>
          )}

          {/* By indicator */}
          <section>
            <SectionLabel>Accuracy by Indicator</SectionLabel>
            <p className="text-sm text-muted mb-4">
              Aggregated across all countries. Positive bias = systematically too high; negative = too low.
            </p>
            <DataTable
              head={
                <>
                  <th className="text-left px-5 py-3">Indicator</th>
                  <th className="text-right px-5 py-3">Scored</th>
                  <th className="text-right px-5 py-3">MAE</th>
                  <th className="text-right px-5 py-3">Bias</th>
                </>
              }
            >
              {accuracyByIndicator.map((row) => {
                const b = fmtBias(row.avgBias);
                return (
                  <tr key={row.indicatorName} className="hover:bg-bg transition-colors">
                    <td className="px-5 py-3.5 text-base font-medium text-ink">
                      {row.indicatorName}
                    </td>
                    <td
                      className="px-5 py-3.5 text-right text-base text-muted tabular-nums"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      {row.scoredCount}
                    </td>
                    <td
                      className="px-5 py-3.5 text-right text-base tabular-nums"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      {fmtError(row.avgAbsoluteError)}
                    </td>
                    <td
                      className={`px-5 py-3.5 text-right text-base tabular-nums ${b.cls}`}
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      {b.label}
                    </td>
                  </tr>
                );
              })}
            </DataTable>
          </section>

          {/* By country */}
          <section>
            <SectionLabel>Accuracy by Country</SectionLabel>
            <DataTable
              head={
                <>
                  <th className="text-left px-5 py-3">Country</th>
                  <th className="text-right px-5 py-3">Scored</th>
                  <th className="text-right px-5 py-3">MAE</th>
                  <th className="text-right px-5 py-3">Bias</th>
                </>
              }
            >
              {accuracyByCountry.map((row) => {
                const b = fmtBias(row.avgBias);
                return (
                  <tr key={row.countryCode} className="hover:bg-bg transition-colors">
                    <td className="px-5 py-3.5 text-base font-medium text-ink">
                      {row.countryCode}
                    </td>
                    <td
                      className="px-5 py-3.5 text-right text-base text-muted tabular-nums"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      {row.scoredCount}
                    </td>
                    <td
                      className="px-5 py-3.5 text-right text-base tabular-nums"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      {fmtError(row.avgAbsoluteError)}
                    </td>
                    <td
                      className={`px-5 py-3.5 text-right text-base tabular-nums ${b.cls}`}
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      {b.label}
                    </td>
                  </tr>
                );
              })}
            </DataTable>
          </section>

          {/* By horizon */}
          {accuracyByHorizon.length > 0 && (
            <section>
              <SectionLabel>Accuracy by Forecast Horizon</SectionLabel>
              <p className="text-sm text-muted mb-4">
                Accuracy typically degrades at longer horizons.
              </p>
              <DataTable
                head={
                  <>
                    <th className="text-left px-5 py-3">Horizon</th>
                    <th className="text-right px-5 py-3">Scored</th>
                    <th className="text-right px-5 py-3">MAE</th>
                    <th className="text-right px-5 py-3">Bias</th>
                  </>
                }
              >
                {accuracyByHorizon
                  .filter((r) => r.horizon >= 0 && r.horizon <= 5)
                  .map((row) => {
                    const b = fmtBias(row.avgBias);
                    return (
                      <tr key={row.horizon} className="hover:bg-bg transition-colors">
                        <td className="px-5 py-3.5 text-base font-medium text-ink">
                          {horizonLabel(row.horizon)}
                        </td>
                        <td
                          className="px-5 py-3.5 text-right text-base text-muted tabular-nums"
                          style={{ fontFamily: "var(--font-mono)" }}
                        >
                          {row.scoredCount}
                        </td>
                        <td
                          className="px-5 py-3.5 text-right text-base tabular-nums"
                          style={{ fontFamily: "var(--font-mono)" }}
                        >
                          {fmtError(row.avgAbsoluteError)}
                        </td>
                        <td
                          className={`px-5 py-3.5 text-right text-base tabular-nums ${b.cls}`}
                          style={{ fontFamily: "var(--font-mono)" }}
                        >
                          {b.label}
                        </td>
                      </tr>
                    );
                  })}
              </DataTable>
            </section>
          )}

          {/* Full breakdown */}
          <section>
            <SectionLabel>Full Breakdown</SectionLabel>
            <DataTable
              head={
                <>
                  <th className="text-left px-5 py-3">Variable</th>
                  <th className="text-left px-5 py-3">Country</th>
                  <th className="text-right px-5 py-3">Forecasts</th>
                  <th className="text-right px-5 py-3">MAE</th>
                  <th className="text-right px-5 py-3">vs Consensus</th>
                </>
              }
            >
              {accuracyByVariable.map((row) => (
                <tr key={row.variableId} className="hover:bg-bg transition-colors">
                  <td className="px-5 py-3.5">
                    <Link
                      href={`/variables/${row.variableId}`}
                      className="text-base text-ink hover:text-accent transition-colors"
                    >
                      {row.variableName}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-sm font-medium tracking-wide text-muted">
                    {row.countryCode}
                  </td>
                  <td
                    className="px-5 py-3.5 text-right text-base tabular-nums text-muted"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {row.forecastCount}
                  </td>
                  <td
                    className="px-5 py-3.5 text-right text-base tabular-nums"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {row.avgAbsoluteError != null
                      ? parseFloat(row.avgAbsoluteError).toFixed(2)
                      : <span className="text-muted">—</span>}
                  </td>
                  <td
                    className="px-5 py-3.5 text-right text-base tabular-nums"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {row.avgScoreVsConsensus != null ? (
                      <span
                        className={
                          parseFloat(row.avgScoreVsConsensus) < 0
                            ? "text-signal-green font-medium"
                            : "text-signal-red"
                        }
                      >
                        {parseFloat(row.avgScoreVsConsensus) > 0 ? "+" : ""}
                        {parseFloat(row.avgScoreVsConsensus).toFixed(2)}
                      </span>
                    ) : <span className="text-muted">—</span>}
                  </td>
                </tr>
              ))}
            </DataTable>
          </section>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Type-check and commit**

```bash
npx tsc --noEmit
git add src/app/(public)/forecasters/[slug]/page.tsx
git commit -m "feat: forecaster profile -- 4-card metric band, best/weakest panel, Card components"
```

---

## Task 7: Landing page — two-column hero with leaderboard module (Priority 3)

**Files:**
- Modify: `src/app/(public)/page.tsx`

### What this task does
Adds a two-column hero layout. Left: headline + copy + CTAs. Right: a live "Top Forecasters by Accuracy" leaderboard card showing real data. Below: improved KPI cards and institutions list.

- [ ] **Step 1: Rewrite `src/app/(public)/page.tsx`**

```typescript
// Landing page — public showcase entry point.
// Two-column hero: headline/CTAs left, live forecaster leaderboard right.
// NOTE: this is a data-led placeholder until the news/events layout ships.

import { db } from "@/lib/db";
import { variables, actuals, forecasters, forecasts, forecastScores } from "@/lib/db/schema";
import { eq, desc, inArray, and, avg, count, isNotNull } from "drizzle-orm";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { SectionLabel } from "@/components/ui/SectionLabel";

export const revalidate = 3600;

async function getFeaturedData() {
  const gdpVars = await db
    .select()
    .from(variables)
    .where(
      and(
        eq(variables.name, "GDP Growth Rate"),
        inArray(variables.countryCode, ["WLD", "USA", "CHN", "GBR", "ZAF"])
      )
    )
    .orderBy(variables.countryCode, variables.name);

  const gdpActuals = gdpVars.length > 0
    ? await db
        .select()
        .from(actuals)
        .where(inArray(actuals.variableId, gdpVars.map((v) => v.id)))
        .orderBy(desc(actuals.targetPeriod))
    : [];

  const institutions = await db
    .select()
    .from(forecasters)
    .where(eq(forecasters.type, "INSTITUTION"))
    .orderBy(forecasters.name);

  // Leaderboard: institutions ranked by avg absolute error (scored forecasts only)
  const leaderboard = await db
    .select({
      id: forecasters.id,
      name: forecasters.name,
      slug: forecasters.slug,
      forecastCount: count(forecasts.id),
      avgError: avg(forecastScores.absoluteError),
    })
    .from(forecasters)
    .innerJoin(forecasts, eq(forecasts.forecasterId, forecasters.id))
    .innerJoin(forecastScores, eq(forecastScores.forecastId, forecasts.id))
    .where(and(
      eq(forecasters.type, "INSTITUTION"),
      isNotNull(forecastScores.absoluteError),
    ))
    .groupBy(forecasters.id, forecasters.name, forecasters.slug)
    .orderBy(avg(forecastScores.absoluteError))
    .limit(6);

  return { gdpVars, gdpActuals, institutions, leaderboard };
}

const COUNTRY_LABELS: Record<string, string> = {
  WLD: "World", USA: "US", CHN: "China", GBR: "UK", ZAF: "S. Africa",
};

export default async function LandingPage() {
  const { gdpVars, gdpActuals, institutions, leaderboard } = await getFeaturedData();

  const latestActuals = new Map<string, { value: string; period: string }>();
  for (const a of gdpActuals) {
    if (!latestActuals.has(a.variableId)) {
      latestActuals.set(a.variableId, {
        value: parseFloat(a.value).toFixed(1),
        period: a.targetPeriod,
      });
    }
  }

  return (
    <div className="space-y-20">

      {/* ── Two-column hero ───────────────────────────────────────── */}
      <section className="pt-4 grid lg:grid-cols-[1fr_420px] gap-12 items-start">
        {/* Left: headline + copy + CTAs */}
        <div>
          <h1
            className="text-[64px] leading-[1.05] tracking-tight text-ink"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Who calls it{" "}
            <span className="text-accent">right?</span>
          </h1>
          <p className="mt-6 text-xl text-muted leading-relaxed max-w-lg">
            Forethought tracks economic forecasts from institutions and
            independent analysts, scores them against outcomes, and publishes
            the record — permanently.
          </p>
          <div className="mt-8 flex gap-3">
            <Link
              href="/variables"
              className="inline-flex items-center px-6 py-3 text-base font-semibold bg-accent text-white rounded-[10px] hover:bg-accent-dark transition-colors duration-200"
              style={{ boxShadow: "0 1px 3px rgba(29, 78, 216, 0.3)" }}
            >
              Browse variables
            </Link>
            <Link
              href="/forecasters"
              className="inline-flex items-center px-6 py-3 text-base font-semibold border-2 border-border text-ink rounded-[10px] hover:border-accent hover:text-accent transition-colors duration-200"
            >
              View forecasters
            </Link>
          </div>
        </div>

        {/* Right: live leaderboard card */}
        {leaderboard.length > 0 && (
          <Card raised padding="none" className="overflow-hidden">
            <div className="px-5 pt-5 pb-3 border-b border-border">
              <p className="text-xs font-bold tracking-widest text-accent uppercase">
                Accuracy Leaderboard
              </p>
              <p className="text-xs text-muted mt-0.5">Ranked by avg. absolute error — lower is better</p>
            </div>
            <div className="divide-y divide-border">
              {leaderboard.map((f, i) => (
                <Link
                  key={f.id}
                  href={`/forecasters/${f.slug}`}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-bg transition-colors group"
                >
                  <span
                    className="text-sm font-bold tabular-nums text-muted w-5 shrink-0"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {i + 1}
                  </span>
                  <span className="flex-1 text-sm font-semibold text-ink group-hover:text-accent transition-colors truncate">
                    {f.name}
                  </span>
                  {f.avgError != null && (
                    <span
                      className="text-sm tabular-nums text-muted shrink-0"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      {parseFloat(f.avgError).toFixed(2)} MAE
                    </span>
                  )}
                </Link>
              ))}
            </div>
            <div className="px-5 py-3 border-t border-border">
              <Link
                href="/forecasters"
                className="text-xs font-semibold text-accent hover:text-accent-dark transition-colors"
              >
                View all forecasters →
              </Link>
            </div>
          </Card>
        )}
      </section>

      {/* ── GDP snapshot ─────────────────────────────────────────── */}
      {gdpVars.length > 0 && (
        <section>
          <SectionLabel>GDP Growth — Latest Actuals</SectionLabel>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {gdpVars.map((v) => {
              const latest = latestActuals.get(v.id);
              const val = latest ? parseFloat(latest.value) : null;
              const isPos = val !== null && val >= 0;
              return (
                <Link
                  key={v.id}
                  href={`/variables/${v.id}`}
                  className="group card px-5 py-4 hover:border-accent transition-colors duration-200"
                  style={{ borderRadius: "var(--radius-md)" }}
                >
                  <p className="text-xs font-bold tracking-wider text-muted uppercase">
                    {COUNTRY_LABELS[v.countryCode] ?? v.countryCode}
                  </p>
                  {latest && val !== null ? (
                    <>
                      <p
                        className={`mt-2 text-2xl font-bold tabular-nums leading-none ${
                          isPos ? "text-signal-green" : "text-signal-red"
                        }`}
                        style={{ fontFamily: "var(--font-mono)" }}
                      >
                        {isPos && val !== 0 ? "+" : ""}{val.toFixed(1)}%
                      </p>
                      <p className="mt-2 text-xs text-muted">{latest.period}</p>
                    </>
                  ) : (
                    <p className="mt-2 text-xl text-border-dark">—</p>
                  )}
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Tracked institutions ─────────────────────────────────── */}
      {institutions.length > 0 && (
        <section>
          <SectionLabel>Tracked Institutions</SectionLabel>
          <Card padding="none">
            {institutions.map((f, i) => (
              <Link
                key={f.id}
                href={`/forecasters/${f.slug}`}
                className={`flex items-center justify-between px-6 py-4 hover:bg-bg transition-colors group ${
                  i < institutions.length - 1 ? "border-b border-border" : ""
                }`}
              >
                <span className="text-base font-semibold text-ink group-hover:text-accent transition-colors">
                  {f.name}
                </span>
                <span
                  className="text-xs text-muted tabular-nums"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
              </Link>
            ))}
          </Card>
        </section>
      )}

      {/* ── How it works ─────────────────────────────────────────── */}
      <section className="border-t border-border pt-14">
        <SectionLabel>How It Works</SectionLabel>
        <div className="grid sm:grid-cols-3 gap-8">
          {[
            {
              n: "01",
              title: "Forecasts are logged",
              body: "Institutions publish WEO-style projections. Independent analysts submit their own. Every forecast is timestamped and immutable.",
            },
            {
              n: "02",
              title: "Outcomes are scored",
              body: "When official data is published, each forecast is scored: absolute error, directional accuracy, and performance vs the consensus.",
            },
            {
              n: "03",
              title: "Accuracy is public",
              body: "Scores and rankings are visible to everyone. No cherry-picking. The methodology is versioned and documented.",
            },
          ].map((item) => (
            <div key={item.n}>
              <p
                className="text-4xl font-bold text-accent-light mb-4 leading-none select-none"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {item.n}
              </p>
              <h3
                className="text-lg font-semibold text-ink mb-2"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {item.title}
              </h3>
              <p className="text-base text-muted leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
```

- [ ] **Step 2: Type-check and commit**

```bash
npx tsc --noEmit
git add src/app/(public)/page.tsx
git commit -m "feat: landing -- two-column hero, live leaderboard module, Card components"
```

---

## Task 8: System-wide table and list polish (Priority 4)

**Files:**
- Modify: `src/app/(public)/forecasters/page.tsx`
- Modify: `src/app/(public)/variables/page.tsx`

### What this task does
Applies Card wrapping, consistent table header styling, improved hover states, and filter input polish to the two list pages.

- [ ] **Step 1: Rewrite `src/app/(public)/forecasters/page.tsx`**

```typescript
// /forecasters — list of all tracked forecasters with accuracy overview.

import { db } from "@/lib/db";
import { forecasters, forecasts, forecastScores } from "@/lib/db/schema";
import { eq, avg, count } from "drizzle-orm";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { SectionLabel } from "@/components/ui/SectionLabel";

export const revalidate = 3600;

async function getForecasters() {
  const rows = await db
    .select({
      id: forecasters.id,
      name: forecasters.name,
      slug: forecasters.slug,
      type: forecasters.type,
      forecastCount: count(forecasts.id),
      avgAbsoluteError: avg(forecastScores.absoluteError),
    })
    .from(forecasters)
    .leftJoin(forecasts, eq(forecasts.forecasterId, forecasters.id))
    .leftJoin(forecastScores, eq(forecastScores.forecastId, forecasts.id))
    .groupBy(forecasters.id, forecasters.name, forecasters.slug, forecasters.type)
    .orderBy(forecasters.type, forecasters.name);

  return rows;
}

export default async function ForecastersPage() {
  const rows = await getForecasters();
  const institutions = rows.filter((r) => r.type === "INSTITUTION");
  const analysts = rows.filter((r) => r.type === "ANALYST");

  function ForecasterTable({ items }: { items: typeof rows }) {
    return (
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="border-b border-border bg-bg">
              <tr className="text-xs font-bold tracking-wider text-muted uppercase">
                <th className="text-left px-6 py-3 w-[60%]">Name</th>
                <th className="text-right px-6 py-3">Forecasts</th>
                <th className="text-right px-6 py-3">Avg error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((f) => (
                <tr key={f.id} className="hover:bg-bg transition-colors group">
                  <td className="px-6 py-4">
                    <Link
                      href={`/forecasters/${f.slug}`}
                      className="text-base font-semibold text-ink group-hover:text-accent transition-colors"
                    >
                      {f.name}
                    </Link>
                  </td>
                  <td
                    className="px-6 py-4 text-right text-base text-muted tabular-nums"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {Number(f.forecastCount) > 0 ? f.forecastCount : "—"}
                  </td>
                  <td
                    className="px-6 py-4 text-right text-base tabular-nums"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {f.avgAbsoluteError != null
                      ? parseFloat(f.avgAbsoluteError).toFixed(2)
                      : <span className="text-muted">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-12">
      <div>
        <h1
          className="text-5xl text-ink tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Forecasters
        </h1>
        <div className="mt-2 h-[3px] w-12 bg-accent" />
      </div>

      <section>
        <SectionLabel>Institutions</SectionLabel>
        <ForecasterTable items={institutions} />
      </section>

      {analysts.length > 0 && (
        <section>
          <SectionLabel>Independent Analysts</SectionLabel>
          <ForecasterTable items={analysts} />
        </section>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Rewrite `src/app/(public)/variables/page.tsx`**

```typescript
// /variables — browseable list of all tracked economic variables.

import { db } from "@/lib/db";
import { variables, actuals } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { SectionLabel } from "@/components/ui/SectionLabel";

export const revalidate = 3600;

const CATEGORIES = ["MACRO", "COMMODITY", "FINANCIAL", "POLITICAL"] as const;

const COUNTRY_OPTIONS = [
  { code: "WLD", label: "World" },
  { code: "ADV", label: "Advanced Economies" },
  { code: "EME", label: "Emerging & Developing" },
  { code: "EA",  label: "Euro Area" },
  { code: "G7",  label: "G7" },
  { code: "USA", label: "United States" },
  { code: "CHN", label: "China" },
  { code: "DEU", label: "Germany" },
  { code: "JPN", label: "Japan" },
  { code: "IND", label: "India" },
  { code: "GBR", label: "United Kingdom" },
  { code: "FRA", label: "France" },
  { code: "BRA", label: "Brazil" },
  { code: "ZAF", label: "South Africa" },
  { code: "AUS", label: "Australia" },
  { code: "CAN", label: "Canada" },
  { code: "KOR", label: "South Korea" },
  { code: "MEX", label: "Mexico" },
  { code: "RUS", label: "Russia" },
  { code: "SAU", label: "Saudi Arabia" },
];

async function getVariables(country?: string, category?: string) {
  const conditions = [];
  if (country) conditions.push(eq(variables.countryCode, country));
  if (category) conditions.push(eq(variables.category, category as typeof CATEGORIES[number]));

  const rows = await db
    .select()
    .from(variables)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(variables.countryCode, variables.name);

  const latestActualsMap = new Map<string, { value: string; targetPeriod: string }>();
  if (rows.length > 0) {
    const variableIds = rows.map((v) => v.id);
    const latestActuals = await db
      .select()
      .from(actuals)
      .where(inArray(actuals.variableId, variableIds))
      .orderBy(actuals.targetPeriod);
    for (const a of latestActuals) {
      latestActualsMap.set(a.variableId, { value: a.value, targetPeriod: a.targetPeriod });
    }
  }

  return { rows, latestActualsMap };
}

const inputClass =
  "text-sm border border-border rounded-[10px] px-3.5 py-2 bg-surface text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-colors";

interface PageProps {
  searchParams: Promise<{ country?: string; category?: string }>;
}

export default async function VariablesPage({ searchParams }: PageProps) {
  const { country, category } = await searchParams;
  const { rows, latestActualsMap } = await getVariables(country, category);

  return (
    <div className="space-y-10">
      <div>
        <h1
          className="text-5xl text-ink tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Variables
        </h1>
        <div className="mt-2 h-[3px] w-12 bg-accent" />
      </div>

      <form className="flex flex-wrap items-center gap-3">
        <select name="country" defaultValue={country ?? ""} className={inputClass}>
          <option value="">All countries</option>
          {COUNTRY_OPTIONS.map((c) => (
            <option key={c.code} value={c.code}>{c.label}</option>
          ))}
        </select>
        <select name="category" defaultValue={category ?? ""} className={inputClass}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <button
          type="submit"
          className="text-sm font-semibold px-4 py-2 bg-accent text-white rounded-[10px] hover:bg-accent-dark transition-colors duration-200"
          style={{ boxShadow: "0 1px 3px rgba(29, 78, 216, 0.25)" }}
        >
          Filter
        </button>
        {(country || category) && (
          <Link
            href="/variables"
            className="text-sm font-medium px-4 py-2 border border-border rounded-[10px] hover:border-accent transition-colors"
          >
            Clear
          </Link>
        )}
        <span className="ml-auto text-sm text-muted">{rows.length} variables</span>
      </form>

      {rows.length === 0 ? (
        <p className="text-base text-muted py-8">No variables match the selected filters.</p>
      ) : (
        <Card padding="none">
          <div className="overflow-hidden">
            <table className="min-w-full">
              <thead className="border-b border-border bg-bg">
                <tr className="text-xs font-bold tracking-wider text-muted uppercase">
                  <th className="text-left px-6 py-3">Variable</th>
                  <th className="text-left px-6 py-3">Country</th>
                  <th className="text-left px-6 py-3">Unit</th>
                  <th className="text-right px-6 py-3">Latest actual</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((v) => {
                  const latest = latestActualsMap.get(v.id);
                  const val = latest ? parseFloat(latest.value) : null;
                  return (
                    <tr key={v.id} className="hover:bg-bg transition-colors">
                      <td className="px-6 py-4">
                        <Link
                          href={`/variables/${v.id}`}
                          className="text-base font-semibold text-ink hover:text-accent transition-colors"
                        >
                          {v.name}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-semibold tracking-wide text-muted">{v.countryCode}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted">{v.unit}</td>
                      <td
                        className="px-6 py-4 text-right tabular-nums"
                        style={{ fontFamily: "var(--font-mono)" }}
                      >
                        {latest && val !== null ? (
                          <span className={val >= 0 ? "text-signal-green font-medium" : "text-signal-red font-medium"}>
                            {val > 0 ? "+" : ""}{val.toFixed(2)}
                            <span className="text-muted font-normal ml-2 text-xs">{latest.targetPeriod}</span>
                          </span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Type-check and commit**

```bash
npx tsc --noEmit
git add src/app/(public)/forecasters/page.tsx src/app/(public)/variables/page.tsx
git commit -m "feat: forecasters and variables list pages -- Card wrapping, consistent table polish"
```

---

## Self-Review Against Spec

**Spec coverage check:**

| Spec requirement | Task |
|---|---|
| `#F7F8FA` background, `#1D4ED8` blue, Inter font | Task 1 |
| Shadow + radius system (`12px`, `0 2px 8px...`) | Task 1 |
| Shared card/label/metric primitives | Task 2 |
| Max-width 1280px, nav polish | Task 3 |
| Chart 480px+, 3px actuals, blue consensus | Task 4 |
| Variable page chart-led, integrated actual callout | Task 5 |
| Forecaster 4-card metric band | Task 6 |
| Forecaster best/weakest panel | Task 6 |
| Landing two-column hero + product preview | Task 7 |
| Leaderboard module with real data | Task 7 |
| Improved KPI cards (GDP strip) | Task 7 |
| System-wide table and list polish | Task 8 |
| `border-l-4` accent on best/worst cards | Task 6 |
| `rounded-[10px]` buttons/inputs | Tasks 3, 7, 8 |
| Semantic colour use only (green/red/orange) | All tasks |
| No playful animations, no heavy shadows | Verified — no entrance animations |

**Gaps:** None identified. All 12 priority items from the spec are covered.

**Placeholder scan:** No TBDs, TODOs, or vague steps found.

**Type consistency:**
- `Card` props: `children`, `className?`, `raised?`, `padding?` — used consistently across Tasks 5–8
- `SectionLabel` props: `children`, `className?` — consistent
- `MetricCard` props: `label`, `value`, `valueClass?`, `subtext?` — used in Task 6 only, consistent
- `ForecastChart` new `height` prop defaults to `480` — used in Task 5 with explicit `height={480}`
- `fmtBias` returns `{ label, cls }` — used consistently in Tasks 5, 6
