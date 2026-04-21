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
import { parseWeoXlsxFile, SUBJECT_CODE_MAP } from "../src/lib/ingestion/imf-weo";

const AGGREGATE_CODES = new Set(["EA", "WLD", "G7", "ADV", "EME"]);
const WEO_FILE = join(process.cwd(), "data", "weo", "WEOOct2025all.xlsx");
const PUBLISHED_AT = new Date("2025-10-22"); // Oct-2025 WEO publication date
const SOURCE = "IMF-WEO";
const FALLBACK_ESTIMATES_YEAR = 2024; // Oct-2025: actuals available through 2024

async function main() {
  console.log("Backfilling aggregate actuals from WEO Oct-2025 xlsx...");

  // Build variable lookup: "name|countryCode" → id
  const allVars = await db
    .select({ id: variables.id, name: variables.name, countryCode: variables.countryCode })
    .from(variables)
    .where(eq(variables.category, "MACRO"));

  const variableMap = new Map<string, string>();
  for (const v of allVars) {
    variableMap.set(`${v.name}|${v.countryCode}`, v.id);
  }

  const rows = parseWeoXlsxFile(WEO_FILE, FALLBACK_ESTIMATES_YEAR);

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
      .onConflictDoNothing()
      .returning({ id: actuals.id });
    inserted += result.length;
  }

  console.log(`  Inserted: ${inserted}`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
