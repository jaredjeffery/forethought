// Ingest World Bank Global Economic Prospects (GEP) forecasts.
//
// Fetches GDP growth forecasts for the latest GEP edition from the WB Indicators API.
// Vintage is determined automatically from the API's `lastupdated` date.
//
// Usage:
//   npx tsx --env-file=.env.local scripts/ingest-wb-gep.ts

import { ingestWbGep } from "../src/lib/ingestion/wb-gep";

async function main() {
  const result = await ingestWbGep();
  console.log(`\nVintage: ${result.vintage}`);
  console.log(`Total forecasts inserted: ${result.forecasts_inserted}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });
