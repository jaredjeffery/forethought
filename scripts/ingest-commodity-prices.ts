// Ingest IMF WEO commodity price series from the Commodity Prices sheet
// in WEOOct2025all.xlsx. Creates new variables (category=COMMODITY) then
// stores historical years (<=2024) as actuals and future years as IMF forecasts.

import * as XLSX from "xlsx";
import { join } from "path";
import { db } from "../src/lib/db";
import { variables, actuals, forecasts, forecasters } from "../src/lib/db/schema";
import { eq, and } from "drizzle-orm";

const VINTAGE_LABEL = "2025-Oct";
const VINTAGE_PUB_DATE = new Date("2025-10-21");
const ACTUALS_CUTOFF_YEAR = 2024; // year <= this → actual data
const SOURCE = "IMF-WEO";
const COUNTRY_CODE = "WLD";

async function main() {
  const filePath = join(process.cwd(), "data", "weo", "WEOOct2025all.xlsx");
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets["Commodity Prices"];
  if (!ws) throw new Error("No 'Commodity Prices' sheet found in xlsx");

  const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(ws, { header: 1 });
  const headers = rows[0] as (string | number)[];

  const indicatorIdx   = headers.indexOf("INDICATOR");
  const indicatorIdIdx = headers.indexOf("INDICATOR.ID");
  const unitIdx        = headers.indexOf("UNIT");

  // Year columns: integer headers in the 1980-2035 range
  const yearCols = headers
    .map((h, i) => ({ index: i, year: +h }))
    .filter(({ year }) => Number.isInteger(year) && year >= 1980 && year <= 2035);

  // Fetch IMF forecaster id
  const [imf] = await db.select({ id: forecasters.id }).from(forecasters).where(eq(forecasters.slug, "imf")).limit(1);
  if (!imf) throw new Error("IMF forecaster not found — run npm run seed first");

  let variablesCreated = 0;
  let actualsInserted = 0;
  let forecastsInserted = 0;

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i] as (string | number | null)[];
    const name = String(r[indicatorIdx] ?? "").trim();
    const unit = String(r[unitIdx] ?? "").trim() || "Index";
    if (!name) continue;

    // Upsert variable
    const [variable] = await db
      .insert(variables)
      .values({ name, countryCode: COUNTRY_CODE, category: "COMMODITY", unit, frequency: "ANNUAL" })
      .onConflictDoNothing()
      .returning({ id: variables.id });

    let variableId: string;
    if (variable) {
      variableId = variable.id;
      variablesCreated++;
    } else {
      // Already exists — look it up
      const [existing] = await db
        .select({ id: variables.id })
        .from(variables)
        .where(and(eq(variables.name, name), eq(variables.countryCode, COUNTRY_CODE)))
        .limit(1);
      if (!existing) { console.warn(`  Could not find variable for "${name}", skipping`); continue; }
      variableId = existing.id;
    }

    // Partition data into actuals vs forecasts
    const actualRows: (typeof actuals.$inferInsert)[] = [];
    const forecastRows: (typeof forecasts.$inferInsert)[] = [];

    for (const { index, year } of yearCols) {
      const raw = r[index];
      if (raw == null || raw === "" || raw === ".." || raw === "n/a" || raw === "--") continue;
      const value = String(raw);
      const yearStr = String(year);

      if (year <= ACTUALS_CUTOFF_YEAR) {
        actualRows.push({
          variableId,
          targetPeriod: yearStr,
          value,
          source: SOURCE,
          publishedAt: VINTAGE_PUB_DATE,
          releaseNumber: 1,
          isLatest: true,
        });
      } else {
        forecastRows.push({
          forecasterId: imf.id,
          variableId,
          targetPeriod: yearStr,
          value,
          submittedAt: VINTAGE_PUB_DATE,
          forecastMadeAt: VINTAGE_PUB_DATE,
          vintage: VINTAGE_LABEL,
          sourceUrl: "https://www.imf.org/en/Publications/WEO/weo-database/2025/October",
        });
      }
    }

    // Batch insert actuals (500 at a time)
    const BATCH = 500;
    for (let j = 0; j < actualRows.length; j += BATCH) {
      const result = await db
        .insert(actuals)
        .values(actualRows.slice(j, j + BATCH))
        .onConflictDoNothing()
        .returning({ id: actuals.id });
      actualsInserted += result.length;
    }

    // Batch insert forecasts
    for (let j = 0; j < forecastRows.length; j += BATCH) {
      const result = await db
        .insert(forecasts)
        .values(forecastRows.slice(j, j + BATCH))
        .onConflictDoNothing()
        .returning({ id: forecasts.id });
      forecastsInserted += result.length;
    }
  }

  console.log(`Variables created: ${variablesCreated}`);
  console.log(`Actuals inserted:  ${actualsInserted}`);
  console.log(`Forecasts inserted: ${forecastsInserted}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });
