// IMF WEO ingestion runner.
// Reads local WEO tab-delimited files from data/weo/ and imports forecasts.
//
// BEFORE RUNNING: Download WEO files from IMF (see imf-weo.ts for instructions)
// and place them in data/weo/. File names follow the pattern WEO[Mon][Year]all.txt.
//
// Ingests the latest available vintage by default, or specify with WEO_VINTAGE:
//   WEO_VINTAGE=2025-Oct npm run ingest:weo
//
// Run with: npm run ingest:weo

// DATABASE_URL and other env vars are loaded via --env-file=.env.local in package.json

import { ingestWeoVintage, listAvailableVintages, WEO_VINTAGES } from "../src/lib/ingestion/imf-weo";

async function main() {
  const available = listAvailableVintages();

  if (available.length === 0) {
    console.error("No WEO data files found in data/weo/");
    console.error("Expected files like: WEOOct2025all.txt, WEOOct2025alla.txt");
    console.error("See src/lib/ingestion/imf-weo.ts for download instructions.");
    process.exit(1);
  }

  const targetLabel = process.env.WEO_VINTAGE ?? available[0].label;
  const vintage = available.find((v) => v.label === targetLabel);

  if (!vintage) {
    console.error(`Vintage "${targetLabel}" not found or files missing.`);
    console.error(`Available: ${available.map((v) => v.label).join(", ")}`);
    process.exit(1);
  }

  console.log(`Ingesting WEO ${vintage.label} from local files...`);

  try {
    const result = await ingestWeoVintage(vintage);
    console.log("\nIngestion complete:");
    console.log(`  Forecasts inserted      : ${result.forecasts_inserted}`);
    console.log(`  Rows skipped (no match) : ${result.skipped_no_variable}`);
    process.exit(0);
  } catch (err) {
    console.error("\nIngestion failed:", err);
    process.exit(1);
  }
}

main();
