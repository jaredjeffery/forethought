// Landing page — public showcase entry point.
// Server component: pulls featured variables and forecasters directly from DB.
// NOTE: this is a placeholder layout. The production landing page will be a
// news-style front page with articles, analysis, and events listings.

import { db } from "@/lib/db";
import { variables, actuals, forecasters } from "@/lib/db/schema";
import { eq, desc, inArray, and } from "drizzle-orm";
import Link from "next/link";

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

  return { gdpVars, gdpActuals, institutions };
}

const COUNTRY_LABELS: Record<string, string> = {
  WLD: "World", USA: "United States", CHN: "China",
  GBR: "United Kingdom", ZAF: "South Africa",
};

export default async function LandingPage() {
  const { gdpVars, gdpActuals, institutions } = await getFeaturedData();

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

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="pt-6">
        <h1
          className="text-6xl sm:text-7xl text-ink leading-[1.05] tracking-tight max-w-3xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Who calls it{" "}
          <span className="text-accent">right?</span>
        </h1>
        <p className="mt-7 text-xl text-muted max-w-xl leading-relaxed">
          Forethought tracks economic forecasts from institutions and independent
          analysts, scores them against outcomes, and makes the record public.
        </p>
        <div className="mt-8 flex gap-3">
          <Link
            href="/variables"
            className="inline-flex items-center px-6 py-3 text-base font-medium bg-accent text-white rounded hover:bg-accent-dark transition-colors duration-200"
          >
            Browse variables
          </Link>
          <Link
            href="/forecasters"
            className="inline-flex items-center px-6 py-3 text-base font-medium border-2 border-border text-ink rounded hover:border-accent hover:text-accent transition-colors duration-200"
          >
            View forecasters
          </Link>
        </div>
      </section>

      {/* ── GDP snapshot ─────────────────────────────────────────── */}
      {gdpVars.length > 0 && (
        <section>
          <p className="text-xs font-bold tracking-widest text-accent uppercase mb-5">
            GDP Growth — Latest Actuals
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {gdpVars.map((v) => {
              const latest = latestActuals.get(v.id);
              const val = latest ? parseFloat(latest.value) : null;
              const isPositive = val !== null && val >= 0;
              return (
                <Link
                  key={v.id}
                  href={`/variables/${v.id}`}
                  className="group block p-4 border-2 border-border rounded-lg hover:border-accent transition-colors duration-200"
                >
                  <p className="text-xs font-bold tracking-wider text-muted uppercase">
                    {COUNTRY_LABELS[v.countryCode] ?? v.countryCode}
                  </p>
                  {latest && val !== null ? (
                    <>
                      <p
                        className={`mt-2 text-2xl font-bold tabular-nums leading-none ${isPositive ? "text-signal-green" : "text-signal-red"}`}
                        style={{ fontFamily: "var(--font-mono)" }}
                      >
                        {isPositive && val !== 0 ? "+" : ""}{val.toFixed(1)}%
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
          <p className="text-xs font-bold tracking-widest text-accent uppercase mb-5">
            Tracked Institutions
          </p>
          <div className="border-t border-border">
            {institutions.map((f, i) => (
              <Link
                key={f.id}
                href={`/forecasters/${f.slug}`}
                className="flex items-center justify-between py-4 border-b border-border group hover:bg-tinted -mx-2 px-2 rounded transition-colors duration-150"
              >
                <span className="text-base font-medium text-ink group-hover:text-accent transition-colors">
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
          </div>
        </section>
      )}

      {/* ── How it works ─────────────────────────────────────────── */}
      <section className="border-t border-border pt-14">
        <p className="text-xs font-bold tracking-widest text-accent uppercase mb-10">
          How It Works
        </p>
        <div className="grid sm:grid-cols-3 gap-10">
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
                className="text-4xl font-bold text-accent-light mb-4 leading-none"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {item.n}
              </p>
              <h3
                className="text-lg font-semibold text-ink mb-3"
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
