// Public methodology index for Farfield scoring, actuals, consensus, and access rules.

import Link from "next/link";
import { methodologyNotes } from "@/lib/content";
import { Card } from "@/components/ui/Card";
import { SectionLabel } from "@/components/ui/SectionLabel";

export const revalidate = 3600;

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

      <section className="grid gap-4 lg:grid-cols-3">
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
