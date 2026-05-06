"use client";
// Interactive time-series chart for a variable's forecast history and actuals.
// Uses Recharts. Rendered client-side since Recharts requires browser APIs.
// Colors come from the Prism design tokens via CSS variables.

import {
  Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, Area, ComposedChart,
} from "recharts";

export interface DataPoint {
  period: string;
  actual?: number | null;
  [forecasterSlug: string]: number | null | string | undefined;
}

interface ForecastSeries {
  slug: string;
  name: string;
  color?: string;
}

interface ForecastChartProps {
  data: DataPoint[];
  series: ForecastSeries[];
  unit: string;
  height?: number;
  estimatesStartAfter?: number;
  /** Optional dispersion band (subscriber view). Each entry: [lo, hi]. */
  band?: { lo: number; hi: number; period: string }[];
}

// Prism rotation: institutional forecaster colours, skipping cobalt (consensus) and ink (actual).
const PRISM_SERIES = [
  "#E8442A", // coral
  "#7C3AED", // violet
  "#0891B2", // cyan
  "#D97706", // amber
  "#0D9488", // teal
  "#BE185D", // rose
  "#CA8A04", // marigold
  "#4338CA", // indigo
];

const INK = "#18181B";
const COBALT = "#2952CC";
const BORDER = "#E4E4E7";
const MUTED = "#71717A";

export function ForecastChart({
  data,
  series,
  unit,
  height = 480,
  estimatesStartAfter,
  band,
}: ForecastChartProps) {
  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-md border border-dashed border-border text-base text-muted"
        style={{ height }}
      >
        No chart data available yet.
      </div>
    );
  }

  const pctUnit = unit.includes("%");

  // Consensus uses cobalt; other forecasters rotate through the prism palette.
  let prismIndex = 0;
  const colorMap: Record<string, string> = {};
  for (const s of series) {
    if (s.slug === "consensus") {
      colorMap[s.slug] = COBALT;
    } else if (s.color) {
      colorMap[s.slug] = s.color;
    } else {
      colorMap[s.slug] = PRISM_SERIES[prismIndex % PRISM_SERIES.length];
      prismIndex++;
    }
  }

  // If we have a dispersion band, fold it into the data points so the area renders.
  const chartData = band
    ? data.map((point) => {
        const match = band.find((b) => b.period === point.period);
        return match
          ? { ...point, _bandLo: match.lo, _bandHi: match.hi }
          : point;
      })
    : data;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="2 4" stroke={BORDER} vertical={false} />
        <XAxis
          dataKey="period"
          tick={{ fontSize: 12, fill: MUTED, fontFamily: "var(--font-mono)" }}
          axisLine={{ stroke: BORDER }}
          tickLine={false}
          dy={6}
        />
        <YAxis
          tick={{ fontSize: 12, fill: MUTED, fontFamily: "var(--font-mono)" }}
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
            color: INK,
            fontFamily: "var(--font-sans)",
            fontSize: 13,
            marginBottom: 4,
          }}
          contentStyle={{
            fontSize: 13,
            border: `1px solid ${BORDER}`,
            backgroundColor: "#FFFFFF",
            borderRadius: 12,
            color: INK,
            boxShadow: "0 8px 28px rgba(24,24,27,0.08)",
            padding: "10px 14px",
          }}
          itemStyle={{ padding: "2px 0" }}
        />
        <Legend
          wrapperStyle={{
            fontSize: 13,
            fontFamily: "var(--font-sans)",
            color: MUTED,
            paddingTop: 12,
          }}
        />

        {estimatesStartAfter && (
          <ReferenceLine
            x={String(estimatesStartAfter)}
            stroke={BORDER}
            strokeDasharray="4 2"
            label={{
              value: "forecast →",
              position: "insideTopRight",
              fontSize: 11,
              fill: MUTED,
            }}
          />
        )}

        {/* Optional dispersion band — cobalt at low opacity */}
        {band && (
          <Area
            type="monotone"
            dataKey="_bandHi"
            stroke="none"
            fill={COBALT}
            fillOpacity={0.08}
            isAnimationActive={false}
            legendType="none"
          />
        )}
        {band && (
          <Area
            type="monotone"
            dataKey="_bandLo"
            stroke="none"
            fill="#FFFFFF"
            fillOpacity={1}
            isAnimationActive={false}
            legendType="none"
          />
        )}

        {/* Actual outcomes — boldest, ink */}
        <Line
          type="monotone"
          dataKey="actual"
          name="Actual"
          stroke={INK}
          strokeWidth={3}
          dot={{ r: 4, fill: INK, strokeWidth: 0 }}
          activeDot={{ r: 5 }}
          isAnimationActive={false}
          connectNulls={false}
        />

        {/* Named series: consensus solid cobalt; forecasters rotate prism */}
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
            isAnimationActive={false}
            connectNulls={false}
          />
        ))}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
