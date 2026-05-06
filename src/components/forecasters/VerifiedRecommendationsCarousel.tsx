"use client";
// Manual text-only carousel for verified Farfield customer recommendations.

import { Card } from "@/components/ui/Card";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { useMemo, useState } from "react";

export type VerifiedRecommendation = {
  id: string;
  body: string;
  transactionType: string;
  publishedAt: string;
};

interface VerifiedRecommendationsCarouselProps {
  recommendations: VerifiedRecommendation[];
  emptyState: string;
}

function seededOrder(items: VerifiedRecommendation[]) {
  return [...items].sort((a, b) => a.id.localeCompare(b.id));
}

export function VerifiedRecommendationsCarousel({
  recommendations,
  emptyState,
}: VerifiedRecommendationsCarouselProps) {
  const ordered = useMemo(() => seededOrder(recommendations), [recommendations]);
  const [index, setIndex] = useState(0);
  const current = ordered[index];

  function previous() {
    setIndex((value) => (value === 0 ? ordered.length - 1 : value - 1));
  }

  function next() {
    setIndex((value) => (value + 1) % ordered.length);
  }

  return (
    <section>
      <Card padding="lg">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <SectionLabel>Verified Recommendations</SectionLabel>
            <h2
              className="text-3xl leading-tight text-ink"
              style={{ fontFamily: "var(--font-display)" }}
            >
              From paid Farfield customers
            </h2>
          </div>
          <p className="font-mono text-sm tabular-nums text-muted">
            {ordered.length.toLocaleString()} verified
          </p>
        </div>

        {current ? (
          <div className="mt-7">
            <blockquote className="max-w-3xl border-l-4 border-cobalt pl-5 text-lg leading-8 text-ink">
              &quot;{current.body}&quot;
            </blockquote>
            <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-muted">
              {current.transactionType} / Moderated by Farfield
            </p>
            <div className="mt-6 flex items-center justify-between">
              <button type="button" className="btn-secondary" onClick={previous}>
                Previous
              </button>
              <span className="font-mono text-xs tabular-nums text-muted">
                {index + 1} / {ordered.length}
              </span>
              <button type="button" className="btn-secondary" onClick={next}>
                Next
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-7 text-sm leading-6 text-muted">{emptyState}</p>
        )}
      </Card>
    </section>
  );
}
