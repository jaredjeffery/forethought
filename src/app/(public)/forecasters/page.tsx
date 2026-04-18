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
    <p className="text-xs font-semibold tracking-widest text-amber uppercase mb-5">
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
          className="text-4xl text-ink tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Forecasters
        </h1>
        <div className="mt-2 h-px w-10 bg-amber" />
      </div>

      {/* Institutions */}
      <section>
        <SectionLabel>Institutions</SectionLabel>
        <div className="border-t border-warm-border">
          <div className="grid grid-cols-12 py-2 text-[11px] font-semibold tracking-wider text-muted uppercase border-b border-warm-border">
            <div className="col-span-6">Name</div>
            <div className="col-span-3 text-right">Forecasts</div>
            <div className="col-span-3 text-right">Avg error</div>
          </div>
          {institutions.map((f) => (
            <div
              key={f.id}
              className="grid grid-cols-12 py-3.5 border-b border-warm-border hover:bg-cream-tinted -mx-2 px-2 rounded transition-colors duration-150 group"
            >
              <div className="col-span-6">
                <Link
                  href={`/forecasters/${f.slug}`}
                  className="text-sm font-medium text-ink group-hover:text-amber transition-colors"
                >
                  {f.name}
                </Link>
              </div>
              <div
                className="col-span-3 text-right text-sm text-muted tabular-nums"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {Number(f.forecastCount) > 0 ? f.forecastCount : "—"}
              </div>
              <div
                className="col-span-3 text-right text-sm tabular-nums"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {f.avgAbsoluteError != null
                  ? parseFloat(f.avgAbsoluteError).toFixed(2)
                  : <span className="text-muted">—</span>
                }
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Analysts */}
      {analysts.length > 0 && (
        <section>
          <SectionLabel>Independent Analysts</SectionLabel>
          <div className="border-t border-warm-border">
            <div className="grid grid-cols-12 py-2 text-[11px] font-semibold tracking-wider text-muted uppercase border-b border-warm-border">
              <div className="col-span-6">Name</div>
              <div className="col-span-3 text-right">Forecasts</div>
              <div className="col-span-3 text-right">Avg error</div>
            </div>
            {analysts.map((f) => (
              <div
                key={f.id}
                className="grid grid-cols-12 py-3.5 border-b border-warm-border hover:bg-cream-tinted -mx-2 px-2 rounded transition-colors duration-150 group"
              >
                <div className="col-span-6">
                  <Link
                    href={`/forecasters/${f.slug}`}
                    className="text-sm font-medium text-ink group-hover:text-amber transition-colors"
                  >
                    {f.name}
                  </Link>
                </div>
                <div
                  className="col-span-3 text-right text-sm text-muted tabular-nums"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {f.forecastCount}
                </div>
                <div
                  className="col-span-3 text-right text-sm tabular-nums"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
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
