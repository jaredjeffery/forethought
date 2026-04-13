"use client";
// Interactive time-series chart for a variable's forecast history and actuals.
// Uses Recharts. Rendered client-side since Recharts requires browser APIs.

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from "recharts";

export interface DataPoint {
  period: string;
  actual?: number | null;
  [forecasterSlug: string]: number | null | string | undefined;
}

interface ForecastSeries {
  slug: string;
  name: string;
  color: string;
}

interface ForecastChartProps {
  data: DataPoint[];
  series: ForecastSeries[];
  unit: string;
  estimatesStartAfter?: number; // year from which values are forecasts
}

// Colour palette for up to 8 forecasters
const COLORS = [
  "#2563eb", "#dc2626", "#16a34a", "#d97706",
  "#7c3aed", "#0891b2", "#be185d", "#65a30d",
];

export function ForecastChart({ data, series, unit, estimatesStartAfter }: ForecastChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-sm text-gray-400">
        No chart data available yet.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="period"
          tick={{ fontSize: 12, fill: "#6b7280" }}
        />
        <YAxis
          tick={{ fontSize: 12, fill: "#6b7280" }}
          tickFormatter={(v) => `${v}${unit.includes("%") ? "%" : ""}`}
          width={48}
        />
        <Tooltip
          formatter={(value: number, name: string) => [
            `${value?.toFixed(2)} ${unit}`,
            name,
          ]}
          labelStyle={{ fontWeight: 600 }}
          contentStyle={{ fontSize: 12 }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />

        {/* Dashed vertical line separating actuals from forecasts */}
        {estimatesStartAfter && (
          <ReferenceLine
            x={String(estimatesStartAfter)}
            stroke="#d1d5db"
            strokeDasharray="4 2"
            label={{ value: "forecast →", position: "insideTopRight", fontSize: 10, fill: "#9ca3af" }}
          />
        )}

        {/* Actuals line — bold black */}
        <Line
          type="monotone"
          dataKey="actual"
          name="Actual"
          stroke="#111827"
          strokeWidth={2}
          dot={{ r: 3, fill: "#111827" }}
          connectNulls={false}
        />

        {/* One line per forecaster */}
        {series.map((s, i) => (
          <Line
            key={s.slug}
            type="monotone"
            dataKey={s.slug}
            name={s.name}
            stroke={COLORS[i % COLORS.length]}
            strokeWidth={1.5}
            strokeDasharray={i > 0 ? "4 2" : undefined}
            dot={false}
            connectNulls={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
