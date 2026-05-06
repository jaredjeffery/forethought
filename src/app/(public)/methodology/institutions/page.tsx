// Public institutions methodology page for managed and claimed profile rules.

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { SectionLabel } from "@/components/ui/SectionLabel";

export const revalidate = 3600;

const profileRules = [
  {
    title: "Farfield-managed profiles",
    body: "Seeded institution profiles can exist without a user account. Farfield controls the source record, coverage, scoring, and methodology panels.",
  },
  {
    title: "Claimed institution profiles",
    body: "A verified owner may later maintain profile copy, logos, links, and contact details. They cannot change forecast history or score outputs.",
  },
  {
    title: "Independent forecasters",
    body: "Individual forecasters can eventually manage their storefront and publish analysis, while Farfield controls the trust panel and score history.",
  },
];

const editableFields = [
  ["Can edit later", "Description, logo, homepage link, profile topics, products, public reports."],
  ["Cannot edit", "Forecast rows imported from public releases, actuals, scores, ranking rules, source documents."],
  ["Needs review", "Claim requests, identity checks, institutional email proof, and disputed profile facts."],
];

export default function InstitutionsMethodologyPage() {
  return (
    <article className="mx-auto max-w-4xl">
      <nav className="mb-8 flex items-center gap-2 text-sm text-muted">
        <Link href="/methodology" className="transition-colors hover:text-ink">
          Methodology
        </Link>
        <span>/</span>
        <span className="text-ink">Institutions</span>
      </nav>

      <header className="border-b border-border pb-8">
        <SectionLabel>Institutions</SectionLabel>
        <h1
          className="max-w-3xl text-5xl leading-tight tracking-tight text-ink"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Profiles and score records have different owners
        </h1>
        <p className="mt-5 max-w-3xl text-xl leading-8 text-muted">
          Farfield separates the public profile from the forecast record. Institutions
          can eventually claim and improve their profile, but cannot edit the data that
          Farfield uses for scoring or trust signals.
        </p>
      </header>

      <section className="mt-10 grid gap-4 md:grid-cols-3">
        {profileRules.map((rule) => (
          <Card key={rule.title} padding="md" className="h-full">
            <h2
              className="text-xl leading-tight text-ink"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {rule.title}
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted">{rule.body}</p>
          </Card>
        ))}
      </section>

      <section className="mt-12 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <SectionLabel>Control Split</SectionLabel>
          <h2
            className="text-3xl leading-tight text-ink"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Storefront fields are not trust-panel fields
          </h2>
        </div>
        <Card padding="none" className="overflow-hidden">
          <div className="divide-y divide-border">
            {editableFields.map(([title, body]) => (
              <div key={title} className="grid gap-3 px-5 py-4 sm:grid-cols-[160px_1fr]">
                <p className="text-sm font-semibold text-ink">{title}</p>
                <p className="text-sm leading-6 text-muted">{body}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="mt-12">
        <Card padding="lg" className="border-l-4 border-l-accent">
          <SectionLabel>Why this matters</SectionLabel>
          <p className="max-w-3xl text-base leading-7 text-muted">
            Forecasters should be able to explain themselves and sell analysis. Farfield
            should protect the evidence layer: source documents, forecasts, actuals,
            scoring methodology, and the trust panel that readers rely on.
          </p>
        </Card>
      </section>
    </article>
  );
}
