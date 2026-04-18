// /variables/[id] — variable detail page.

import { db } from "@/lib/db";
import { variables, forecasts, actuals, forecasters, forecastScores, consensusForecasts } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ForecastChart, type DataPoint } from "@/components/ForecastChart";

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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold tracking-widest text-accent uppercase mb-5">
      {children}
    </p>
  );
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
  for (const f of forecastRows) {
    forecasterSet.set(f.forecasterSlug, f.forecasterName);
  }
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
    <div className="space-y-14">
      <nav className="text-sm text-muted flex items-center gap-1.5">
        <Link href="/variables" className="hover:text-ink transition-colors">Variables</Link>
        <span>›</span>
        <span className="text-ink">{variable.name} — {variable.countryCode}</span>
      </nav>

      <div className="flex items-start justify-between flex-wrap gap-6">
        <div>
          <p className="text-xs font-bold tracking-widest text-accent uppercase mb-2">{variable.category}</p>
          <h1
            className="text-5xl text-ink tracking-tight"
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
          <div className="border-2 border-border rounded-lg px-7 py-5 bg-tinted text-right">
            <p className="text-xs font-bold tracking-wider text-muted uppercase">Latest actual</p>
            <p
              className={`mt-2 text-4xl font-bold tabular-nums ${parseFloat(latestActual.value) >= 0 ? "text-signal-green" : "text-signal-red"}`}
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {parseFloat(latestActual.value) > 0 ? "+" : ""}
              {parseFloat(latestActual.value).toFixed(2)}
              {pctUnit ? "%" : ""}
            </p>
            <p className="mt-1.5 text-sm text-muted">{latestActual.targetPeriod}</p>
          </div>
        )}
      </div>

      <section>
        <SectionLabel>Forecast History vs Actuals</SectionLabel>
        <div className="border border-border rounded-lg p-5 bg-tinted">
          <ForecastChart data={chartData} series={allSeries} unit={variable.unit} />
        </div>
      </section>

      {actualRows.length > 0 && (
        <section>
          <SectionLabel>Actuals</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {actualRows.slice(-12).map((a) => {
              const val = parseFloat(a.value);
              return (
                <div key={a.id} className="px-4 py-3 border border-border rounded-lg bg-tinted text-center min-w-[72px]">
                  <p className="text-[10px] font-bold tracking-wide text-muted uppercase">{a.targetPeriod}</p>
                  <p
                    className={`mt-1.5 text-base font-bold tabular-nums ${val >= 0 ? "text-signal-green" : "text-signal-red"}`}
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

      {scoredForecasts.length > 0 && (
        <section>
          <SectionLabel>Forecast Accuracy</SectionLabel>
          <div className="border border-border rounded-lg overflow-x-auto">
            <table className="min-w-full">
              <thead className="border-b border-border bg-tinted">
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
                  <tr key={f.id} className="hover:bg-tinted transition-colors">
                    <td className="px-5 py-3.5">
                      <Link href={`/forecasters/${f.forecasterSlug}`} className="text-base font-medium text-ink hover:text-accent transition-colors">
                        {f.forecasterName}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-sm font-medium tracking-wide text-muted">{f.targetPeriod}</td>
                    <td className="px-5 py-3.5 text-right text-base tabular-nums" style={{ fontFamily: "var(--font-mono)" }}>
                      {parseFloat(f.value).toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5 text-right text-base tabular-nums" style={{ fontFamily: "var(--font-mono)" }}>
                      {f.absoluteError != null ? parseFloat(f.absoluteError).toFixed(2) : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-right text-base tabular-nums" style={{ fontFamily: "var(--font-mono)" }}>
                      {f.scoreVsConsensus != null ? (
                        <span className={parseFloat(f.scoreVsConsensus) < 0 ? "text-signal-green font-medium" : "text-signal-red"}>
                          {parseFloat(f.scoreVsConsensus) > 0 ? "+" : ""}
                          {parseFloat(f.scoreVsConsensus).toFixed(2)}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-center text-base font-medium" style={{ fontFamily: "var(--font-mono)" }}>
                      {f.directionalCorrect === null
                        ? <span className="text-muted">—</span>
                        : f.directionalCorrect
                          ? <span className="text-signal-green">✓</span>
                          : <span className="text-signal-red">✗</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
