// World Bank actuals ingestion runner.
// Fetches historical observed data for all 6 core variables from the World Bank
// Open Data API and populates the actuals table.
//
// Run with: npm run ingest:wb

// DATABASE_URL and other env vars are loaded via --env-file=.env.local in package.json

import { ingestWorldBankActuals } from "../src/lib/ingestion/world-bank";

async function main() {
  console.log("Ingesting World Bank actuals...");
  console.log(`Fetching ${new Date().getFullYear() - 2010 + 1} years of data for 28 countries\n`);

  try {
    const result = await ingestWorldBankActuals();
    console.log("\nIngestion complete:");
    console.log(`  Actuals inserted : ${result.total_inserted}`);
    console.log(`  Actuals updated  : ${result.total_updated}`);
    process.exit(0);
  } catch (err) {
    console.error("\nIngestion failed:", err);
    process.exit(1);
  }
}

main();
