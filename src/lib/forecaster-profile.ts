// Public-safe forecaster profile model and default widget configuration.

export type ForecasterKind = "INSTITUTION" | "ANALYST";

export type ProfileWidgetKey =
  | "track_record"
  | "coverage"
  | "latest_analysis"
  | "products"
  | "specialties"
  | "methodology_note"
  | "media_credentials"
  | "team_bio";

export type ForecasterProfileSummary = {
  id: string;
  slug: string;
  name: string;
  type: ForecasterKind;
  forecastCount: number;
  scoredCount: number;
  variableCount: number;
  countryCount: number;
  latestVintage: string | null;
};

export type ScoreRailTone = "cobalt" | "teal" | "amber" | "neutral";

export type ScoreRailItem = {
  label: string;
  value: string;
  detail: string;
  tone: ScoreRailTone;
};

export type ForecasterProfileViewConfig = {
  hero: {
    name: string;
    headline: string;
    summary: string;
    badges: string[];
    featuredWidgetKey: ProfileWidgetKey;
  };
  scoreRail: {
    label: string;
    items: ScoreRailItem[];
  };
  widgets: ProfileWidgetKey[];
  recommendations: {
    mode: "manual-carousel";
    count: number;
    emptyState: string;
    customerRating: null;
  };
};

export type ProfileWidgetDefinition = {
  key: ProfileWidgetKey;
  label: string;
  description: string;
};

export const DEFAULT_PROFILE_WIDGET_ORDER: ProfileWidgetKey[] = [
  "track_record",
  "coverage",
  "latest_analysis",
  "products",
  "specialties",
  "methodology_note",
];

export const PROFILE_WIDGET_DEFINITIONS: Record<ProfileWidgetKey, ProfileWidgetDefinition> = {
  track_record: {
    key: "track_record",
    label: "Track record",
    description: "Farfield-controlled performance and sample-depth summary.",
  },
  coverage: {
    key: "coverage",
    label: "Coverage",
    description: "Indicators, countries, and vintages tracked for this forecaster.",
  },
  latest_analysis: {
    key: "latest_analysis",
    label: "Latest analysis",
    description: "Public analysis, notes, and research updates.",
  },
  products: {
    key: "products",
    label: "Products",
    description: "Subscriptions, reports, datasets, calls, and bespoke research.",
  },
  specialties: {
    key: "specialties",
    label: "Specialties",
    description: "Forecaster-owned focus areas and domain strengths.",
  },
  methodology_note: {
    key: "methodology_note",
    label: "Methodology note",
    description: "How the forecaster thinks about evidence, uncertainty, and revisions.",
  },
  media_credentials: {
    key: "media_credentials",
    label: "Media and credentials",
    description: "Restrained professional proof and external references.",
  },
  team_bio: {
    key: "team_bio",
    label: "Team",
    description: "Author or team context for institutions and research houses.",
  },
};

export function isProfileWidgetKey(value: string): value is ProfileWidgetKey {
  return Object.prototype.hasOwnProperty.call(PROFILE_WIDGET_DEFINITIONS, value);
}

function formatCount(value: number) {
  return value.toLocaleString("en-US");
}

export function buildProfileStatus(scoredCount: number, forecastCount: number) {
  if (scoredCount >= 100) {
    return {
      label: "Scored benchmark",
      detail: "Large scored sample",
      tone: "cobalt" as const,
    };
  }

  if (scoredCount > 0) {
    return {
      label: "Building track record",
      detail: "Scored sample forming",
      tone: "amber" as const,
    };
  }

  if (forecastCount > 0) {
    return {
      label: "Tracked, awaiting scores",
      detail: "Forecasts logged",
      tone: "violet" as const,
    };
  }

  return {
    label: "Not yet tracked",
    detail: "No public forecast sample",
    tone: "neutral" as const,
  };
}

export function buildDefaultForecasterProfile(
  summary: ForecasterProfileSummary,
): ForecasterProfileViewConfig {
  const status = buildProfileStatus(summary.scoredCount, summary.forecastCount);
  const kindLabel = summary.type === "INSTITUTION" ? "Institution" : "Independent forecaster";

  return {
    hero: {
      name: summary.name,
      headline:
        summary.type === "INSTITUTION"
          ? `${summary.name} public forecast record`
          : `${summary.name} forecast profile`,
      summary:
        summary.type === "INSTITUTION"
          ? "Public forecast coverage, source depth, and Farfield-controlled performance evidence."
          : "Forecast work, public track record, and Farfield-controlled performance evidence.",
      badges: [kindLabel, status.label],
      featuredWidgetKey: summary.scoredCount > 0 ? "track_record" : "coverage",
    },
    scoreRail: {
      label: "Farfield record",
      items: [
        {
          label: "Status",
          value: status.label,
          detail: status.detail,
          tone: status.tone === "violet" ? "amber" : status.tone,
        },
        {
          label: "Scored sample",
          value: summary.scoredCount > 0 ? formatCount(summary.scoredCount) : "-",
          detail: "Rows matched to actuals",
          tone: summary.scoredCount > 0 ? "teal" : "neutral",
        },
        {
          label: "Coverage",
          value:
            summary.variableCount > 0 || summary.countryCount > 0
              ? `${formatCount(summary.variableCount)} / ${formatCount(summary.countryCount)}`
              : "-",
          detail: "Indicators / geographies",
          tone: summary.variableCount > 0 ? "cobalt" : "neutral",
        },
        {
          label: "Latest vintage",
          value: summary.latestVintage ?? "-",
          detail: "Most recent public source",
          tone: summary.latestVintage ? "neutral" : "neutral",
        },
      ],
    },
    widgets: DEFAULT_PROFILE_WIDGET_ORDER,
    recommendations: {
      mode: "manual-carousel",
      count: 0,
      emptyState: "No verified client recommendations yet.",
      customerRating: null,
    },
  };
}
