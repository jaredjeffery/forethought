// Public forecaster directory with non-leaky coverage signals.

import { db } from "@/lib/db";
import { forecasters, forecasts, forecastScores, variables } from "@/lib/db/schema";
import { eq, countDistinct, desc } from "drizzle-orm";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { SectionLabel } from "@/components/ui/SectionLabel";

export const revalidate = 3600;

async function getForecasters() {
  return db
    .select({
      id: forecasters.id,
      name: forecasters.name,
      slug: forecasters.slug,
      type: forecasters.type,
      forecastCount: countDistinct(forecasts.id),
      scoredCount: countDistinct(forecastScores.id),
      variableCount: countDistinct(forecasts.variableId),
      countryCount: countDistinct(variables.countryCode),
    })
    .from(forecasters)
    .leftJoin(forecasts, eq(forecasts.forecasterId, forecasters.id))
    .leftJoin(forecastScores, eq(forecastScores.forecastId, forecasts.id))
    .leftJoin(variables, eq(variables.id, forecasts.variableId))
    .groupBy(forecasters.id, forecasters.name, forecasters.slug, forecasters.type)
    .orderBy(desc(countDistinct(forecastScores.id)), forecasters.name);
}

function rankedStatus(scoredCount: number, forecastCount: number) {
  if (scoredCount >= 100) return "Ranked benchmark";
  if (scoredCount > 0) return "Building track record";
  if (forecastCount > 0) return "Tracked, awaiting scores";
  return "No tracked forecasts";
}

export default async function ForecastersPage() {
  const rows = await getForecasters();
  const institutions = rows.filter((r) => r.type === "INSTITUTION");
  const analysts = rows.filter((r) => r.type === "ANALYST");

  function ForecasterTable({ items }: { items: typeof rows }) {
    return (
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="min-w-full table-fixed">
            <thead className="border-b border-border bg-bg">
              <tr className="text-xs font-bold text-muted uppercase">
                <th className="w-[34%] px-6 py-3 text-left">Name</th>
                <th className="w-[22%] px-6 py-3 text-left">Status</th>
                <th className="w-[14%] px-6 py-3 text-right">Forecasts</th>
                <th className="w-[14%] px-6 py-3 text-right">Scored</th>
                <th className="w-[16%] px-6 py-3 text-right">Coverage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((f) => {
                const forecastCount = Number(f.forecastCount);
                const scoredCount = Number(f.scoredCount);
                const variableCount = Number(f.variableCount);
                const countryCount = Number(f.countryCount);

                return (
                  <tr key={f.id} className="hover:bg-bg transition-colors group">
                    <td className="px-6 py-4">
                      <Link
                        href={`/forecasters/${f.slug}`}
                        className="text-base font-semibold text-ink group-hover:text-accent transition-colors"
                      >
                        {f.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted">
                      {rankedStatus(scoredCount, forecastCount)}
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-base tabular-nums text-muted">
                      {forecastCount > 0 ? forecastCount : "-"}
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-base tabular-nums text-muted">
                      {scoredCount > 0 ? scoredCount : "-"}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-muted">
                      {variableCount > 0
                        ? `${variableCount} vars / ${countryCount} geos`
                        : "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-12">
      <div>
        <h1
          className="text-5xl text-ink tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Forecasters
        </h1>
        <div className="mt-2 h-[3px] w-12 bg-accent" />
        <p className="mt-5 max-w-3xl text-base leading-7 text-muted">
          Farfield tracks public institutional forecasts and shows public coverage signals here.
          Full accuracy, consensus, and vintage detail stay locked for subscribers.
        </p>
      </div>

      <section>
        <SectionLabel>Institutions</SectionLabel>
        <ForecasterTable items={institutions} />
      </section>

      {analysts.length > 0 && (
        <section>
          <SectionLabel>Independent Analysts</SectionLabel>
          <ForecasterTable items={analysts} />
        </section>
      )}
    </div>
  );
}
