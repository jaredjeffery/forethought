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
  estimatesStartAfter?: number;
}

// Warm editorial palette — ink for actuals, then amber/teal/plum/green/red for forecasters
const COLORS = [
  "#B5621A", // amber (primary)
  "#1B5E72", // deep teal
  "#6B3FA0", // plum
  "#2A6848", // forest green
  "#A83030", // brick red
  "#0D5C6B", // dark cyan
  "#7B4F1E", // saddle brown
  "#4A3F80", // indigo
];

export function ForecastChart({ data, series, unit, estimatesStartAfter }: ForecastChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-sm text-muted">
        No chart data available yet.
      </div>
    );
  }

  const pctUnit = unit.includes("%");

  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E3D8C9" vertical={false} />
        <XAxis
          dataKey="period"
          tick={{ fontSize: 11, fill: "#7A6A58", fontFamily: "var(--font-mono)" }}
          axisLine={{ stroke: "#E3D8C9" }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#7A6A58", fontFamily: "var(--font-mono)" }}
          tickFormatter={(v) => `${v}${pctUnit ? "%" : ""}`}
          width={44}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          formatter={(value: number, name: string) => [
            `${value?.toFixed(2)}${pctUnit ? "%" : ` ${unit}`}`,
            name,
          ]}
          labelStyle={{ fontWeight: 600, color: "#1A1209", fontFamily: "var(--font-sans)" }}
          contentStyle={{
            fontSize: 12,
            borderColor: "#E3D8C9",
            backgroundColor: "#FAF7F2",
            borderRadius: 4,
            color: "#1A1209",
          }}
        />
        <Legend
          wrapperStyle={{ fontSize: 11, fontFamily: "var(--font-sans)", color: "#7A6A58" }}
        />

        {estimatesStartAfter && (
          <ReferenceLine
            x={String(estimatesStartAfter)}
            stroke="#C8B8A4"
            strokeDasharray="4 2"
            label={{ value: "forecast →", position: "insideTopRight", fontSize: 10, fill: "#7A6A58" }}
          />
        )}

        {/* Actuals — bold ink */}
        <Line
          type="monotone"
          dataKey="actual"
          name="Actual"
          stroke="#1A1209"
          strokeWidth={2.5}
          dot={{ r: 3, fill: "#1A1209", strokeWidth: 0 }}
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
            strokeDasharray={s.slug !== "consensus" ? "5 3" : undefined}
            dot={false}
            connectNulls={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
