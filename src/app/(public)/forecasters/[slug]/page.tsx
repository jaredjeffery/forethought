// /forecasters/[slug] — institution or analyst profile page.

import { getForecasterBySlug, getForecasterProfileData } from "@/lib/forecaster-queries";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { MetricCard } from "@/components/ui/MetricCard";
import { SectionLabel } from "@/components/ui/SectionLabel";

export const revalidate = 3600;

function fmtError(v: string | null | undefined) {
  if (v == null) return "—";
  return parseFloat(v).toFixed(2);
}

function fmtBias(v: string | null | undefined) {
  if (v == null) return { label: "—", cls: "text-muted" };
  const n = parseFloat(v);
  const label = (n > 0 ? "+" : "") + n.toFixed(1) + "%";
  const cls =
    Math.abs(n) < 0.5 ? "text-ink"
    : n > 0 ? "text-signal-orange"
    : "text-signal-green";
  return { label, cls };
}

function horizonLabel(h: number) {
  if (h === 0) return "Current year";
  return `${h}-year ahead`;
}

function DataTable({ head, children }: { head: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card padding="none">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="border-b border-border bg-bg">
            <tr className="text-xs font-bold tracking-wider text-muted uppercase">
              {head}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">{children}</tbody>
        </table>
      </div>
    </Card>
  );
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function ForecasterProfilePage({ params }: PageProps) {
  const { slug } = await params;
  const forecaster = await getForecasterBySlug(slug);
  if (!forecaster) notFound();

  const {
    overallStats,
    accuracyByIndicator,
    accuracyByCountry,
    accuracyByHorizon,
    accuracyByVariable,
  } = await getForecasterProfileData(forecaster.id);

  const totalForecasts = accuracyByVariable.reduce((s, r) => s + Number(r.forecastCount), 0);
  const scoredCount = Number(overallStats.scoredCount);
  const bias = fmtBias(overallStats.avgBias);
  const beatCount = Number(overallStats.beatConsensusCount);
  const vsTotal = Number(overallStats.vsConsensusTotal);
  const beatRate = vsTotal > 0 ? Math.round((beatCount / vsTotal) * 100) : null;

  // Best and weakest indicators by MAE (min 2 scored forecasts to qualify)
  const qualifiedIndicators = accuracyByIndicator.filter(
    (r) => r.avgAbsoluteError != null && Number(r.scoredCount) >= 2
  );
  const bestIndicator = qualifiedIndicators.at(0);   // ordered ASC by MAE
  const worstIndicator = qualifiedIndicators.at(-1);

  const qualifiedCountries = accuracyByCountry.filter(
    (r) => r.avgAbsoluteError != null && Number(r.scoredCount) >= 2
  );
  const bestCountry = qualifiedCountries.at(0);
  const worstCountry = qualifiedCountries.at(-1);

  return (
    <div className="space-y-12">
      {/* Breadcrumb */}
      <nav className="text-sm text-muted flex items-center gap-1.5">
        <Link href="/forecasters" className="hover:text-ink transition-colors">
          Forecasters
        </Link>
        <span>›</span>
        <span className="text-ink">{forecaster.name}</span>
      </nav>

      {/* Header */}
      <div>
        <p className="text-xs font-bold tracking-widest text-accent uppercase mb-3">
          {forecaster.type.toLowerCase()}
        </p>
        <h1
          className="text-5xl text-ink tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {forecaster.name}
        </h1>
        <div className="mt-2 h-[3px] w-12 bg-accent" />
      </div>

      {/* Metric band */}
      {(totalForecasts > 0 || scoredCount > 0) && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Forecasts tracked" value={totalForecasts || "—"} />
          <MetricCard label="Scored" value={scoredCount || "—"} />
          {overallStats.avgBias != null && (
            <MetricCard
              label="Average bias"
              value={bias.label}
              valueClass={bias.cls}
              subtext="+ = too high, − = too low"
            />
          )}
          {beatRate !== null && (
            <MetricCard
              label="Beat consensus"
              value={`${beatRate}%`}
              valueClass={beatRate >= 50 ? "text-signal-green" : "text-signal-red"}
              subtext={`${beatCount} of ${vsTotal} forecasts`}
            />
          )}
        </div>
      )}

      {accuracyByIndicator.length === 0 ? (
        <p className="text-base text-muted py-8">
          No scored forecasts yet. Check back after the next data ingestion.
        </p>
      ) : (
        <>
          {/* Best / weakest insight panel */}
          {(bestIndicator || bestCountry) && (
            <section>
              <SectionLabel>Performance Highlights</SectionLabel>
              <div className="grid sm:grid-cols-2 gap-4">
                {bestIndicator && worstIndicator && bestIndicator !== worstIndicator && (
                  <Card padding="md" className="border-l-4 border-l-signal-green">
                    <p className="text-xs font-bold tracking-wider text-muted uppercase mb-1">
                      Best indicator
                    </p>
                    <p className="text-lg font-semibold text-ink">{bestIndicator.indicatorName}</p>
                    <p className="mt-1 text-sm text-muted">
                      MAE{" "}
                      <span
                        className="font-mono font-semibold text-signal-green"
                        style={{ fontFamily: "var(--font-mono)" }}
                      >
                        {fmtError(bestIndicator.avgAbsoluteError)}
                      </span>{" "}
                      across {bestIndicator.scoredCount} forecasts
                    </p>
                  </Card>
                )}
                {worstIndicator && bestIndicator !== worstIndicator && (
                  <Card padding="md" className="border-l-4 border-l-signal-red">
                    <p className="text-xs font-bold tracking-wider text-muted uppercase mb-1">
                      Weakest indicator
                    </p>
                    <p className="text-lg font-semibold text-ink">{worstIndicator.indicatorName}</p>
                    <p className="mt-1 text-sm text-muted">
                      MAE{" "}
                      <span
                        className="font-mono font-semibold text-signal-red"
                        style={{ fontFamily: "var(--font-mono)" }}
                      >
                        {fmtError(worstIndicator.avgAbsoluteError)}
                      </span>{" "}
                      across {worstIndicator.scoredCount} forecasts
                    </p>
                  </Card>
                )}
                {bestCountry && worstCountry && bestCountry !== worstCountry && (
                  <Card padding="md" className="border-l-4 border-l-accent">
                    <p className="text-xs font-bold tracking-wider text-muted uppercase mb-1">
                      Best country
                    </p>
                    <p className="text-lg font-semibold text-ink">{bestCountry.countryCode}</p>
                    <p className="mt-1 text-sm text-muted">
                      MAE{" "}
                      <span
                        className="font-semibold text-accent"
                        style={{ fontFamily: "var(--font-mono)" }}
                      >
                        {fmtError(bestCountry.avgAbsoluteError)}
                      </span>{" "}
                      across {bestCountry.scoredCount} forecasts
                    </p>
                  </Card>
                )}
                {worstCountry && bestCountry !== worstCountry && (
                  <Card padding="md" className="border-l-4 border-l-border-dark">
                    <p className="text-xs font-bold tracking-wider text-muted uppercase mb-1">
                      Weakest country
                    </p>
                    <p className="text-lg font-semibold text-ink">{worstCountry.countryCode}</p>
                    <p className="mt-1 text-sm text-muted">
                      MAE{" "}
                      <span
                        className="font-semibold text-muted"
                        style={{ fontFamily: "var(--font-mono)" }}
                      >
                        {fmtError(worstCountry.avgAbsoluteError)}
                      </span>{" "}
                      across {worstCountry.scoredCount} forecasts
                    </p>
                  </Card>
                )}
              </div>
            </section>
          )}

          {/* By indicator */}
          <section>
            <SectionLabel>Accuracy by Indicator</SectionLabel>
            <p className="text-sm text-muted mb-4">
              Aggregated across all countries. Positive bias = systematically too high; negative = too low.
            </p>
            <DataTable
              head={
                <>
                  <th className="text-left px-5 py-3">Indicator</th>
                  <th className="text-right px-5 py-3">Scored</th>
                  <th className="text-right px-5 py-3">MAE</th>
                  <th className="text-right px-5 py-3">Bias</th>
                </>
              }
            >
              {accuracyByIndicator.map((row) => {
                const b = fmtBias(row.avgBias);
                return (
                  <tr key={row.indicatorName} className="hover:bg-bg transition-colors">
                    <td className="px-5 py-3.5 text-base font-medium text-ink">
                      {row.indicatorName}
                    </td>
                    <td
                      className="px-5 py-3.5 text-right text-base text-muted tabular-nums"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      {row.scoredCount}
                    </td>
                    <td
                      className="px-5 py-3.5 text-right text-base tabular-nums"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      {fmtError(row.avgAbsoluteError)}
                    </td>
                    <td
                      className={`px-5 py-3.5 text-right text-base tabular-nums ${b.cls}`}
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      {b.label}
                    </td>
                  </tr>
                );
              })}
            </DataTable>
          </section>

          {/* By country */}
          <section>
            <SectionLabel>Accuracy by Country</SectionLabel>
            <DataTable
              head={
                <>
                  <th className="text-left px-5 py-3">Country</th>
                  <th className="text-right px-5 py-3">Scored</th>
                  <th className="text-right px-5 py-3">MAE</th>
                  <th className="text-right px-5 py-3">Bias</th>
                </>
              }
            >
              {accuracyByCountry.map((row) => {
                const b = fmtBias(row.avgBias);
                return (
                  <tr key={row.countryCode} className="hover:bg-bg transition-colors">
                    <td className="px-5 py-3.5 text-base font-medium text-ink">
                      {row.countryCode}
                    </td>
                    <td
                      className="px-5 py-3.5 text-right text-base text-muted tabular-nums"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      {row.scoredCount}
                    </td>
                    <td
                      className="px-5 py-3.5 text-right text-base tabular-nums"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      {fmtError(row.avgAbsoluteError)}
                    </td>
                    <td
                      className={`px-5 py-3.5 text-right text-base tabular-nums ${b.cls}`}
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      {b.label}
                    </td>
                  </tr>
                );
              })}
            </DataTable>
          </section>

          {/* By horizon */}
          {accuracyByHorizon.length > 0 && (
            <section>
              <SectionLabel>Accuracy by Forecast Horizon</SectionLabel>
              <p className="text-sm text-muted mb-4">
                Accuracy typically degrades at longer horizons.
              </p>
              <DataTable
                head={
                  <>
                    <th className="text-left px-5 py-3">Horizon</th>
                    <th className="text-right px-5 py-3">Scored</th>
                    <th className="text-right px-5 py-3">MAE</th>
                    <th className="text-right px-5 py-3">Bias</th>
                  </>
                }
              >
                {accuracyByHorizon
                  .filter((r) => r.horizon >= 0 && r.horizon <= 5)
                  .map((row) => {
                    const b = fmtBias(row.avgBias);
                    return (
                      <tr key={row.horizon} className="hover:bg-bg transition-colors">
                        <td className="px-5 py-3.5 text-base font-medium text-ink">
                          {horizonLabel(row.horizon)}
                        </td>
                        <td
                          className="px-5 py-3.5 text-right text-base text-muted tabular-nums"
                          style={{ fontFamily: "var(--font-mono)" }}
                        >
                          {row.scoredCount}
                        </td>
                        <td
                          className="px-5 py-3.5 text-right text-base tabular-nums"
                          style={{ fontFamily: "var(--font-mono)" }}
                        >
                          {fmtError(row.avgAbsoluteError)}
                        </td>
                        <td
                          className={`px-5 py-3.5 text-right text-base tabular-nums ${b.cls}`}
                          style={{ fontFamily: "var(--font-mono)" }}
                        >
                          {b.label}
                        </td>
                      </tr>
                    );
                  })}
              </DataTable>
            </section>
          )}

          {/* Full breakdown */}
          <section>
            <SectionLabel>Full Breakdown</SectionLabel>
            <DataTable
              head={
                <>
                  <th className="text-left px-5 py-3">Variable</th>
                  <th className="text-left px-5 py-3">Country</th>
                  <th className="text-right px-5 py-3">Forecasts</th>
                  <th className="text-right px-5 py-3">MAE</th>
                  <th className="text-right px-5 py-3">vs Consensus</th>
                </>
              }
            >
              {accuracyByVariable.map((row) => (
                <tr key={row.variableId} className="hover:bg-bg transition-colors">
                  <td className="px-5 py-3.5">
                    <Link
                      href={`/variables/${row.variableId}`}
                      className="text-base text-ink hover:text-accent transition-colors"
                    >
                      {row.variableName}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-sm font-medium tracking-wide text-muted">
                    {row.countryCode}
                  </td>
                  <td
                    className="px-5 py-3.5 text-right text-base tabular-nums text-muted"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {row.forecastCount}
                  </td>
                  <td
                    className="px-5 py-3.5 text-right text-base tabular-nums"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {row.avgAbsoluteError != null
                      ? parseFloat(row.avgAbsoluteError).toFixed(2)
                      : <span className="text-muted">—</span>}
                  </td>
                  <td
                    className="px-5 py-3.5 text-right text-base tabular-nums"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {row.avgScoreVsConsensus != null ? (
                      <span
                        className={
                          parseFloat(row.avgScoreVsConsensus) < 0
                            ? "text-signal-green font-medium"
                            : "text-signal-red"
                        }
                      >
                        {parseFloat(row.avgScoreVsConsensus) > 0 ? "+" : ""}
                        {parseFloat(row.avgScoreVsConsensus).toFixed(2)}
                      </span>
                    ) : <span className="text-muted">—</span>}
                  </td>
                </tr>
              ))}
            </DataTable>
          </section>
        </>
      )}
    </div>
  );
}
