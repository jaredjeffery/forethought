// Renders approved public-safe widgets for forecaster profile middle sections.

import { Card } from "@/components/ui/Card";
import { SectionLabel } from "@/components/ui/SectionLabel";
import type { ForecasterProfileViewConfig, ProfileWidgetKey } from "@/lib/forecaster-profile";
import { PROFILE_WIDGET_DEFINITIONS } from "@/lib/forecaster-profile";
import Link from "next/link";

type CoverageIndicatorRow = {
  indicatorName: string;
  forecastCount: number | string;
  scoredCount: number | string;
  countryCount: number | string;
};

type CoverageCountryRow = {
  countryCode: string;
  forecastCount: number | string;
  scoredCount: number | string;
  variableCount: number | string;
};

type VintageRow = {
  vintage: string | null;
};

interface ForecasterWidgetRendererProps {
  profile: ForecasterProfileViewConfig;
  coverageByIndicator: CoverageIndicatorRow[];
  coverageByCountry: CoverageCountryRow[];
  vintages: VintageRow[];
}

function CoverageBar({ value, max }: { value: number; max: number }) {
  const ratio = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="h-2 overflow-hidden rounded-full bg-bg-alt">
      <div className="h-full rounded-full bg-cobalt" style={{ width: `${Math.max(ratio, 2)}%` }} />
    </div>
  );
}

function TrackRecordWidget({
  coverageByIndicator,
}: {
  coverageByIndicator: CoverageIndicatorRow[];
}) {
  const indicatorMax = coverageByIndicator.reduce(
    (max, row) => Math.max(max, Number(row.forecastCount)),
    0,
  );

  return (
    <Card padding="lg">
      <SectionLabel>Track Record</SectionLabel>
      {coverageByIndicator.length === 0 ? (
        <p className="text-sm leading-6 text-muted">No public tracked forecasts yet.</p>
      ) : (
        <div className="space-y-4">
          {coverageByIndicator.slice(0, 6).map((row) => {
            const value = Number(row.forecastCount);
            return (
              <div
                key={row.indicatorName}
                className="grid gap-3 md:grid-cols-[1fr_120px_1.4fr_80px] md:items-center"
              >
                <span className="text-sm font-semibold text-ink">{row.indicatorName}</span>
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
      )}
    </Card>
  );
}

function CoverageWidget({
  coverageByCountry,
  vintages,
}: {
  coverageByCountry: CoverageCountryRow[];
  vintages: VintageRow[];
}) {
  return (
    <Card padding="lg">
      <SectionLabel>Coverage</SectionLabel>
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="grid gap-2 sm:grid-cols-3 md:grid-cols-4">
          {coverageByCountry.slice(0, 16).map((row) => (
            <div key={row.countryCode} className="rounded-md border border-border bg-bg px-3 py-3">
              <p className="font-mono text-sm font-bold text-ink">{row.countryCode}</p>
              <p className="mt-1 font-mono text-[10px] tabular-nums text-muted">
                {Number(row.forecastCount)} forecasts / {Number(row.variableCount)} indicators
              </p>
            </div>
          ))}
          {coverageByCountry.length === 0 && (
            <p className="text-sm leading-6 text-muted">No geography coverage is recorded yet.</p>
          )}
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
            Latest vintages
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {vintages.length > 0 ? (
              vintages.map((row) => (
                <span key={row.vintage} className="badge badge-neutral">
                  {row.vintage}
                </span>
              ))
            ) : (
              <p className="text-sm text-muted">No vintage labels recorded.</p>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

function TextWidget({ widget }: { widget: ProfileWidgetKey }) {
  const definition = PROFILE_WIDGET_DEFINITIONS[widget];

  if (widget === "latest_analysis") {
    return (
      <Card padding="lg">
        <SectionLabel>{definition.label}</SectionLabel>
        <p className="text-sm leading-6 text-muted">
          Public analysis and paid research modules will appear here as the editorial and product systems expand.
        </p>
        <Link href="/articles" className="btn-secondary mt-5">
          Browse Farfield analysis
        </Link>
      </Card>
    );
  }

  if (widget === "products") {
    return (
      <Card padding="lg">
        <SectionLabel>{definition.label}</SectionLabel>
        <p className="text-sm leading-6 text-muted">
          Subscriptions, reports, datasets, calls, and bespoke research will be listed here when forecaster products are live.
        </p>
        <Link href="/pricing" className="btn-primary mt-5">
          Request access
        </Link>
      </Card>
    );
  }

  return (
    <Card padding="lg">
      <SectionLabel>{definition.label}</SectionLabel>
      <p className="text-sm leading-6 text-muted">{definition.description}</p>
    </Card>
  );
}

export function ForecasterWidgetRenderer({
  profile,
  coverageByIndicator,
  coverageByCountry,
  vintages,
}: ForecasterWidgetRendererProps) {
  return (
    <section className="space-y-5">
      {profile.widgets.map((widget) => {
        if (widget === "track_record") {
          return (
            <TrackRecordWidget
              key={widget}
              coverageByIndicator={coverageByIndicator}
            />
          );
        }

        if (widget === "coverage") {
          return (
            <CoverageWidget
              key={widget}
              coverageByCountry={coverageByCountry}
              vintages={vintages}
            />
          );
        }

        return <TextWidget key={widget} widget={widget} />;
      })}
    </section>
  );
}
