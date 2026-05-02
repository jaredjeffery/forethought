// Public methodology detail page backed by the static content registry.

import Link from "next/link";
import { notFound } from "next/navigation";
import { findMethodologyNote, methodologyNotes } from "@/lib/content";
import { Card } from "@/components/ui/Card";
import { SectionLabel } from "@/components/ui/SectionLabel";

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return methodologyNotes.map((note) => ({ slug: note.slug }));
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const note = findMethodologyNote(slug);

  if (!note) return {};

  return {
    title: `${note.title} | Farfield Methodology`,
    description: note.dek,
  };
}

export default async function MethodologyDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const note = findMethodologyNote(slug);

  if (!note) notFound();

  return (
    <article className="mx-auto max-w-3xl">
      <nav className="mb-8 flex items-center gap-2 text-sm text-muted">
        <Link href="/methodology" className="transition-colors hover:text-ink">
          Methodology
        </Link>
        <span>/</span>
        <span className="text-ink">{note.title}</span>
      </nav>

      <header className="border-b border-border pb-8">
        <SectionLabel>{note.label}</SectionLabel>
        <h1
          className="text-5xl leading-tight tracking-tight text-ink"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {note.title}
        </h1>
        <p className="mt-5 text-xl leading-8 text-muted">{note.dek}</p>
        <div className="mt-6 flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-widest text-muted">
          <span className="rounded-full bg-surface px-3 py-1">{note.tag}</span>
          <span className="rounded-full bg-surface px-3 py-1">{note.readingTime}</span>
          <span className="rounded-full bg-surface px-3 py-1">{note.publishedAt}</span>
        </div>
      </header>

      <div className="mt-10 space-y-8">
        {note.sections.map((section) => (
          <section key={section.heading}>
            <h2
              className="text-2xl leading-tight text-ink"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {section.heading}
            </h2>
            <div className="mt-4 space-y-4">
              {section.body.map((paragraph) => (
                <p key={paragraph} className="text-base leading-8 text-muted">
                  {paragraph}
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>

      <Card padding="md" className="mt-12 border-l-4 border-l-accent">
        <p className="text-sm font-semibold text-ink">Implementation checkpoint</p>
        <p className="mt-2 text-sm leading-6 text-muted">
          This public note describes the rule. The enforcement lives in server-side
          access helpers, API guards, ingestion audit tables, and leakage tests.
        </p>
      </Card>
    </article>
  );
}
