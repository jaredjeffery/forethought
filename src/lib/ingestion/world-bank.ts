// World Bank API ingestion — populates the actuals table with observed
// historical data for the 6 core variables.
//
// The World Bank Open Data API (https://api.worldbank.org/v2/) is freely
// accessible without authentication and returns clean JSON with ISO alpha-3
// country codes matching our schema.
//
// This runs automatically (no manual download required). Fetches data for
// all countries and years from 2010 to the current year.

import { db } from "../db";
import { variables, actuals } from "../db/schema";
import { and, eq } from "drizzle-orm";

// ---------------------------------------------------------------------------
// World Bank indicator codes → our variable names
// ---------------------------------------------------------------------------

const WB_INDICATOR_MAP: Record<string, string> = {
  "NY.GDP.MKTP.KD.ZG": "GDP Growth Rate",        // GDP growth, annual %
  "FP.CPI.TOTL.ZG":    "Inflation (CPI)",         // CPI inflation, annual %
  "SL.UEM.TOTL.ZS":    "Unemployment Rate",       // % of total labour force (ILO)
  "BN.CAB.XOKA.GD.ZS": "Current Account Balance", // Current account balance, % of GDP
  "GC.NLD.TOTL.GD.ZS": "Government Balance",      // Net lending (+) / net borrowing (–), % of GDP
  "GC.DOD.TOTL.GD.ZS": "Government Gross Debt",   // Central government debt, % of GDP
};

// The WB API does not cover aggregate regions (WLD, ADV, EME, EA, G7) with
// the same indicator codes — only individual ISO alpha-3 countries.
const INDIVIDUAL_COUNTRY_CODES = [
  "USA", "CHN", "DEU", "JPN", "IND", "GBR", "FRA", "BRA",
  "ITA", "CAN", "RUS", "KOR", "AUS", "MEX", "ESP", "IDN",
  "NLD", "SAU", "TUR", "CHE", "ZAF", "ARG", "NGA", "EGY",
  "POL", "THA", "MYS", "COL",
];

const WB_API_BASE = "https://api.worldbank.org/v2";
// Fetch historical data back to 2010 — enough for scoring analysis
const START_YEAR = 2010;
const CURRENT_YEAR = new Date().getFullYear();

// ---------------------------------------------------------------------------
// Fetch one indicator for all countries, all years
// ---------------------------------------------------------------------------

interface WbDataPoint {
  countryiso3code: string;
  date: string;       // "2024"
  value: number | null;
}

async function fetchIndicator(indicatorCode: string): Promise<WbDataPoint[]> {
  const countryCodes = INDIVIDUAL_COUNTRY_CODES.join(";");
  const dateRange = `${START_YEAR}:${CURRENT_YEAR}`;
  const perPage = 1000; // large enough to get all in one page

  const url =
    `${WB_API_BASE}/country/${countryCodes}/indicator/${indicatorCode}` +
    `?format=json&date=${dateRange}&per_page=${perPage}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`World Bank API error for ${indicatorCode}: ${response.status}`);
  }

  const [meta, data] = await response.json() as [{ total: number }, WbDataPoint[]];
  if (!Array.isArray(data)) {
    throw new Error(`Unexpected World Bank API response for ${indicatorCode}`);
  }

  // If there are more pages, fetch them (shouldn't be needed with our per_page)
  const allData = [...data];
  if (meta.total > perPage) {
    const pages = Math.ceil(meta.total / perPage);
    for (let page = 2; page <= pages; page++) {
      const r = await fetch(`${url}&page=${page}`);
      const [, d] = await r.json() as [unknown, WbDataPoint[]];
      allData.push(...d);
    }
  }

  return allData.filter((d) => d.value !== null && d.countryiso3code);
}

// ---------------------------------------------------------------------------
// Upsert actuals for one indicator
// ---------------------------------------------------------------------------

async function upsertActuals(
  indicatorCode: string,
  variableName: string,
  dataPoints: WbDataPoint[],
  variableMap: Map<string, string>,
): Promise<{ inserted: number; updated: number }> {
  let inserted = 0;
  let updated = 0;

  for (const point of dataPoints) {
    const variableId = variableMap.get(`${variableName}|${point.countryiso3code}`);
    if (!variableId) continue;

    const value = String(point.value!);
    const publishedAt = new Date(`${point.date}-12-31`); // approximation: year-end
    const source = `World Bank (${indicatorCode})`;

    const existing = await db
      .select({ id: actuals.id, value: actuals.value })
      .from(actuals)
      .where(
        and(
          eq(actuals.variableId, variableId),
          eq(actuals.targetPeriod, point.date)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      await db.insert(actuals).values({ variableId, targetPeriod: point.date, value, publishedAt, source });
      inserted++;
    } else if (existing[0].value !== value) {
      await db
        .update(actuals)
        .set({ value, publishedAt, source })
        .where(eq(actuals.id, existing[0].id));
      updated++;
    }
  }

  return { inserted, updated };
}

// ---------------------------------------------------------------------------
// Main export: ingest all World Bank actuals
// ---------------------------------------------------------------------------

export async function ingestWorldBankActuals(): Promise<{
  total_inserted: number;
  total_updated: number;
}> {
  // Build variable lookup map
  const allVariables = await db.select().from(variables);
  const variableMap = new Map<string, string>();
  for (const v of allVariables) {
    variableMap.set(`${v.name}|${v.countryCode}`, v.id);
  }

  let totalInserted = 0;
  let totalUpdated = 0;

  for (const [indicatorCode, variableName] of Object.entries(WB_INDICATOR_MAP)) {
    process.stdout.write(`  Fetching ${variableName} (${indicatorCode})...`);

    try {
      const data = await fetchIndicator(indicatorCode);
      const { inserted, updated } = await upsertActuals(
        indicatorCode, variableName, data, variableMap
      );
      console.log(` ${data.length} data points → +${inserted} inserted, ~${updated} updated`);
      totalInserted += inserted;
      totalUpdated += updated;
    } catch (err) {
      console.log(` FAILED: ${String(err)}`);
    }
  }

  return { total_inserted: totalInserted, total_updated: totalUpdated };
}
