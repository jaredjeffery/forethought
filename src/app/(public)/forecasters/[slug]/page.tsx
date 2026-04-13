// /forecasters/[slug] — institution or analyst profile page.
// Shows which variables are tracked, accuracy by variable, and recent forecasts.

import { db } from "@/lib/db";
import { forecasters, forecasts, variables, forecastScores } from "@/lib/db/schema";
import { eq, avg, count } from "drizzle-orm";
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

  // Accuracy by variable
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

  return { forecaster, accuracyByVariable };
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function ForecasterProfilePage({ params }: PageProps) {
  const { slug } = await params;
  const data = await getForecasterData(slug);

  if (!data) notFound();

  const { forecaster, accuracyByVariable } = data;

  const totalForecasts = accuracyByVariable.reduce((s, r) => s + Number(r.forecastCount), 0);
  const scoredRows = accuracyByVariable.filter((r) => r.avgAbsoluteError != null);
  const overallAvgError = scoredRows.length > 0
    ? scoredRows.reduce((s, r) => s + parseFloat(r.avgAbsoluteError!), 0) / scoredRows.length
    : null;

  return (
    <div className="space-y-10">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500">
        <Link href="/forecasters" className="hover:text-gray-700">Forecasters</Link>
        <span className="mx-2">›</span>
        <span className="text-gray-900">{forecaster.name}</span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{forecaster.name}</h1>
          <p className="mt-1 text-sm text-gray-500 capitalize">{forecaster.type.toLowerCase()}</p>
        </div>
        <div className="flex gap-6 text-right">
          <div>
            <p className="text-xs text-gray-500">Forecasts</p>
            <p className="text-2xl font-semibold tabular-nums">{totalForecasts || "—"}</p>
          </div>
          {overallAvgError !== null && (
            <div>
              <p className="text-xs text-gray-500">Avg abs. error</p>
              <p className="text-2xl font-semibold tabular-nums">{overallAvgError.toFixed(2)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Accuracy by variable */}
      {accuracyByVariable.length > 0 ? (
        <section>
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
            Accuracy by variable
          </h2>
          <div className="border border-gray-200 rounded-lg overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Variable</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Country</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Forecasts</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Avg abs. error</th>
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
                        : <span className="text-gray-400">—</span>
                      }
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
      ) : (
        <p className="text-sm text-gray-500 py-8">
          No forecasts from this institution yet. Check back after the next WEO data ingestion.
        </p>
      )}
    </div>
  );
}
