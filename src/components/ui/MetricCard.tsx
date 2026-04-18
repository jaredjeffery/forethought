// Single-stat display card for metric bands (forecaster profile, etc.).

interface MetricCardProps {
  label: string;
  value: string | number;
  valueClass?: string;     // override colour on the value
  subtext?: string;        // optional small line beneath value
}

export function MetricCard({ label, value, valueClass = "text-ink", subtext }: MetricCardProps) {
  return (
    <div className="card flex-1 min-w-[130px] px-6 py-5">
      <p className="text-xs font-bold tracking-wider text-muted uppercase">{label}</p>
      <p
        className={`mt-2 text-4xl font-bold tabular-nums leading-none ${valueClass}`}
        style={{ fontFamily: "var(--font-mono)" }}
      >
        {value}
      </p>
      {subtext && (
        <p className="mt-1.5 text-xs text-muted">{subtext}</p>
      )}
    </div>
  );
}
