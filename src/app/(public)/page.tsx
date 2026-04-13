// Landing page — public showcase entry point.
// Server component: pulls featured variables and forecasters directly from DB.

import { db } from "@/lib/db";
import { variables, actuals, forecasters } from "@/lib/db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import Link from "next/link";

export const revalidate = 3600; // revalidate every hour

async function getFeaturedData() {
  // Feature a small set of high-interest variables: GDP growth for key economies
  const featuredVars = await db
    .select()
    .from(variables)
    .where(
      inArray(variables.countryCode, ["WLD", "USA", "CHN", "GBR", "ZAF"])
    )
    .orderBy(variables.countryCode, variables.name);

  // Latest actuals for GDP Growth Rate
  const gdpVars = featuredVars.filter((v) => v.name === "GDP Growth Rate");
  const gdpActuals = gdpVars.length > 0
    ? await db
        .select()
        .from(actuals)
        .where(inArray(actuals.variableId, gdpVars.map((v) => v.id)))
        .orderBy(desc(actuals.targetPeriod))
    : [];

  // Institutional forecasters
  const institutions = await db
    .select()
    .from(forecasters)
    .where(eq(forecasters.type, "INSTITUTION"))
    .orderBy(forecasters.name);

  return { featuredVars, gdpVars, gdpActuals, institutions };
}

export default async function LandingPage() {
  const { gdpVars, gdpActuals, institutions } = await getFeaturedData();

  // Build a map from variableId → latest actual
  const latestActuals = new Map<string, string>();
  for (const a of gdpActuals) {
    if (!latestActuals.has(a.variableId)) {
      latestActuals.set(a.variableId, `${a.value}% (${a.targetPeriod})`);
    }
  }

  return (
    <div className="space-y-16">
      {/* Hero */}
      <section className="pt-8 pb-4">
        <h1 className="text-3xl font-semibold tracking-tight text-gray-900">
          Who calls it right?
        </h1>
        <p className="mt-4 text-lg text-gray-600 max-w-2xl">
          Forethought tracks economic forecasts from institutions and independent
          analysts, scores them against outcomes, and makes performance public.
        </p>
        <div className="mt-6 flex gap-4">
          <Link
            href="/variables"
            className="inline-flex items-center px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            Browse variables
          </Link>
          <Link
            href="/forecasters"
            className="inline-flex items-center px-4 py-2 text-sm font-medium border border-gray-300 text-gray-700 rounded-md hover:border-gray-400 transition-colors"
          >
            View forecasters
          </Link>
        </div>
      </section>

      {/* GDP snapshot */}
      {gdpVars.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
            GDP Growth — latest actuals
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {gdpVars.map((v) => (
              <Link
                key={v.id}
                href={`/variables/${v.id}`}
                className="block p-4 border border-gray-200 rounded-lg hover:border-gray-400 transition-colors"
              >
                <p className="text-xs text-gray-500">{v.countryCode}</p>
                <p className="mt-1 text-xl font-semibold tabular-nums">
                  {latestActuals.get(v.id) ?? "—"}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Tracked institutions */}
      {institutions.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
            Tracked institutions
          </h2>
          <div className="flex flex-wrap gap-2">
            {institutions.map((f) => (
              <Link
                key={f.id}
                href={`/forecasters/${f.slug}`}
                className="inline-flex items-center px-3 py-1.5 text-sm border border-gray-200 rounded-full hover:border-gray-400 transition-colors"
              >
                {f.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* How it works */}
      <section className="border-t border-gray-100 pt-12">
        <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-6">
          How it works
        </h2>
        <div className="grid sm:grid-cols-3 gap-8">
          {[
            {
              title: "Forecasts are logged",
              body: "Institutions publish WEO-style projections. Independent analysts submit their own. Every forecast is timestamped and immutable.",
            },
            {
              title: "Outcomes are scored",
              body: "When official data is published, each forecast is scored: absolute error, directional accuracy, and performance relative to the consensus.",
            },
            {
              title: "Accuracy is public",
              body: "Scores and rankings are visible to everyone. No cherry-picking. The methodology is versioned and documented.",
            },
          ].map((item) => (
            <div key={item.title}>
              <h3 className="text-sm font-semibold text-gray-900">{item.title}</h3>
              <p className="mt-2 text-sm text-gray-600 leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
