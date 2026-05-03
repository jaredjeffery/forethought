// Inline SVG sparkline. Pure server component. Used to show actuals trend
// alongside variable cards and inside forecaster profiles.

interface SparklineProps {
  values: (number | null | undefined)[];
  width?: number;
  height?: number;
  stroke?: string;
  fill?: string;
  /** Highlight the most recent point with a dot. */
  showLastDot?: boolean;
  /** Render a faint zero baseline. */
  zeroBaseline?: boolean;
  className?: string;
}

export function Sparkline({
  values,
  width = 140,
  height = 36,
  stroke = "var(--cobalt)",
  fill = "none",
  showLastDot = true,
  zeroBaseline = false,
  className,
}: SparklineProps) {
  const cleaned = values
    .map((v, i) => ({ v: typeof v === "number" ? v : null, i }))
    .filter((p): p is { v: number; i: number } => p.v !== null);

  if (cleaned.length < 2) {
    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className}>
        <line
          x1={0}
          x2={width}
          y1={height / 2}
          y2={height / 2}
          stroke="var(--border)"
          strokeDasharray="2 3"
        />
      </svg>
    );
  }

  const xs = cleaned.map((p) => p.i);
  const ys = cleaned.map((p) => p.v);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);

  const padY = (yMax - yMin) * 0.15 || 1;
  const yLo = yMin - padY;
  const yHi = yMax + padY;

  const xRange = xMax - xMin || 1;
  const yRange = yHi - yLo || 1;

  const points = cleaned.map((p) => {
    const x = ((p.i - xMin) / xRange) * (width - 4) + 2;
    const y = height - ((p.v - yLo) / yRange) * (height - 4) - 2;
    return { x, y };
  });

  const path = points
    .map((p, idx) => `${idx === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");

  const areaPath =
    fill !== "none" && fill !== undefined
      ? `${path} L${points[points.length - 1].x.toFixed(1)} ${height} L${points[0].x.toFixed(1)} ${height} Z`
      : null;

  const last = points[points.length - 1];
  const zeroY = yLo <= 0 && yHi >= 0
    ? height - ((0 - yLo) / yRange) * (height - 4) - 2
    : null;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      preserveAspectRatio="none"
    >
      {zeroBaseline && zeroY !== null && (
        <line
          x1={0}
          x2={width}
          y1={zeroY}
          y2={zeroY}
          stroke="var(--border-strong)"
          strokeDasharray="2 3"
          strokeWidth={1}
        />
      )}
      {areaPath && <path d={areaPath} fill={fill} />}
      <path
        d={path}
        fill="none"
        stroke={stroke}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {showLastDot && (
        <circle cx={last.x} cy={last.y} r={2.5} fill={stroke} />
      )}
    </svg>
  );
}
