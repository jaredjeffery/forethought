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

// Cobalt-anchored palette: cobalt primary, then coral, green, violet, cyan, amber
const COLORS = [
  "#1845F5", // cobalt
  "#FF5C35", // coral
  "#059669", // emerald
  "#7C3AED", // violet
  "#0891B2", // cyan
  "#D97706", // amber
  "#BE185D", // pink
  "#0D5C6B", // teal
];

export function ForecastChart({ data, series, unit, estimatesStartAfter }: ForecastChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-base text-muted">
        No chart data available yet.
      </div>
    );
  }

  const pctUnit = unit.includes("%");

  return (
    <ResponsiveContainer width="100%" height={340}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
        <XAxis
          dataKey="period"
          tick={{ fontSize: 12, fill: "#64748B", fontFamily: "var(--font-mono)" }}
          axisLine={{ stroke: "#E2E8F0" }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 12, fill: "#64748B", fontFamily: "var(--font-mono)" }}
          tickFormatter={(v) => `${v}${pctUnit ? "%" : ""}`}
          width={46}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          formatter={(value: number, name: string) => [
            `${value?.toFixed(2)}${pctUnit ? "%" : ` ${unit}`}`,
            name,
          ]}
          labelStyle={{ fontWeight: 700, color: "#0D0D18", fontFamily: "var(--font-sans)", fontSize: 13 }}
          contentStyle={{
            fontSize: 13,
            borderColor: "#E2E8F0",
            backgroundColor: "#ffffff",
            borderRadius: 6,
            color: "#0D0D18",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          }}
        />
        <Legend wrapperStyle={{ fontSize: 13, fontFamily: "var(--font-sans)", color: "#64748B", paddingTop: 8 }} />

        {estimatesStartAfter && (
          <ReferenceLine
            x={String(estimatesStartAfter)}
            stroke="#CBD5E1"
            strokeDasharray="4 2"
            label={{ value: "forecast →", position: "insideTopRight", fontSize: 11, fill: "#64748B" }}
          />
        )}

        {/* Actuals — bold ink */}
        <Line
          type="monotone"
          dataKey="actual"
          name="Actual"
          stroke="#0D0D18"
          strokeWidth={2.5}
          dot={{ r: 3.5, fill: "#0D0D18", strokeWidth: 0 }}
          connectNulls={false}
        />

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
