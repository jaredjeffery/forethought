// Public scoring methodology page for Farfield accuracy and vintage rules.

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { SectionLabel } from "@/components/ui/SectionLabel";

export const revalidate = 3600;

const scoreLinks = [
  ["Forecast", "The original forecast row, forecaster, variable, target period, and vintage."],
  ["Actual", "The exact actual release used for scoring, including release number and source."],
  ["Method", "The scoring methodology version that produced the score."],
];

const metricCards = [
  {
    title: "Absolute error",
    body: "The size of the miss, regardless of direction. It answers: how far away was the forecast?",
  },
  {
    title: "Signed error",
    body: "The direction of the miss. Positive means the forecast was too high; negative means it was too low.",
  },
  {
    title: "Horizon",
    body: "The time between forecast_made_at and the target period, so short-horizon and long-horizon calls are not mixed casually.",
  },
  {
    title: "Consensus comparison",
    body: "Whether a forecast beat the relevant consensus benchmark. Public pages can describe this without exposing consensus values.",
  },
];

export default function ScoringMethodologyPage() {
  return (
    <article className="mx-auto max-w-4xl">
      <nav className="mb-8 flex items-center gap-2 text-sm text-muted">
        <Link href="/methodology" className="transition-colors hover:text-ink">
          Methodology
        </Link>
        <span>/</span>
        <span className="text-ink">Scoring</span>
      </nav>

      <header className="border-b border-border pb-8">
        <SectionLabel>Scoring</SectionLabel>
        <h1
          className="max-w-3xl text-5xl leading-tight tracking-tight text-ink"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Scores are only useful when the vintage is clear
        </h1>
        <p className="mt-5 max-w-3xl text-xl leading-8 text-muted">
          Farfield scores forecasts against exact actual releases and records the method
          version used. That keeps first-release, latest-release, and future scoring
          methods separate instead of overwriting the record.
        </p>
      </header>

      <section className="mt-10 grid gap-4 md:grid-cols-3">
        {scoreLinks.map(([title, body], index) => (
          <Card key={title} padding="md" className="border-l-4 border-l-accent">
            <p className="font-mono text-3xl font-bold text-accent">0{index + 1}</p>
            <h2
              className="mt-4 text-xl leading-tight text-ink"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {title}
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted">{body}</p>
          </Card>
        ))}
      </section>

      <section className="mt-12">
        <SectionLabel>Metrics</SectionLabel>
        <div className="grid gap-4 md:grid-cols-2">
          {metricCards.map((metric) => (
            <Card key={metric.title} padding="md">
              <h2
                className="text-xl leading-tight text-ink"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {metric.title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted">{metric.body}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-12 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <div>
          <SectionLabel>Publication Rule</SectionLabel>
          <h2
            className="text-3xl leading-tight text-ink"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Public trust signals first, detailed score tables later
          </h2>
        </div>
        <Card padding="lg" className="bg-bg">
          <p className="text-base leading-7 text-muted">
            Public pages may show ranked status, coverage, sample size, and broad trust
            signals. Subscriber pages can later show horizon-specific rankings, full
            comparison tables, exports, and forecast-versus-consensus detail after
            server-side plan checks.
          </p>
        </Card>
      </section>
    </article>
  );
}
