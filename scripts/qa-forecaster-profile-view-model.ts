// QA checks for the DB-backed public forecaster profile view model.

import { getForecasterPublicProfileViewModel } from "../src/lib/forecaster-queries";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

async function main() {
  const profile = await getForecasterPublicProfileViewModel("imf");

  assert(profile !== null, "Expected IMF profile view model");
  assert(profile.forecaster.slug === "imf", "Expected IMF slug");
  assert(profile.profile.scoreRail.items.length >= 4, "Score rail should include safe public items");
  assert(profile.profile.recommendations.customerRating == null, "Customer rating must stay absent");
  assert(profile.profile.widgets.includes("track_record"), "Track record widget should be present");
  assert(Array.isArray(profile.coverageByIndicator), "Indicator coverage should be an array");
  assert(Array.isArray(profile.coverageByCountry), "Country coverage should be an array");

  const serialized = JSON.stringify(profile);
  for (const forbidden of [
    "absoluteError",
    "percentageError",
    "signedError",
    "scoreVsConsensus",
    "simpleMean",
    "weightedMean",
  ]) {
    assert(!serialized.includes(forbidden), `Forbidden metric leaked through view model: ${forbidden}`);
  }

  console.log("Forecaster profile view-model QA passed.");
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
