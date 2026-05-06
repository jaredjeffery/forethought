// Public article detail page backed by the static content registry.

import Link from "next/link";
import { notFound } from "next/navigation";
import { articles, findArticle } from "@/lib/content";
import { ArticleVisual } from "@/components/ArticleVisual";
import { Card } from "@/components/ui/Card";
import { SectionLabel } from "@/components/ui/SectionLabel";

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return articles.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const article = findArticle(slug);

  if (!article) return {};

  return {
    title: `${article.title} | Farfield`,
    description: article.dek,
  };
}

export default async function ArticleDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const article = findArticle(slug);

  if (!article) notFound();

  return (
    <article className="mx-auto max-w-3xl">
      <nav className="mb-8 flex items-center gap-2 text-sm text-muted">
        <Link href="/articles" className="transition-colors hover:text-ink">
          Articles
        </Link>
        <span>/</span>
        <span className="text-ink">{article.title}</span>
      </nav>

      <header className="border-b border-border pb-8">
        <SectionLabel>{article.label}</SectionLabel>
        <h1
          className="text-5xl leading-tight tracking-tight text-ink"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {article.title}
        </h1>
        <p className="mt-5 text-xl leading-8 text-muted">{article.dek}</p>
        <div className="mt-6 flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-widest text-muted">
          <span className="rounded-full bg-surface px-3 py-1">{article.tag}</span>
          <span className="rounded-full bg-surface px-3 py-1">{article.readingTime}</span>
          <span className="rounded-full bg-surface px-3 py-1">{article.publishedAt}</span>
        </div>
      </header>

      <div className="mt-8 overflow-hidden border border-border bg-surface shadow-sm">
        <ArticleVisual article={article} size="lg" />
      </div>

      <div className="mt-10 space-y-8">
        {article.sections.map((section) => (
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
        <p className="text-sm font-semibold text-ink">Subscriber data stays locked</p>
        <p className="mt-2 text-sm leading-6 text-muted">
          Current forecast values, consensus values, vintage paths, and exports are held
          behind authentication and plan checks.
        </p>
        <Link
          href="/pricing"
          className="mt-4 inline-flex text-sm font-semibold text-accent hover:text-accent-dark"
        >
          See subscriber access
        </Link>
      </Card>
    </article>
  );
}
