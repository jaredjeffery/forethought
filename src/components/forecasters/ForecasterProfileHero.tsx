// Public forecaster profile hero with forecaster-owned positioning and Farfield score rail.

import type { ForecasterProfileViewConfig } from "@/lib/forecaster-profile";
import { ForecasterScoreRail } from "./ForecasterScoreRail";

interface ForecasterProfileHeroProps {
  profile: ForecasterProfileViewConfig;
}

export function ForecasterProfileHero({ profile }: ForecasterProfileHeroProps) {
  return (
    <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
      <div className="min-h-[320px] py-2">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {profile.hero.badges.map((badge) => (
            <span key={badge} className="badge badge-cobalt">
              {badge}
            </span>
          ))}
        </div>
        <h1
          className="max-w-3xl text-5xl leading-[1.04] tracking-tight text-ink"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {profile.hero.name}
        </h1>
        <span className="accent-rule" />
        <p className="mt-5 max-w-2xl text-xl leading-8 text-ink-2">
          {profile.hero.headline}
        </p>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted">
          {profile.hero.summary}
        </p>
      </div>

      <ForecasterScoreRail scoreRail={profile.scoreRail} />
    </section>
  );
}
