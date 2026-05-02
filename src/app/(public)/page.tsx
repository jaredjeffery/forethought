// Public homepage for Farfield with non-leaky editorial, actuals, and trust signals.

import { db } from "@/lib/db";
import {
  actuals,
  forecasters,
  forecasts,
  forecastScores,
  sourceDocuments,
  variables,
} from "@/lib/db/schema";
import { countDistinct, desc, eq, inArray } from "drizzle-orm";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { SectionLabel } from "@/components/ui/SectionLabel";

export const revalidate = 3600;

const COUNTRY_LABELS: Record<string, string> = {
  WLD: "World",
  USA: "United States",
  CHN: "China",
  GBR: "United Kingdom",
  ZAF: "South Africa",
  IND: "India",
  EA: "Euro Area",
  G7: "G7",
};

const FEATURED_VARIABLES = [
  { name: "GDP Growth Rate", countryCode: "WLD" },
  { name: "GDP Growth Rate", countryCode: "USA" },
  { name: "GDP Growth Rate", countryCode: "CHN" },
  { name: "Inflation (CPI)", countryCode: "GBR" },
  { name: "Unemployment Rate", countryCode: "ZAF" },
  { name: "Current Account Balance", countryCode: "IND" },
];

const EDITORIAL_PREVIEWS = [
  {
    label: "Data note",
    title: "How Farfield treats WEO actuals",
    dek: "A short guide to national-authority metadata, fiscal-year mapping, and why first-release scoring matters.",
    tag: "Methodology",
  },
  {
    label: "Launch brief",
    title: "The first public forecast record",
    dek: "What can be checked today across IMF, OECD, ECB, and World Bank source history.",
    tag: "Forecast record",
  },
  {
    label: "Variable explainer",
    title: "Why GDP surprises are not all equal",
    dek: "A plain-English look at horizons, revisions, and why the same miss can mean different things.",
    tag: "GDP growth",
  },
];

async function getHomepageData() {
  const allVariables = await db
    .select()
    .from(variables)
    .where(eq(variables.category, "MACRO"))
    .orderBy(variables.countryCode, variables.name);

  const featuredVariables = FEATURED_VARIABLES
    .map((target) =>
      allVariables.find(
        (variable) =>
          variable.name === target.name &&
          variable.countryCode === target.countryCode,
      ),
    )
    .filter((variable): variable is NonNullable<typeof variable> => Boolean(variable));

  const featuredActuals = featuredVariables.length > 0
    ? await db
        .select()
        .from(actuals)
        .where(inArray(actuals.variableId, featuredVariables.map((variable) => variable.id)))
        .orderBy(desc(actuals.targetPeriod), desc(actuals.publishedAt))
    : [];

  const institutions = await db
    .select({
      id: forecasters.id,
      name: forecasters.name,
      slug: forecasters.slug,
      forecastCount: countDistinct(forecasts.id),
      scoredCount: countDistinct(forecastScores.id),
      variableCount: countDistinct(forecasts.variableId),
      countryCount: countDistinct(variables.countryCode),
    })
    .from(forecasters)
    .leftJoin(forecasts, eq(forecasts.forecasterId, forecasters.id))
    .leftJoin(forecastScores, eq(forecastScores.forecastId, forecasts.id))
    .leftJoin(variables, eq(variables.id, forecasts.variableId))
    .where(eq(forecasters.type, "INSTITUTION"))
    .groupBy(forecasters.id, forecasters.name, forecasters.slug)
    .orderBy(desc(countDistinct(forecasts.id)), forecasters.name)
    .limit(8);

  const sourceRows = await db.select().from(sourceDocuments);
  const sourceCount = new Set(sourceRows.map((row) => row.sourceName)).size;
  const latestSource = sourceRows
    .slice()
    .sort((a, b) => b.ingestedAt.getTime() - a.ingestedAt.getTime())
    .at(0);

  return {
    featuredVariables,
    featuredActuals,
    institutions,
    sourceCount,
    latestSource,
  };
}

function statusLabel(scoredCount: number, forecastCount: number) {
  if (scoredCount >= 100) return "Ranked benchmark";
  if (scoredCount > 0) return "Building track record";
  if (forecastCount > 0) return "Tracked, awaiting scores";
  return "No tracked forecasts";
}

function formatActual(value: string, unit: string) {
  const parsed = parseFloat(value);
  const suffix = unit.includes("%") ? "%" : "";
  return `${parsed > 0 ? "+" : ""}${parsed.toFixed(1)}${suffix}`;
}

export default async function LandingPage() {
  const {
    featuredVariables,
    featuredActuals,
    institutions,
    sourceCount,
    latestSource,
  } = await getHomepageData();

  const latestActuals = new Map<string, typeof featuredActuals[number]>();
  for (const actual of featuredActuals) {
    if (!latestActuals.has(actual.variableId)) {
      latestActuals.set(actual.variableId, actual);
    }
  }

  const totalTracked = institutions.reduce(
    (sum, row) => sum + Number(row.forecastCount),
    0,
  );
  const totalScored = institutions.reduce(
    (sum, row) => sum + Number(row.scoredCount),
    0,
  );

  const spotlight = institutions.slice(0, 4);

  return (
    <div className="space-y-20">
      <section className="relative overflow-hidden border-b border-border pb-14 pt-4">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div>
            <p className="mb-4 text-xs font-bold uppercase tracking-widest text-accent">
              Forecast accountability
            </p>
            <h1
              className="max-w-4xl text-6xl leading-[1.02] tracking-tight text-ink"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Farfield
            </h1>
            <p className="mt-5 max-w-3xl text-2xl leading-snug text-ink">
              Public economic forecasts, preserved by vintage and checked against actual outcomes.
            </p>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted">
              Visitors can inspect actuals, source depth, coverage, and public trust signals.
              Subscribers will see current consensus, vintage history, dispersion, and exports.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/variables"
                className="inline-flex items-center rounded-[10px] bg-accent px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-dark"
              >
                Browse variables
              </Link>
              <Link
                href="/forecasters"
                className="inline-flex items-center rounded-[10px] border border-border px-5 py-3 text-sm font-semibold text-ink transition-colors hover:border-accent hover:text-accent"
              >
                View forecasters
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="border-l-4 border-accent bg-surface px-5 py-4 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-widest text-muted">
                Tracked forecasts
              </p>
              <p className="mt-2 font-mono text-4xl font-bold tabular-nums text-ink">
                {totalTracked.toLocaleString()}
              </p>
            </div>
            <div className="border-l-4 border-signal-green bg-surface px-5 py-4 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-widest text-muted">
                Scored rows
              </p>
              <p className="mt-2 font-mono text-4xl font-bold tabular-nums text-ink">
                {totalScored.toLocaleString()}
              </p>
            </div>
            <div className="border-l-4 border-signal-orange bg-surface px-5 py-4 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-widest text-muted">
                Source families
              </p>
              <p className="mt-2 font-mono text-4xl font-bold tabular-nums text-ink">
                {sourceCount.toLocaleString()}
              </p>
            </div>
            <div className="border-l-4 border-ink bg-surface px-5 py-4 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-widest text-muted">
                Latest import
              </p>
              <p className="mt-2 text-lg font-semibold leading-tight text-ink">
                {latestSource?.vintageLabel ?? "Pending"}
              </p>
              <p className="mt-1 text-xs text-muted">
                {latestSource?.sourceName ?? "No source document yet"}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <SectionLabel className="mb-2">Farfield Editorial</SectionLabel>
            <h2
              className="text-3xl tracking-tight text-ink"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Research notes for the public record
            </h2>
          </div>
          <span className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted">
            Editorial previews
          </span>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {EDITORIAL_PREVIEWS.map((article) => (
            <Card key={article.title} padding="lg" className="min-h-[250px]">
              <div className="flex h-full flex-col">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-accent">
                    {article.label}
                  </p>
                  <span className="rounded-full bg-bg px-3 py-1 text-xs font-semibold text-muted">
                    {article.tag}
                  </span>
                </div>
                <h3
                  className="mt-8 text-2xl leading-tight text-ink"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {article.title}
                </h3>
                <p className="mt-4 text-sm leading-6 text-muted">{article.dek}</p>
                <p className="mt-auto pt-8 text-xs font-semibold uppercase tracking-widest text-border-dark">
                  Preview
                </p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <SectionLabel className="mb-2">Actuals Only</SectionLabel>
            <h2
              className="text-3xl tracking-tight text-ink"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Public macro cards
            </h2>
          </div>
          <Link href="/variables" className="text-sm font-semibold text-accent hover:text-accent-dark">
            View all variables
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {featuredVariables.map((variable) => {
            const latest = latestActuals.get(variable.id);
            const value = latest ? parseFloat(latest.value) : null;
            const isPositive = value !== null && value >= 0;
            return (
              <Link
                key={variable.id}
                href={`/variables/${variable.slug}`}
                className="card group px-5 py-5 transition-colors hover:border-accent"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-muted">
                      {COUNTRY_LABELS[variable.countryCode] ?? variable.countryCode}
                    </p>
                    <h3 className="mt-2 text-base font-semibold text-ink">
                      {variable.name}
                    </h3>
                  </div>
                  <span className="rounded-full bg-bg px-3 py-1 text-xs font-semibold text-muted">
                    {latest?.source ?? "No actual"}
                  </span>
                </div>
                {latest && value !== null ? (
                  <div className="mt-8 flex items-end justify-between gap-4">
                    <p
                      className={`font-mono text-4xl font-bold leading-none tabular-nums ${
                        isPositive ? "text-signal-green" : "text-signal-red"
                      }`}
                    >
                      {formatActual(latest.value, variable.unit)}
                    </p>
                    <p className="text-sm font-medium text-muted">{latest.targetPeriod}</p>
                  </div>
                ) : (
                  <p className="mt-8 text-sm text-muted">Actual pending.</p>
                )}
              </Link>
            );
          })}
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <SectionLabel>Institution Spotlight</SectionLabel>
          <h2
            className="text-3xl leading-tight tracking-tight text-ink"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Who is already in the record?
          </h2>
          <p className="mt-4 text-base leading-7 text-muted">
            Farfield starts with public institutions so the trust layer exists before
            independent forecasters and marketplace features arrive.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {spotlight.map((institution) => {
            const forecastCount = Number(institution.forecastCount);
            const scoredCount = Number(institution.scoredCount);
            const variableCount = Number(institution.variableCount);
            const countryCount = Number(institution.countryCount);
            return (
              <Link
                key={institution.id}
                href={`/forecasters/${institution.slug}`}
                className="card px-5 py-4 transition-colors hover:border-accent"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-base font-semibold text-ink">{institution.name}</h3>
                  <span className="rounded-full bg-accent-light px-3 py-1 text-xs font-semibold text-accent">
                    {statusLabel(scoredCount, forecastCount)}
                  </span>
                </div>
                <div className="mt-5 grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="font-mono text-xl font-bold text-ink tabular-nums">
                      {forecastCount.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted">Forecasts</p>
                  </div>
                  <div>
                    <p className="font-mono text-xl font-bold text-ink tabular-nums">
                      {variableCount.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted">Variables</p>
                  </div>
                  <div>
                    <p className="font-mono text-xl font-bold text-ink tabular-nums">
                      {countryCount.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted">Geos</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card padding="lg" className="border-l-4 border-l-accent">
          <SectionLabel>Methodology</SectionLabel>
          <h2
            className="text-3xl leading-tight text-ink"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Built around exact source links
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              ["1", "Forecast vintages are preserved."],
              ["2", "Actual releases stay linked to source documents."],
              ["3", "Scores record the methodology version used."],
            ].map(([step, text]) => (
              <div key={step}>
                <p className="font-mono text-2xl font-bold text-accent">{step}</p>
                <p className="mt-2 text-sm leading-6 text-muted">{text}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card padding="lg" className="bg-bg">
          <SectionLabel>Subscriber Layer</SectionLabel>
          <h2
            className="text-3xl leading-tight text-ink"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Locked premium modules
          </h2>
          <div className="mt-6 grid gap-3">
            {[
              "Current consensus values",
              "Vintage history and revision paths",
              "Forecaster-by-forecaster series",
              "Dispersion, rankings, and exports",
            ].map((item) => (
              <div key={item} className="flex items-center justify-between border-b border-border pb-3">
                <span className="text-sm font-medium text-ink">{item}</span>
                <span className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-muted">
                  Locked
                </span>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}
