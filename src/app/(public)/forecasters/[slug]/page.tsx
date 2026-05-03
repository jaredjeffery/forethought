// Public forecaster profile with non-leaky coverage and trust signals.

import { getForecasterBySlug, getForecasterPublicProfileData } from "@/lib/forecaster-queries";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { PrismDial } from "@/components/viz/PrismDial";

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ slug: string }>;
}

function rankedStatus(scoredCount: number, forecastCount: number) {
  if (scoredCount >= 100) return "Ranked benchmark";
  if (scoredCount > 0) return "Building track record";
  if (forecastCount > 0) return "Tracked, awaiting scores";
  return "Not yet tracked";
}

function statusBadgeClass(scoredCount: number, forecastCount: number) {
  if (scoredCount >= 100) return "badge badge-cobalt";
  if (scoredCount > 0) return "badge badge-amber";
  if (forecastCount > 0) return "badge badge-violet";
  return "badge badge-neutral";
}

function CoverageBar({ value, max }: { value: number; max: number }) {
  const ratio = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="h-2 overflow-hidden rounded-full bg-bg-alt">
      <div
        className="h-full rounded-full bg-cobalt"
        style={{ width: `${Math.max(ratio, 2)}%` }}
      />
    </div>
  );
}

export default async function ForecasterProfilePage({ params }: PageProps) {
  const { slug } = await params;
  const forecaster = await getForecasterBySlug(slug);
  if (!forecaster) notFound();

  const { summary, coverageByIndicator, coverageByCountry, vintages } =
    await getForecasterPublicProfileData(forecaster.id);

  const forecastCount = Number(summary.forecastCount);
  const scoredCount = Number(summary.scoredCount);
  const variableCount = Number(summary.variableCount);
  const countryCount = Number(summary.countryCount);
  const status = rankedStatus(scoredCount, forecastCount);

  const indicatorMax = coverageByIndicator.reduce(
    (max, row) => Math.max(max, Number(row.forecastCount)),
    0,
  );
  const countryMax = coverageByCountry.reduce(
    (max, row) => Math.max(max, Number(row.forecastCount)),
    0,
  );

  // Prism dial weights from top-8 indicator coverage.
  const dialWeights = coverageByIndicator
    .slice(0, 8)
    .map((row) => Number(row.forecastCount) / Math.max(indicatorMax, 1));
  const dialLabels = coverageByIndicator
    .slice(0, 8)
    .map((row) => row.indicatorName);

  return (
    <div className="space-y-12">
      <nav className="flex items-center gap-1.5 text-sm text-muted">
        <Link href="/forecasters" className="transition-colors hover:text-ink">
          Forecasters
        </Link>
        <span>/</span>
        <span className="text-ink">{forecaster.name}</span>
      </nav>

      {/* HERO */}
      <section className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="badge badge-cobalt">{forecaster.type.toLowerCase()}</span>
            <span className={statusBadgeClass(scoredCount, forecastCount)}>{status}</span>
            <span className="badge badge-neutral">Farfield-managed profile</span>
          </div>
          <h1
            className="text-5xl leading-[1.05] tracking-tight text-ink"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {forecaster.name}
          </h1>
          <span className="accent-rule" />
          <p className="mt-5 max-w-xl text-base leading-7 text-muted">
            {forecaster.name} is tracked passively from public data releases. The figures
            below describe coverage breadth and source depth. Detailed accuracy comparisons
            live behind subscriber access.
          </p>
        </div>

        {/* Prism dial signature */}
        {dialWeights.length > 0 && (
          <Card padding="lg" raised className="flex flex-col items-center justify-center">
            <p className="section-label mb-3">Indicator Signature</p>
            <PrismDial weights={dialWeights} labels={dialLabels} size={220} />
          </Card>
        )}
      </section>

      {/* TRUST PANEL */}
      <section>
        <SectionLabel>Public Trust Panel</SectionLabel>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Forecasts tracked", forecastCount, "across vintages"],
            ["Scored sample", scoredCount, "rows with matched actuals"],
            ["Variables covered", variableCount, "distinct indicators"],
            ["Geographies", countryCount, "countries / aggregates"],
          ].map(([label, value, sub]) => (
            <Card padding="md" key={String(label)}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
                {label}
              </p>
              <p className="mt-2 font-mono text-3xl font-bold tabular-nums text-ink">
                {Number(value).toLocaleString() || "—"}
              </p>
              <p className="mt-1 text-xs text-muted">{sub}</p>
            </Card>
          ))}
        </div>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-muted">
          Public profiles show coverage, source status, and sample depth. Full accuracy
          tables, horizon rankings, consensus comparisons, and exports are subscriber-only.
        </p>
      </section>

      {forecastCount === 0 ? (
        <Card padding="lg">
          <p className="text-base text-muted">
            No forecasts are currently tracked for this institution.
          </p>
        </Card>
      ) : (
        <>
          {/* COVERAGE BY INDICATOR — visual */}
          <section>
            <SectionLabel>Coverage by Indicator</SectionLabel>
            <Card padding="lg">
              <div className="space-y-4">
                {coverageByIndicator.map((row) => {
                  const value = Number(row.forecastCount);
                  return (
                    <div
                      key={row.indicatorName}
                      className="grid grid-cols-[1.1fr_0.6fr_2fr_0.5fr] items-center gap-4"
                    >
                      <span className="text-sm font-medium text-ink">
                        {row.indicatorName}
                      </span>
                      <span className="font-mono text-xs tabular-nums text-muted">
                        {Number(row.countryCount)} geos
                      </span>
                      <CoverageBar value={value} max={indicatorMax} />
                      <span className="text-right font-mono text-sm tabular-nums text-ink">
                        {value.toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>
          </section>

          {/* COVERAGE BY COUNTRY — geo grid */}
          <section>
            <SectionLabel>Coverage by Country</SectionLabel>
            <div className="grid gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {coverageByCountry.slice(0, 24).map((row) => {
                const value = Number(row.forecastCount);
                const ratio = countryMax > 0 ? value / countryMax : 0;
                const opacity = 0.25 + ratio * 0.7;
                return (
                  <div
                    key={row.countryCode}
                    className="card flex flex-col items-center justify-center px-3 py-3 text-center"
                    style={{
                      borderColor:
                        ratio > 0.6
                          ? "var(--cobalt)"
                          : "var(--border)",
                    }}
                  >
                    <div
                      className="mb-2 h-10 w-10 rounded-md"
                      style={{
                        background: `var(--cobalt)`,
                        opacity,
                      }}
                    />
                    <p className="font-mono text-sm font-semibold text-ink">
                      {row.countryCode}
                    </p>
                    <p className="mt-0.5 font-mono text-[10px] tabular-nums text-muted">
                      {value} / {Number(row.variableCount)}v
                    </p>
                  </div>
                );
              })}
            </div>
            {coverageByCountry.length > 24 && (
              <p className="mt-3 text-xs text-muted">
                Showing top 24 of {coverageByCountry.length} geographies.
              </p>
            )}
          </section>

          {/* VINTAGES + SUBSCRIBER */}
          <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
            <Card padding="lg">
              <SectionLabel>Latest Vintages</SectionLabel>
              <div className="flex flex-wrap gap-2">
                {vintages.length > 0 ? (
                  vintages.map((row) => (
                    <span key={row.vintage} className="badge badge-cobalt">
                      {row.vintage}
                    </span>
                  ))
                ) : (
                  <p className="text-sm text-muted">No vintage labels recorded.</p>
                )}
              </div>
              <p className="mt-5 text-xs leading-5 text-muted">
                Each vintage is a distinct source publication. Forecast values stay locked;
                vintage labels are public so coverage cadence is visible.
              </p>
            </Card>
            <Card padding="lg" className="bg-bg-alt">
              <SectionLabel>Subscriber Detail</SectionLabel>
              <p className="text-sm leading-6 text-muted">
                Accuracy by country, indicator, forecast horizon, consensus comparison, and
                variable-level exports are locked until subscriber access is enabled.
              </p>
              <Link href="/pricing" className="btn-primary mt-5">
                Request access
              </Link>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}
