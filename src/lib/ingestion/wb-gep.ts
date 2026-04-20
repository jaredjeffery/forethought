// World Bank Global Economic Prospects (GEP) ingestion via World Bank Indicators API.
//
// Source 27 in the WB API is GEP. It publishes one indicator:
//   NYGDPMKTPKDZ → GDP Growth Rate (% constant 2010-19 prices)
//
// Vintage is identified via the `lastupdated` field in the API response metadata.
// This changes when a new GEP edition is published (Jan and Jun each year).
//
// API endpoint:
//   https://api.worldbank.org/v2/country/all/indicator/NYGDPMKTPKDZ?source=27&format=json&per_page=500
//
// Country codes: `countryiso3code` in the response maps directly to our country codes,
// except for regional aggregates which require explicit mapping (see WB_TO_OUR_COUNTRY).
//
// Run with: npx tsx --env-file=.env.local scripts/ingest-wb-gep.ts

import { db } from "../db";
import { forecasters, variables, forecasts } from "../db/schema";
import { eq, and } from "drizzle-orm";

const WB_API_BASE = "https://api.worldbank.org/v2";
const INDICATOR = "NYGDPMKTPKDZ";
const SOURCE_ID = "27";
const VARIABLE_NAME = "GDP Growth Rate";
const SOURCE_URL = "https://www.worldbank.org/en/publication/global-economic-prospects";

// WB countryiso3code → our countryCode for aggregates that don't match directly
const WB_TO_OUR_COUNTRY: Record<string, string> = {
  "EMU": "EA",   // Euro Area
  "AME": "ADV",  // Advanced economies
  "EMD": "EME",  // Emerging market and developing economies
  "WLT": "WLD",  // World (WBG members)
};

// Aggregates WB publishes that we don't have variables for — skip silently
const SKIP_ISO3 = new Set(["EAS", "ECS", "LCN", "MEA", "SAS", "SSF"]);

interface WbRow {
  countryiso3code: string;
  date: string;       // year as string
  value: number | null;
  obs_status: string;
}

interface WbMeta {
  lastupdated: string; // e.g. "2026-01-13"
  total: number;
  pages: number;
  per_page: number;
}

async function fetchAllRows(): Promise<{ meta: WbMeta; rows: WbRow[] }> {
  const perPage = 500;
  const url = `${WB_API_BASE}/country/all/indicator/${INDICATOR}?source=${SOURCE_ID}&format=json&per_page=${perPage}`;

  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`WB API HTTP ${resp.status}`);
  const data = (await resp.json()) as [WbMeta, WbRow[]];

  const meta = data[0];
  const rows: WbRow[] = [...data[1]];

  // Paginate if needed (unlikely with per_page=500 and ~163 countries × ~5 years = ~815 rows)
  for (let page = 2; page <= meta.pages; page++) {
    const pageResp = await fetch(`${url}&page=${page}`);
    if (!pageResp.ok) break;
    const pageData = (await pageResp.json()) as [WbMeta, WbRow[]];
    rows.push(...pageData[1]);
  }

  return { meta, rows };
}

export async function ingestWbGep(): Promise<{
  vintage: string;
  forecasts_inserted: number;
  skipped_no_variable: number;
}> {
  console.log("\nIngesting World Bank Global Economic Prospects...");

  // 1. Look up World Bank forecaster
  const [wb] = await db
    .select({ id: forecasters.id })
    .from(forecasters)
    .where(eq(forecasters.slug, "world-bank"))
    .limit(1);
  if (!wb) throw new Error("World Bank forecaster not found — run npm run seed");

  // 2. Build variable lookup: countryCode → variableId (GDP Growth Rate only)
  const allVars = await db
    .select({ id: variables.id, countryCode: variables.countryCode })
    .from(variables)
    .where(and(eq(variables.name, VARIABLE_NAME), eq(variables.category, "MACRO")));

  const variableByCountry = new Map<string, string>();
  for (const v of allVars) {
    variableByCountry.set(v.countryCode, v.id);
  }

  // 3. Fetch data
  const { meta, rows } = await fetchAllRows();
  console.log(`  API lastupdated: ${meta.lastupdated}  |  Total rows: ${rows.length}`);

  // Derive vintage label and publication year from lastupdated (e.g. "2026-01-13" → "WB-GEP-2026-01")
  const [pubYear, pubMonth] = meta.lastupdated.split("-").map(Number);
  const vintageLabel = `WB-GEP-${pubYear}-${String(pubMonth).padStart(2, "0")}`;
  const pubDate = new Date(meta.lastupdated);

  console.log(`  Vintage: ${vintageLabel}`);

  // 4. Build forecast rows
  const forecastRows: (typeof forecasts.$inferInsert)[] = [];
  let skippedNoVariable = 0;

  for (const row of rows) {
    if (row.value == null) continue;

    const year = parseInt(row.date, 10);
    // Only store forecasts for the current publication year - 1 onwards
    // (e.g. for Jan 2026 GEP: store 2025, 2026, 2027)
    if (year < pubYear - 1) continue;

    if (SKIP_ISO3.has(row.countryiso3code)) continue;

    const ourCountry = WB_TO_OUR_COUNTRY[row.countryiso3code] ?? row.countryiso3code;
    const variableId = variableByCountry.get(ourCountry);
    if (!variableId) { skippedNoVariable++; continue; }

    forecastRows.push({
      forecasterId: wb.id,
      variableId,
      targetPeriod: row.date,
      value: String(row.value),
      submittedAt: pubDate,
      forecastMadeAt: pubDate,
      vintage: vintageLabel,
      sourceUrl: SOURCE_URL,
    });
  }

  // 5. Batch insert, skip duplicates
  let inserted = 0;
  const BATCH = 500;
  for (let i = 0; i < forecastRows.length; i += BATCH) {
    const result = await db
      .insert(forecasts)
      .values(forecastRows.slice(i, i + BATCH))
      .onConflictDoNothing()
      .returning({ id: forecasts.id });
    inserted += result.length;
  }

  console.log(`  Inserted: ${inserted}  |  Skipped (no variable): ${skippedNoVariable}`);
  return { vintage: vintageLabel, forecasts_inserted: inserted, skipped_no_variable: skippedNoVariable };
}
