// Public data-sources methodology page for provenance, actuals, and ingestion rules.

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { SectionLabel } from "@/components/ui/SectionLabel";

export const revalidate = 3600;

const provenanceItems = [
  {
    title: "Source documents",
    body: "Every imported release should have a source name, publication name, vintage label, URL or file reference, hash, and ingestion time.",
  },
  {
    title: "Ingestion runs",
    body: "Every parser run records status, created rows, updated rows, skipped rows, errors, start time, and finish time.",
  },
  {
    title: "Variable mappings",
    body: "Source-specific variable codes are mapped explicitly to Farfield variables, with notes for unit or definition differences.",
  },
  {
    title: "Quality flags",
    body: "Failed parses, ambiguous mappings, and data-source concerns are reviewable before public scoring depends on them.",
  },
];

const actualRules = [
  "For core macro scoring, Farfield prefers WEO-carried observations identified as historical or actual data where the source status supports national-authority or equivalent treatment.",
  "World Bank rows can remain useful as references or fallback exceptions, but they are not the default scoring baseline when WEO-carried national-authority actuals are available.",
  "Fiscal-year observations are mapped conservatively using explicit metadata and methodology notes.",
  "First-release and latest-release actuals must be separable so future scoring views can answer different questions.",
];

export default function DataSourcesMethodologyPage() {
  return (
    <article className="mx-auto max-w-4xl">
      <nav className="mb-8 flex items-center gap-2 text-sm text-muted">
        <Link href="/methodology" className="transition-colors hover:text-ink">
          Methodology
        </Link>
        <span>/</span>
        <span className="text-ink">Data sources</span>
      </nav>

      <header className="border-b border-border pb-8">
        <SectionLabel>Data Sources</SectionLabel>
        <h1
          className="max-w-3xl text-5xl leading-tight tracking-tight text-ink"
          style={{ fontFamily: "var(--font-display)" }}
        >
          The source record comes before the score
        </h1>
        <p className="mt-5 max-w-3xl text-xl leading-8 text-muted">
          Farfield treats forecast and actual data as sourced records. The platform
          stores where a value came from, when it was published, how it was parsed, and
          whether the mapping needs review.
        </p>
      </header>

      <section className="mt-10">
        <SectionLabel>Provenance Layer</SectionLabel>
        <div className="grid gap-4 md:grid-cols-2">
          {provenanceItems.map((item) => (
            <Card key={item.title} padding="md">
              <h2
                className="text-xl leading-tight text-ink"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {item.title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted">{item.body}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-12 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <SectionLabel>Actuals Policy</SectionLabel>
          <h2
            className="text-3xl leading-tight text-ink"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Actuals are not just latest history
          </h2>
        </div>
        <Card padding="lg" className="border-l-4 border-l-accent">
          <ul className="space-y-4">
            {actualRules.map((rule) => (
              <li key={rule} className="flex gap-3 text-sm leading-6 text-muted">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                <span>{rule}</span>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <section className="mt-12">
        <Card padding="lg" className="bg-bg">
          <SectionLabel>Public Boundary</SectionLabel>
          <p className="max-w-3xl text-base leading-7 text-muted">
            Public pages may show actuals, source labels, coverage counts, and source
            notes. Forecast values, paid consensus values, vintage paths, exports, and
            reconstructive chart data require subscriber access.
          </p>
        </Card>
      </section>
    </article>
  );
}
