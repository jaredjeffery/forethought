// IMF WEO ingestion runner.
// Reads local WEO files from data/weo/ and imports forecasts.
//
// BEFORE RUNNING: Download the WEO file from IMF (see imf-weo.ts for instructions)
// and place it in data/weo/. New format (2025-Oct+): WEO[Mon][Year].csv
// Legacy format (pre-2025-Oct): WEO[Mon][Year]all.txt + WEO[Mon][Year]alla.txt
//
// Ingests the latest available vintage by default, or specify with WEO_VINTAGE:
//   WEO_VINTAGE=2025-Oct npm run ingest:weo
//
// To ingest all available vintages in one pass:
//   WEO_ALL=1 npm run ingest:weo
//
// Run with: npm run ingest:weo

// DATABASE_URL and other env vars are loaded via --env-file=.env.local in package.json

import { ingestWeoVintage, listAvailableVintages } from "../src/lib/ingestion/imf-weo";

async function main() {
  const available = listAvailableVintages();

  if (available.length === 0) {
    console.error("No WEO data files found in data/weo/");
    console.error("Expected files like: WEOOct2025all.txt, WEOOct2025alla.txt");
    console.error("See src/lib/ingestion/imf-weo.ts for download instructions.");
    process.exit(1);
  }

  const ingestAll = process.env.WEO_ALL === "1";
  const vintages = ingestAll
    ? available
    : [available.find((v) => v.label === (process.env.WEO_VINTAGE ?? available[0].label))].filter(Boolean) as typeof available;

  if (vintages.length === 0) {
    const targetLabel = process.env.WEO_VINTAGE ?? available[0].label;
    console.error(`Vintage "${targetLabel}" not found or files missing.`);
    console.error(`Available: ${available.map((v) => v.label).join(", ")}`);
    process.exit(1);
  }

  let totalInserted = 0;
  let totalSkipped = 0;

  for (const vintage of vintages) {
    console.log(`\nIngesting WEO ${vintage.label} from local files...`);
    try {
      const result = await ingestWeoVintage(vintage);
      console.log(`  Forecasts inserted      : ${result.forecasts_inserted}`);
      console.log(`  Rows skipped (no match) : ${result.skipped_no_variable}`);
      totalInserted += result.forecasts_inserted;
      totalSkipped += result.skipped_no_variable;
    } catch (err) {
      console.error(`\nIngestion failed for ${vintage.label}:`, err);
      process.exit(1);
    }
  }

  if (vintages.length > 1) {
    console.log(`\n${"=".repeat(50)}`);
    console.log(`Total across ${vintages.length} vintages:`);
    console.log(`  Forecasts inserted      : ${totalInserted}`);
    console.log(`  Rows skipped (no match) : ${totalSkipped}`);
  }

  process.exit(0);
}

main();
