// IMF World Economic Outlook (WEO) ingestion.
// Reads from a locally downloaded WEO tab-delimited file and imports
// forecasts for the 6 core variables tracked in Phase 1.
//
// WHY LOCAL FILES: IMF's WEO download page uses JavaScript rendering and
// WAF rules that block automated HTTP access. The WEO is published twice
// a year (April, October) — manual download is appropriate for this cadence.
//
// HOW TO GET THE DATA:
//   1. Go to https://www.imf.org/en/Publications/WEO/weo-database
//   2. Open the latest release → "Download Entire Database"
//   3. Download both "Tab Delimited Values" files:
//      - "By Countries"      → save as data/weo/WEO[Mon][Year]all.txt
//      - "By Country Groups" → save as data/weo/WEO[Mon][Year]alla.txt
//   4. Run: npm run ingest:weo
//
// The parser handles the standard WEO tab-delimited format which has been
// consistent since ~2010: one header row, then one row per indicator per country.
// Years up to "Estimates Start After" are actuals; later years are forecasts.
//
// Run with: npm run ingest:weo

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { db } from "../db";
import { forecasters, variables, forecasts } from "../db/schema";

// ---------------------------------------------------------------------------
// WEO subject code → our variable name
// ---------------------------------------------------------------------------

const SUBJECT_CODE_MAP: Record<string, string> = {
  NGDP_RPCH:    "GDP Growth Rate",        // GDP, constant prices, % change
  PCPIPCH:      "Inflation (CPI)",         // CPI, average % change
  LUR:          "Unemployment Rate",       // % of labour force
  BCA_NGDPD:    "Current Account Balance", // % of GDP
  GGXCNL_NGDP: "Government Balance",      // overall net lending/borrowing, % of GDP
  GGXWDG_NGDP: "Government Gross Debt",   // gross debt, % of GDP
};

// ---------------------------------------------------------------------------
// WEO country group code → our country code
// Used for the "By Country Groups" file which has numeric group codes.
// ---------------------------------------------------------------------------

const GROUP_CODE_MAP: Record<string, string> = {
  "001": "WLD",  // World
  "110": "ADV",  // Advanced Economies
  "200": "EME",  // Emerging Market and Developing Economies
  "119": "EA",   // Euro Area
  "998": "G7",   // G7
};

// ---------------------------------------------------------------------------
// Vintage definitions — update each April and October after IMF release.
// ---------------------------------------------------------------------------

export interface WeoVintage {
  year: number;
  month: "April" | "October";
  label: string;            // e.g. "2026-Apr" — used as vintage field in forecasts
  publication_date: string; // ISO date (approximate)
  countries_file: string;   // filename in data/weo/
  groups_file: string;
}

export const WEO_VINTAGES: WeoVintage[] = [
  // April 2026 published 2026-04-14; add files when downloaded
  {
    year: 2026, month: "April", label: "2026-Apr", publication_date: "2026-04-14",
    countries_file: "WEOApr2026all.txt", groups_file: "WEOApr2026alla.txt",
  },
  {
    year: 2025, month: "October", label: "2025-Oct", publication_date: "2025-10-21",
    countries_file: "WEOOct2025all.txt", groups_file: "WEOOct2025alla.txt",
  },
  {
    year: 2025, month: "April", label: "2025-Apr", publication_date: "2025-04-22",
    countries_file: "WEOApr2025all.txt", groups_file: "WEOApr2025alla.txt",
  },
  {
    year: 2024, month: "October", label: "2024-Oct", publication_date: "2024-10-22",
    countries_file: "WEOOct2024all.txt", groups_file: "WEOOct2024alla.txt",
  },
  {
    year: 2024, month: "April", label: "2024-Apr", publication_date: "2024-04-16",
    countries_file: "WEOApr2024all.txt", groups_file: "WEOApr2024alla.txt",
  },
];

// Data directory relative to project root
const DATA_DIR = join(process.cwd(), "data", "weo");

// ---------------------------------------------------------------------------
// Parse a WEO tab-delimited file (from disk)
// ---------------------------------------------------------------------------

interface WeoRow {
  countryCode: string;
  subjectCode: string;
  yearData: Record<string, string>; // "2024" → "2.5"
  estimatesStartAfter: number;
}

function parseWeoFile(filePath: string, fileType: "countries" | "groups"): WeoRow[] {
  if (!existsSync(filePath)) {
    throw new Error(`WEO file not found: ${filePath}\nSee instructions in src/lib/ingestion/imf-weo.ts`);
  }

  const text = readFileSync(filePath, "utf-8");
  const lines = text.split("\n").filter((l) => l.trim().length > 0);

  if (lines.length < 2) {
    throw new Error(`WEO file appears empty or malformed: ${filePath}`);
  }

  const headers = lines[0].split("\t").map((h) => h.trim().replace(/\r/g, ""));

  const subjectCodeIdx = headers.findIndex((h) => h === "WEO Subject Code");
  const estimatesIdx = headers.findIndex((h) => h === "Estimates Start After");
  const countryColIdx =
    fileType === "countries"
      ? headers.findIndex((h) => h === "ISO")
      : headers.findIndex((h) => h === "WEO Country Group Code");

  if (subjectCodeIdx === -1 || countryColIdx === -1) {
    throw new Error(
      `Expected columns not found in ${filePath}. Got: ${headers.slice(0, 8).join(", ")}`
    );
  }

  // Year columns: 4-digit numbers in the 1980–2035 range
  const yearCols = headers
    .map((h, i) => ({ index: i, year: h }))
    .filter(({ year }) => /^\d{4}$/.test(year) && +year >= 1980 && +year <= 2035);

  const rows: WeoRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split("\t").map((c) => c.trim().replace(/\r/g, ""));
    if (cols.length < headers.length - 1) continue;

    const subjectCode = cols[subjectCodeIdx] ?? "";
    if (!SUBJECT_CODE_MAP[subjectCode]) continue;

    const rawCode = cols[countryColIdx] ?? "";
    const countryCode =
      fileType === "countries" ? rawCode : (GROUP_CODE_MAP[rawCode] ?? null);
    if (!countryCode) continue;

    const estimatesStartAfter = parseInt(cols[estimatesIdx] ?? "", 10);
    if (isNaN(estimatesStartAfter)) continue;

    const yearData: Record<string, string> = {};
    for (const { index, year } of yearCols) {
      const val = (cols[index] ?? "").replace(/,/g, "");
      if (val && val !== ".." && val !== "n/a" && val !== "--") {
        yearData[year] = val;
      }
    }

    rows.push({ countryCode, subjectCode, yearData, estimatesStartAfter });
  }

  return rows;
}

// ---------------------------------------------------------------------------
// Build lookup maps from DB
// ---------------------------------------------------------------------------

async function buildLookupMaps() {
  const allVariables = await db.select().from(variables);
  const allForecasters = await db.select().from(forecasters);

  const variableMap = new Map<string, string>(); // "GDP Growth Rate|USA" → id
  for (const v of allVariables) {
    variableMap.set(`${v.name}|${v.countryCode}`, v.id);
  }

  const forecasterIds = new Map<string, string>(); // slug → id
  for (const f of allForecasters) {
    forecasterIds.set(f.slug, f.id);
  }

  return { variableMap, forecasterIds };
}

// ---------------------------------------------------------------------------
// Ingest a single WEO vintage (forecasts only — actuals come from World Bank)
// ---------------------------------------------------------------------------

export async function ingestWeoVintage(vintage: WeoVintage): Promise<{
  forecasts_inserted: number;
  skipped_no_variable: number;
}> {
  console.log(`\nIngesting WEO ${vintage.label} forecasts from local files...`);

  const countriesPath = join(DATA_DIR, vintage.countries_file);
  const groupsPath = join(DATA_DIR, vintage.groups_file);

  const countriesRows = parseWeoFile(countriesPath, "countries");
  const groupsRows = parseWeoFile(groupsPath, "groups");
  const allRows = [...countriesRows, ...groupsRows];
  console.log(`  Parsed ${allRows.length} matching rows`);

  const { variableMap, forecasterIds } = await buildLookupMaps();
  const imfId = forecasterIds.get("imf");
  if (!imfId) throw new Error("IMF forecaster not found — run npm run seed first");

  const submittedAt = new Date(vintage.publication_date);
  let forecastsInserted = 0;
  let skippedNoVariable = 0;

  const forecastRows: (typeof forecasts.$inferInsert)[] = [];

  for (const row of allRows) {
    const variableName = SUBJECT_CODE_MAP[row.subjectCode];
    const variableId = variableMap.get(`${variableName}|${row.countryCode}`);

    if (!variableId) {
      skippedNoVariable++;
      continue;
    }

    for (const [yearStr, value] of Object.entries(row.yearData)) {
      const year = parseInt(yearStr, 10);
      // Only import forecast years (not actuals — those come from World Bank)
      if (year <= row.estimatesStartAfter) continue;

      forecastRows.push({
        forecasterId: imfId,
        variableId,
        targetPeriod: yearStr,
        value,
        submittedAt,
        vintage: vintage.label,
        sourceUrl: `https://www.imf.org/en/Publications/WEO/weo-database/${vintage.year}/${vintage.month}`,
      });
    }
  }

  // Insert in batches of 500
  const BATCH = 500;
  for (let i = 0; i < forecastRows.length; i += BATCH) {
    const result = await db
      .insert(forecasts)
      .values(forecastRows.slice(i, i + BATCH))
      .onConflictDoNothing()
      .returning({ id: forecasts.id });
    forecastsInserted += result.length;
  }

  return { forecasts_inserted: forecastsInserted, skipped_no_variable: skippedNoVariable };
}

// ---------------------------------------------------------------------------
// List which vintages have local files available
// ---------------------------------------------------------------------------

export function listAvailableVintages(): WeoVintage[] {
  return WEO_VINTAGES.filter((v) =>
    existsSync(join(DATA_DIR, v.countries_file)) &&
    existsSync(join(DATA_DIR, v.groups_file))
  );
}
