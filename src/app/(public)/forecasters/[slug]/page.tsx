// /forecasters/[slug] — institution or analyst profile page.

import { getForecasterBySlug, getForecasterProfileData } from "@/lib/forecaster-queries";
import { notFound } from "next/navigation";
import Link from "next/link";

export const revalidate = 3600;

function fmtError(v: string | null | undefined) {
  if (v == null) return "—";
  return parseFloat(v).toFixed(2);
}

function fmtBias(v: string | null | undefined) {
  if (v == null) return { label: "—", cls: "text-muted" };
  const n = parseFloat(v);
  const label = (n > 0 ? "+" : "") + n.toFixed(1) + "%";
  const cls = Math.abs(n) < 0.5 ? "text-ink" : n > 0 ? "text-coral" : "text-signal-green";
  return { label, cls };
}

function horizonLabel(h: number) {
  if (h === 0) return "Current year";
  return `${h}-year ahead`;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold tracking-widest text-accent uppercase mb-5">
      {children}
    </p>
  );
}

function DataTable({ head, children }: { head: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="border border-border rounded-lg overflow-x-auto">
      <table className="min-w-full">
        <thead className="border-b border-border bg-tinted">
          <tr className="text-xs font-bold tracking-wider text-muted uppercase">
            {head}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {children}
        </tbody>
      </table>
    </div>
  );
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function ForecasterProfilePage({ params }: PageProps) {
  const { slug } = await params;
  const forecaster = await getForecasterBySlug(slug);
  if (!forecaster) notFound();

  const { overallStats, accuracyByIndicator, accuracyByCountry, accuracyByHorizon, accuracyByVariable } =
    await getForecasterProfileData(forecaster.id);

  const totalForecasts = accuracyByVariable.reduce((s, r) => s + Number(r.forecastCount), 0);
  const scoredCount = Number(overallStats.scoredCount);
  const bias = fmtBias(overallStats.avgBias);
  const beatCount = Number(overallStats.beatConsensusCount);
  const vsTotal = Number(overallStats.vsConsensusTotal);
  const beatRate = vsTotal > 0 ? Math.round((beatCount / vsTotal) * 100) : null;

  return (
    <div className="space-y-14">
      <nav className="text-sm text-muted flex items-center gap-1.5">
        <Link href="/forecasters" className="hover:text-ink transition-colors">Forecasters</Link>
        <span>›</span>
        <span className="text-ink">{forecaster.name}</span>
      </nav>

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

        {(totalForecasts > 0 || scoredCount > 0) && (
          <div className="mt-8 flex flex-wrap gap-px border border-border rounded-lg overflow-hidden">
            {totalForecasts > 0 && (
              <div className="flex-1 min-w-[130px] px-6 py-5 bg-tinted">
                <p className="text-xs font-bold tracking-wider text-muted uppercase">Forecasts</p>
                <p className="mt-2 text-4xl font-bold text-ink tabular-nums" style={{ fontFamily: "var(--font-mono)" }}>
                  {totalForecasts}
                </p>
              </div>
            )}
            {scoredCount > 0 && (
              <div className="flex-1 min-w-[130px] px-6 py-5 bg-tinted">
                <p className="text-xs font-bold tracking-wider text-muted uppercase">Scored</p>
                <p className="mt-2 text-4xl font-bold text-ink tabular-nums" style={{ fontFamily: "var(--font-mono)" }}>
                  {scoredCount}
                </p>
              </div>
            )}
            {overallStats.avgBias != null && (
              <div className="flex-1 min-w-[130px] px-6 py-5 bg-tinted">
                <p className="text-xs font-bold tracking-wider text-muted uppercase">Avg bias</p>
                <p className={`mt-2 text-4xl font-bold tabular-nums ${bias.cls}`} style={{ fontFamily: "var(--font-mono)" }}>
                  {bias.label}
                </p>
              </div>
            )}
            {beatRate !== null && (
              <div className="flex-1 min-w-[130px] px-6 py-5 bg-tinted">
                <p className="text-xs font-bold tracking-wider text-muted uppercase">Beat consensus</p>
                <p
                  className={`mt-2 text-4xl font-bold tabular-nums ${beatRate >= 50 ? "text-signal-green" : "text-signal-red"}`}
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {beatRate}%
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {accuracyByIndicator.length === 0 ? (
        <p className="text-base text-muted py-8">
          No scored forecasts yet. Check back after the next data ingestion.
        </p>
      ) : (
        <>
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
                  <tr key={row.indicatorName} className="hover:bg-tinted transition-colors">
                    <td className="px-5 py-3.5 text-base font-medium text-ink">{row.indicatorName}</td>
                    <td className="px-5 py-3.5 text-right text-base text-muted tabular-nums" style={{ fontFamily: "var(--font-mono)" }}>{row.scoredCount}</td>
                    <td className="px-5 py-3.5 text-right text-base tabular-nums" style={{ fontFamily: "var(--font-mono)" }}>{fmtError(row.avgAbsoluteError)}</td>
                    <td className={`px-5 py-3.5 text-right text-base tabular-nums ${b.cls}`} style={{ fontFamily: "var(--font-mono)" }}>{b.label}</td>
                  </tr>
                );
              })}
            </DataTable>
          </section>

          <section>
            <SectionLabel>Accuracy by Country</SectionLabel>
            <p className="text-sm text-muted mb-4">
              Aggregated across all indicators. Sorted by MAE — most accurate first.
            </p>
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
                  <tr key={row.countryCode} className="hover:bg-tinted transition-colors">
                    <td className="px-5 py-3.5 text-base font-medium text-ink">{row.countryCode}</td>
                    <td className="px-5 py-3.5 text-right text-base text-muted tabular-nums" style={{ fontFamily: "var(--font-mono)" }}>{row.scoredCount}</td>
                    <td className="px-5 py-3.5 text-right text-base tabular-nums" style={{ fontFamily: "var(--font-mono)" }}>{fmtError(row.avgAbsoluteError)}</td>
                    <td className={`px-5 py-3.5 text-right text-base tabular-nums ${b.cls}`} style={{ fontFamily: "var(--font-mono)" }}>{b.label}</td>
                  </tr>
                );
              })}
            </DataTable>
          </section>

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
                  .filter((row) => row.horizon >= 0 && row.horizon <= 5)
                  .map((row) => {
                    const b = fmtBias(row.avgBias);
                    return (
                      <tr key={row.horizon} className="hover:bg-tinted transition-colors">
                        <td className="px-5 py-3.5 text-base font-medium text-ink">{horizonLabel(row.horizon)}</td>
                        <td className="px-5 py-3.5 text-right text-base text-muted tabular-nums" style={{ fontFamily: "var(--font-mono)" }}>{row.scoredCount}</td>
                        <td className="px-5 py-3.5 text-right text-base tabular-nums" style={{ fontFamily: "var(--font-mono)" }}>{fmtError(row.avgAbsoluteError)}</td>
                        <td className={`px-5 py-3.5 text-right text-base tabular-nums ${b.cls}`} style={{ fontFamily: "var(--font-mono)" }}>{b.label}</td>
                      </tr>
                    );
                  })}
              </DataTable>
            </section>
          )}

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
                <tr key={row.variableId} className="hover:bg-tinted transition-colors">
                  <td className="px-5 py-3.5">
                    <Link href={`/variables/${row.variableId}`} className="text-base text-ink hover:text-accent transition-colors">
                      {row.variableName}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-sm font-medium tracking-wide text-muted">{row.countryCode}</td>
                  <td className="px-5 py-3.5 text-right text-base tabular-nums text-muted" style={{ fontFamily: "var(--font-mono)" }}>{row.forecastCount}</td>
                  <td className="px-5 py-3.5 text-right text-base tabular-nums" style={{ fontFamily: "var(--font-mono)" }}>
                    {row.avgAbsoluteError != null ? parseFloat(row.avgAbsoluteError).toFixed(2) : <span className="text-muted">—</span>}
                  </td>
                  <td className="px-5 py-3.5 text-right text-base tabular-nums" style={{ fontFamily: "var(--font-mono)" }}>
                    {row.avgScoreVsConsensus != null ? (
                      <span className={parseFloat(row.avgScoreVsConsensus) < 0 ? "text-signal-green font-medium" : "text-signal-red"}>
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
