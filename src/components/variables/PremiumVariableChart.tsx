"use client";
// Main variable chart workbench for public actuals and subscriber-only forecast layers.

import { useMemo, useState } from "react";
import { ForecastChart, type DataPoint } from "@/components/ForecastChart";

export interface PremiumConsensusPoint {
  targetPeriod: string;
  asOfDate: string;
  value: number;
  includedForecastCount: number;
}

export interface PremiumInstitutionPoint {
  targetPeriod: string;
  asOfDate: string;
  forecasterSlug: string;
  forecasterName: string;
  value: number;
}

export interface PremiumActualPoint {
  targetPeriod: string;
  value: number;
  source: string;
}

interface VariableChartWorkbenchProps {
  unit: string;
  access: "public" | "subscriber";
  consensus?: PremiumConsensusPoint[];
  publicInstitutionForecasts?: PremiumInstitutionPoint[];
  myForecasterForecasts?: PremiumInstitutionPoint[];
  actuals: PremiumActualPoint[];
}

const layerDefaults = {
  consensus: true,
  publicInstitutions: true,
  myForecasters: true,
};

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

function first<T>(values: T[]) {
  return values.length > 0 ? values[0] : undefined;
}

function last<T>(values: T[]) {
  return values.length > 0 ? values[values.length - 1] : undefined;
}

function seriesKey(prefix: string, slug: string) {
  return `${prefix}_${slug.replace(/[^a-zA-Z0-9_]/g, "_")}`;
}

function latestByTarget(points: PremiumConsensusPoint[]) {
  const rows = new Map<string, PremiumConsensusPoint>();
  for (const point of points) {
    const current = rows.get(point.targetPeriod);
    if (!current || point.asOfDate > current.asOfDate) {
      rows.set(point.targetPeriod, point);
    }
  }
  return rows;
}

function latestInstitutionByTarget(points: PremiumInstitutionPoint[]) {
  const rows = new Map<string, PremiumInstitutionPoint>();
  for (const point of points) {
    const key = `${point.forecasterSlug}:${point.targetPeriod}`;
    const current = rows.get(key);
    if (!current || point.asOfDate > current.asOfDate) {
      rows.set(key, point);
    }
  }
  return rows;
}

export function VariableChartWorkbench({
  unit,
  access,
  consensus = [],
  publicInstitutionForecasts = [],
  myForecasterForecasts = [],
  actuals,
}: VariableChartWorkbenchProps) {
  const allPeriods = uniqueSorted([
    ...actuals.map((point) => point.targetPeriod),
    ...consensus.map((point) => point.targetPeriod),
    ...publicInstitutionForecasts.map((point) => point.targetPeriod),
    ...myForecasterForecasts.map((point) => point.targetPeriod),
  ]);

  const [startPeriod, setStartPeriod] = useState(first(allPeriods) ?? "");
  const [endPeriod, setEndPeriod] = useState(last(allPeriods) ?? "");
  const [layers, setLayers] = useState(layerDefaults);

  const visibleData = useMemo(() => {
    const lower = startPeriod && endPeriod && startPeriod > endPeriod ? endPeriod : startPeriod;
    const upper = startPeriod && endPeriod && startPeriod > endPeriod ? startPeriod : endPeriod;
    const periods = allPeriods.filter((period) => {
      if (lower && period < lower) return false;
      if (upper && period > upper) return false;
      return true;
    });

    const actualByTarget = new Map(actuals.map((point) => [point.targetPeriod, point]));
    const rows = new Map<string, DataPoint>();
    for (const period of periods) {
      rows.set(period, {
        period,
        actual: actualByTarget.get(period)?.value ?? null,
      });
    }

    const seriesMap = new Map<string, { slug: string; name: string }>();

    if (access === "subscriber" && layers.consensus) {
      const latestConsensus = latestByTarget(consensus);
      for (const [period, point] of latestConsensus) {
        if (!rows.has(period)) continue;
        rows.get(period)!.consensus = point.value;
      }
      if (latestConsensus.size > 0) {
        seriesMap.set("consensus", { slug: "consensus", name: "Basic consensus" });
      }
    }

    if (access === "subscriber" && layers.publicInstitutions) {
      const latestInstitutionForecasts = latestInstitutionByTarget(publicInstitutionForecasts);
      for (const point of latestInstitutionForecasts.values()) {
        if (!rows.has(point.targetPeriod)) continue;
        const slug = seriesKey("institution", point.forecasterSlug);
        rows.get(point.targetPeriod)![slug] = point.value;
        seriesMap.set(slug, { slug, name: point.forecasterName });
      }
    }

    if (access === "subscriber" && layers.myForecasters) {
      const latestMyForecasts = latestInstitutionByTarget(myForecasterForecasts);
      for (const point of latestMyForecasts.values()) {
        if (!rows.has(point.targetPeriod)) continue;
        const slug = seriesKey("my", point.forecasterSlug);
        rows.get(point.targetPeriod)![slug] = point.value;
        seriesMap.set(slug, { slug, name: point.forecasterName });
      }
    }

    return {
      chartData: Array.from(rows.values()).sort((a, b) => a.period.localeCompare(b.period)),
      series: Array.from(seriesMap.values()),
      rangeLabel: lower && upper ? `${lower} to ${upper}` : "full history",
    };
  }, [
    access,
    actuals,
    allPeriods,
    consensus,
    endPeriod,
    layers.consensus,
    layers.myForecasters,
    layers.publicInstitutions,
    myForecasterForecasts,
    publicInstitutionForecasts,
    startPeriod,
  ]);

  if (allPeriods.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border p-8 text-sm leading-6 text-muted">
        No chart data available yet for this variable.
      </div>
    );
  }

  const canShowControls = access === "subscriber";

  return (
    <div className="space-y-5">
      {canShowControls ? (
        <div className="grid gap-4 border-b border-border pb-5 lg:grid-cols-[0.7fr_0.7fr_1.6fr]">
          <label className="text-xs font-bold uppercase tracking-widest text-muted">
            Start
            <select
              value={startPeriod}
              onChange={(event) => setStartPeriod(event.target.value)}
              className="mt-2 w-full rounded-md border border-border bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-ink"
            >
              {allPeriods.map((period) => (
                <option key={period} value={period}>
                  {period}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-bold uppercase tracking-widest text-muted">
            End
            <select
              value={endPeriod}
              onChange={(event) => setEndPeriod(event.target.value)}
              className="mt-2 w-full rounded-md border border-border bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-ink"
            >
              {allPeriods.map((period) => (
                <option key={period} value={period}>
                  {period}
                </option>
              ))}
            </select>
          </label>

          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-muted">Chart layers</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {[
                { key: "consensus", label: "Basic consensus", disabled: consensus.length === 0 },
                {
                  key: "publicInstitutions",
                  label: "Public institutions",
                  disabled: publicInstitutionForecasts.length === 0,
                },
                {
                  key: "myForecasters",
                  label: "My forecasters",
                  disabled: myForecasterForecasts.length === 0,
                },
              ].map(({ key, label, disabled }) => {
                const typedKey = key as keyof typeof layers;
                const isDisabled = disabled;
                return (
                  <label
                    key={key}
                    className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold ${
                      isDisabled
                        ? "border-border bg-bg-alt text-muted"
                        : "border-border bg-white text-ink"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={layers[typedKey] && !isDisabled}
                      disabled={isDisabled}
                      onChange={(event) =>
                        setLayers((current) => ({
                          ...current,
                          [typedKey]: event.target.checked,
                        }))
                      }
                    />
                    {label}
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="border-b border-border pb-4 text-sm leading-6 text-muted">
          Public view: actual outcomes only. Subscribers can add consensus, public institutions,
          subscribed forecasters, and exports.
        </div>
      )}

      <ForecastChart
        data={visibleData.chartData}
        series={visibleData.series}
        unit={unit}
        height={480}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-xs text-muted">
        <span>
          Showing <span className="font-semibold text-ink">{visibleData.rangeLabel}</span>.
        </span>
        {canShowControls ? (
          <span>CSV export is the next subscriber action to wire into this chart.</span>
        ) : (
          <span>Forecast and consensus values are not returned for public requests.</span>
        )}
      </div>
    </div>
  );
}
