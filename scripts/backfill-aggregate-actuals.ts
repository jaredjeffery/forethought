// Backfill historical actuals for WEO aggregate country codes (EA, WLD, G7, ADV, EME)
// from the WEO Oct-2025 xlsx file.
//
// The World Bank actuals pipeline only covers individual countries. Aggregates have
// no actuals in the DB, so forecasts for WLD/EA/G7/ADV/EME can't be scored.
//
// The WEO Oct-2025 xlsx contains IMF-compiled historical data for these aggregates
// sourced from Eurostat and national statistics offices. Using it as actuals is
// consistent with the "WEO-scored-against-WEO" policy in FORECAST_GATHERING_PLAN.md.
//
// Run with: npx tsx --env-file=.env.local scripts/backfill-aggregate-actuals.ts

import { join } from "path";
import { db } from "../src/lib/db";
import { actuals, variables } from "../src/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { parseWeoXlsxFile, parseWeoCsvFile, WEO_VINTAGES, SUBJECT_CODE_MAP } from "../src/lib/ingestion/imf-weo";
import { sql } from "drizzle-orm";

const AGGREGATE_CODES = new Set(["EA", "WLD", "G7", "ADV", "EME"]);
const SOURCE = "IMF-WEO";
const DATA_DIR = join(process.cwd(), "data", "weo");

// Find the most recent WEO vintage that has a local file
function findLatestVintage() {
  const { existsSync } = require("fs");
  for (const v of WEO_VINTAGES) {
    const file = v.xlsx_file ?? v.csv_file;
    if (file && existsSync(join(DATA_DIR, file))) return v;
  }
  throw new Error("No WEO data files found in data/weo/");
}

async function main() {
  const vintage = findLatestVintage();
  const fallbackEstimatesYear = vintage.year - 1;
  const file = vintage.xlsx_file ?? vintage.csv_file!;
  console.log(`Backfilling aggregate actuals from ${vintage.label} (${file})...`);

  // Build variable lookup: "name|countryCode" → id
  const allVars = await db
    .select({ id: variables.id, name: variables.name, countryCode: variables.countryCode })
    .from(variables)
    .where(eq(variables.category, "MACRO"));

  const variableMap = new Map<string, string>();
  for (const v of allVars) {
    variableMap.set(`${v.name}|${v.countryCode}`, v.id);
  }

  const filePath = join(DATA_DIR, file);
  const rows = vintage.xlsx_file
    ? parseWeoXlsxFile(filePath, fallbackEstimatesYear)
    : parseWeoCsvFile(filePath, fallbackEstimatesYear);
  const PUBLISHED_AT = new Date(vintage.publication_date);

  const actualRows: (typeof actuals.$inferInsert)[] = [];
  let skipped = 0;

  for (const row of rows) {
    if (!AGGREGATE_CODES.has(row.countryCode)) continue;

    const variableName = SUBJECT_CODE_MAP[row.subjectCode];
    if (!variableName) continue;

    const variableId = variableMap.get(`${variableName}|${row.countryCode}`);
    if (!variableId) { skipped++; continue; }

    for (const [yearStr, value] of Object.entries(row.yearData)) {
      const year = parseInt(yearStr, 10);
      // Only store historical years (actual data, not forecasts)
      if (year > row.estimatesStartAfter) continue;
      if (isNaN(parseFloat(value))) continue;

      actualRows.push({
        variableId,
        targetPeriod: yearStr,
        value,
        source: SOURCE,
        publishedAt: PUBLISHED_AT,
        releaseNumber: 1,
        isLatest: true,
      });
    }
  }

  console.log(`  Built ${actualRows.length} actual rows (skipped ${skipped} no-variable)`);

  // Batch insert, skip duplicates
  let inserted = 0;
  const BATCH = 500;
  for (let i = 0; i < actualRows.length; i += BATCH) {
    const result = await db
      .insert(actuals)
      .values(actualRows.slice(i, i + BATCH))
      .onConflictDoUpdate({
        target: [actuals.variableId, actuals.targetPeriod, actuals.source, actuals.releaseNumber],
        set: { value: sql`excluded.value`, publishedAt: sql`excluded.published_at`, isLatest: sql`excluded.is_latest` },
      })
      .returning({ id: actuals.id });
    inserted += result.length;
  }

  console.log(`  Inserted: ${inserted}`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
