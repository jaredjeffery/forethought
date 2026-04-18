// /forecasters — list of all tracked forecasters with accuracy overview.

import { db } from "@/lib/db";
import { forecasters, forecasts, forecastScores } from "@/lib/db/schema";
import { eq, avg, count } from "drizzle-orm";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { SectionLabel } from "@/components/ui/SectionLabel";

export const revalidate = 3600;

async function getForecasters() {
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

  function ForecasterTable({ items }: { items: typeof rows }) {
    return (
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="border-b border-border bg-bg">
              <tr className="text-xs font-bold tracking-wider text-muted uppercase">
                <th className="text-left px-6 py-3 w-[60%]">Name</th>
                <th className="text-right px-6 py-3">Forecasts</th>
                <th className="text-right px-6 py-3">Avg error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((f) => (
                <tr key={f.id} className="hover:bg-bg transition-colors group">
                  <td className="px-6 py-4">
                    <Link
                      href={`/forecasters/${f.slug}`}
                      className="text-base font-semibold text-ink group-hover:text-accent transition-colors"
                    >
                      {f.name}
                    </Link>
                  </td>
                  <td
                    className="px-6 py-4 text-right text-base text-muted tabular-nums"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {Number(f.forecastCount) > 0 ? f.forecastCount : "—"}
                  </td>
                  <td
                    className="px-6 py-4 text-right text-base tabular-nums"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {f.avgAbsoluteError != null
                      ? parseFloat(f.avgAbsoluteError).toFixed(2)
                      : <span className="text-muted">—</span>}
                  </td>
                </tr>
              ))}
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
