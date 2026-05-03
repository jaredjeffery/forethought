// Prism Dial — a radial signature for the hero/spotlight panels.
// Eight prism-coloured wedges sized by `weights` (0..1). Pure SVG.
// Used as a non-leaky data shape: it represents coverage, scoring depth, etc.

interface PrismDialProps {
  weights: number[];          // length 1–8, values 0..1
  labels?: string[];           // optional labels rendered below
  size?: number;
  className?: string;
  innerRadiusRatio?: number;
}

const PRISM = [
  "#2952CC", // cobalt
  "#7C3AED", // violet
  "#0891B2", // cyan
  "#0D9488", // teal
  "#CA8A04", // marigold
  "#D97706", // amber
  "#E8442A", // coral
  "#BE185D", // rose
];

export function PrismDial({
  weights,
  labels,
  size = 200,
  innerRadiusRatio = 0.4,
  className,
}: PrismDialProps) {
  const cx = size / 2;
  const cy = size / 2;
  const rOuter = size / 2 - 6;
  const rInner = rOuter * innerRadiusRatio;
  const n = weights.length;
  const angleStep = (Math.PI * 2) / n;

  const wedges = weights.map((w, i) => {
    const start = -Math.PI / 2 + i * angleStep;
    const end = start + angleStep - 0.04; // small gap
    const r = rInner + (rOuter - rInner) * Math.max(0.08, Math.min(1, w));
    const x1 = cx + Math.cos(start) * rInner;
    const y1 = cy + Math.sin(start) * rInner;
    const x2 = cx + Math.cos(start) * r;
    const y2 = cy + Math.sin(start) * r;
    const x3 = cx + Math.cos(end) * r;
    const y3 = cy + Math.sin(end) * r;
    const x4 = cx + Math.cos(end) * rInner;
    const y4 = cy + Math.sin(end) * rInner;
    const largeArc = end - start > Math.PI ? 1 : 0;
    const path = [
      `M${x1} ${y1}`,
      `L${x2} ${y2}`,
      `A${r} ${r} 0 ${largeArc} 1 ${x3} ${y3}`,
      `L${x4} ${y4}`,
      `A${rInner} ${rInner} 0 ${largeArc} 0 ${x1} ${y1}`,
      "Z",
    ].join(" ");
    return { path, color: PRISM[i % PRISM.length] };
  });

  return (
    <div className={className}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {wedges.map((w, i) => (
          <path key={i} d={w.path} fill={w.color} opacity={0.85} />
        ))}
        <circle cx={cx} cy={cy} r={rInner - 1} fill="var(--surface)" />
      </svg>
      {labels && (
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] font-medium uppercase tracking-widest text-muted">
          {labels.slice(0, n).map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: PRISM[i % PRISM.length] }}
              />
              {label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
