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
  height?: number;
  estimatesStartAfter?: number;
}

// Institutional palette: first non-actuals/consensus slots
const FORECASTER_COLORS = [
  "#EA580C", // orange
  "#7C3AED", // violet
  "#0891B2", // cyan
  "#BE185D", // pink
  "#059669", // green
  "#0D5C6B", // teal
  "#92400E", // brown
  "#4338CA", // indigo
];

export function ForecastChart({
  data,
  series,
  unit,
  height = 480,
  estimatesStartAfter,
}: ForecastChartProps) {
  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-base text-muted"
        style={{ height }}
      >
        No chart data available yet.
      </div>
    );
  }

  const pctUnit = unit.includes("%");
  // Consensus gets the brand blue; other forecasters get the rotation palette
  let forecasterColorIndex = 0;
  const colorMap: Record<string, string> = {};
  for (const s of series) {
    if (s.slug === "consensus") {
      colorMap[s.slug] = "#1D4ED8";
    } else {
      colorMap[s.slug] = FORECASTER_COLORS[forecasterColorIndex % FORECASTER_COLORS.length];
      forecasterColorIndex++;
    }
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="2 4" stroke="#E5E7EB" vertical={false} />
        <XAxis
          dataKey="period"
          tick={{ fontSize: 12, fill: "#6B7280", fontFamily: "var(--font-mono)" }}
          axisLine={{ stroke: "#E5E7EB" }}
          tickLine={false}
          dy={6}
        />
        <YAxis
          tick={{ fontSize: 12, fill: "#6B7280", fontFamily: "var(--font-mono)" }}
          tickFormatter={(v) => `${v}${pctUnit ? "%" : ""}`}
          width={48}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          formatter={(value: number, name: string) => [
            `${value?.toFixed(2)}${pctUnit ? "%" : ` ${unit}`}`,
            name,
          ]}
          labelStyle={{
            fontWeight: 700,
            color: "#111827",
            fontFamily: "var(--font-sans)",
            fontSize: 13,
            marginBottom: 4,
          }}
          contentStyle={{
            fontSize: 13,
            border: "1px solid #E5E7EB",
            backgroundColor: "#FFFFFF",
            borderRadius: 10,
            color: "#111827",
            boxShadow: "0 8px 24px rgba(15, 23, 42, 0.10)",
            padding: "10px 14px",
          }}
          itemStyle={{ padding: "2px 0" }}
        />
        <Legend
          wrapperStyle={{
            fontSize: 13,
            fontFamily: "var(--font-sans)",
            color: "#6B7280",
            paddingTop: 12,
          }}
        />

        {estimatesStartAfter && (
          <ReferenceLine
            x={String(estimatesStartAfter)}
            stroke="#D1D5DB"
            strokeDasharray="4 2"
            label={{
              value: "forecast →",
              position: "insideTopRight",
              fontSize: 11,
              fill: "#9CA3AF",
            }}
          />
        )}

        {/* Actuals — boldest, most authoritative */}
        <Line
          type="monotone"
          dataKey="actual"
          name="Actual"
          stroke="#111827"
          strokeWidth={3}
          dot={{ r: 4, fill: "#111827", strokeWidth: 0 }}
          activeDot={{ r: 5 }}
          connectNulls={false}
        />

        {/* Named series: consensus blue, forecasters rotate */}
        {series.map((s) => (
          <Line
            key={s.slug}
            type="monotone"
            dataKey={s.slug}
            name={s.name}
            stroke={colorMap[s.slug]}
            strokeWidth={s.slug === "consensus" ? 2.5 : 1.5}
            strokeDasharray={s.slug !== "consensus" ? "5 3" : undefined}
            dot={false}
            activeDot={{ r: 4 }}
            connectNulls={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
