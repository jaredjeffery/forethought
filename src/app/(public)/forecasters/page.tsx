// /forecasters — list of all tracked forecasters with accuracy overview.

import { db } from "@/lib/db";
import { forecasters, forecasts, forecastScores } from "@/lib/db/schema";
import { eq, avg, count } from "drizzle-orm";
import Link from "next/link";

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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold tracking-widest text-accent uppercase mb-5">
      {children}
    </p>
  );
}

export default async function ForecastersPage() {
  const rows = await getForecasters();
  const institutions = rows.filter((r) => r.type === "INSTITUTION");
  const analysts = rows.filter((r) => r.type === "ANALYST");

  return (
    <div className="space-y-14">
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
        <div className="border-t border-border">
          <div className="grid grid-cols-12 py-2.5 text-xs font-bold tracking-wider text-muted uppercase border-b border-border">
            <div className="col-span-6">Name</div>
            <div className="col-span-3 text-right">Forecasts</div>
            <div className="col-span-3 text-right">Avg error</div>
          </div>
          {institutions.map((f) => (
            <div
              key={f.id}
              className="grid grid-cols-12 py-4 border-b border-border hover:bg-tinted -mx-2 px-2 rounded transition-colors duration-150 group"
            >
              <div className="col-span-6">
                <Link
                  href={`/forecasters/${f.slug}`}
                  className="text-base font-medium text-ink group-hover:text-accent transition-colors"
                >
                  {f.name}
                </Link>
              </div>
              <div className="col-span-3 text-right text-base text-muted tabular-nums" style={{ fontFamily: "var(--font-mono)" }}>
                {Number(f.forecastCount) > 0 ? f.forecastCount : "—"}
              </div>
              <div className="col-span-3 text-right text-base tabular-nums" style={{ fontFamily: "var(--font-mono)" }}>
                {f.avgAbsoluteError != null
                  ? parseFloat(f.avgAbsoluteError).toFixed(2)
                  : <span className="text-muted">—</span>
                }
              </div>
            </div>
          ))}
        </div>
      </section>

      {analysts.length > 0 && (
        <section>
          <SectionLabel>Independent Analysts</SectionLabel>
          <div className="border-t border-border">
            <div className="grid grid-cols-12 py-2.5 text-xs font-bold tracking-wider text-muted uppercase border-b border-border">
              <div className="col-span-6">Name</div>
              <div className="col-span-3 text-right">Forecasts</div>
              <div className="col-span-3 text-right">Avg error</div>
            </div>
            {analysts.map((f) => (
              <div
                key={f.id}
                className="grid grid-cols-12 py-4 border-b border-border hover:bg-tinted -mx-2 px-2 rounded transition-colors duration-150 group"
              >
                <div className="col-span-6">
                  <Link
                    href={`/forecasters/${f.slug}`}
                    className="text-base font-medium text-ink group-hover:text-accent transition-colors"
                  >
                    {f.name}
                  </Link>
                </div>
                <div className="col-span-3 text-right text-base text-muted tabular-nums" style={{ fontFamily: "var(--font-mono)" }}>
                  {f.forecastCount}
                </div>
                <div className="col-span-3 text-right text-base tabular-nums" style={{ fontFamily: "var(--font-mono)" }}>
                  {f.avgAbsoluteError != null
                    ? parseFloat(f.avgAbsoluteError).toFixed(2)
                    : <span className="text-muted">—</span>
                  }
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
