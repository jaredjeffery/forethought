// Landing page — public showcase entry point.
// Server component: pulls featured variables and forecasters directly from DB.

import { db } from "@/lib/db";
import { variables, actuals, forecasters } from "@/lib/db/schema";
import { eq, desc, inArray, and } from "drizzle-orm";
import Link from "next/link";

export const revalidate = 3600;

async function getFeaturedData() {
  // GDP Growth Rate for key economies — filtered at DB level, not in JS
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
          className="text-5xl sm:text-6xl text-ink leading-tight tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Who calls it right?
        </h1>
        <div className="mt-2 h-px w-16 bg-amber" />
        <p className="mt-6 text-lg text-muted max-w-xl leading-relaxed">
          Forethought tracks economic forecasts from institutions and independent
          analysts, scores them against outcomes, and makes the record public.
        </p>
        <div className="mt-8 flex gap-3">
          <Link
            href="/variables"
            className="inline-flex items-center px-5 py-2.5 text-sm font-medium bg-ink text-cream rounded hover:bg-amber transition-colors duration-200"
          >
            Browse variables
          </Link>
          <Link
            href="/forecasters"
            className="inline-flex items-center px-5 py-2.5 text-sm font-medium border border-warm-border-dark text-ink rounded hover:border-amber hover:text-amber transition-colors duration-200"
          >
            View forecasters
          </Link>
        </div>
      </section>

      {/* ── GDP snapshot ─────────────────────────────────────────── */}
      {gdpVars.length > 0 && (
        <section>
          <p className="text-xs font-semibold tracking-widest text-amber uppercase mb-5">
            GDP Growth — Latest Actuals
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {gdpVars.map((v) => {
              const latest = latestActuals.get(v.id);
              const isPositive = latest ? parseFloat(latest.value) >= 0 : null;
              return (
                <Link
                  key={v.id}
                  href={`/variables/${v.id}`}
                  className="group block p-4 border border-warm-border bg-cream-tinted rounded hover:border-amber-light hover:bg-amber-light transition-colors duration-200"
                >
                  <p className="text-[11px] font-medium tracking-wider text-muted uppercase">
                    {COUNTRY_LABELS[v.countryCode] ?? v.countryCode}
                  </p>
                  {latest ? (
                    <>
                      <p
                        className={`mt-2 text-2xl font-semibold tabular-nums leading-none ${
                          isPositive ? "text-signal-green" : "text-signal-red"
                        }`}
                        style={{ fontFamily: "var(--font-mono)" }}
                      >
                        {isPositive && latest.value !== "0.0" ? "+" : ""}{latest.value}%
                      </p>
                      <p className="mt-1.5 text-[11px] text-muted">{latest.period}</p>
                    </>
                  ) : (
                    <p className="mt-2 text-xl text-warm-border-dark">—</p>
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
          <p className="text-xs font-semibold tracking-widest text-amber uppercase mb-5">
            Tracked Institutions
          </p>
          <div className="border-t border-warm-border">
            {institutions.map((f, i) => (
              <Link
                key={f.id}
                href={`/forecasters/${f.slug}`}
                className="flex items-center justify-between py-3 border-b border-warm-border group hover:bg-cream-tinted -mx-2 px-2 rounded transition-colors duration-150"
              >
                <span className="text-sm font-medium text-ink group-hover:text-amber transition-colors">
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
      <section className="border-t border-warm-border pt-14">
        <p className="text-xs font-semibold tracking-widest text-amber uppercase mb-10">
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
                className="text-3xl font-bold text-amber-light mb-4 leading-none"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {item.n}
              </p>
              <h3
                className="text-base font-semibold text-ink mb-2"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {item.title}
              </h3>
              <p className="text-sm text-muted leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
