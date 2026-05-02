// Public forecaster profile with non-leaky coverage and trust signals.

import { getForecasterBySlug, getForecasterPublicProfileData } from "@/lib/forecaster-queries";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { MetricCard } from "@/components/ui/MetricCard";
import { SectionLabel } from "@/components/ui/SectionLabel";

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

function SourceBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-sm border border-border bg-bg px-2.5 py-1 text-xs font-semibold text-muted">
      {children}
    </span>
  );
}

function CoverageTable({
  head,
  children,
}: {
  head: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card padding="none">
      <div className="overflow-x-auto">
        <table className="min-w-full table-fixed">
          <thead className="border-b border-border bg-bg">
            <tr className="text-xs font-bold text-muted uppercase">
              {head}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">{children}</tbody>
        </table>
      </div>
    </Card>
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

  return (
    <div className="space-y-12">
      <nav className="text-sm text-muted flex items-center gap-1.5">
        <Link href="/forecasters" className="hover:text-ink transition-colors">
          Forecasters
        </Link>
        <span>/</span>
        <span className="text-ink">{forecaster.name}</span>
      </nav>

      <div>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <SourceBadge>{forecaster.type.toLowerCase()}</SourceBadge>
          <SourceBadge>{status}</SourceBadge>
          <SourceBadge>Farfield-managed profile</SourceBadge>
        </div>
        <h1
          className="text-5xl text-ink tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {forecaster.name}
        </h1>
        <div className="mt-2 h-[3px] w-12 bg-accent" />
      </div>

      <section>
        <SectionLabel>Public Trust Panel</SectionLabel>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Forecasts tracked" value={forecastCount || "-"} />
          <MetricCard label="Scored sample" value={scoredCount || "-"} />
          <MetricCard label="Variables covered" value={variableCount || "-"} />
          <MetricCard label="Countries covered" value={countryCount || "-"} />
        </div>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-muted">
          Public profiles show coverage, source status, and sample depth. Full accuracy tables,
          horizon rankings, consensus comparisons, and exports are subscriber-only.
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
          <section>
            <SectionLabel>Coverage by Indicator</SectionLabel>
            <CoverageTable
              head={
                <>
                  <th className="w-[44%] px-5 py-3 text-left">Indicator</th>
                  <th className="w-[18%] px-5 py-3 text-right">Forecasts</th>
                  <th className="w-[18%] px-5 py-3 text-right">Scored</th>
                  <th className="w-[20%] px-5 py-3 text-right">Countries</th>
                </>
              }
            >
              {coverageByIndicator.map((row) => (
                <tr key={row.indicatorName} className="hover:bg-bg transition-colors">
                  <td className="px-5 py-3.5 text-base font-medium text-ink">
                    {row.indicatorName}
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono text-base tabular-nums text-muted">
                    {row.forecastCount}
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono text-base tabular-nums text-muted">
                    {row.scoredCount}
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono text-base tabular-nums text-muted">
                    {row.countryCount}
                  </td>
                </tr>
              ))}
            </CoverageTable>
          </section>

          <section>
            <SectionLabel>Coverage by Country</SectionLabel>
            <CoverageTable
              head={
                <>
                  <th className="w-[44%] px-5 py-3 text-left">Country</th>
                  <th className="w-[18%] px-5 py-3 text-right">Forecasts</th>
                  <th className="w-[18%] px-5 py-3 text-right">Scored</th>
                  <th className="w-[20%] px-5 py-3 text-right">Variables</th>
                </>
              }
            >
              {coverageByCountry.slice(0, 30).map((row) => (
                <tr key={row.countryCode} className="hover:bg-bg transition-colors">
                  <td className="px-5 py-3.5 text-base font-medium text-ink">
                    {row.countryCode}
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono text-base tabular-nums text-muted">
                    {row.forecastCount}
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono text-base tabular-nums text-muted">
                    {row.scoredCount}
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono text-base tabular-nums text-muted">
                    {row.variableCount}
                  </td>
                </tr>
              ))}
            </CoverageTable>
          </section>

          <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
            <Card padding="lg">
              <SectionLabel>Latest Vintages</SectionLabel>
              <div className="flex flex-wrap gap-2">
                {vintages.length > 0 ? (
                  vintages.map((row) => (
                    <SourceBadge key={row.vintage}>{row.vintage}</SourceBadge>
                  ))
                ) : (
                  <p className="text-sm text-muted">No vintage labels recorded.</p>
                )}
              </div>
            </Card>
            <Card padding="lg" className="bg-bg">
              <SectionLabel>Subscriber Detail</SectionLabel>
              <p className="text-sm leading-6 text-muted">
                Accuracy by country, indicator, forecast horizon, consensus comparison, and
                variable-level exports are locked until subscriber access is enabled.
              </p>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}
