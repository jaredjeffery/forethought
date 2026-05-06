// Bar chart of actual outcomes for a variable. Pure server SVG. No forecasts,
// safe for all public/free pages. Positive bars cobalt, negative bars coral.

interface ActualsBar {
  period: string;
  value: number | null;
}

interface ActualsBarsProps {
  data: ActualsBar[];
  height?: number;
  unit?: string;
  className?: string;
  /** Highlight the latest bar with the cobalt brand colour. */
  highlightLast?: boolean;
}

export function ActualsBars({
  data,
  height = 160,
  unit = "",
  className,
  highlightLast = true,
}: ActualsBarsProps) {
  const filtered = data.filter((d): d is { period: string; value: number } => typeof d.value === "number");
  if (filtered.length === 0) {
    return (
      <div
        className={`flex items-center justify-center rounded-md border border-dashed border-border text-sm text-muted ${className ?? ""}`}
        style={{ height }}
      >
        No actuals yet
      </div>
    );
  }

  const values = filtered.map((d) => d.value);
  const maxAbs = Math.max(...values.map((v) => Math.abs(v)), 0.01);
  const yMid = height / 2;
  const half = height / 2 - 14;

  const barW = 100 / filtered.length;
  const gap = barW * 0.18;
  const innerW = barW - gap;

  const last = filtered[filtered.length - 1];
  const lastValue = last.value;
  const lastIsNegative = lastValue < 0;

  const isPct = unit.includes("%");
  const fmt = (v: number) => `${v > 0 ? "+" : ""}${v.toFixed(1)}${isPct ? "%" : ""}`;

  return (
    <div className={className}>
      <svg
        viewBox={`0 0 100 ${height}`}
        preserveAspectRatio="none"
        style={{ width: "100%", height }}
      >
        {/* Zero line */}
        <line
          x1={0}
          x2={100}
          y1={yMid}
          y2={yMid}
          stroke="var(--border-strong)"
          strokeWidth={0.5}
        />
        {filtered.map((d, i) => {
          const isLast = i === filtered.length - 1;
          const ratio = d.value / maxAbs;
          const barH = Math.abs(ratio) * half;
          const x = i * barW + gap / 2;
          const y = d.value >= 0 ? yMid - barH : yMid;
          const fill = isLast && highlightLast
            ? lastIsNegative
              ? "var(--coral)"
              : "var(--cobalt)"
            : d.value >= 0
              ? "var(--cobalt-mid)"
              : "var(--coral-mid)";
          return (
            <rect
              key={d.period}
              x={x}
              y={y}
              width={innerW}
              height={Math.max(barH, 0.5)}
              fill={fill}
              opacity={isLast ? 1 : 0.85}
              rx={0.5}
            />
          );
        })}
      </svg>
      <div className="mt-2 flex items-center justify-between text-[10px] font-mono tabular-nums text-muted">
        <span>{filtered[0]?.period}</span>
        <span className="text-ink font-semibold">
          Latest {last.period}: {fmt(lastValue)}
        </span>
        <span>{last.period}</span>
      </div>
    </div>
  );
}
