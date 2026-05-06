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
import { ActualsBars } from "@/components/viz/ActualsBars";
import { Sparkline } from "@/components/viz/Sparkline";
import { CoverageMatrix } from "@/components/viz/CoverageMatrix";
import { PrismDial } from "@/components/viz/PrismDial";
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
  DEU: "Germany",
  JPN: "Japan",
  BRA: "Brazil",
};

const FEATURED_VARIABLES = [
  { name: "GDP Growth Rate", countryCode: "WLD" },
  { name: "GDP Growth Rate", countryCode: "USA" },
  { name: "GDP Growth Rate", countryCode: "CHN" },
  { name: "Inflation (CPI)", countryCode: "GBR" },
  { name: "Unemployment Rate", countryCode: "ZAF" },
  { name: "Current Account Balance", countryCode: "IND" },
];

const COVERAGE_COUNTRIES: { code: string; label: string }[] = [
  { code: "USA", label: "United States" },
  { code: "CHN", label: "China" },
  { code: "DEU", label: "Germany" },
  { code: "JPN", label: "Japan" },
  { code: "GBR", label: "United Kingdom" },
  { code: "IND", label: "India" },
  { code: "BRA", label: "Brazil" },
  { code: "ZAF", label: "South Africa" },
];

const COVERAGE_INDICATORS = [
  "GDP Growth Rate",
  "Inflation (CPI)",
  "Unemployment Rate",
  "Current Account Balance",
  "Government Balance",
] as const;

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
        .orderBy(actuals.targetPeriod)
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

  // Coverage matrix: which institutions cover which (indicator, top-N countries)?
  const coverageVariables = allVariables.filter(
    (v) =>
      COVERAGE_INDICATORS.includes(v.name as typeof COVERAGE_INDICATORS[number]) &&
      COVERAGE_COUNTRIES.some((c) => c.code === v.countryCode),
  );
  const coverageVariableIds = coverageVariables.map((v) => v.id);
  const coverageRows =
    coverageVariableIds.length > 0
      ? await db
          .select({
            forecasterId: forecasts.forecasterId,
            variableId: forecasts.variableId,
          })
          .from(forecasts)
          .where(inArray(forecasts.variableId, coverageVariableIds))
      : [];

  return {
    featuredVariables,
    featuredActuals,
    institutions,
    sourceCount,
    latestSource,
    allVariables,
    coverageVariables,
    coverageRows,
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
    coverageVariables,
    coverageRows,
  } = await getHomepageData();

  // Latest actual per variable + ordered history (last 14 periods).
  const actualsByVariable = new Map<string, typeof featuredActuals>();
  for (const actual of featuredActuals) {
    const list = actualsByVariable.get(actual.variableId) ?? [];
    list.push(actual);
    actualsByVariable.set(actual.variableId, list);
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

  // Hero variable: world GDP, all of its actuals, used for the hero bar chart.
  const heroVariable =
    featuredVariables.find(
      (v) => v.name === "GDP Growth Rate" && v.countryCode === "WLD",
    ) ?? featuredVariables[0];
  const heroActualsRaw = heroVariable
    ? (actualsByVariable.get(heroVariable.id) ?? []).slice().sort((a, b) =>
        a.targetPeriod.localeCompare(b.targetPeriod),
      )
    : [];
  // Dedup by target period and keep last 18.
  const heroActualMap = new Map<string, typeof heroActualsRaw[number]>();
  for (const a of heroActualsRaw) {
    if (!heroActualMap.has(a.targetPeriod)) heroActualMap.set(a.targetPeriod, a);
  }
  const heroActuals = Array.from(heroActualMap.values()).slice(-18);
  const heroBars = heroActuals.map((a) => ({
    period: a.targetPeriod,
    value: parseFloat(a.value),
  }));
  const heroLatest = heroActuals.at(-1);

  // Coverage matrix cells: rows = COUNTRY×INDICATOR variables, cols = top institutions.
  // Build a Set of "forecasterId-variableId" for fast lookup.
  const coverageSet = new Set(
    coverageRows.map((r) => `${r.forecasterId}-${r.variableId}`),
  );
  const matrixInstitutions = institutions.slice(0, 5);
  // Top rows: pick one variable per indicator+country combo (up to 8 rows so the grid stays compact).
  const matrixRows = COVERAGE_INDICATORS.flatMap((indicator) =>
    COVERAGE_COUNTRIES.slice(0, 4).map((country) => ({
      indicator,
      country,
      variable: coverageVariables.find(
        (v) => v.name === indicator && v.countryCode === country.code,
      ),
    })),
  )
    .filter((row) => Boolean(row.variable))
    .slice(0, 12);

  const matrixCells = matrixRows.map((row) =>
    matrixInstitutions.map((inst) =>
      coverageSet.has(`${inst.id}-${row.variable?.id}`),
    ),
  );

  // Prism dial signature: weights derived from coverage breadth across the 8 prism wedges.
  const dialMax = institutions.reduce(
    (max, row) => Math.max(max, Number(row.forecastCount)),
    1,
  );
  const dialWeights = institutions
    .slice(0, 8)
    .map((inst) => Number(inst.forecastCount) / dialMax);
  const dialLabels = institutions.slice(0, 8).map((inst) => inst.name);

  // Sparkline cards: build per-variable sequences (deduped, last 14 periods).
  const sparkCards = featuredVariables.map((variable) => {
    const list = (actualsByVariable.get(variable.id) ?? [])
      .slice()
      .sort((a, b) => a.targetPeriod.localeCompare(b.targetPeriod));
    const map = new Map<string, typeof list[number]>();
    for (const a of list) if (!map.has(a.targetPeriod)) map.set(a.targetPeriod, a);
    const points = Array.from(map.values()).slice(-14);
    return {
      variable,
      points,
      latest: points.at(-1),
    };
  });

  return (
    <div className="space-y-24">
      {/* HERO — masthead + lead article preview, side by side */}
      <section className="prism-backdrop relative overflow-hidden rounded-[var(--r-lg)] border border-border bg-surface px-8 pb-10 pt-9 lg:px-12 lg:pt-12">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <div>
            <h1
              className="text-[60px] leading-[1.02] tracking-tight text-ink"
              style={{ fontFamily: "var(--font-display)" }}
            >
              The forecast record,
              <br />
              <span className="italic text-cobalt">finally checkable.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-muted">
              Farfield tracks every public economic forecast against the actual outcome,
              with full source provenance. We publish what happened, who said it, and how
              the record changed over time.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/articles" className="btn-primary">
                Read analysis
              </Link>
              <Link href="/variables" className="btn-secondary">
                Browse indicators
              </Link>
              <Link href="/forecasters" className="btn-secondary">
                See forecasters
              </Link>
            </div>

            <div className="mt-10 grid grid-cols-2 gap-5 border-t border-border pt-7 sm:grid-cols-4">
              {[
                ["Forecasts tracked", totalTracked.toLocaleString()],
                ["Scored rows", totalScored.toLocaleString()],
                ["Source families", String(sourceCount)],
                ["Latest import", latestSource?.vintageLabel ?? "Pending"],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
                    {label}
                  </p>
                  <p
                    className="mt-1.5 font-mono text-2xl font-bold leading-tight text-ink tabular-nums"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Hero data panel — World GDP actuals chart */}
          {heroVariable && heroBars.length > 0 && (
            <div className="rounded-[var(--r-md)] border border-border bg-bg-alt/60 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-cobalt">
                    Live · Actuals only
                  </p>
                  <h3
                    className="mt-2 text-2xl leading-tight text-ink"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {COUNTRY_LABELS[heroVariable.countryCode] ?? heroVariable.countryCode}{" "}
                    {heroVariable.name}
                  </h3>
                </div>
                {heroLatest && (
                  <div className="text-right">
                    <p
                      className="font-mono text-3xl font-bold leading-none text-ink tabular-nums"
                    >
                      {formatActual(heroLatest.value, heroVariable.unit)}
                    </p>
                    <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted">
                      {heroLatest.targetPeriod}
                    </p>
                  </div>
                )}
              </div>
              <div className="mt-5">
                <ActualsBars data={heroBars} unit={heroVariable.unit} height={150} />
              </div>
              <div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-4 text-xs text-muted">
                <span>Source: {heroLatest?.source ?? "—"}</span>
                <Link
                  href={`/variables/${heroVariable.slug}`}
                  className="font-semibold text-cobalt hover:text-cobalt-dark"
                >
                  Open full record →
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* TODAY IN FARFIELD — editorial */}
      <section>
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="section-label">Today in Farfield</p>
            <h2
              className="mt-2 text-3xl tracking-tight text-ink"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Analysis from the forecast record
            </h2>
          </div>
          <Link href="/articles" className="text-sm font-semibold text-cobalt hover:text-cobalt-dark">
            All articles →
          </Link>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
          {leadArticle && (
            <Link href={`/articles/${leadArticle.slug}`} className="group">
              <Card padding="none" raised className="h-full overflow-hidden transition-colors group-hover:border-cobalt">
                <ArticleVisual article={leadArticle} size="lg" />
                <div className="p-7">
                  <div className="flex flex-wrap items-center gap-3 text-xs font-bold uppercase tracking-widest text-muted">
                    <span className="text-cobalt">{leadArticle.label}</span>
                    <span>{leadArticle.tag}</span>
                    <span>{leadArticle.readingTime}</span>
                  </div>
                  <h3
                    className="mt-4 max-w-2xl text-4xl leading-tight tracking-tight text-ink group-hover:text-cobalt"
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
                <Card padding="none" className="grid overflow-hidden transition-colors group-hover:border-cobalt sm:grid-cols-[155px_1fr] lg:grid-cols-1 xl:grid-cols-[155px_1fr]">
                  <ArticleVisual article={article} />
                  <div className="p-5">
                    <p className="text-xs font-bold uppercase tracking-widest text-cobalt">
                      {article.label}
                    </p>
                    <h3
                      className="mt-3 text-xl leading-tight text-ink group-hover:text-cobalt"
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

      {/* SIGNAL GRID — sparkline-driven variable cards */}
      <section>
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="section-label">Signal Grid</p>
            <h2
              className="mt-2 text-3xl tracking-tight text-ink"
              style={{ fontFamily: "var(--font-display)" }}
            >
              What the actuals are doing
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
              Each card is the public actuals series for one variable. Forecast values stay
              with subscribers.
            </p>
          </div>
          <Link href="/variables" className="text-sm font-semibold text-cobalt hover:text-cobalt-dark">
            All variables →
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sparkCards.map(({ variable, points, latest }) => {
            const values = points.map((p) => parseFloat(p.value));
            const latestNum = latest ? parseFloat(latest.value) : null;
            const isPct = variable.unit.includes("%");
            const positive = latestNum !== null && latestNum >= 0;
            return (
              <Link
                key={variable.id}
                href={`/variables/${variable.slug}`}
                className="group block"
              >
                <Card padding="md" className="h-full transition-colors group-hover:border-cobalt">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
                        {COUNTRY_LABELS[variable.countryCode] ?? variable.countryCode}
                      </p>
                      <h3 className="mt-1.5 text-base font-semibold leading-snug text-ink group-hover:text-cobalt">
                        {variable.name}
                      </h3>
                    </div>
                    <span className="rounded-full border border-border bg-bg-alt px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
                      {latest?.source ?? "Pending"}
                    </span>
                  </div>
                  <div className="mt-4">
                    <Sparkline
                      values={values}
                      width={260}
                      height={56}
                      stroke={positive ? "var(--cobalt)" : "var(--coral)"}
                      zeroBaseline
                    />
                  </div>
                  <div className="mt-4 flex items-end justify-between border-t border-border pt-3">
                    {latestNum !== null ? (
                      <p
                        className={`font-mono text-3xl font-bold leading-none tabular-nums ${
                          positive ? "text-cobalt" : "text-coral"
                        }`}
                      >
                        {latestNum > 0 ? "+" : ""}
                        {latestNum.toFixed(1)}
                        {isPct ? "%" : ""}
                      </p>
                    ) : (
                      <p className="text-sm text-muted">Awaiting actual</p>
                    )}
                    <div className="text-right">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
                        {latest?.targetPeriod ?? "—"}
                      </p>
                      <p className="mt-0.5 text-[10px] text-muted">{variable.unit}</p>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      {/* COVERAGE MATRIX — visual demonstration of source breadth */}
      <section className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
        <div>
          <p className="section-label">Coverage</p>
          <h2
            className="mt-2 text-3xl tracking-tight text-ink"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Who covers what
          </h2>
          <p className="mt-3 max-w-xl text-base leading-7 text-muted">
            Five major institutions, five core macro indicators, top economies. A filled cell
            means that institution publishes a tracked forecast for that variable. Public
            users see the shape; values stay with subscribers.
          </p>
          <Link
            href="/forecasters"
            className="mt-5 inline-flex text-sm font-semibold text-cobalt hover:text-cobalt-dark"
          >
            Open the directory →
          </Link>
        </div>
        <Card padding="lg" raised>
          {matrixCells.length > 0 ? (
            <CoverageMatrix
              rowLabels={matrixRows.map(
                (r) => `${r.country.code} · ${r.indicator.split(" ")[0]}`,
              )}
              colLabels={matrixInstitutions.map((i) => i.name)}
              cells={matrixCells}
            />
          ) : (
            <p className="text-sm text-muted">Coverage data unavailable.</p>
          )}
        </Card>
      </section>

      {/* INSTITUTION SPOTLIGHT — prism dial + cards */}
      <section className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
        <div>
          <p className="section-label">Institution Signature</p>
          <h2
            className="mt-2 text-3xl leading-tight tracking-tight text-ink"
            style={{ fontFamily: "var(--font-display)" }}
          >
            The first eight in the record
          </h2>
          <p className="mt-3 text-base leading-7 text-muted">
            Each wedge represents one institution. Length is forecast-rows-tracked,
            normalised to the busiest publisher. The shape changes as new institutions ramp
            up.
          </p>
          <div className="mt-7">
            {dialWeights.length > 0 && (
              <PrismDial weights={dialWeights} labels={dialLabels} size={220} />
            )}
          </div>
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
                className="card group block px-5 py-4 transition-colors hover:border-cobalt"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-base font-semibold text-ink group-hover:text-cobalt">
                    {institution.name}
                  </h3>
                  <span className="badge badge-cobalt">
                    {statusLabel(scoredCount, forecastCount)}
                  </span>
                </div>
                <div className="mt-5 grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="font-mono text-xl font-bold text-ink tabular-nums">
                      {forecastCount.toLocaleString()}
                    </p>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted">
                      Forecasts
                    </p>
                  </div>
                  <div>
                    <p className="font-mono text-xl font-bold text-ink tabular-nums">
                      {variableCount.toLocaleString()}
                    </p>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted">
                      Variables
                    </p>
                  </div>
                  <div>
                    <p className="font-mono text-xl font-bold text-ink tabular-nums">
                      {countryCount.toLocaleString()}
                    </p>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted">
                      Geos
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* LEADING INDICATORS + FORECASTER SPOTLIGHT */}
      <section className="grid gap-8 lg:grid-cols-[1fr_0.8fr]">
        <div>
          <div className="mb-5 flex items-end justify-between gap-3">
            <div>
              <p className="section-label">Leading Indicators</p>
              <h2
                className="mt-2 text-3xl tracking-tight text-ink"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Signals before the data lands
              </h2>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {leadingIndicators.map((article) => (
              <Link key={article.slug} href={`/articles/${article.slug}`} className="group">
                <Card padding="none" className="h-full overflow-hidden transition-colors group-hover:border-cobalt">
                  <ArticleVisual article={article} />
                  <div className="p-5">
                    <p className="text-xs font-bold uppercase tracking-widest text-cobalt">
                      {article.tag}
                    </p>
                    <h3
                      className="mt-3 text-xl leading-tight text-ink group-hover:text-cobalt"
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
            <p className="section-label mb-5">Forecaster Spotlight</p>
            <Link href={`/articles/${forecasterSpotlight.slug}`} className="group">
              <Card padding="none" raised className="h-full overflow-hidden transition-colors group-hover:border-cobalt">
                <ArticleVisual article={forecasterSpotlight} size="lg" />
                <div className="p-6">
                  <p className="text-xs font-bold uppercase tracking-widest text-cobalt">
                    Regular profile
                  </p>
                  <h3
                    className="mt-3 text-3xl leading-tight text-ink group-hover:text-cobalt"
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

      {/* FARFIELD BLOG */}
      <section>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="section-label">Farfield Blog</p>
            <h2
              className="mt-2 text-3xl tracking-tight text-ink"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Notes from the data room
            </h2>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {blogArticles.map((article) => (
            <Link key={article.slug} href={`/articles/${article.slug}`} className="group">
              <Card padding="md" className="h-full transition-colors group-hover:border-cobalt">
                <p className="text-xs font-bold uppercase tracking-widest text-cobalt">
                  {article.tag}
                </p>
                <h3
                  className="mt-4 text-lg leading-tight text-ink group-hover:text-cobalt"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {article.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-muted">{article.dek}</p>
                <p className="mt-6 text-xs font-semibold uppercase tracking-widest text-subtle">
                  {article.readingTime}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* METHODOLOGY + SUBSCRIBER LAYER */}
      <section className="grid gap-6 lg:grid-cols-2">
        <Card padding="lg" className="border-l-4 border-l-cobalt">
          <p className="section-label">Methodology</p>
          <h2
            className="mt-2 text-3xl leading-tight text-ink"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Built around exact source links
          </h2>
          <p className="mt-3 text-base leading-7 text-muted">
            Every forecast row keeps its source document, vintage label, and ingestion run.
            Every score links to the exact actual release it was tested against. The record
            is checkable from the cell up.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {methodologyNotes.map((note) => (
              <Link key={note.slug} href={`/methodology/${note.slug}`} className="group">
                <div className="h-full border-t border-border pt-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-cobalt">
                    {note.tag}
                  </p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-ink group-hover:text-cobalt">
                    {note.title}
                  </p>
                </div>
              </Link>
            ))}
          </div>
          <Link
            href="/methodology"
            className="mt-8 inline-flex text-sm font-semibold text-cobalt hover:text-cobalt-dark"
          >
            View methodology →
          </Link>
        </Card>

        <Card padding="lg" className="bg-bg-alt">
          <p className="section-label">Subscriber Layer</p>
          <h2
            className="mt-2 text-3xl leading-tight text-ink"
            style={{ fontFamily: "var(--font-display)" }}
          >
            What stays locked
          </h2>
          <p className="mt-3 text-base leading-7 text-muted">
            Public pages prove the record exists. Subscriber pages carry the live values.
          </p>
          <div className="mt-6 grid gap-3">
            {[
              "Current consensus values and as-of history",
              "Forecaster-by-forecaster series",
              "Vintage history and revision paths",
              "Dispersion, premium rankings, and exports",
            ].map((item) => (
              <div
                key={item}
                className="flex items-center justify-between border-b border-border pb-3"
              >
                <span className="text-sm font-medium text-ink">{item}</span>
                <span className="badge badge-neutral">Locked</span>
              </div>
            ))}
          </div>
          <Link
            href="/pricing"
            className="mt-7 inline-flex text-sm font-semibold text-cobalt hover:text-cobalt-dark"
          >
            See subscriber access →
          </Link>
        </Card>
      </section>
    </div>
  );
}
