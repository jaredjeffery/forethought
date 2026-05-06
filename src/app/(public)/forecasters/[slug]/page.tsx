// Public forecaster profile with modular widgets and Farfield-controlled trust signals.

import { ForecasterProfileHero } from "@/components/forecasters/ForecasterProfileHero";
import { ForecasterWidgetRenderer } from "@/components/forecasters/ForecasterWidgetRenderer";
import { VerifiedRecommendationsCarousel } from "@/components/forecasters/VerifiedRecommendationsCarousel";
import { getForecasterPublicProfileViewModel } from "@/lib/forecaster-queries";
import Link from "next/link";
import { notFound } from "next/navigation";

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function ForecasterProfilePage({ params }: PageProps) {
  const { slug } = await params;
  const data = await getForecasterPublicProfileViewModel(slug);
  if (!data) notFound();

  return (
    <div className="space-y-12">
      <nav className="flex items-center gap-1.5 text-sm text-muted">
        <Link href="/forecasters" className="transition-colors hover:text-ink">
          Forecasters
        </Link>
        <span>/</span>
        <span className="text-ink">{data.forecaster.name}</span>
      </nav>

      <ForecasterProfileHero profile={data.profile} />

      <ForecasterWidgetRenderer
        profile={data.profile}
        coverageByIndicator={data.coverageByIndicator}
        coverageByCountry={data.coverageByCountry}
        vintages={data.vintages}
      />

      <VerifiedRecommendationsCarousel
        recommendations={[]}
        emptyState={data.profile.recommendations.emptyState}
      />
    </div>
  );
}
