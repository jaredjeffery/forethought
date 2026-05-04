// /variables/[slug] - public variable detail page with actuals and locked premium modules.

import { db } from "@/lib/db";
import {
  variables,
  forecasts,
  actuals,
  consensusForecasts,
  forecasters,
  forecastScores,
} from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Sparkline } from "@/components/viz/Sparkline";
import { Card } from "@/components/ui/Card";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { canAccessPremiumForecastData, getForecastDataAccess } from "@/lib/access/forecast-data";
import { articles } from "@/lib/content";
import { VariableChartWorkbench } from "@/components/variables/PremiumVariableChart";

export const dynamic = "force-dynamic";

const COUNTRY_LABELS: Record<string, string> = {
  WLD: "World",
  USA: "United States",
  CHN: "China",
  GBR: "United Kingdom",
  ZAF: "South Africa",
  IND: "India",
  EA: "Euro Area",
  G7: "G7",
  DEU: "Germany",
  JPN: "Japan",
  BRA: "Brazil",
};

function getVariablePlanningModules(variableName: string, countryLabel: string) {
  const lowerName = variableName.toLowerCase();
  const isGdp = lowerName.includes("gdp");
  const isInflation = lowerName.includes("inflation") || lowerName.includes("cpi");
  const isUnemployment = lowerName.includes("unemployment");

  if (isGdp) {
    return {
      otherFrequencies: [
        {
          label: "Quarterly GDP growth",
          detail: "Separate chart and score table once quarterly actuals and forecasts are ingested.",
          status: "Planned",
        },
        {
          label: "Monthly activity proxies",
          detail: "Industrial production, retail sales, payrolls, and PMI signals for early read-through.",
          status: "Signal set",
        },
      ],
      releaseCalendar: {
        title: "Quarterly national accounts",
        expected: "Source calendar pending",
        source: countryLabel === "United States" ? "BEA" : "National authority",
        targetPeriod: "Next quarterly release",
        note: "Farfield will show source links, publication status, and whether earlier periods may be revised.",
      },
      relatedVariables: [
        "CPI inflation",
        "Unemployment rate",
        "Government balance",
        "Current account balance",
      ],
      leadingSignals: [
        "PMI",
        "Industrial production",
        "Retail sales",
        "Payroll growth",
        "Consumer confidence",
      ],
    };
  }

  if (isInflation) {
    return {
      otherFrequencies: [
        {
          label: "Monthly CPI inflation",
          detail: "Monthly release view with seasonally adjusted and year-on-year series.",
          status: "Planned",
        },
        {
          label: "Core inflation",
          detail: "Separate series for excluding volatile food and energy components where available.",
          status: "Signal set",
        },
      ],
      releaseCalendar: {
        title: "Consumer price release",
        expected: "Source calendar pending",
        source: "National statistics office",
        targetPeriod: "Next monthly release",
        note: "Farfield will show release time, target month, source links, and revision policy.",
      },
      relatedVariables: [
        "Policy rate",
        "Wage growth",
        "Oil price",
        "Exchange rate",
      ],
      leadingSignals: [
        "Fuel prices",
        "Food prices",
        "Import prices",
        "Rent measures",
        "Inflation expectations",
      ],
    };
  }

  if (isUnemployment) {
    return {
      otherFrequencies: [
        {
          label: "Monthly labour market release",
          detail: "Monthly series where official labour-force data supports it.",
          status: "Planned",
        },
        {
          label: "Employment growth",
          detail: "Payroll or employment-level series for labour-market turning points.",
          status: "Signal set",
        },
      ],
      releaseCalendar: {
        title: "Labour market release",
        expected: "Source calendar pending",
        source: "National statistics office",
        targetPeriod: "Next labour-market period",
        note: "Farfield will show survey period, publication date, source links, and revision risk.",
      },
      relatedVariables: [
        "GDP growth",
        "CPI inflation",
        "Wage growth",
        "Consumer confidence",
      ],
      leadingSignals: [
        "Jobless claims",
        "Vacancy rate",
        "Payroll growth",
        "PMI employment",
        "Household survey detail",
      ],
    };
  }

  return {
    otherFrequencies: [
      {
        label: "Higher-frequency series",
        detail: "Quarterly or monthly pages will appear when source coverage supports them.",
        status: "Planned",
      },
      {
        label: "Comparable concepts",
        detail: "Related definitions and source variants will be grouped under this variable family.",
        status: "Signal set",
      },
    ],
    releaseCalendar: {
      title: "Official release",
      expected: "Source calendar pending",
      source: "Primary source",
      targetPeriod: "Next release period",
      note: "Farfield will show release date, source links, status, and revision risk.",
    },
    relatedVariables: [
      "GDP growth",
      "CPI inflation",
      "Unemployment rate",
      "Current account balance",
    ],
    leadingSignals: [
      "Survey indicators",
      "Market prices",
      "Policy announcements",
      "High-frequency activity data",
      "Source revisions",
    ],
  };
}

async function getVariableData(slug: string) {
  const [variable] = await db
    .select()
    .from(variables)
    .where(eq(variables.slug, slug))
    .limit(1);

  if (!variable) return null;

  const coverageRows = await db
    .select({
      forecasterId: forecasts.forecasterId,
      targetPeriod: forecasts.targetPeriod,
    })
    .from(forecasts)
    .where(eq(forecasts.variableId, variable.id));

  const actualRows = await db
    .select()
    .from(actuals)
    .where(eq(actuals.variableId, variable.id))
    .orderBy(actuals.targetPeriod);

  const scoreRows = await db
    .select({
      forecasterId: forecasters.id,
      forecasterSlug: forecasters.slug,
      forecasterName: forecasters.name,
      absoluteError: forecastScores.absoluteError,
      horizonMonths: forecastScores.horizonMonths,
    })
    .from(forecastScores)
    .innerJoin(forecasts, eq(forecasts.id, forecastScores.forecastId))
    .innerJoin(forecasters, eq(forecasters.id, forecasts.forecasterId))
    .where(eq(forecasts.variableId, variable.id));

  const performanceByForecaster = new Map<
    string,
    {
      slug: string;
      name: string;
      absoluteErrorSum: number;
      sampleSize: number;
      horizons: Set<number>;
    }
  >();

  for (const row of scoreRows) {
    if (row.absoluteError === null) continue;
    const absoluteError = parseFloat(row.absoluteError);
    if (!Number.isFinite(absoluteError)) continue;
    const current =
      performanceByForecaster.get(row.forecasterId) ??
      {
        slug: row.forecasterSlug,
        name: row.forecasterName,
        absoluteErrorSum: 0,
        sampleSize: 0,
        horizons: new Set<number>(),
      };
    current.absoluteErrorSum += absoluteError;
    current.sampleSize += 1;
    if (row.horizonMonths !== null) {
      current.horizons.add(row.horizonMonths);
    }
    performanceByForecaster.set(row.forecasterId, current);
  }

  const topForecasters = Array.from(performanceByForecaster.values())
    .filter((row) => row.sampleSize >= 3)
    .map((row) => ({
      slug: row.slug,
      name: row.name,
      mae: row.absoluteErrorSum / row.sampleSize,
      sampleSize: row.sampleSize,
      horizonCount: row.horizons.size,
    }))
    .sort((a, b) => a.mae - b.mae)
    .slice(0, 5);

  return {
    variable,
    actualRows,
    topForecasters,
    forecastCoverage: {
      forecasterCount: new Set(coverageRows.map((row) => row.forecasterId)).size,
      targetPeriodCount: new Set(coverageRows.map((row) => row.targetPeriod)).size,
    },
  };
}

function isoDate(value: Date | string | null) {
  if (!value) return null;
  return (value instanceof Date ? value : new Date(value)).toISOString().slice(0, 10);
}

function shouldUseActualCandidate(
  current: { source: string } | undefined,
  candidate: { source: string },
) {
  if (!current) return true;
  const currentIsWeo = current.source.startsWith("IMF-WEO");
  const candidateIsWeo = candidate.source.startsWith("IMF-WEO");
  return candidateIsWeo && !currentIsWeo;
}

async function getPremiumVariableData(variableId: string) {
  const consensusRows = await db
    .select({
      targetPeriod: consensusForecasts.targetPeriod,
      asOfDate: consensusForecasts.asOfDate,
      simpleMean: consensusForecasts.simpleMean,
      includedForecastCount: consensusForecasts.includedForecastCount,
    })
    .from(consensusForecasts)
    .where(eq(consensusForecasts.variableId, variableId))
    .orderBy(consensusForecasts.targetPeriod, consensusForecasts.asOfDate);

  const institutionForecastRows = await db
    .select({
      targetPeriod: forecasts.targetPeriod,
      value: forecasts.value,
      forecastMadeAt: forecasts.forecastMadeAt,
      submittedAt: forecasts.submittedAt,
      forecasterSlug: forecasters.slug,
      forecasterName: forecasters.name,
    })
    .from(forecasts)
    .innerJoin(forecasters, eq(forecasters.id, forecasts.forecasterId))
    .where(and(eq(forecasts.variableId, variableId), eq(forecasters.type, "INSTITUTION")))
    .orderBy(forecasts.targetPeriod, forecasts.forecastMadeAt, forecasts.submittedAt);

  return {
    consensus: consensusRows.map((row) => ({
      targetPeriod: row.targetPeriod,
      asOfDate: String(row.asOfDate),
      value: parseFloat(row.simpleMean),
      includedForecastCount: row.includedForecastCount,
    })),
    publicInstitutionForecasts: institutionForecastRows
      .map((row) => {
        const asOfDate = isoDate(row.forecastMadeAt ?? row.submittedAt);
        if (!asOfDate) return null;
        return {
          targetPeriod: row.targetPeriod,
          asOfDate,
          forecasterSlug: row.forecasterSlug,
          forecasterName: row.forecasterName,
          value: parseFloat(row.value),
        };
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row)),
    myForecasterForecasts: [],
  };
}

function getVariableResearch(variableName: string) {
  const lowerName = variableName.toLowerCase();
  const matches = articles.filter((article) => {
    const haystack = `${article.title} ${article.dek} ${article.tag}`.toLowerCase();
    if (lowerName.includes("gdp")) return haystack.includes("gdp") || haystack.includes("growth");
    if (lowerName.includes("inflation") || lowerName.includes("cpi")) return haystack.includes("inflation");
    if (lowerName.includes("oil")) return haystack.includes("oil");
    return haystack.includes(lowerName.split(" ")[0]);
  });

  return (matches.length > 0 ? matches : articles.slice(0, 3)).slice(0, 4);
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function VariableDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const data = await getVariableData(slug);
  const access = await getForecastDataAccess();

  if (!data) notFound();

  const { variable, actualRows, forecastCoverage, topForecasters } = data;
  const canSeePremium = canAccessPremiumForecastData(access);

  // Dedup by target period. Prefer WEO-carried actuals when multiple sources exist.
  const actualByPeriod = new Map<string, typeof actualRows[number]>();
  for (const a of actualRows) {
    if (shouldUseActualCandidate(actualByPeriod.get(a.targetPeriod), a)) {
      actualByPeriod.set(a.targetPeriod, a);
    }
  }
  const sortedActuals = Array.from(actualByPeriod.values()).sort((a, b) =>
    a.targetPeriod.localeCompare(b.targetPeriod),
  );

  const latestActual = sortedActuals.at(-1);
  const previousActual = sortedActuals.at(-2);
  const pctUnit = variable.unit.includes("%");
  const unitSuffix = pctUnit ? "%" : "";

  const latestValue = latestActual ? parseFloat(latestActual.value) : null;
  const previousValue = previousActual ? parseFloat(previousActual.value) : null;
  const change =
    latestValue !== null && previousValue !== null
      ? latestValue - previousValue
      : null;

  const sparkValues = sortedActuals.slice(-18).map((a) => parseFloat(a.value));
  const countryLabel = COUNTRY_LABELS[variable.countryCode] ?? variable.countryCode;
  const planningModules = getVariablePlanningModules(variable.name, countryLabel);
  const premiumData = canSeePremium ? await getPremiumVariableData(variable.id) : null;
  const researchItems = getVariableResearch(variable.name);
  const premiumActuals = sortedActuals.map((a) => ({
    targetPeriod: a.targetPeriod,
    value: parseFloat(a.value),
    source: a.source,
  }));

  return (
    <div className="space-y-12">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-muted">
        <Link href="/variables" className="transition-colors hover:text-ink">
          Variables
        </Link>
        <span>›</span>
        <span className="text-ink">
          {variable.name} — {countryLabel}
        </span>
      </nav>

      {/* HERO — title + latest reading + sparkline */}
      <section className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
        <div>
          <p className="section-label">{variable.category}</p>
          <h1
            className="mt-3 text-5xl leading-[1.05] tracking-tight text-ink"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {variable.name}
            <span
              className="ml-3 italic text-cobalt"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {countryLabel}
            </span>
          </h1>
          <span className="accent-rule" />
          <p className="mt-4 max-w-xl text-base leading-7 text-muted">
            {variable.unit} · {variable.frequency.toLowerCase()}
            {variable.description && ` · ${variable.description}`}
          </p>
        </div>

        {latestActual && latestValue !== null && (
          <Card padding="lg" raised className="prism-backdrop">
            <div className="flex items-start justify-between gap-6">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted">
                  Latest actual
                </p>
                <p
                  className={`mt-2 font-mono text-5xl font-bold leading-none tabular-nums ${
                    latestValue >= 0 ? "text-cobalt" : "text-coral"
                  }`}
                >
                  {latestValue > 0 ? "+" : ""}
                  {latestValue.toFixed(2)}
                  {unitSuffix}
                </p>
                <p className="mt-2 text-sm font-semibold text-ink">
                  {latestActual.targetPeriod}
                </p>
                {change !== null && (
                  <p className="mt-1 text-xs text-muted">
                    {change > 0 ? "▲" : change < 0 ? "▼" : "—"}{" "}
                    <span className="font-mono tabular-nums">
                      {change > 0 ? "+" : ""}
                      {change.toFixed(2)}
                      {unitSuffix}
                    </span>{" "}
                    vs {previousActual?.targetPeriod}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                <Sparkline
                  values={sparkValues}
                  width={180}
                  height={60}
                  stroke={
                    latestValue >= 0 ? "var(--cobalt)" : "var(--coral)"
                  }
                  zeroBaseline
                />
                <span className="badge badge-neutral">{latestActual.source}</span>
              </div>
            </div>
          </Card>
        )}
      </section>

      {/* FORECASTER PERFORMANCE + COVERAGE */}
      <section className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
        <Card padding="lg" raised>
          <SectionLabel>Top Forecasters</SectionLabel>
          {topForecasters.length > 0 ? (
            <div className="space-y-3">
              {topForecasters.map((forecaster, index) => (
                <Link
                  key={forecaster.slug}
                  href={`/forecasters/${forecaster.slug}`}
                  className="grid gap-3 border-b border-border pb-3 last:border-b-0 last:pb-0 sm:grid-cols-[3rem_1fr_auto] sm:items-center"
                >
                  <span className="font-mono text-2xl font-bold tabular-nums text-cobalt">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span>
                    <span className="block font-semibold text-ink">{forecaster.name}</span>
                    <span className="mt-1 block text-xs text-muted">
                      {forecaster.sampleSize} scored forecasts
                      {forecaster.horizonCount > 0
                        ? ` across ${forecaster.horizonCount} horizon${
                            forecaster.horizonCount === 1 ? "" : "s"
                          }`
                        : ""}
                    </span>
                  </span>
                  <span className="text-left sm:text-right">
                    <span className="block text-[10px] font-bold uppercase tracking-widest text-muted">
                      MAE
                    </span>
                    <span className="font-mono text-lg font-bold tabular-nums text-ink">
                      {forecaster.mae.toFixed(2)}
                      {unitSuffix}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm leading-6 text-muted">
              No scored forecaster record is available for this variable yet.
            </p>
          )}
        </Card>

        <Card padding="lg" className="border-l-4 border-l-cobalt">
          <SectionLabel>Coverage</SectionLabel>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
                Forecasters
              </p>
              <p className="mt-1 font-mono text-3xl font-bold tabular-nums text-ink">
                {forecastCoverage.forecasterCount}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
                Periods
              </p>
              <p className="mt-1 font-mono text-3xl font-bold tabular-nums text-ink">
                {forecastCoverage.targetPeriodCount}
              </p>
            </div>
          </div>
          <Link
            href="/pricing"
            className="mt-4 inline-flex text-sm font-semibold text-cobalt hover:text-cobalt-dark"
          >
            See subscriber access →
          </Link>
        </Card>

      </section>

      {premiumActuals.length > 0 && (
        <section>
          <SectionLabel>Variable Chart</SectionLabel>
          <Card padding="lg" raised>
            <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <h2
                  className="text-3xl leading-tight text-ink"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Actuals and accessible forecast layers
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
                  Hover over the chart to inspect values. Subscribers can add basic
                  consensus, public institutions, and subscribed forecaster series.
                </p>
              </div>
              {!premiumData && (
                <Link href="/pricing" className="btn-primary">
                  Request access
                </Link>
              )}
            </div>
            <VariableChartWorkbench
              unit={variable.unit}
              access={premiumData ? "subscriber" : "public"}
              consensus={premiumData?.consensus}
              publicInstitutionForecasts={premiumData?.publicInstitutionForecasts}
              myForecasterForecasts={premiumData?.myForecasterForecasts}
              actuals={premiumActuals}
            />
          </Card>
        </section>
      )}

      <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <Card padding="lg">
          <SectionLabel>Other Periods</SectionLabel>
          <div className="space-y-4">
            {planningModules.otherFrequencies.map((item) => (
              <div
                key={item.label}
                className="border-b border-border pb-4 last:border-b-0 last:pb-0"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="font-semibold text-ink">{item.label}</h3>
                  <span className="badge badge-neutral">{item.status}</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted">{item.detail}</p>
              </div>
            ))}
          </div>
          <Link
            href={`mailto:coverage@farfield.ai?subject=Request period coverage: ${encodeURIComponent(
              `${variable.name} ${countryLabel}`,
            )}`}
            className="mt-5 inline-flex text-sm font-semibold text-cobalt hover:text-cobalt-dark"
          >
            Request period coverage
          </Link>
        </Card>

        <Card padding="lg" className="border-l-4 border-l-emerald">
          <SectionLabel>Next Official Release</SectionLabel>
          <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-start">
            <div>
              <h3
                className="text-2xl leading-tight text-ink"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {planningModules.releaseCalendar.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted">
                {planningModules.releaseCalendar.note}
              </p>
            </div>
            <span className="badge badge-neutral">Calendar planned</span>
          </div>
          <div className="mt-6 grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
                Expected
              </p>
              <p className="mt-1 font-semibold text-ink">
                {planningModules.releaseCalendar.expected}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
                Period
              </p>
              <p className="mt-1 font-semibold text-ink">
                {planningModules.releaseCalendar.targetPeriod}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
                Source
              </p>
              <p className="mt-1 font-semibold text-ink">
                {planningModules.releaseCalendar.source}
              </p>
            </div>
          </div>
        </Card>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <Card padding="lg">
          <SectionLabel>Related Variables</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {planningModules.relatedVariables.map((item) => (
              <span
                key={item}
                className="rounded-md border border-border bg-white px-3 py-2 text-sm font-semibold text-ink"
              >
                {item}
              </span>
            ))}
          </div>
          <p className="mt-5 text-sm leading-6 text-muted">
            These become linked variable-family cards once the related series are ingested and
            scored.
          </p>
        </Card>

        <Card padding="lg">
          <SectionLabel>Leading Signals</SectionLabel>
          <div className="grid gap-2 sm:grid-cols-2">
            {planningModules.leadingSignals.map((item) => (
              <div
                key={item}
                className="rounded-md border border-border bg-bg-alt px-3 py-2 text-sm font-semibold text-ink"
              >
                {item}
              </div>
            ))}
          </div>
          <p className="mt-5 text-sm leading-6 text-muted">
            Farfield can later test which signals tend to move before this variable and show
            that evidence beside the chart.
          </p>
        </Card>
      </section>

      {premiumData && (
        <>
          <section className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
            <Card padding="lg">
              <SectionLabel>Research on this variable</SectionLabel>
              <div className="space-y-4">
                {researchItems.map((article) => (
                  <Link
                    key={article.slug}
                    href={`/articles/${article.slug}`}
                    className="block border-b border-border pb-4 last:border-b-0 last:pb-0"
                  >
                    <p className="text-xs font-bold uppercase tracking-widest text-cobalt">
                      {article.column ?? article.label}
                    </p>
                    <h3 className="mt-1 text-lg font-semibold leading-snug text-ink">
                      {article.title}
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-muted">{article.dek}</p>
                  </Link>
                ))}
              </div>
            </Card>

            <Card padding="lg" className="bg-bg-alt">
              <SectionLabel>Coverage Requests</SectionLabel>
              <h3
                className="text-2xl leading-tight text-ink"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Want more forecaster coverage here?
              </h3>
              <p className="mt-3 text-sm leading-6 text-muted">
                Requesting coverage helps Farfield see where subscriber demand is
                concentrated and gives forecasters a signal about what to publish next.
              </p>
              <Link
                href={`mailto:coverage@farfield.ai?subject=Request coverage: ${encodeURIComponent(
                  `${variable.name} ${countryLabel}`,
                )}`}
                className="btn-primary mt-5"
              >
                Request coverage
              </Link>
            </Card>
          </section>
        </>
      )}

      {/* SUBSCRIBER PREVIEW */}
      {!premiumData && (
      <section>
        <SectionLabel>Subscriber Preview</SectionLabel>
        <Card padding="lg" className="bg-bg-alt">
          <div className="grid gap-6 md:grid-cols-[1fr_1fr]">
            <div>
              <h3
                className="text-2xl leading-tight text-ink"
                style={{ fontFamily: "var(--font-display)" }}
              >
                What unlocks with subscriber access
              </h3>
              <p className="mt-3 text-sm leading-6 text-muted">
                The full forecast record for {variable.name} — every institution&rsquo;s
                forecast path, the consensus as-of history, dispersion bands, and revisions
                between vintages.
              </p>
              <Link href="/pricing" className="btn-primary mt-5">
                Request access
              </Link>
            </div>
            <div className="grid gap-3">
              {[
                "Forecast lines per institution",
                "Consensus path with as-of snapshots",
                "Dispersion band (high–low–median)",
                "Vintage history and revision deltas",
                "CSV / API export",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center justify-between border-b border-border pb-2"
                >
                  <span className="text-sm font-medium text-ink">{item}</span>
                  <span className="badge badge-neutral">Locked</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </section>
      )}

      {sortedActuals.length === 0 && (
        <p className="py-8 text-base text-muted">
          No data available yet for this variable. Check back after the next data ingestion.
        </p>
      )}
    </div>
  );
}
