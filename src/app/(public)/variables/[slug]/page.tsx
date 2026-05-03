// /variables/[slug] - public variable detail page with actuals and locked premium modules.

import { db } from "@/lib/db";
import { variables, forecasts, actuals } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ForecastChart, type DataPoint } from "@/components/ForecastChart";
import { ActualsBars } from "@/components/viz/ActualsBars";
import { Sparkline } from "@/components/viz/Sparkline";
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

  return {
    variable,
    actualRows,
    forecastCoverage: {
      forecasterCount: new Set(coverageRows.map((row) => row.forecasterId)).size,
      targetPeriodCount: new Set(coverageRows.map((row) => row.targetPeriod)).size,
    },
  };
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function VariableDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const data = await getVariableData(slug);

  if (!data) notFound();

  const { variable, actualRows, forecastCoverage } = data;

  // Dedup by target period (latest published wins).
  const actualByPeriod = new Map<string, typeof actualRows[number]>();
  for (const a of actualRows) {
    actualByPeriod.set(a.targetPeriod, a);
  }
  const sortedActuals = Array.from(actualByPeriod.values()).sort((a, b) =>
    a.targetPeriod.localeCompare(b.targetPeriod),
  );

  const allPeriods = sortedActuals.map((a) => a.targetPeriod);
  const chartData: DataPoint[] = allPeriods.map((period) => ({
    period,
    actual: actualByPeriod.get(period)
      ? parseFloat(actualByPeriod.get(period)!.value)
      : null,
  }));

  // Source breakdown
  const sourceCounts = new Map<string, number>();
  for (const a of actualRows) {
    sourceCounts.set(a.source, (sourceCounts.get(a.source) ?? 0) + 1);
  }
  const sourcesByCount = Array.from(sourceCounts.entries()).sort(
    (a, b) => b[1] - a[1],
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
  const barData = sortedActuals
    .slice(-16)
    .map((a) => ({ period: a.targetPeriod, value: parseFloat(a.value) }));

  const countryLabel = COUNTRY_LABELS[variable.countryCode] ?? variable.countryCode;

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

      {/* ACTUALS BARS — punchy at-a-glance trend */}
      {barData.length > 0 && (
        <section>
          <SectionLabel>At a Glance</SectionLabel>
          <Card padding="lg">
            <ActualsBars data={barData} unit={variable.unit} height={160} />
          </Card>
        </section>
      )}

      {/* FULL HISTORY CHART */}
      {chartData.length > 0 && (
        <section>
          <SectionLabel>Actuals History</SectionLabel>
          <Card padding="none" raised>
            <div className="px-4 pt-6 pb-4">
              <ForecastChart
                data={chartData}
                series={[]}
                unit={variable.unit}
                height={420}
              />
            </div>
          </Card>
        </section>
      )}

      {/* COVERAGE + SOURCES */}
      <section className="grid gap-4 lg:grid-cols-[0.6fr_1.4fr]">
        <Card padding="lg" className="border-l-4 border-l-cobalt">
          <SectionLabel>Forecast Coverage</SectionLabel>
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
                Target periods
              </p>
              <p className="mt-1 font-mono text-3xl font-bold tabular-nums text-ink">
                {forecastCoverage.targetPeriodCount}
              </p>
            </div>
          </div>
          <p className="mt-5 text-sm leading-6 text-muted">
            Forecast values, consensus history, dispersion, and exports require a subscriber
            account.
          </p>
          <Link
            href="/pricing"
            className="mt-4 inline-flex text-sm font-semibold text-cobalt hover:text-cobalt-dark"
          >
            See subscriber access →
          </Link>
        </Card>

        <Card padding="lg">
          <SectionLabel>Sources Behind the Actuals</SectionLabel>
          {sourcesByCount.length > 0 ? (
            <div className="space-y-3">
              {sourcesByCount.map(([source, count]) => {
                const max = sourcesByCount[0][1];
                const ratio = (count / max) * 100;
                return (
                  <div key={source}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-semibold text-ink">{source}</span>
                      <span className="font-mono text-xs tabular-nums text-muted">
                        {count} releases
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-bg-alt">
                      <div
                        className="h-full rounded-full bg-cobalt"
                        style={{ width: `${ratio}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted">No actual sources recorded yet.</p>
          )}
        </Card>
      </section>

      {/* RECENT ACTUALS GRID */}
      {sortedActuals.length > 0 && (
        <section>
          <SectionLabel>Recent Actuals</SectionLabel>
          <div className="grid gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
            {sortedActuals.slice(-14).reverse().map((a) => {
              const val = parseFloat(a.value);
              return (
                <div key={a.id} className="card px-4 py-3 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
                    {a.targetPeriod}
                  </p>
                  <p
                    className={`mt-2 font-mono text-base font-bold tabular-nums ${
                      val >= 0 ? "text-cobalt" : "text-coral"
                    }`}
                  >
                    {val > 0 ? "+" : ""}
                    {val.toFixed(1)}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* SUBSCRIBER PREVIEW */}
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

      {sortedActuals.length === 0 && (
        <p className="py-8 text-base text-muted">
          No data available yet for this variable. Check back after the next data ingestion.
        </p>
      )}
    </div>
  );
}
