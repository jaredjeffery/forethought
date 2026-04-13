// Scoring runner — scores all forecasts that have actuals but no score yet.
// Run after ingesting data: npm run score
// Use --rescore flag to re-score everything: WEO_RESCORE=1 npm run score

// DATABASE_URL and other env vars are loaded via --env-file=.env.local in package.json

import { scoreAllPending, rescoreAll } from "../src/lib/scoring";

async function main() {
  const rescore = process.env.WEO_RESCORE === "1";

  if (rescore) {
    console.log("Re-scoring all forecasts with actuals...");
  } else {
    console.log("Scoring pending forecasts (have actuals, no score)...");
  }

  try {
    const result = rescore ? await rescoreAll() : await scoreAllPending();
    console.log(`\nDone: ${result.scored} scored, ${result.skipped} skipped`);
    process.exit(0);
  } catch (err) {
    console.error("Scoring failed:", err);
    process.exit(1);
  }
}

main();
