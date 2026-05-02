// Public methodology index for Farfield scoring, actuals, consensus, and access rules.

import Link from "next/link";
import { methodologyNotes } from "@/lib/content";
import { Card } from "@/components/ui/Card";
import { SectionLabel } from "@/components/ui/SectionLabel";

export const revalidate = 3600;

const corePages = [
  {
    href: "/methodology/scoring",
    label: "Scoring",
    title: "Scores, horizons, and vintages",
    body: "How forecast rows, actual releases, and methodology versions connect.",
  },
  {
    href: "/methodology/data-sources",
    label: "Data Sources",
    title: "Source documents and actuals",
    body: "How Farfield records source documents, ingestion runs, mappings, and quality flags.",
  },
  {
    href: "/methodology/institutions",
    label: "Institutions",
    title: "Profiles, claims, and trust panels",
    body: "What institutions can edit later, and what Farfield keeps fixed.",
  },
];

export default function MethodologyPage() {
  return (
    <div className="space-y-12">
      <section className="grid gap-8 border-b border-border pb-10 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <SectionLabel>Methodology</SectionLabel>
          <h1
            className="text-5xl leading-tight tracking-tight text-ink"
            style={{ fontFamily: "var(--font-display)" }}
          >
            How Farfield keeps the forecast record checkable
          </h1>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ["1", "Preserve the forecast vintage."],
            ["2", "Link scores to exact actual releases."],
            ["3", "Gate premium values server-side."],
          ].map(([step, text]) => (
            <Card key={step} padding="md">
              <p className="font-mono text-2xl font-bold text-accent">{step}</p>
              <p className="mt-3 text-sm leading-6 text-muted">{text}</p>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-5">
          <SectionLabel className="mb-2">Core Pages</SectionLabel>
          <h2
            className="text-3xl leading-tight tracking-tight text-ink"
            style={{ fontFamily: "var(--font-display)" }}
          >
            The rules behind the public record
          </h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {corePages.map((page) => (
            <Link key={page.href} href={page.href} className="group">
              <Card padding="lg" className="h-full transition-colors group-hover:border-accent">
                <p className="text-xs font-bold uppercase tracking-widest text-accent">
                  {page.label}
                </p>
                <h2
                  className="mt-6 text-2xl leading-tight text-ink group-hover:text-accent"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {page.title}
                </h2>
                <p className="mt-4 text-sm leading-6 text-muted">{page.body}</p>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-3">
          <SectionLabel className="mb-2">Methodology Notes</SectionLabel>
          <h2
            className="text-3xl leading-tight tracking-tight text-ink"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Specific source and access notes
          </h2>
        </div>
        {methodologyNotes.map((note) => (
          <Link key={note.slug} href={`/methodology/${note.slug}`} className="group">
            <Card padding="lg" className="h-full min-h-[280px] transition-colors group-hover:border-accent">
              <div className="flex h-full flex-col">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-accent">
                    {note.label}
                  </p>
                  <span className="rounded-full bg-bg px-3 py-1 text-xs font-semibold text-muted">
                    {note.tag}
                  </span>
                </div>
                <h2
                  className="mt-8 text-2xl leading-tight text-ink"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {note.title}
                </h2>
                <p className="mt-4 text-sm leading-6 text-muted">{note.dek}</p>
                <p className="mt-auto pt-8 text-xs font-semibold uppercase tracking-widest text-border-dark">
                  {note.readingTime}
                </p>
              </div>
            </Card>
          </Link>
        ))}
      </section>
    </div>
  );
}
