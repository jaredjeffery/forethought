// QA checks for the public forecaster profile model.

import {
  DEFAULT_PROFILE_WIDGET_ORDER,
  PROFILE_WIDGET_DEFINITIONS,
  buildDefaultForecasterProfile,
  isProfileWidgetKey,
} from "../src/lib/forecaster-profile";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

const profile = buildDefaultForecasterProfile({
  id: "00000000-0000-0000-0000-000000000001",
  slug: "maya-ndlovu",
  name: "Maya Ndlovu",
  type: "ANALYST",
  forecastCount: 286,
  scoredCount: 172,
  variableCount: 14,
  countryCount: 9,
  latestVintage: "2026-Apr",
});

assert(profile.hero.name === "Maya Ndlovu", "Hero name should use forecaster name");
assert(profile.scoreRail.items.length >= 4, "Score rail should expose at least four safe items");
assert(profile.recommendations.mode === "manual-carousel", "Recommendations should use manual carousel mode");
assert(profile.recommendations.customerRating == null, "Profile model must not expose a customer rating");
assert(
  profile.recommendations.emptyState === "No verified client recommendations yet.",
  "Empty state copy changed unexpectedly",
);
assert(DEFAULT_PROFILE_WIDGET_ORDER.every(isProfileWidgetKey), "Default widget order contains an unknown widget");

for (const widget of DEFAULT_PROFILE_WIDGET_ORDER) {
  assert(Boolean(PROFILE_WIDGET_DEFINITIONS[widget]), `Missing widget definition for ${widget}`);
}

console.log("Forecaster profile model QA passed.");
