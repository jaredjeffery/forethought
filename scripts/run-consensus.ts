// Consensus computation runner.
// Computes the simple mean consensus for all variable + period combinations.
// Run after ingesting forecasts: npm run consensus
//
// Typical workflow:
//   npm run ingest:wb       # populate actuals
//   npm run ingest:weo      # populate IMF forecasts (requires local WEO files)
//   npm run consensus       # compute consensus from forecasts
//   npm run score           # score forecasts against actuals + consensus

// DATABASE_URL and other env vars are loaded via --env-file=.env.local in package.json

import { computeAllConsensus } from "../src/lib/scoring/consensus";

async function main() {
  console.log("Computing consensus forecasts...");

  try {
    const result = await computeAllConsensus();
    console.log(`Done: ${result.computed} consensus rows computed, ${result.skipped} skipped`);
    process.exit(0);
  } catch (err) {
    console.error("Consensus computation failed:", err);
    process.exit(1);
  }
}

main();
