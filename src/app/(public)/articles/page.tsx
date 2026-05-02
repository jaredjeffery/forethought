// Public article index for Farfield editorial previews and launch notes.

import Link from "next/link";
import { articles } from "@/lib/content";
import { Card } from "@/components/ui/Card";
import { SectionLabel } from "@/components/ui/SectionLabel";

export const revalidate = 3600;

export default function ArticlesPage() {
  return (
    <div className="space-y-10">
      <section className="border-b border-border pb-10">
        <SectionLabel>Farfield Editorial</SectionLabel>
        <h1
          className="max-w-3xl text-5xl leading-tight tracking-tight text-ink"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Research notes for the public record
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-muted">
          Short public notes on forecast records, variable behavior, source choices, and
          how Farfield keeps subscriber data protected.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {articles.map((article) => (
          <Link key={article.slug} href={`/articles/${article.slug}`} className="group">
            <Card padding="lg" className="h-full min-h-[290px] transition-colors group-hover:border-accent">
              <div className="flex h-full flex-col">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-accent">
                    {article.label}
                  </p>
                  <span className="rounded-full bg-bg px-3 py-1 text-xs font-semibold text-muted">
                    {article.tag}
                  </span>
                </div>
                <h2
                  className="mt-8 text-2xl leading-tight text-ink"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {article.title}
                </h2>
                <p className="mt-4 text-sm leading-6 text-muted">{article.dek}</p>
                <div className="mt-auto flex items-center justify-between pt-8 text-xs font-semibold uppercase tracking-widest text-border-dark">
                  <span>{article.readingTime}</span>
                  <span>{article.publishedAt}</span>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </section>
    </div>
  );
}
