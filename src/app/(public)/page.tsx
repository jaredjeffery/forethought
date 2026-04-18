// Landing page — public showcase entry point.
// Two-column hero: headline/CTAs left, live forecaster leaderboard right.
// NOTE: this is a data-led placeholder until the news/events layout ships.

import { db } from "@/lib/db";
import { variables, actuals, forecasters, forecasts, forecastScores } from "@/lib/db/schema";
import { eq, desc, inArray, and, avg, count, isNotNull } from "drizzle-orm";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { SectionLabel } from "@/components/ui/SectionLabel";

export const revalidate = 3600;

async function getFeaturedData() {
  const gdpVars = await db
    .select()
    .from(variables)
    .where(
      and(
        eq(variables.name, "GDP Growth Rate"),
        inArray(variables.countryCode, ["WLD", "USA", "CHN", "GBR", "ZAF"])
      )
    )
    .orderBy(variables.countryCode, variables.name);

  const gdpActuals = gdpVars.length > 0
    ? await db
        .select()
        .from(actuals)
        .where(inArray(actuals.variableId, gdpVars.map((v) => v.id)))
        .orderBy(desc(actuals.targetPeriod))
    : [];

  const institutions = await db
    .select()
    .from(forecasters)
    .where(eq(forecasters.type, "INSTITUTION"))
    .orderBy(forecasters.name);

  // Leaderboard: institutions ranked by avg absolute error (scored forecasts only)
  const leaderboard = await db
    .select({
      id: forecasters.id,
      name: forecasters.name,
      slug: forecasters.slug,
      forecastCount: count(forecasts.id),
      avgError: avg(forecastScores.absoluteError),
    })
    .from(forecasters)
    .innerJoin(forecasts, eq(forecasts.forecasterId, forecasters.id))
    .innerJoin(forecastScores, eq(forecastScores.forecastId, forecasts.id))
    .where(and(
      eq(forecasters.type, "INSTITUTION"),
      isNotNull(forecastScores.absoluteError),
    ))
    .groupBy(forecasters.id, forecasters.name, forecasters.slug)
    .orderBy(avg(forecastScores.absoluteError))
    .limit(6);

  return { gdpVars, gdpActuals, institutions, leaderboard };
}

const COUNTRY_LABELS: Record<string, string> = {
  WLD: "World", USA: "US", CHN: "China", GBR: "UK", ZAF: "S. Africa",
};

export default async function LandingPage() {
  const { gdpVars, gdpActuals, institutions, leaderboard } = await getFeaturedData();

  const latestActuals = new Map<string, { value: string; period: string }>();
  for (const a of gdpActuals) {
    if (!latestActuals.has(a.variableId)) {
      latestActuals.set(a.variableId, {
        value: parseFloat(a.value).toFixed(1),
        period: a.targetPeriod,
      });
    }
  }

  return (
    <div className="space-y-20">

      {/* ── Two-column hero ───────────────────────────────────────── */}
      <section className="pt-4 grid lg:grid-cols-[1fr_420px] gap-12 items-start">
        {/* Left: headline + copy + CTAs */}
        <div>
          <h1
            className="text-[64px] leading-[1.05] tracking-tight text-ink"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Who calls it{" "}
            <span className="text-accent">right?</span>
          </h1>
          <p className="mt-6 text-xl text-muted leading-relaxed max-w-lg">
            Forethought tracks economic forecasts from institutions and
            independent analysts, scores them against outcomes, and publishes
            the record — permanently.
          </p>
          <div className="mt-8 flex gap-3">
            <Link
              href="/variables"
              className="inline-flex items-center px-6 py-3 text-base font-semibold bg-accent text-white rounded-[10px] hover:bg-accent-dark transition-colors duration-200"
              style={{ boxShadow: "0 1px 3px rgba(29, 78, 216, 0.3)" }}
            >
              Browse variables
            </Link>
            <Link
              href="/forecasters"
              className="inline-flex items-center px-6 py-3 text-base font-semibold border-2 border-border text-ink rounded-[10px] hover:border-accent hover:text-accent transition-colors duration-200"
            >
              View forecasters
            </Link>
          </div>
        </div>

        {/* Right: live leaderboard card */}
        {leaderboard.length > 0 && (
          <Card raised padding="none" className="overflow-hidden">
            <div className="px-5 pt-5 pb-3 border-b border-border">
              <p className="text-xs font-bold tracking-widest text-accent uppercase">
                Accuracy Leaderboard
              </p>
              <p className="text-xs text-muted mt-0.5">Ranked by avg. absolute error — lower is better</p>
            </div>
            <div className="divide-y divide-border">
              {leaderboard.map((f, i) => (
                <Link
                  key={f.id}
                  href={`/forecasters/${f.slug}`}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-bg transition-colors group"
                >
                  <span
                    className="text-sm font-bold tabular-nums text-muted w-5 shrink-0"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {i + 1}
                  </span>
                  <span className="flex-1 text-sm font-semibold text-ink group-hover:text-accent transition-colors truncate">
                    {f.name}
                  </span>
                  {f.avgError != null && (
                    <span
                      className="text-sm tabular-nums text-muted shrink-0"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      {parseFloat(f.avgError).toFixed(2)} MAE
                    </span>
                  )}
                </Link>
              ))}
            </div>
            <div className="px-5 py-3 border-t border-border">
              <Link
                href="/forecasters"
                className="text-xs font-semibold text-accent hover:text-accent-dark transition-colors"
              >
                View all forecasters →
              </Link>
            </div>
          </Card>
        )}
      </section>

      {/* ── GDP snapshot ─────────────────────────────────────────── */}
      {gdpVars.length > 0 && (
        <section>
          <SectionLabel>GDP Growth — Latest Actuals</SectionLabel>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {gdpVars.map((v) => {
              const latest = latestActuals.get(v.id);
              const val = latest ? parseFloat(latest.value) : null;
              const isPos = val !== null && val >= 0;
              return (
                <Link
                  key={v.id}
                  href={`/variables/${v.id}`}
                  className="group card px-5 py-4 hover:border-accent transition-colors duration-200"
                  style={{ borderRadius: "var(--radius-md)" }}
                >
                  <p className="text-xs font-bold tracking-wider text-muted uppercase">
                    {COUNTRY_LABELS[v.countryCode] ?? v.countryCode}
                  </p>
                  {latest && val !== null ? (
                    <>
                      <p
                        className={`mt-2 text-2xl font-bold tabular-nums leading-none ${
                          isPos ? "text-signal-green" : "text-signal-red"
                        }`}
                        style={{ fontFamily: "var(--font-mono)" }}
                      >
                        {isPos && val !== 0 ? "+" : ""}{val.toFixed(1)}%
                      </p>
                      <p className="mt-2 text-xs text-muted">{latest.period}</p>
                    </>
                  ) : (
                    <p className="mt-2 text-xl text-border-dark">—</p>
                  )}
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Tracked institutions ─────────────────────────────────── */}
      {institutions.length > 0 && (
        <section>
          <SectionLabel>Tracked Institutions</SectionLabel>
          <Card padding="none">
            {institutions.map((f, i) => (
              <Link
                key={f.id}
                href={`/forecasters/${f.slug}`}
                className={`flex items-center justify-between px-6 py-4 hover:bg-bg transition-colors group ${
                  i < institutions.length - 1 ? "border-b border-border" : ""
                }`}
              >
                <span className="text-base font-semibold text-ink group-hover:text-accent transition-colors">
                  {f.name}
                </span>
                <span
                  className="text-xs text-muted tabular-nums"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
              </Link>
            ))}
          </Card>
        </section>
      )}

      {/* ── How it works ─────────────────────────────────────────── */}
      <section className="border-t border-border pt-14">
        <SectionLabel>How It Works</SectionLabel>
        <div className="grid sm:grid-cols-3 gap-8">
          {[
            {
              n: "01",
              title: "Forecasts are logged",
              body: "Institutions publish WEO-style projections. Independent analysts submit their own. Every forecast is timestamped and immutable.",
            },
            {
              n: "02",
              title: "Outcomes are scored",
              body: "When official data is published, each forecast is scored: absolute error, directional accuracy, and performance vs the consensus.",
            },
            {
              n: "03",
              title: "Accuracy is public",
              body: "Scores and rankings are visible to everyone. No cherry-picking. The methodology is versioned and documented.",
            },
          ].map((item) => (
            <div key={item.n}>
              <p
                className="text-4xl font-bold text-accent-light mb-4 leading-none select-none"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {item.n}
              </p>
              <h3
                className="text-lg font-semibold text-ink mb-2"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {item.title}
              </h3>
              <p className="text-base text-muted leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
