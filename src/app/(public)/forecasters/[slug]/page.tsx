// /forecasters/[slug] — institution or analyst profile page.
// Shows accuracy by indicator, country, forecast horizon, and individual variable.

import { db } from "@/lib/db";
import { forecasters, forecasts, variables, forecastScores } from "@/lib/db/schema";
import { eq, avg, count, sql, and, isNotNull } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";

export const revalidate = 3600;

async function getForecasterData(slug: string) {
  const [forecaster] = await db
    .select()
    .from(forecasters)
    .where(eq(forecasters.slug, slug))
    .limit(1);

  if (!forecaster) return null;

  // Overall stats: total forecasts, scored count, bias, beat-consensus rate
  const [overallStats] = await db
    .select({
      scoredCount: count(forecastScores.id),
      avgBias: avg(forecastScores.percentageError),
      beatConsensusCount: sql<string>`COUNT(CASE WHEN ${forecastScores.scoreVsConsensus} < 0 THEN 1 END)`,
      vsConsensusTotal: sql<string>`COUNT(CASE WHEN ${forecastScores.scoreVsConsensus} IS NOT NULL THEN 1 END)`,
    })
    .from(forecasts)
    .innerJoin(forecastScores, eq(forecastScores.forecastId, forecasts.id))
    .where(eq(forecasts.forecasterId, forecaster.id));

  // Accuracy by indicator (variable name, aggregated across all countries)
  const accuracyByIndicator = await db
    .select({
      indicatorName: variables.name,
      scoredCount: count(forecastScores.id),
      avgAbsoluteError: avg(forecastScores.absoluteError),
      avgBias: avg(forecastScores.percentageError),
    })
    .from(forecasts)
    .innerJoin(variables, eq(forecasts.variableId, variables.id))
    .innerJoin(forecastScores, eq(forecastScores.forecastId, forecasts.id))
    .where(eq(forecasts.forecasterId, forecaster.id))
    .groupBy(variables.name)
    .orderBy(avg(forecastScores.absoluteError));

  // Accuracy by country (aggregated across all indicators)
  const accuracyByCountry = await db
    .select({
      countryCode: variables.countryCode,
      scoredCount: count(forecastScores.id),
      avgAbsoluteError: avg(forecastScores.absoluteError),
      avgBias: avg(forecastScores.percentageError),
    })
    .from(forecasts)
    .innerJoin(variables, eq(forecasts.variableId, variables.id))
    .innerJoin(forecastScores, eq(forecastScores.forecastId, forecasts.id))
    .where(eq(forecasts.forecasterId, forecaster.id))
    .groupBy(variables.countryCode)
    .orderBy(avg(forecastScores.absoluteError));

  // Accuracy by forecast horizon (target_year − vintage_year)
  const horizonExpr = sql<number>`CAST(${forecasts.targetPeriod} AS INTEGER) - CAST(SPLIT_PART(${forecasts.vintage}, '-', 1) AS INTEGER)`;
  const accuracyByHorizon = await db
    .select({
      horizon: horizonExpr,
      scoredCount: count(forecastScores.id),
      avgAbsoluteError: avg(forecastScores.absoluteError),
      avgBias: avg(forecastScores.percentageError),
    })
    .from(forecasts)
    .innerJoin(forecastScores, eq(forecastScores.forecastId, forecasts.id))
    .where(and(
      eq(forecasts.forecasterId, forecaster.id),
      isNotNull(forecasts.vintage),
    ))
    .groupBy(horizonExpr)
    .orderBy(horizonExpr);

  // Full breakdown: accuracy by individual variable (existing behaviour)
  const accuracyByVariable = await db
    .select({
      variableId: variables.id,
      variableName: variables.name,
      countryCode: variables.countryCode,
      forecastCount: count(forecasts.id),
      avgAbsoluteError: avg(forecastScores.absoluteError),
      avgScoreVsConsensus: avg(forecastScores.scoreVsConsensus),
    })
    .from(forecasts)
    .innerJoin(variables, eq(forecasts.variableId, variables.id))
    .leftJoin(forecastScores, eq(forecastScores.forecastId, forecasts.id))
    .where(eq(forecasts.forecasterId, forecaster.id))
    .groupBy(variables.id, variables.name, variables.countryCode)
    .orderBy(variables.countryCode, variables.name);

  return { forecaster, overallStats, accuracyByIndicator, accuracyByCountry, accuracyByHorizon, accuracyByVariable };
}

// ─── helpers ───────────────────────────────────────────────────────────────

function fmtError(v: string | null | undefined) {
  if (v == null) return "—";
  return parseFloat(v).toFixed(2);
}

function fmtBias(v: string | null | undefined) {
  if (v == null) return { label: "—", cls: "text-gray-400" };
  const n = parseFloat(v);
  const label = (n > 0 ? "+" : "") + n.toFixed(1) + "%";
  // positive bias = forecast too high (optimistic); negative = too low (pessimistic)
  const cls = Math.abs(n) < 0.5 ? "text-gray-700" : n > 0 ? "text-amber-600" : "text-blue-600";
  return { label, cls };
}

function horizonLabel(h: number) {
  if (h === 0) return "Current year";
  return `${h}-year ahead`;
}

// ─── page ──────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function ForecasterProfilePage({ params }: PageProps) {
  const { slug } = await params;
  const data = await getForecasterData(slug);

  if (!data) notFound();

  const { forecaster, overallStats, accuracyByIndicator, accuracyByCountry, accuracyByHorizon, accuracyByVariable } = data;

  const totalForecasts = accuracyByVariable.reduce((s, r) => s + Number(r.forecastCount), 0);
  const scoredCount = Number(overallStats.scoredCount);
  const bias = fmtBias(overallStats.avgBias);
  const beatCount = Number(overallStats.beatConsensusCount);
  const vsTotal = Number(overallStats.vsConsensusTotal);
  const beatRate = vsTotal > 0 ? Math.round((beatCount / vsTotal) * 100) : null;

  return (
    <div className="space-y-10">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500">
        <Link href="/forecasters" className="hover:text-gray-700">Forecasters</Link>
        <span className="mx-2">›</span>
        <span className="text-gray-900">{forecaster.name}</span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{forecaster.name}</h1>
          <p className="mt-1 text-sm text-gray-500 capitalize">{forecaster.type.toLowerCase()}</p>
        </div>
        <div className="flex gap-8 flex-wrap">
          <div className="text-right">
            <p className="text-xs text-gray-500">Forecasts</p>
            <p className="text-2xl font-semibold tabular-nums">{totalForecasts || "—"}</p>
          </div>
          {scoredCount > 0 && (
            <div className="text-right">
              <p className="text-xs text-gray-500">Scored</p>
              <p className="text-2xl font-semibold tabular-nums">{scoredCount}</p>
            </div>
          )}
          {overallStats.avgBias != null && (
            <div className="text-right">
              <p className="text-xs text-gray-500">Avg bias</p>
              <p className={`text-2xl font-semibold tabular-nums ${bias.cls}`}>{bias.label}</p>
            </div>
          )}
          {beatRate !== null && (
            <div className="text-right">
              <p className="text-xs text-gray-500">Beat consensus</p>
              <p className="text-2xl font-semibold tabular-nums">{beatRate}%</p>
            </div>
          )}
        </div>
      </div>

      {accuracyByIndicator.length === 0 ? (
        <p className="text-sm text-gray-500 py-8">
          No scored forecasts yet. Check back after the next data ingestion.
        </p>
      ) : (
        <>
          {/* By indicator */}
          <section>
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
              Accuracy by indicator
            </h2>
            <p className="text-xs text-gray-400 mb-3">
              Aggregated across all countries. Bias: positive = systematically too high; negative = too low.
            </p>
            <div className="border border-gray-200 rounded-lg overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Indicator</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Scored</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">MAE</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Bias</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {accuracyByIndicator.map((row) => {
                    const b = fmtBias(row.avgBias);
                    return (
                      <tr key={row.indicatorName} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{row.indicatorName}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-gray-600">{row.scoredCount}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{fmtError(row.avgAbsoluteError)}</td>
                        <td className={`px-4 py-3 text-right tabular-nums ${b.cls}`}>{b.label}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* By country */}
          <section>
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
              Accuracy by country
            </h2>
            <p className="text-xs text-gray-400 mb-3">
              Aggregated across all indicators. Sorted by MAE (most accurate first).
            </p>
            <div className="border border-gray-200 rounded-lg overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Country</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Scored</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">MAE</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Bias</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {accuracyByCountry.map((row) => {
                    const b = fmtBias(row.avgBias);
                    return (
                      <tr key={row.countryCode} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{row.countryCode}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-gray-600">{row.scoredCount}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{fmtError(row.avgAbsoluteError)}</td>
                        <td className={`px-4 py-3 text-right tabular-nums ${b.cls}`}>{b.label}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* By horizon */}
          {accuracyByHorizon.length > 0 && (
            <section>
              <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
                Accuracy by forecast horizon
              </h2>
              <p className="text-xs text-gray-400 mb-3">
                How far ahead was the forecast made? Accuracy typically degrades at longer horizons.
              </p>
              <div className="border border-gray-200 rounded-lg overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Horizon</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Scored</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">MAE</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Bias</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {accuracyByHorizon
                      .filter((row) => row.horizon >= 0 && row.horizon <= 5)
                      .map((row) => {
                        const b = fmtBias(row.avgBias);
                        return (
                          <tr key={row.horizon} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium">{horizonLabel(row.horizon)}</td>
                            <td className="px-4 py-3 text-right tabular-nums text-gray-600">{row.scoredCount}</td>
                            <td className="px-4 py-3 text-right tabular-nums">{fmtError(row.avgAbsoluteError)}</td>
                            <td className={`px-4 py-3 text-right tabular-nums ${b.cls}`}>{b.label}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Full breakdown by variable */}
          <section>
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
              Full breakdown
            </h2>
            <div className="border border-gray-200 rounded-lg overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Variable</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Country</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Forecasts</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">MAE</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">vs consensus</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {accuracyByVariable.map((row) => (
                    <tr key={row.variableId} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link href={`/variables/${row.variableId}`} className="hover:underline">
                          {row.variableName}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{row.countryCode}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{row.forecastCount}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {row.avgAbsoluteError != null
                          ? parseFloat(row.avgAbsoluteError).toFixed(2)
                          : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {row.avgScoreVsConsensus != null ? (
                          <span className={parseFloat(row.avgScoreVsConsensus) < 0 ? "text-green-600" : "text-red-600"}>
                            {parseFloat(row.avgScoreVsConsensus) > 0 ? "+" : ""}
                            {parseFloat(row.avgScoreVsConsensus).toFixed(2)}
                          </span>
                        ) : <span className="text-gray-400">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
