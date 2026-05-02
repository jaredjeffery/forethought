// Public showcase landing page with actuals-only previews and coverage signals.

import { db } from "@/lib/db";
import { actuals, forecasters, forecasts, forecastScores, variables } from "@/lib/db/schema";
import { and, countDistinct, desc, eq, inArray } from "drizzle-orm";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { SectionLabel } from "@/components/ui/SectionLabel";

export const revalidate = 3600;

const COUNTRY_LABELS: Record<string, string> = {
  WLD: "World",
  USA: "US",
  CHN: "China",
  GBR: "UK",
  ZAF: "South Africa",
};

async function getFeaturedData() {
  const gdpVars = await db
    .select()
    .from(variables)
    .where(
      and(
        eq(variables.name, "GDP Growth Rate"),
        inArray(variables.countryCode, ["WLD", "USA", "CHN", "GBR", "ZAF"]),
      ),
    )
    .orderBy(variables.countryCode, variables.name);

  const gdpActuals = gdpVars.length > 0
    ? await db
        .select()
        .from(actuals)
        .where(inArray(actuals.variableId, gdpVars.map((v) => v.id)))
        .orderBy(desc(actuals.targetPeriod), desc(actuals.publishedAt))
    : [];

  const institutions = await db
    .select({
      id: forecasters.id,
      name: forecasters.name,
      slug: forecasters.slug,
      forecastCount: countDistinct(forecasts.id),
      scoredCount: countDistinct(forecastScores.id),
      variableCount: countDistinct(forecasts.variableId),
      countryCount: countDistinct(variables.countryCode),
    })
    .from(forecasters)
    .leftJoin(forecasts, eq(forecasts.forecasterId, forecasters.id))
    .leftJoin(forecastScores, eq(forecastScores.forecastId, forecasts.id))
    .leftJoin(variables, eq(variables.id, forecasts.variableId))
    .where(eq(forecasters.type, "INSTITUTION"))
    .groupBy(forecasters.id, forecasters.name, forecasters.slug)
    .orderBy(desc(countDistinct(forecasts.id)), forecasters.name)
    .limit(8);

  return { gdpVars, gdpActuals, institutions };
}

function statusLabel(scoredCount: number, forecastCount: number) {
  if (scoredCount >= 100) return "Ranked benchmark";
  if (scoredCount > 0) return "Building track record";
  if (forecastCount > 0) return "Tracked, awaiting scores";
  return "No tracked forecasts";
}

export default async function LandingPage() {
  const { gdpVars, gdpActuals, institutions } = await getFeaturedData();

  const latestActuals = new Map<string, { value: string; period: string }>();
  for (const actual of gdpActuals) {
    if (!latestActuals.has(actual.variableId)) {
      latestActuals.set(actual.variableId, {
        value: parseFloat(actual.value).toFixed(1),
        period: actual.targetPeriod,
      });
    }
  }

  const totalTracked = institutions.reduce((sum, row) => sum + Number(row.forecastCount), 0);
  const totalScored = institutions.reduce((sum, row) => sum + Number(row.scoredCount), 0);

  return (
    <div className="space-y-20">
      <section className="pt-4 grid gap-12 lg:grid-cols-[1fr_430px] lg:items-start">
        <div>
          <p className="mb-4 text-xs font-bold tracking-widest text-accent uppercase">
            Forecast accountability
          </p>
          <h1
            className="text-[64px] leading-[1.05] text-ink"
            style={{ fontFamily: "var(--font-display)" }}
          >
            See who forecasts what, and how the record is kept.
          </h1>
          <p className="mt-6 max-w-xl text-xl leading-relaxed text-muted">
            Farfield tracks public economic forecasts, preserves source vintages,
            scores them against actual outcomes, and keeps premium forecast values
            behind subscriber access.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/variables"
              className="inline-flex items-center rounded-[10px] bg-accent px-6 py-3 text-base font-semibold text-white transition-colors duration-200 hover:bg-accent-dark"
              style={{ boxShadow: "0 1px 3px rgba(29, 78, 216, 0.3)" }}
            >
              Browse variables
            </Link>
            <Link
              href="/forecasters"
              className="inline-flex items-center rounded-[10px] border-2 border-border px-6 py-3 text-base font-semibold text-ink transition-colors duration-200 hover:border-accent hover:text-accent"
            >
              View forecasters
            </Link>
          </div>
        </div>

        <Card raised padding="none" className="overflow-hidden">
          <div className="border-b border-border px-5 pb-3 pt-5">
            <p className="text-xs font-bold tracking-widest text-accent uppercase">
              Coverage Snapshot
            </p>
            <p className="mt-0.5 text-xs text-muted">
              Public source depth, not premium forecast values
            </p>
          </div>
          <div className="grid grid-cols-2 divide-x divide-border border-b border-border">
            <div className="px-5 py-5">
              <p className="text-xs font-bold uppercase text-muted">Tracked forecasts</p>
              <p className="mt-2 font-mono text-3xl font-bold text-ink tabular-nums">
                {totalTracked.toLocaleString()}
              </p>
            </div>
            <div className="px-5 py-5">
              <p className="text-xs font-bold uppercase text-muted">Scored sample</p>
              <p className="mt-2 font-mono text-3xl font-bold text-ink tabular-nums">
                {totalScored.toLocaleString()}
              </p>
            </div>
          </div>
          <div className="divide-y divide-border">
            {institutions.slice(0, 5).map((institution) => {
              const forecastCount = Number(institution.forecastCount);
              const scoredCount = Number(institution.scoredCount);
              return (
                <Link
                  key={institution.id}
                  href={`/forecasters/${institution.slug}`}
                  className="block px-5 py-3.5 transition-colors hover:bg-bg"
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm font-semibold text-ink">
                      {institution.name}
                    </span>
                    <span className="shrink-0 text-xs font-medium text-muted">
                      {statusLabel(scoredCount, forecastCount)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {forecastCount.toLocaleString()} forecasts / {scoredCount.toLocaleString()} scored
                  </p>
                </Link>
              );
            })}
          </div>
          <div className="border-t border-border px-5 py-3">
            <Link
              href="/forecasters"
              className="text-xs font-semibold text-accent transition-colors hover:text-accent-dark"
            >
              View all forecasters
            </Link>
          </div>
        </Card>
      </section>

      {gdpVars.length > 0 && (
        <section>
          <SectionLabel>GDP Growth: Latest Actuals</SectionLabel>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {gdpVars.map((variable) => {
              const latest = latestActuals.get(variable.id);
              const value = latest ? parseFloat(latest.value) : null;
              const isPositive = value !== null && value >= 0;
              return (
                <Link
                  key={variable.id}
                  href={`/variables/${variable.slug}`}
                  className="card group px-5 py-4 transition-colors duration-200 hover:border-accent"
                  style={{ borderRadius: "var(--radius-md)" }}
                >
                  <p className="text-xs font-bold uppercase text-muted">
                    {COUNTRY_LABELS[variable.countryCode] ?? variable.countryCode}
                  </p>
                  {latest && value !== null ? (
                    <>
                      <p
                        className={`mt-2 font-mono text-2xl font-bold leading-none tabular-nums ${
                          isPositive ? "text-signal-green" : "text-signal-red"
                        }`}
                      >
                        {isPositive && value !== 0 ? "+" : ""}{value.toFixed(1)}%
                      </p>
                      <p className="mt-2 text-xs text-muted">{latest.period}</p>
                    </>
                  ) : (
                    <p className="mt-2 text-xl text-border-dark">-</p>
                  )}
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div>
          <SectionLabel>What Public Users See</SectionLabel>
          <div className="space-y-3">
            {[
              "Actual outcomes and source labels",
              "Which institutions cover a variable",
              "Coverage counts and scored sample sizes",
              "Methodology and public trust panels",
            ].map((item) => (
              <Card key={item} padding="sm">
                <p className="text-sm font-medium text-ink">{item}</p>
              </Card>
            ))}
          </div>
        </div>
        <div>
          <SectionLabel>Subscriber Detail</SectionLabel>
          <Card padding="lg" className="bg-bg">
            <p className="text-base leading-7 text-muted">
              Current forecast values, consensus history, vintage changes, dispersion,
              horizon rankings, and exports stay locked until subscriber access is enabled.
            </p>
          </Card>
        </div>
      </section>

      <section className="border-t border-border pt-14">
        <SectionLabel>How It Works</SectionLabel>
        <div className="grid gap-8 sm:grid-cols-3">
          {[
            {
              n: "01",
              title: "Sources are archived",
              body: "Every public forecast vintage is tied to its source document and ingestion run.",
            },
            {
              n: "02",
              title: "Actuals are versioned",
              body: "Scores link to the exact actual vintage and methodology version used.",
            },
            {
              n: "03",
              title: "Premium data is gated",
              body: "Public pages build trust without exposing current consensus or reconstructive forecast data.",
            },
          ].map((item) => (
            <div key={item.n}>
              <p
                className="mb-4 select-none text-4xl font-bold leading-none text-accent-light"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {item.n}
              </p>
              <h3
                className="mb-2 text-lg font-semibold text-ink"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {item.title}
              </h3>
              <p className="text-base leading-relaxed text-muted">{item.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
