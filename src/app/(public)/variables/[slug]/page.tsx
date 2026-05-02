// /variables/[slug] - public variable detail page with actuals and locked premium modules.

import { db } from "@/lib/db";
import { variables, forecasts, actuals } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ForecastChart, type DataPoint } from "@/components/ForecastChart";
import { Card } from "@/components/ui/Card";
import { SectionLabel } from "@/components/ui/SectionLabel";

export const revalidate = 3600;

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

  const allPeriods = [...new Set(actualRows.map((a) => a.targetPeriod))].sort();

  const actualByPeriod = new Map(actualRows.map((a) => [a.targetPeriod, parseFloat(a.value)]));

  const chartData: DataPoint[] = allPeriods.map((period) => {
    const row: DataPoint = { period };
    row.actual = actualByPeriod.get(period) ?? null;
    return row;
  });

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
        <SectionLabel>Actuals History</SectionLabel>
        <Card
          padding="none"
          raised
          className="pt-6 pb-4 px-4"
          style={{ borderRadius: "var(--radius-lg)" } as React.CSSProperties}
        >
          <ForecastChart data={chartData} series={[]} unit={variable.unit} height={480} />
        </Card>
      </section>

      {/* Actuals strip — compact horizontal */}
      <section>
        <SectionLabel>Forecast Coverage</SectionLabel>
        <Card padding="md" className="border-l-4 border-l-accent">
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <p className="text-xs font-bold tracking-wider text-muted uppercase">Forecasters</p>
              <p className="mt-1 text-2xl font-semibold text-ink">{forecastCoverage.forecasterCount}</p>
            </div>
            <div>
              <p className="text-xs font-bold tracking-wider text-muted uppercase">Target periods</p>
              <p className="mt-1 text-2xl font-semibold text-ink">{forecastCoverage.targetPeriodCount}</p>
            </div>
            <div>
              <p className="text-xs font-bold tracking-wider text-muted uppercase">Premium data</p>
              <p className="mt-1 text-sm text-muted">
                Forecast values, consensus history, dispersion, and exports require a subscriber account.
              </p>
            </div>
          </div>
        </Card>
      </section>

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

      {actualRows.length === 0 && (
        <p className="text-base text-muted py-8">
          No data available yet for this variable. Check back after the next data ingestion.
        </p>
      )}
    </div>
  );
}
