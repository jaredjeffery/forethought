// Public article index for Farfield editorial previews and launch notes.

import Link from "next/link";
import { articles } from "@/lib/content";
import { ArticleVisual } from "@/components/ArticleVisual";
import { Card } from "@/components/ui/Card";
import { SectionLabel } from "@/components/ui/SectionLabel";

export const revalidate = 3600;

export default function ArticlesPage() {
  const leadArticle = articles.find((article) => article.prominence === "lead") ?? articles[0];
  const remainingArticles = articles.filter((article) => article.slug !== leadArticle?.slug);
  const leadingIndicators = remainingArticles.filter(
    (article) => article.column === "Leading Indicators",
  );
  const otherArticles = remainingArticles.filter(
    (article) => article.column !== "Leading Indicators",
  );

  return (
    <div className="space-y-12">
      <section className="border-b border-border pb-10">
        <SectionLabel>Farfield Editorial</SectionLabel>
        <h1
          className="max-w-3xl text-5xl leading-tight tracking-tight text-ink"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Analysis, columns, and notes from the forecast record
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-muted">
          Public stories introduce the forecasting questions. Subscriber pages later carry
          current forecasts, consensus values, vintage paths, and exports.
        </p>
      </section>

      {leadArticle && (
        <section>
          <Link href={`/articles/${leadArticle.slug}`} className="group">
            <Card padding="none" raised className="overflow-hidden transition-colors group-hover:border-accent">
              <ArticleVisual article={leadArticle} size="lg" />
              <div className="p-8">
                <p className="text-xs font-bold uppercase tracking-widest text-accent">
                  {leadArticle.label}
                </p>
                <h2
                  className="mt-4 max-w-3xl text-4xl leading-tight text-ink group-hover:text-accent"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {leadArticle.title}
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-7 text-muted">
                  {leadArticle.dek}
                </p>
              </div>
            </Card>
          </Link>
        </section>
      )}

      <section>
        <SectionLabel>Top Stories</SectionLabel>
        <div className="grid gap-4 lg:grid-cols-3">
          {otherArticles.slice(0, 6).map((article) => (
            <Link key={article.slug} href={`/articles/${article.slug}`} className="group">
              <Card padding="none" className="h-full overflow-hidden transition-colors group-hover:border-accent">
                <ArticleVisual article={article} />
                <div className="flex min-h-[210px] flex-col p-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-bold uppercase tracking-widest text-accent">
                      {article.label}
                    </p>
                    <span className="rounded-full bg-bg px-3 py-1 text-xs font-semibold text-muted">
                      {article.tag}
                    </span>
                  </div>
                  <h2
                    className="mt-5 text-2xl leading-tight text-ink group-hover:text-accent"
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
        </div>
      </section>

      {leadingIndicators.length > 0 && (
        <section>
          <SectionLabel>Leading Indicators</SectionLabel>
          <div className="grid gap-4 md:grid-cols-2">
            {leadingIndicators.map((article) => (
              <Link key={article.slug} href={`/articles/${article.slug}`} className="group">
                <Card padding="none" className="grid overflow-hidden transition-colors group-hover:border-accent sm:grid-cols-[220px_1fr]">
                  <ArticleVisual article={article} />
                  <div className="p-5">
                    <p className="text-xs font-bold uppercase tracking-widest text-accent">
                      {article.tag}
                    </p>
                    <h2
                      className="mt-4 text-2xl leading-tight text-ink group-hover:text-accent"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {article.title}
                    </h2>
                    <p className="mt-4 text-sm leading-6 text-muted">{article.dek}</p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
