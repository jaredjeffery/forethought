"use client";
// Subscriber-only variable chart controls for consensus and accessible forecast layers.

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

interface PremiumVariableChartProps {
  unit: string;
  consensus: PremiumConsensusPoint[];
  publicInstitutionForecasts: PremiumInstitutionPoint[];
  myForecasterForecasts: PremiumInstitutionPoint[];
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

function last<T>(values: T[]) {
  return values.length > 0 ? values[values.length - 1] : undefined;
}

export function PremiumVariableChart({
  unit,
  consensus,
  publicInstitutionForecasts,
  myForecasterForecasts,
  actuals,
}: PremiumVariableChartProps) {
  const targetPeriods = uniqueSorted([
    ...consensus.map((point) => point.targetPeriod),
    ...publicInstitutionForecasts.map((point) => point.targetPeriod),
    ...myForecasterForecasts.map((point) => point.targetPeriod),
  ]);

  const [targetPeriod, setTargetPeriod] = useState(last(targetPeriods) ?? "");
  const [layers, setLayers] = useState(layerDefaults);

  const asOfDatesForTarget = uniqueSorted([
    ...consensus
      .filter((point) => point.targetPeriod === targetPeriod)
      .map((point) => point.asOfDate),
    ...publicInstitutionForecasts
      .filter((point) => point.targetPeriod === targetPeriod)
      .map((point) => point.asOfDate),
    ...myForecasterForecasts
      .filter((point) => point.targetPeriod === targetPeriod)
      .map((point) => point.asOfDate),
  ]);

  const [selectedAsOfDate, setSelectedAsOfDate] = useState(last(asOfDatesForTarget) ?? "");
  const effectiveAsOfDate = asOfDatesForTarget.includes(selectedAsOfDate)
    ? selectedAsOfDate
    : last(asOfDatesForTarget) ?? "";

  const visibleData = useMemo(() => {
    const actual = actuals.find((point) => point.targetPeriod === targetPeriod);
    const rows = new Map<string, DataPoint>();
    const seriesMap = new Map<string, { slug: string; name: string }>();

    function rowFor(asOfDate: string) {
      const row = rows.get(asOfDate) ?? {
        period: asOfDate,
        actual: actual?.value ?? null,
      };
      rows.set(asOfDate, row);
      return row;
    }

    if (layers.consensus) {
      for (const point of consensus) {
        if (point.targetPeriod !== targetPeriod || point.asOfDate > effectiveAsOfDate) continue;
        rowFor(point.asOfDate).consensus = point.value;
      }
      seriesMap.set("consensus", { slug: "consensus", name: "Basic consensus" });
    }

    if (layers.publicInstitutions) {
      for (const point of publicInstitutionForecasts) {
        if (point.targetPeriod !== targetPeriod || point.asOfDate > effectiveAsOfDate) continue;
        const slug = `institution_${point.forecasterSlug.replace(/[^a-zA-Z0-9_]/g, "_")}`;
        rowFor(point.asOfDate)[slug] = point.value;
        seriesMap.set(slug, { slug, name: point.forecasterName });
      }
    }

    if (layers.myForecasters) {
      for (const point of myForecasterForecasts) {
        if (point.targetPeriod !== targetPeriod || point.asOfDate > effectiveAsOfDate) continue;
        const slug = `my_${point.forecasterSlug.replace(/[^a-zA-Z0-9_]/g, "_")}`;
        rowFor(point.asOfDate)[slug] = point.value;
        seriesMap.set(slug, { slug, name: point.forecasterName });
      }
    }

    return {
      chartData: Array.from(rows.values()).sort((a, b) => a.period.localeCompare(b.period)),
      series: Array.from(seriesMap.values()),
      actual,
    };
  }, [
    actuals,
    consensus,
    effectiveAsOfDate,
    layers.consensus,
    layers.myForecasters,
    layers.publicInstitutions,
    myForecasterForecasts,
    publicInstitutionForecasts,
    targetPeriod,
  ]);

  if (targetPeriods.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border p-8 text-sm leading-6 text-muted">
        No subscriber forecast series are available for this variable yet.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 border-b border-border pb-5 lg:grid-cols-[0.8fr_0.8fr_1.4fr]">
        <label className="text-xs font-bold uppercase tracking-widest text-muted">
          Target period
          <select
            value={targetPeriod}
            onChange={(event) => {
              setTargetPeriod(event.target.value);
              setSelectedAsOfDate("");
            }}
            className="mt-2 w-full rounded-md border border-border bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-ink"
          >
            {targetPeriods.map((period) => (
              <option key={period} value={period}>
                {period}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs font-bold uppercase tracking-widest text-muted">
          As of
          <select
            value={effectiveAsOfDate}
            onChange={(event) => setSelectedAsOfDate(event.target.value)}
            className="mt-2 w-full rounded-md border border-border bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-ink"
          >
            {asOfDatesForTarget.map((date) => (
              <option key={date} value={date}>
                {date}
              </option>
            ))}
          </select>
        </label>

        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-muted">Chart layers</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {[
              ["consensus", "Basic consensus"],
              ["publicInstitutions", "Public institutions"],
              ["myForecasters", "My forecasters"],
            ].map(([key, label]) => {
              const typedKey = key as keyof typeof layers;
              const disabled = typedKey === "myForecasters" && myForecasterForecasts.length === 0;
              return (
                <label
                  key={key}
                  className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold ${
                    disabled
                      ? "border-border bg-bg-alt text-muted"
                      : "border-border bg-white text-ink"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={layers[typedKey] && !disabled}
                    disabled={disabled}
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

      <ForecastChart
        data={visibleData.chartData}
        series={visibleData.series}
        unit={unit}
        height={460}
      />

      <div className="grid gap-3 text-sm text-muted md:grid-cols-3">
        <div className="rounded-md border border-border bg-bg-alt p-4">
          <p className="font-semibold text-ink">Included for subscribers</p>
          <p className="mt-1 leading-6">
            Basic consensus and public institution series are shown when available.
          </p>
        </div>
        <div className="rounded-md border border-border bg-bg-alt p-4">
          <p className="font-semibold text-ink">My forecasters</p>
          <p className="mt-1 leading-6">
            Personal forecaster subscriptions will appear here once forecaster products are live.
          </p>
        </div>
        <div className="rounded-md border border-border bg-bg-alt p-4">
          <p className="font-semibold text-ink">Actual outcome</p>
          <p className="mt-1 leading-6">
            {visibleData.actual
              ? `${targetPeriod}: ${visibleData.actual.value.toFixed(2)} ${unit} from ${visibleData.actual.source}`
              : "No actual has been recorded for this target period yet."}
          </p>
        </div>
      </div>
    </div>
  );
}
