// /variables/[id] — variable detail page.
// Shows forecast history, actuals, consensus, and accuracy scores.
// Server component: data fetched at render time. Chart is a client component.

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

  // Forecasts with forecaster info and scores
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

  // Actuals
  const actualRows = await db
    .select()
    .from(actuals)
    .where(eq(actuals.variableId, id))
    .orderBy(actuals.targetPeriod);

  // Consensus
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

  // Build chart data: one row per period, columns for each forecaster + actual
  const allPeriods = [
    ...new Set([
      ...actualRows.map((a) => a.targetPeriod),
      ...forecastRows.map((f) => f.targetPeriod),
    ]),
  ].sort();

  // Unique forecasters
  const forecasterSet = new Map<string, string>(); // slug → name
  for (const f of forecastRows) {
    forecasterSet.set(f.forecasterSlug, f.forecasterName);
  }
  const seriesList = Array.from(forecasterSet.entries()).map(([slug, name]) => ({
    slug, name, color: "",
  }));

  // Build period → actual lookup
  const actualByPeriod = new Map(actualRows.map((a) => [a.targetPeriod, parseFloat(a.value)]));
  const consensusByPeriod = new Map(consensusRows.map((c) => [c.targetPeriod, parseFloat(c.simpleMean)]));

  // Find the latest vintage published by each forecaster for this variable.
  // The chart shows only that vintage — "what does the IMF currently say about 2027?"
  // not a palimpsest of every past round.
  const latestVintageByForecaster = new Map<string, string>(); // slug → max vintage
  for (const f of forecastRows) {
    const current = latestVintageByForecaster.get(f.forecasterSlug);
    if (f.vintage && (!current || f.vintage > current)) {
      latestVintageByForecaster.set(f.forecasterSlug, f.vintage);
    }
  }

  const latestForecastByForecasterPeriod = new Map<string, number>(); // "slug|period" → value
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

  // All series including consensus
  const allSeries = [
    ...(consensusRows.length > 0 ? [{ slug: "consensus", name: "Consensus", color: "" }] : []),
    ...seriesList,
  ];

  // Scored forecasts for the accuracy table (only those with a score)
  const scoredForecasts = forecastRows.filter((f) => f.absoluteError !== null);

  return (
    <div className="space-y-10">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500">
        <Link href="/variables" className="hover:text-gray-700">Variables</Link>
        <span className="mx-2">›</span>
        <span className="text-gray-900">{variable.name} — {variable.countryCode}</span>
      </nav>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {variable.name}
          <span className="ml-2 text-lg font-normal text-gray-500">{variable.countryCode}</span>
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {variable.unit} · {variable.frequency}
          {variable.description && ` · ${variable.description}`}
        </p>
      </div>

      {/* Chart */}
      <section>
        <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
          Forecast history vs actuals
        </h2>
        <ForecastChart data={chartData} series={allSeries} unit={variable.unit} />
      </section>

      {/* Actuals table */}
      {actualRows.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
            Actuals
          </h2>
          <div className="flex flex-wrap gap-3">
            {actualRows.slice(-10).map((a) => (
              <div key={a.id} className="px-3 py-2 border border-gray-200 rounded-lg text-center">
                <p className="text-xs text-gray-500">{a.targetPeriod}</p>
                <p className="text-lg font-semibold tabular-nums">
                  {parseFloat(a.value).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Accuracy table */}
      {scoredForecasts.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
            Forecast accuracy
          </h2>
          <div className="border border-gray-200 rounded-lg overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Forecaster</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Period</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Forecast</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Abs. error</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">vs consensus</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Direction</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {scoredForecasts.map((f) => (
                  <tr key={f.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/forecasters/${f.forecasterSlug}`} className="hover:underline">
                        {f.forecasterName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{f.targetPeriod}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {parseFloat(f.value).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {f.absoluteError != null ? parseFloat(f.absoluteError).toFixed(2) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {f.scoreVsConsensus != null ? (
                        <span className={parseFloat(f.scoreVsConsensus) < 0 ? "text-green-600" : "text-red-600"}>
                          {parseFloat(f.scoreVsConsensus) > 0 ? "+" : ""}
                          {parseFloat(f.scoreVsConsensus).toFixed(2)}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {f.directionalCorrect === null ? "—"
                        : f.directionalCorrect ? "✓" : "✗"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {forecastRows.length === 0 && actualRows.length === 0 && (
        <p className="text-sm text-gray-500 py-8">
          No data available yet for this variable. Check back after the next data ingestion.
        </p>
      )}
    </div>
  );
}
