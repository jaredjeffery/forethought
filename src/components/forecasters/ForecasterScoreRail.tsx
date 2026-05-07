// Farfield-controlled score rail for public forecaster profiles.

import { Card } from "@/components/ui/Card";
import type { ForecasterProfileViewConfig, ScoreRailTone } from "@/lib/forecaster-profile";

const toneClass: Record<ScoreRailTone, string> = {
  cobalt: "text-cobalt",
  teal: "text-teal",
  amber: "text-amber",
  neutral: "text-muted",
};

interface ForecasterScoreRailProps {
  scoreRail: ForecasterProfileViewConfig["scoreRail"];
}

export function ForecasterScoreRail({ scoreRail }: ForecasterScoreRailProps) {
  return (
    <Card padding="lg" raised className="h-fit lg:sticky lg:top-24">
      <p className="section-label">{scoreRail.label}</p>
      <div className="mt-5 space-y-4">
        {scoreRail.items.map((item) => (
          <div key={item.label} className="border-b border-border pb-4 last:border-b-0 last:pb-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
              {item.label}
            </p>
            <p
              className={`mt-1 ${
                item.label === "Status"
                  ? "text-lg font-semibold leading-6"
                  : "font-mono text-2xl font-bold tabular-nums"
              } ${toneClass[item.tone]}`}
            >
              {item.value}
            </p>
            <p className="mt-1 text-xs leading-5 text-muted">{item.detail}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
