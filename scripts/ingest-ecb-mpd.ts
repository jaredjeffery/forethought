// Ingest ECB/Eurosystem Macroeconomic Projection Database (MPD) forecasts.
//
// By default ingests 2015–2025 vintages (33 editions: 3 per year × 11 years).
// Set ECB_ALL=1 to ingest all vintages back to 2001.
// Set ECB_VINTAGE=A25 to ingest a specific vintage code.
//
// Usage:
//   npx tsx --env-file=.env.local scripts/ingest-ecb-mpd.ts
//   ECB_ALL=1 npx tsx --env-file=.env.local scripts/ingest-ecb-mpd.ts
//   ECB_VINTAGE=S25 npx tsx --env-file=.env.local scripts/ingest-ecb-mpd.ts

import { ingestEcbMpdVintage, ECB_MPD_VINTAGES, buildVintages } from "../src/lib/ingestion/ecb-mpd";

async function main() {
  let vintages = ECB_MPD_VINTAGES; // default: 2015–2025

  if (process.env.ECB_VINTAGE) {
    const code = process.env.ECB_VINTAGE.toUpperCase();
    vintages = ECB_MPD_VINTAGES.filter((v) => v.code === code);
    if (vintages.length === 0) throw new Error(`Unknown vintage code: ${code}. Try e.g. A25, S25, W25.`);
  } else if (process.env.ECB_ALL) {
    vintages = buildVintages(2001, 2025);
  }

  console.log(`Ingesting ${vintages.length} ECB MPD vintage(s)...`);

  let totalInserted = 0;
  let totalUpdated = 0;
  for (const v of vintages) {
    const result = await ingestEcbMpdVintage(v);
    totalInserted += result.forecasts_inserted;
    totalUpdated += result.forecasts_updated;
  }

  console.log(`\nTotal forecasts inserted: ${totalInserted}`);
  console.log(`Total forecasts updated: ${totalUpdated}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });
