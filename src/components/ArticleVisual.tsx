// Editorial visual treatments for article cards. Pure SVG/CSS, no premium data.
// Each visual kind is a chart-like composition tuned to the article topic,
// rendered with the Prism palette.

import type { PublicContentItem } from "@/lib/content";

interface ArticleVisualProps {
  article: PublicContentItem;
  size?: "sm" | "lg";
}

export function ArticleVisual({ article, size = "sm" }: ArticleVisualProps) {
  const kind = article.visualKind ?? "source-record";
  const height = size === "lg" ? 310 : 150;

  return (
    <div
      className="relative overflow-hidden bg-bg-alt"
      style={{ height }}
    >
      <div className="absolute left-4 top-4 z-[1] rounded-full border border-border bg-surface px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-muted shadow-sm">
        {article.column ?? article.label}
      </div>

      {kind === "oil-volatility" && <OilVolatilityViz size={size} />}
      {kind === "africa-gdp" && <AfricaGdpViz size={size} />}
      {kind === "satellite-crops" && <SatelliteCropsViz size={size} />}
      {kind === "leading-indicators" && <LeadingIndicatorsViz size={size} />}
      {kind === "forecaster-spotlight" && <ForecasterSpotlightViz size={size} />}
      {kind === "gdp-revisions" && <GdpRevisionsViz size={size} />}
      {kind === "scoring" && <ScoringViz size={size} />}
      {kind === "source-record" && <SourceRecordViz size={size} />}
    </div>
  );
}

/* ------------------------------ Oil volatility ------------------------------ */

function OilVolatilityViz({ size }: { size: "sm" | "lg" }) {
  // Brent-style volatility: line + dispersion band that widens around shocks.
  const points = [62, 68, 70, 65, 75, 92, 110, 95, 78, 65, 72, 88, 85, 70, 68];
  const high = points.map((v, i) => v + 8 + Math.abs(Math.sin(i * 0.7)) * 12);
  const low = points.map((v, i) => v - 6 - Math.abs(Math.cos(i * 0.5)) * 10);

  const minV = Math.min(...low);
  const maxV = Math.max(...high);
  const w = 100;
  const h = size === "lg" ? 80 : 75;
  const norm = (v: number) => h - ((v - minV) / (maxV - minV)) * h;

  const linePath = points
    .map((v, i) => `${i === 0 ? "M" : "L"}${(i / (points.length - 1)) * w} ${norm(v)}`)
    .join(" ");

  const bandTop = high
    .map((v, i) => `${i === 0 ? "M" : "L"}${(i / (high.length - 1)) * w} ${norm(v)}`)
    .join(" ");
  const bandBot = low
    .slice()
    .reverse()
    .map((v, i, arr) => `L${(1 - i / (arr.length - 1)) * w} ${norm(v)}`)
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className="absolute inset-0 h-full w-full"
      style={{ paddingTop: 44 }}
    >
      <path d={`${bandTop} ${bandBot} Z`} fill="var(--coral)" opacity={0.16} />
      <path d={linePath} stroke="var(--coral)" strokeWidth={1.5} fill="none" />
      {points.map((v, i) => (
        <circle
          key={i}
          cx={(i / (points.length - 1)) * w}
          cy={norm(v)}
          r={0.7}
          fill="var(--ink)"
        />
      ))}
    </svg>
  );
}

/* -------------------------------- Africa GDP -------------------------------- */

function AfricaGdpViz({ size }: { size: "sm" | "lg" }) {
  // Vintage shift visual: original vs revised GDP series for four countries.
  const countries = [
    { code: "GHA", original: [3.5, 4.2, 5.1, 6.3], revised: [3.2, 5.4, 6.0, 7.2] },
    { code: "KEN", original: [4.5, 4.9, 5.4, 5.7], revised: [5.1, 5.3, 5.7, 6.1] },
    { code: "NGA", original: [2.1, 2.6, 3.0, 2.9], revised: [3.4, 2.2, 3.5, 3.2] },
    { code: "ZAF", original: [1.2, 1.8, 0.6, 0.9], revised: [0.8, 1.4, 0.3, 1.1] },
  ];

  return (
    <div
      className="absolute inset-0 grid grid-cols-4 gap-2 p-4"
      style={{ paddingTop: size === "lg" ? 50 : 44 }}
    >
      {countries.map(({ code, original, revised }) => {
        const max = Math.max(...original, ...revised);
        return (
          <div key={code} className="flex flex-col">
            <div className="flex flex-1 items-end gap-1">
              {original.map((v, i) => (
                <div key={i} className="flex flex-1 flex-col items-stretch gap-px">
                  <div
                    className="bg-cobalt/40"
                    style={{ height: `${(v / max) * 100}%` }}
                  />
                  <div
                    className="bg-cobalt"
                    style={{ height: `${(revised[i] / max) * 100}%` }}
                  />
                </div>
              ))}
            </div>
            <p className="mt-2 text-center text-[10px] font-bold tracking-wide text-muted">
              {code}
            </p>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------ Satellite crops ----------------------------- */

function SatelliteCropsViz({ size }: { size: "sm" | "lg" }) {
  // NDVI-style heatmap: 8 columns × 4 rows, color encodes vegetation.
  const cells = Array.from({ length: 32 }, (_, i) => {
    // Pseudo-random but deterministic.
    const x = i % 8;
    const y = Math.floor(i / 8);
    const v = Math.sin(x * 0.7 + y * 1.1) * 0.5 + 0.5; // 0..1
    return v;
  });

  function colorFor(v: number) {
    if (v > 0.75) return "var(--teal)";
    if (v > 0.55) return "var(--teal-mid)";
    if (v > 0.4) return "var(--amber-mid)";
    if (v > 0.25) return "var(--amber)";
    return "var(--coral-mid)";
  }

  return (
    <div
      className="absolute inset-0 p-4"
      style={{ paddingTop: size === "lg" ? 50 : 44 }}
    >
      <div className="grid h-full grid-cols-8 grid-rows-4 gap-1">
        {cells.map((v, i) => (
          <div
            key={i}
            style={{ background: colorFor(v) }}
            className="rounded-[2px]"
          />
        ))}
      </div>
    </div>
  );
}

/* --------------------------- Leading indicators ---------------------------- */

function LeadingIndicatorsViz({ size }: { size: "sm" | "lg" }) {
  // Multi-row horizontal bar: signal strength across leading indicators.
  const rows = [
    { label: "Freight", v: 0.78, color: "var(--cobalt)" },
    { label: "PMI", v: 0.55, color: "var(--violet)" },
    { label: "Credit", v: 0.41, color: "var(--cyan)" },
    { label: "Rainfall", v: 0.66, color: "var(--amber)" },
  ];

  return (
    <div
      className="absolute inset-0 p-4"
      style={{ paddingTop: size === "lg" ? 50 : 44 }}
    >
      <div className="space-y-2.5">
        {rows.map((row) => (
          <div key={row.label} className="grid grid-cols-[64px_1fr_36px] items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted">
              {row.label}
            </span>
            <div className="h-2.5 overflow-hidden rounded-full bg-surface">
              <div
                className="h-full rounded-full"
                style={{ background: row.color, width: `${row.v * 100}%` }}
              />
            </div>
            <span className="text-right font-mono text-[10px] tabular-nums text-ink">
              {(row.v * 100).toFixed(0)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ----------------------------- Forecaster spotlight ------------------------ */

function ForecasterSpotlightViz({ size }: { size: "sm" | "lg" }) {
  // Eight-wedge prism dial signature, cropped on the right side.
  const wedges = [0.9, 0.7, 0.55, 0.8, 0.45, 0.65, 0.4, 0.6];
  const colors = [
    "#2952CC",
    "#7C3AED",
    "#0891B2",
    "#0D9488",
    "#CA8A04",
    "#D97706",
    "#E8442A",
    "#BE185D",
  ];
  const cx = 100;
  const cy = 50;
  const rOuter = 40;
  const rInner = 14;
  const n = 8;
  const step = (Math.PI * 2) / n;

  return (
    <svg
      viewBox="0 0 200 100"
      preserveAspectRatio="xMidYMid meet"
      className="absolute inset-0 h-full w-full"
      style={{ paddingTop: size === "lg" ? 28 : 22 }}
    >
      {wedges.map((w, i) => {
        const start = -Math.PI / 2 + i * step;
        const end = start + step - 0.04;
        const r = rInner + (rOuter - rInner) * w;
        const x1 = cx + Math.cos(start) * rInner;
        const y1 = cy + Math.sin(start) * rInner;
        const x2 = cx + Math.cos(start) * r;
        const y2 = cy + Math.sin(start) * r;
        const x3 = cx + Math.cos(end) * r;
        const y3 = cy + Math.sin(end) * r;
        const x4 = cx + Math.cos(end) * rInner;
        const y4 = cy + Math.sin(end) * rInner;
        const path = [
          `M${x1} ${y1}`,
          `L${x2} ${y2}`,
          `A${r} ${r} 0 0 1 ${x3} ${y3}`,
          `L${x4} ${y4}`,
          `A${rInner} ${rInner} 0 0 0 ${x1} ${y1}`,
          "Z",
        ].join(" ");
        return <path key={i} d={path} fill={colors[i]} opacity={0.85} />;
      })}
      <circle cx={cx} cy={cy} r={rInner - 1} fill="var(--surface)" />
      <text
        x={cx}
        y={cy + 4}
        textAnchor="middle"
        fontFamily="var(--font-display)"
        fontSize={14}
        fill="var(--cobalt)"
      >
        IMF
      </text>
    </svg>
  );
}

/* ------------------------------ GDP revisions ------------------------------ */

function GdpRevisionsViz({ size }: { size: "sm" | "lg" }) {
  // Three "vintage" lines drifting toward the eventual outturn.
  const final = [2.1, 2.4, 2.5, 2.3, 2.4, 2.5];
  const v1 = [1.4, 1.8, 2.0, 1.9, 2.1, 2.2];
  const v2 = [1.7, 2.1, 2.3, 2.1, 2.2, 2.3];
  const v3 = [1.9, 2.2, 2.4, 2.2, 2.3, 2.4];

  const w = 100;
  const h = size === "lg" ? 70 : 70;
  const all = [...final, ...v1, ...v2, ...v3];
  const minV = Math.min(...all) - 0.2;
  const maxV = Math.max(...all) + 0.2;
  const norm = (v: number) => h - ((v - minV) / (maxV - minV)) * h;

  function path(arr: number[]) {
    return arr
      .map((v, i) => `${i === 0 ? "M" : "L"}${(i / (arr.length - 1)) * w} ${norm(v)}`)
      .join(" ");
  }

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className="absolute inset-0 h-full w-full"
      style={{ paddingTop: 44 }}
    >
      <path d={path(v1)} stroke="var(--violet)" strokeWidth={1} fill="none" opacity={0.6} strokeDasharray="2 2" />
      <path d={path(v2)} stroke="var(--violet)" strokeWidth={1.2} fill="none" opacity={0.8} strokeDasharray="2 2" />
      <path d={path(v3)} stroke="var(--violet)" strokeWidth={1.4} fill="none" />
      <path d={path(final)} stroke="var(--ink)" strokeWidth={1.8} fill="none" />
    </svg>
  );
}

/* --------------------------------- Scoring -------------------------------- */

function ScoringViz({ size }: { size: "sm" | "lg" }) {
  // Three linked rectangles: forecast → actual → method, with arrows.
  return (
    <svg
      viewBox="0 0 200 90"
      preserveAspectRatio="xMidYMid meet"
      className="absolute inset-0 h-full w-full"
      style={{ paddingTop: size === "lg" ? 30 : 22 }}
    >
      {[
        { x: 12, label: "FORECAST", value: "F-2k", color: "var(--cobalt)" },
        { x: 78, label: "ACTUAL", value: "A-1r", color: "var(--teal)" },
        { x: 144, label: "METHOD", value: "v1.0", color: "var(--violet)" },
      ].map((b) => (
        <g key={b.label}>
          <rect
            x={b.x}
            y={20}
            width={44}
            height={50}
            rx={4}
            fill="var(--surface)"
            stroke={b.color}
            strokeWidth={1.2}
          />
          <text
            x={b.x + 22}
            y={36}
            fontSize={6}
            fontFamily="var(--font-sans)"
            fontWeight={700}
            fill="var(--muted)"
            textAnchor="middle"
          >
            {b.label}
          </text>
          <text
            x={b.x + 22}
            y={56}
            fontSize={11}
            fontFamily="var(--font-mono)"
            fontWeight={700}
            fill={b.color}
            textAnchor="middle"
          >
            {b.value}
          </text>
        </g>
      ))}
      <path
        d="M56 45 L78 45 M132 45 L144 45"
        stroke="var(--border-strong)"
        strokeWidth={1}
        markerEnd="url(#arrow)"
      />
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto">
          <path d="M0 0 L10 5 L0 10 Z" fill="var(--border-strong)" />
        </marker>
      </defs>
    </svg>
  );
}

/* ------------------------------ Source record ----------------------------- */

function SourceRecordViz({ size }: { size: "sm" | "lg" }) {
  const sources = [
    { name: "IMF-WEO", v: 0.92, color: "var(--cobalt)" },
    { name: "OECD-EO", v: 0.7, color: "var(--violet)" },
    { name: "ECB-MPD", v: 0.55, color: "var(--cyan)" },
    { name: "WB-GEP", v: 0.32, color: "var(--amber)" },
  ];

  return (
    <div
      className="absolute inset-0 p-4"
      style={{ paddingTop: size === "lg" ? 50 : 44 }}
    >
      <div className="space-y-2">
        {sources.map((s) => (
          <div
            key={s.name}
            className="grid grid-cols-[80px_1fr_30px] items-center gap-2"
          >
            <span className="font-mono text-[10px] font-bold text-ink">{s.name}</span>
            <div className="h-2 overflow-hidden rounded-sm bg-surface">
              <div
                className="h-full"
                style={{ background: s.color, width: `${s.v * 100}%` }}
              />
            </div>
            <span className="text-right font-mono text-[10px] tabular-nums text-muted">
              {(s.v * 100).toFixed(0)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
