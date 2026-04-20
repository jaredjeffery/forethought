// Ingest OECD Economic Outlook forecasts from the SDMX API.
//
// By default ingests only the latest edition (EO_118, Dec 2025).
// Set OECD_ALL=1 to ingest all 5 available editions (EO_114–118).
// Set OECD_EDITION=117 to ingest a specific edition number.
//
// Usage:
//   npx tsx --env-file=.env.local scripts/ingest-oecd-eo.ts
//   OECD_ALL=1 npx tsx --env-file=.env.local scripts/ingest-oecd-eo.ts

import { ingestOecdEoVintage, OECD_EO_VINTAGES } from "../src/lib/ingestion/oecd-eo";

async function main() {
  let vintages = OECD_EO_VINTAGES;

  if (process.env.OECD_EDITION) {
    const edition = parseInt(process.env.OECD_EDITION, 10);
    vintages = OECD_EO_VINTAGES.filter((v) => v.edition === edition);
    if (vintages.length === 0) throw new Error(`Unknown edition: ${edition}`);
  } else if (!process.env.OECD_ALL) {
    // Default: latest only
    vintages = [OECD_EO_VINTAGES[0]];
  }

  let totalInserted = 0;
  for (const v of vintages) {
    const result = await ingestOecdEoVintage(v);
    totalInserted += result.forecasts_inserted;
  }

  console.log(`\nTotal forecasts inserted: ${totalInserted}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });
