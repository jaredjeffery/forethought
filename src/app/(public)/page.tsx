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
import { articles, methodologyNotes } from "@/lib/content";
import { ArticleVisual } from "@/components/ArticleVisual";
import { ForecastChart, type DataPoint } from "@/components/ForecastChart";
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

const SUBSCRIBER_CAROUSEL_PREVIEW = [
  {
    variable: "United States GDP Growth Rate",
    target: "2026",
    signal: "Consensus path",
    detail: "Institution forecasts, consensus, dispersion, and vintage changes stay locked.",
  },
  {
    variable: "United Kingdom Inflation (CPI)",
    target: "2026",
    signal: "Forecaster spread",
    detail: "Subscriber view compares public institutions against the current consensus.",
  },
  {
    variable: "South Africa Unemployment Rate",
    target: "2026",
    signal: "Vintage movement",
    detail: "As-of snapshots show how the record changes from one source release to the next.",
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
  const leadArticle = articles.find((article) => article.prominence === "lead") ?? articles[0];
  const topArticles = articles
    .filter(
      (article) =>
        article.prominence === "top" && article.column !== "Forecaster Spotlight",
    )
    .slice(0, 3);
  const leadingIndicators = articles
    .filter((article) => article.column === "Leading Indicators")
    .slice(0, 3);
  const forecasterSpotlight = articles.find(
    (article) => article.column === "Forecaster Spotlight",
  );
  const blogArticles = articles
    .filter((article) => article.column === "Farfield Blog")
    .slice(0, 4);
  const chartVariable =
    featuredVariables.find(
      (variable) =>
        variable.name === "GDP Growth Rate" && variable.countryCode === "WLD",
    ) ?? featuredVariables[0];
  const chartActuals = chartVariable
    ? featuredActuals.filter((actual) => actual.variableId === chartVariable.id)
    : [];
  const chartActualByPeriod = new Map<string, typeof chartActuals[number]>();

  for (const actual of chartActuals) {
    if (!chartActualByPeriod.has(actual.targetPeriod)) {
      chartActualByPeriod.set(actual.targetPeriod, actual);
    }
  }

  const chartData: DataPoint[] = Array.from(chartActualByPeriod.values())
    .sort((a, b) => a.targetPeriod.localeCompare(b.targetPeriod))
    .slice(-18)
    .map((actual) => ({
      period: actual.targetPeriod,
      actual: parseFloat(actual.value),
    }));
  const latestChartActual = chartData.at(-1);
  const latestChartValue =
    typeof latestChartActual?.actual === "number" ? latestChartActual.actual : null;

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
              <Link
                href="/articles"
                className="inline-flex items-center rounded-[10px] border border-border px-5 py-3 text-sm font-semibold text-ink transition-colors hover:border-accent hover:text-accent"
              >
                Read notes
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
              className="text-4xl tracking-tight text-ink"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Analysis that makes the forecast record worth reading
            </h2>
          </div>
          <Link href="/articles" className="text-sm font-semibold text-accent hover:text-accent-dark">
            View all articles
          </Link>
        </div>
        <div className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
          {leadArticle && (
            <Link href={`/articles/${leadArticle.slug}`} className="group">
              <Card padding="none" raised className="h-full overflow-hidden transition-colors group-hover:border-accent">
                <ArticleVisual article={leadArticle} size="lg" />
                <div className="p-7">
                  <div className="flex flex-wrap items-center gap-3 text-xs font-bold uppercase tracking-widest text-muted">
                    <span className="text-accent">{leadArticle.label}</span>
                    <span>{leadArticle.tag}</span>
                    <span>{leadArticle.readingTime}</span>
                  </div>
                  <h3
                    className="mt-4 max-w-2xl text-4xl leading-tight tracking-tight text-ink group-hover:text-accent"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {leadArticle.title}
                  </h3>
                  <p className="mt-4 max-w-2xl text-base leading-7 text-muted">
                    {leadArticle.dek}
                  </p>
                </div>
              </Card>
            </Link>
          )}

          <div className="grid gap-4">
            {topArticles.map((article) => (
              <Link key={article.slug} href={`/articles/${article.slug}`} className="group">
                <Card padding="none" className="grid overflow-hidden transition-colors group-hover:border-accent sm:grid-cols-[155px_1fr] lg:grid-cols-1 xl:grid-cols-[155px_1fr]">
                  <ArticleVisual article={article} />
                  <div className="p-5">
                    <p className="text-xs font-bold uppercase tracking-widest text-accent">
                      {article.label}
                    </p>
                    <h3
                      className="mt-3 text-xl leading-tight text-ink group-hover:text-accent"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {article.title}
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-muted">{article.dek}</p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-[1fr_0.8fr]">
        <div>
          <div className="mb-5 flex items-end justify-between gap-3">
            <div>
              <SectionLabel className="mb-2">Leading Indicators</SectionLabel>
              <h2
                className="text-3xl tracking-tight text-ink"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Signals forecasters watch before the data lands
              </h2>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {leadingIndicators.map((article) => (
              <Link key={article.slug} href={`/articles/${article.slug}`} className="group">
                <Card padding="none" className="h-full overflow-hidden transition-colors group-hover:border-accent">
                  <ArticleVisual article={article} />
                  <div className="p-5">
                    <p className="text-xs font-bold uppercase tracking-widest text-accent">
                      {article.tag}
                    </p>
                    <h3
                      className="mt-3 text-xl leading-tight text-ink group-hover:text-accent"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {article.title}
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-muted">{article.dek}</p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {forecasterSpotlight && (
          <div>
            <SectionLabel className="mb-5">Forecaster Spotlight</SectionLabel>
            <Link href={`/articles/${forecasterSpotlight.slug}`} className="group">
              <Card padding="none" raised className="h-full overflow-hidden transition-colors group-hover:border-accent">
                <ArticleVisual article={forecasterSpotlight} size="lg" />
                <div className="p-6">
                  <p className="text-xs font-bold uppercase tracking-widest text-accent">
                    Regular profile
                  </p>
                  <h3
                    className="mt-3 text-3xl leading-tight text-ink group-hover:text-accent"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {forecasterSpotlight.title}
                  </h3>
                  <p className="mt-4 text-sm leading-6 text-muted">
                    {forecasterSpotlight.dek}
                  </p>
                </div>
              </Card>
            </Link>
          </div>
        )}
      </section>

      <section>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <SectionLabel className="mb-2">Farfield Blog</SectionLabel>
            <h2
              className="text-3xl tracking-tight text-ink"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Notes from the data room
            </h2>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {blogArticles.map((article) => (
            <Link key={article.slug} href={`/articles/${article.slug}`} className="group">
              <Card padding="md" className="h-full transition-colors group-hover:border-accent">
                <p className="text-xs font-bold uppercase tracking-widest text-accent">
                  {article.tag}
                </p>
                <h3
                  className="mt-4 text-lg leading-tight text-ink group-hover:text-accent"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {article.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-muted">{article.dek}</p>
                <p className="mt-6 text-xs font-semibold uppercase tracking-widest text-border-dark">
                  {article.readingTime}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {chartVariable && chartData.length > 0 && (
        <section className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr] lg:items-stretch">
          <Card padding="none" raised className="overflow-hidden">
            <div className="border-b border-border px-6 py-5">
              <SectionLabel className="mb-2">Public Data Visual</SectionLabel>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2
                    className="text-3xl tracking-tight text-ink"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {COUNTRY_LABELS[chartVariable.countryCode] ?? chartVariable.countryCode}{" "}
                    {chartVariable.name}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    Actual outcomes only. Forecast and consensus lines stay locked.
                  </p>
                </div>
                <Link
                  href={`/variables/${chartVariable.slug}`}
                  className="text-sm font-semibold text-accent hover:text-accent-dark"
                >
                  Open variable
                </Link>
              </div>
            </div>
            <div className="px-3 py-5">
              <ForecastChart
                data={chartData}
                series={[]}
                unit={chartVariable.unit}
                height={360}
              />
            </div>
          </Card>

          <Card padding="lg" className="flex flex-col justify-between border-l-4 border-l-signal-green">
            <div>
              <SectionLabel>Latest Actual</SectionLabel>
              <p className="font-mono text-5xl font-bold leading-none text-ink tabular-nums">
                {latestChartValue !== null
                  ? `${latestChartValue > 0 ? "+" : ""}${latestChartValue.toFixed(1)}${
                      chartVariable.unit.includes("%") ? "%" : ""
                    }`
                  : "Pending"}
              </p>
              <p className="mt-2 text-sm font-medium text-muted">
                {latestChartActual?.period ?? "No period"} / {chartVariable.unit}
              </p>
            </div>
            <div className="mt-8 grid gap-3 text-sm">
              <div className="border-t border-border pt-3">
                <p className="font-semibold text-ink">Public view</p>
                <p className="mt-1 leading-6 text-muted">
                  Actual history, source labels, and coverage indicators.
                </p>
              </div>
              <div className="border-t border-border pt-3">
                <p className="font-semibold text-ink">Subscriber view</p>
                <p className="mt-1 leading-6 text-muted">
                  Forecast paths, consensus as-of history, dispersion, and exports.
                </p>
              </div>
            </div>
          </Card>
        </section>
      )}

      <section>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <SectionLabel className="mb-2">Subscriber Preview</SectionLabel>
            <h2
              className="text-3xl tracking-tight text-ink"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Forecasts compared with consensus
            </h2>
          </div>
          <span className="rounded-full border border-border px-3 py-1 text-xs font-semibold uppercase tracking-widest text-muted">
            Locked
          </span>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {SUBSCRIBER_CAROUSEL_PREVIEW.map((item) => (
            <Card
              key={`${item.variable}-${item.target}`}
              padding="lg"
              className="min-w-[310px] max-w-[340px] border-l-4 border-l-accent"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-muted">
                    {item.target}
                  </p>
                  <h3
                    className="mt-2 text-xl leading-tight text-ink"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {item.variable}
                  </h3>
                </div>
                <span className="rounded-full bg-bg px-3 py-1 text-xs font-semibold text-muted">
                  Locked
                </span>
              </div>
              <div className="mt-8 space-y-3">
                {["Consensus", "Institution", "Actual"].map((label, index) => (
                  <div key={label}>
                    <div className="mb-1 flex items-center justify-between text-xs font-semibold uppercase tracking-widest text-muted">
                      <span>{label}</span>
                      <span>{index === 2 ? "Public" : "Subscriber"}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-bg">
                      <div
                        className={`h-full rounded-full ${
                          index === 0
                            ? "w-3/4 bg-accent"
                            : index === 1
                              ? "w-1/2 bg-signal-orange"
                              : "w-2/3 bg-ink"
                        }`}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-6 text-sm leading-6 text-muted">{item.detail}</p>
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
            {methodologyNotes.map((note) => (
              <Link key={note.slug} href={`/methodology/${note.slug}`} className="group">
                <div className="h-full border-t border-border pt-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-accent">
                    {note.tag}
                  </p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-ink group-hover:text-accent">
                    {note.title}
                  </p>
                </div>
              </Link>
            ))}
          </div>
          <Link
            href="/methodology"
            className="mt-8 inline-flex text-sm font-semibold text-accent hover:text-accent-dark"
          >
            View methodology
          </Link>
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
