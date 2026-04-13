// /forecasters — list of all tracked forecasters with accuracy overview.

import { db } from "@/lib/db";
import { forecasters, forecasts, forecastScores } from "@/lib/db/schema";
import { eq, avg, count } from "drizzle-orm";
import Link from "next/link";

export const revalidate = 3600;

async function getForecasters() {
  // Forecasters with aggregate accuracy stats
  const rows = await db
    .select({
      id: forecasters.id,
      name: forecasters.name,
      slug: forecasters.slug,
      type: forecasters.type,
      forecastCount: count(forecasts.id),
      avgAbsoluteError: avg(forecastScores.absoluteError),
    })
    .from(forecasters)
    .leftJoin(forecasts, eq(forecasts.forecasterId, forecasters.id))
    .leftJoin(forecastScores, eq(forecastScores.forecastId, forecasts.id))
    .groupBy(forecasters.id, forecasters.name, forecasters.slug, forecasters.type)
    .orderBy(forecasters.type, forecasters.name);

  return rows;
}

export default async function ForecastersPage() {
  const rows = await getForecasters();
  const institutions = rows.filter((r) => r.type === "INSTITUTION");
  const analysts = rows.filter((r) => r.type === "ANALYST");

  return (
    <div className="space-y-10">
      <h1 className="text-2xl font-semibold tracking-tight">Forecasters</h1>

      {/* Institutions */}
      <section>
        <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
          Institutions
        </h2>
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Forecasts</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Avg abs. error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {institutions.map((f) => (
                <tr key={f.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/forecasters/${f.slug}`} className="font-medium hover:underline">
                      {f.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-600">
                    {Number(f.forecastCount) > 0 ? f.forecastCount : "—"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {f.avgAbsoluteError != null
                      ? parseFloat(f.avgAbsoluteError).toFixed(2)
                      : <span className="text-gray-400">no data yet</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Analysts (Phase 2) */}
      {analysts.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
            Independent analysts
          </h2>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Forecasts</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Avg abs. error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {analysts.map((f) => (
                  <tr key={f.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/forecasters/${f.slug}`} className="font-medium hover:underline">
                        {f.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-600">
                      {f.forecastCount}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {f.avgAbsoluteError != null
                        ? parseFloat(f.avgAbsoluteError).toFixed(2)
                        : "—"
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
