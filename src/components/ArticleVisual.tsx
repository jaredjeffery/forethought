// Editorial visual treatments for article cards without exposing premium data values.

import type { PublicContentItem } from "@/lib/content";

interface ArticleVisualProps {
  article: PublicContentItem;
  size?: "sm" | "lg";
}

const oilBars = [34, 62, 48, 80, 55, 72, 44, 88, 58, 70];
const gdpBars = [68, 46, 73, 39, 58, 81, 51];
const cropCells = [
  "bg-signal-green",
  "bg-signal-green",
  "bg-accent",
  "bg-signal-orange",
  "bg-signal-green",
  "bg-border-dark",
  "bg-signal-green",
  "bg-accent",
  "bg-signal-orange",
  "bg-signal-green",
  "bg-border-dark",
  "bg-signal-green",
];
const signalRows = ["Freight", "PMI", "Credit", "Rainfall"];

function Bars({ values, tone = "bg-accent" }: { values: number[]; tone?: string }) {
  return (
    <div className="flex h-full items-end gap-1.5">
      {values.map((value, index) => (
        <div
          key={`${value}-${index}`}
          className={`w-full ${tone}`}
          style={{ height: `${value}%` }}
        />
      ))}
    </div>
  );
}

function LineMock() {
  return (
    <div className="relative h-full">
      <div className="absolute left-0 right-0 top-1/4 border-t border-border-dark" />
      <div className="absolute left-0 right-0 top-1/2 border-t border-border-dark" />
      <div className="absolute left-0 right-0 top-3/4 border-t border-border-dark" />
      <div className="absolute bottom-[18%] left-[4%] h-[3px] w-[18%] -rotate-6 bg-accent" />
      <div className="absolute bottom-[31%] left-[20%] h-[3px] w-[20%] rotate-12 bg-accent" />
      <div className="absolute bottom-[44%] left-[38%] h-[3px] w-[18%] -rotate-12 bg-accent" />
      <div className="absolute bottom-[34%] left-[54%] h-[3px] w-[22%] rotate-6 bg-accent" />
      <div className="absolute bottom-[48%] left-[73%] h-[3px] w-[18%] -rotate-6 bg-accent" />
    </div>
  );
}

export function ArticleVisual({ article, size = "sm" }: ArticleVisualProps) {
  const kind = article.visualKind ?? "source-record";
  const height = size === "lg" ? "h-[310px]" : "h-[150px]";

  return (
    <div className={`relative overflow-hidden bg-bg ${height}`}>
      <div className="absolute left-4 top-4 z-[1] rounded-full bg-surface px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-muted shadow-sm">
        {article.column ?? article.label}
      </div>

      {kind === "oil-volatility" && (
        <div className="absolute inset-0 grid grid-cols-[0.75fr_1.25fr] gap-5 p-5 pt-14">
          <div className="flex flex-col justify-end">
            <p className="font-mono text-4xl font-bold leading-none text-ink">Brent</p>
            <p className="mt-2 text-xs font-semibold uppercase tracking-widest text-muted">
              volatility band
            </p>
          </div>
          <Bars values={oilBars} tone="bg-signal-orange" />
        </div>
      )}

      {kind === "africa-gdp" && (
        <div className="absolute inset-0 p-5 pt-14">
          <div className="mb-4 grid grid-cols-4 gap-2 text-center text-xs font-bold text-muted">
            {["GHA", "KEN", "NGA", "ZAF"].map((code) => (
              <span key={code} className="border border-border bg-surface py-1">
                {code}
              </span>
            ))}
          </div>
          <Bars values={gdpBars} tone="bg-accent" />
        </div>
      )}

      {kind === "satellite-crops" && (
        <div className="absolute inset-0 p-5 pt-14">
          <div className="grid h-full grid-cols-4 gap-2">
            {cropCells.map((className, index) => (
              <div key={index} className={`${className} border border-surface`} />
            ))}
          </div>
        </div>
      )}

      {kind === "leading-indicators" && (
        <div className="absolute inset-0 p-5 pt-14">
          <div className="space-y-3">
            {signalRows.map((row, index) => (
              <div key={row} className="grid grid-cols-[86px_1fr] items-center gap-3">
                <span className="text-xs font-bold uppercase tracking-widest text-muted">
                  {row}
                </span>
                <div className="h-2 bg-border">
                  <div
                    className="h-full bg-accent"
                    style={{ width: `${45 + index * 12}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {kind === "forecaster-spotlight" && (
        <div className="absolute inset-0 grid grid-cols-[0.8fr_1.2fr] gap-4 p-5 pt-14">
          <div className="flex items-center justify-center border border-border bg-surface">
            <span className="text-4xl font-bold text-accent" style={{ fontFamily: "var(--font-display)" }}>
              IMF
            </span>
          </div>
          <div className="grid gap-2">
            {["Coverage", "Vintages", "Score rows"].map((label, index) => (
              <div key={label} className="border border-border bg-surface px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
                  {label}
                </p>
                <div className="mt-2 h-1.5 bg-bg">
                  <div
                    className="h-full bg-accent"
                    style={{ width: `${72 - index * 14}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {kind === "gdp-revisions" && (
        <div className="absolute inset-0 p-5 pt-14">
          <LineMock />
        </div>
      )}

      {kind === "scoring" && (
        <div className="absolute inset-0 grid grid-cols-3 gap-3 p-5 pt-14">
          {["Forecast", "Actual", "Method"].map((label, index) => (
            <div key={label} className="flex flex-col justify-between border border-border bg-surface p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
                {label}
              </p>
              <p className="font-mono text-2xl font-bold text-ink">0{index + 1}</p>
            </div>
          ))}
        </div>
      )}

      {kind === "source-record" && (
        <div className="absolute inset-0 p-5 pt-14">
          <div className="grid h-full gap-2">
            {["IMF-WEO", "OECD-EO", "ECB-MPD"].map((source, index) => (
              <div key={source} className="grid grid-cols-[90px_1fr] items-center gap-3 border border-border bg-surface px-3">
                <span className="text-xs font-bold text-ink">{source}</span>
                <div className="h-1.5 bg-bg">
                  <div
                    className="h-full bg-signal-green"
                    style={{ width: `${85 - index * 15}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
