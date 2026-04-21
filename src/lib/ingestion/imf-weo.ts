// IMF World Economic Outlook (WEO) ingestion.
// Reads from a locally downloaded WEO file and imports forecasts for the
// 6 core variables tracked in Phase 1.
//
// WHY LOCAL FILES: IMF's WEO download page uses JavaScript rendering and
// WAF rules that block automated HTTP access. The WEO is published twice
// a year (April, October) — manual download is appropriate for this cadence.
//
// HOW TO GET THE DATA (new format, 2025-Oct onwards):
//   1. Go to https://data.imf.org/en/datasets/IMF.RES:WEO
//   2. Click "Download" → "CSV" to get the full dataset
//   3. Rename the file to WEO[Mon][Year].csv  (e.g. WEOOct2025.csv)
//      and place it in data/weo/
//   4. Run: npm run ingest:weo
//
// HOW TO GET THE DATA (legacy format, pre-2025-Oct):
//   1. Go to https://www.imf.org/en/Publications/WEO/weo-database
//   2. Open the release → "Download Entire Database"
//   3. Download both "Tab Delimited Values" files:
//      - "By Countries"      → save as data/weo/WEO[Mon][Year]all.txt
//      - "By Country Groups" → save as data/weo/WEO[Mon][Year]alla.txt
//   4. Run: npm run ingest:weo
//
// Run with: npm run ingest:weo

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import * as XLSX from "xlsx";
import { db } from "../db";
import { forecasters, variables, forecasts } from "../db/schema";

// ---------------------------------------------------------------------------
// WEO subject code → our variable name  (same codes in both old and new format)
// ---------------------------------------------------------------------------

export const SUBJECT_CODE_MAP: Record<string, string> = {
  NGDP_RPCH:    "GDP Growth Rate",        // GDP, constant prices, % change
  PCPIPCH:      "Inflation (CPI)",         // CPI, average % change
  LUR:          "Unemployment Rate",       // % of labour force
  BCA_NGDPD:    "Current Account Balance", // % of GDP
  GGXCNL_NGDP: "Government Balance",      // overall net lending/borrowing, % of GDP
  GGXWDG_NGDP: "Government Gross Debt",   // gross debt, % of GDP
};

// ---------------------------------------------------------------------------
// Group code maps
// ---------------------------------------------------------------------------

// Legacy tab-delimited format: WEO Country Group Code → our country code
const GROUP_CODE_MAP_LEGACY: Record<string, string> = {
  "001": "WLD",  // World
  "110": "ADV",  // Advanced Economies
  "200": "EME",  // Emerging Market and Developing Economies
  "119": "EA",   // Euro Area
  "998": "G7",   // G7
};

// New CSV format: G-prefixed numeric codes differ from legacy for EA and G7
const GROUP_CODE_MAP_CSV: Record<string, string> = {
  "G001": "WLD",  // World
  "G110": "ADV",  // Advanced Economies
  "G200": "EME",  // Emerging Market and Developing Economies
  "G163": "EA",   // Euro Area
  "G119": "G7",   // G7
};

// ---------------------------------------------------------------------------
// Vintage definitions — update each April and October after IMF release.
// ---------------------------------------------------------------------------

export interface WeoVintage {
  year: number;
  month: "April" | "October";
  label: string;            // e.g. "2026-Apr" — used as vintage field in forecasts
  publication_date: string; // ISO date (approximate)
  // New Excel format (2025-Oct onwards): xlsx workbook with Countries + Country Groups sheets
  xlsx_file?: string;
  // New CSV format (data portal export): single quoted CSV file with SERIES_CODE column
  csv_file?: string;
  // Legacy format (pre-2025-Oct): two tab-delimited txt files
  countries_file?: string;
  groups_file?: string;
}

export const WEO_VINTAGES: WeoVintage[] = [
  {
    year: 2026, month: "April", label: "2026-Apr", publication_date: "2026-04-22",
    csv_file: "WEOApr2026.csv",
  },
  {
    year: 2025, month: "October", label: "2025-Oct", publication_date: "2025-10-21",
    xlsx_file: "WEOOct2025all.xlsx",
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
  {
    year: 2023, month: "October", label: "2023-Oct", publication_date: "2023-10-10",
    countries_file: "WEOOct2023all.txt", groups_file: "WEOOct2023alla.txt",
  },
  {
    year: 2023, month: "April", label: "2023-Apr", publication_date: "2023-04-11",
    countries_file: "WEOApr2023all.txt", groups_file: "WEOApr2023alla.txt",
  },
  {
    year: 2022, month: "October", label: "2022-Oct", publication_date: "2022-10-11",
    countries_file: "WEOOct2022all.txt", groups_file: "WEOOct2022alla.txt",
  },
  {
    year: 2022, month: "April", label: "2022-Apr", publication_date: "2022-04-19",
    countries_file: "WEOApr2022all.txt", groups_file: "WEOApr2022alla.txt",
  },
  {
    year: 2021, month: "October", label: "2021-Oct", publication_date: "2021-10-12",
    countries_file: "WEOOct2021all.txt", groups_file: "WEOOct2021alla.txt",
  },
  {
    year: 2021, month: "April", label: "2021-Apr", publication_date: "2021-04-06",
    countries_file: "WEOApr2021all.txt", groups_file: "WEOApr2021alla.txt",
  },
];

// Data directory relative to project root
const DATA_DIR = join(process.cwd(), "data", "weo");

// ---------------------------------------------------------------------------
// Shared row type — output of both parsers
// ---------------------------------------------------------------------------

export interface WeoRow {
  countryCode: string;
  subjectCode: string;
  yearData: Record<string, string>; // "2024" → "2.5"
  estimatesStartAfter: number;
}

// ---------------------------------------------------------------------------
// Parser for xlsx format (2025-Oct onwards)
// Workbook has two sheets: "Countries" and "Country Groups"
// Both sheets share the same column layout as the new CSV format.
// Year columns are integer headers (1980, 1981 … 2030).
// ---------------------------------------------------------------------------

export function parseWeoXlsxFile(filePath: string, fallbackEstimatesYear: number): WeoRow[] {
  if (!existsSync(filePath)) {
    throw new Error(`WEO file not found: ${filePath}\nSee instructions in src/lib/ingestion/imf-weo.ts`);
  }

  const wb = XLSX.readFile(filePath);
  const rows: WeoRow[] = [];

  for (const sheetName of ["Countries", "Country Groups"]) {
    const ws = wb.Sheets[sheetName];
    if (!ws) continue;

    const raw = XLSX.utils.sheet_to_json<(string | number | null)[]>(ws, { header: 1 });
    if (raw.length < 2) continue;

    const headers = raw[0] as (string | number)[];

    const seriesIdx       = headers.findIndex((h) => h === "SERIES_CODE");
    const latestActualIdx = headers.findIndex((h) => h === "LATEST_ACTUAL_ANNUAL_DATA");

    if (seriesIdx === -1) {
      throw new Error(`SERIES_CODE column not found in sheet "${sheetName}" of ${filePath}`);
    }

    // Year columns: numeric (integer) headers in the 1980–2035 range
    const yearCols = headers
      .map((h, i) => ({ index: i, year: String(h) }))
      .filter(({ year }) => /^\d{4}$/.test(year) && +year >= 1980 && +year <= 2035);

    for (let i = 1; i < raw.length; i++) {
      const cols = raw[i] as (string | number | null)[];

      const seriesCode = String(cols[seriesIdx] ?? "");
      const parts = seriesCode.split(".");
      if (parts.length < 3) continue;

      const [rawCountryCode, subjectCode, frequency] = parts;
      if (frequency !== "A") continue;
      if (!SUBJECT_CODE_MAP[subjectCode]) continue;

      let countryCode: string | null;
      if (rawCountryCode.startsWith("G")) {
        countryCode = GROUP_CODE_MAP_CSV[rawCountryCode] ?? null;
      } else {
        countryCode = rawCountryCode;
      }
      if (!countryCode) continue;

      const rawLatest = cols[latestActualIdx];
      const estimatesStartAfter =
        rawLatest != null && rawLatest !== ""
          ? parseInt(String(rawLatest), 10)
          : fallbackEstimatesYear;
      if (isNaN(estimatesStartAfter)) continue;

      const yearData: Record<string, string> = {};
      for (const { index, year } of yearCols) {
        const val = cols[index];
        if (val != null && val !== "" && val !== ".." && val !== "n/a" && val !== "--") {
          yearData[year] = String(val);
        }
      }

      rows.push({ countryCode, subjectCode, yearData, estimatesStartAfter });
    }
  }

  return rows;
}

// ---------------------------------------------------------------------------
// Parse a single quoted CSV line, handling commas inside quoted fields
// ---------------------------------------------------------------------------

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      // Handle escaped double-quotes ("") within a quoted field
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

// ---------------------------------------------------------------------------
// Parser for new CSV format (2025-Oct onwards)
// Single file, SERIES_CODE = "{countryCode}.{indicatorCode}.A"
//
// fallbackEstimatesYear: used when LATEST_ACTUAL_ANNUAL_DATA is empty,
// which happens for most country group rows (WLD, ADV, EME, G7, etc.).
// Pass vintage.year - 1 (e.g. 2024 for the Oct-2025 or Apr-2026 release).
// ---------------------------------------------------------------------------

export function parseWeoCsvFile(filePath: string, fallbackEstimatesYear: number): WeoRow[] {
  if (!existsSync(filePath)) {
    throw new Error(`WEO file not found: ${filePath}\nSee instructions in src/lib/ingestion/imf-weo.ts`);
  }

  const text = readFileSync(filePath, "utf-8");
  const lines = text.split("\n").filter((l) => l.trim().length > 0);

  if (lines.length < 2) {
    throw new Error(`WEO CSV file appears empty or malformed: ${filePath}`);
  }

  const headers = parseCSVLine(lines[0]);

  const seriesIdx       = headers.indexOf("SERIES_CODE");
  const latestActualIdx = headers.indexOf("LATEST_ACTUAL_ANNUAL_DATA");

  if (seriesIdx === -1 || latestActualIdx === -1) {
    throw new Error(
      `Expected columns (SERIES_CODE, LATEST_ACTUAL_ANNUAL_DATA) not found in ${filePath}.\nGot: ${headers.slice(0, 8).join(", ")}`
    );
  }

  // Year columns: 4-digit numbers in the 1980–2035 range
  const yearCols = headers
    .map((h, i) => ({ index: i, year: h }))
    .filter(({ year }) => /^\d{4}$/.test(year) && +year >= 1980 && +year <= 2035);

  const rows: WeoRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length < headers.length - 1) continue;

    const seriesCode = cols[seriesIdx] ?? "";
    const parts = seriesCode.split(".");
    if (parts.length < 3) continue;

    const [rawCountryCode, subjectCode, frequency] = parts;

    // Only process annual series
    if (frequency !== "A") continue;

    // Only process our tracked indicators
    if (!SUBJECT_CODE_MAP[subjectCode]) continue;

    // Resolve country code: G-prefixed codes are country groups
    let countryCode: string | null;
    if (rawCountryCode.startsWith("G")) {
      countryCode = GROUP_CODE_MAP_CSV[rawCountryCode] ?? null;
    } else {
      countryCode = rawCountryCode; // Standard ISO 3-letter code
    }
    if (!countryCode) continue;

    // LATEST_ACTUAL_ANNUAL_DATA is empty for most group rows (WLD, ADV, EME, G7)
    // in the new CSV format. Fall back to vintageYear - 1 in that case.
    const rawLatest = cols[latestActualIdx] ?? "";
    const estimatesStartAfter = rawLatest
      ? parseInt(rawLatest, 10)
      : fallbackEstimatesYear;
    if (isNaN(estimatesStartAfter)) continue;

    const yearData: Record<string, string> = {};
    for (const { index, year } of yearCols) {
      const val = (cols[index] ?? "").replace(/,/g, "").trim();
      if (val && val !== ".." && val !== "n/a" && val !== "--") {
        yearData[year] = val;
      }
    }

    rows.push({ countryCode, subjectCode, yearData, estimatesStartAfter });
  }

  return rows;
}

// ---------------------------------------------------------------------------
// Parser for legacy tab-delimited format (pre-2025-Oct)
// Two files: "By Countries" and "By Country Groups"
// ---------------------------------------------------------------------------

function parseWeoLegacyFile(filePath: string, fileType: "countries" | "groups"): WeoRow[] {
  if (!existsSync(filePath)) {
    throw new Error(`WEO file not found: ${filePath}\nSee instructions in src/lib/ingestion/imf-weo.ts`);
  }

  // IMF switched to UTF-16 LE encoding around 2024.
  // Files may have a BOM (0xFF 0xFE) or no BOM but null bytes at every odd offset.
  const buf = readFileSync(filePath);
  const hasBom   = buf[0] === 0xff && buf[1] === 0xfe;
  const isUtf16  = hasBom || buf[1] === 0x00; // null byte at position 1 = UTF-16 LE without BOM
  const text = isUtf16
    ? buf.slice(hasBom ? 2 : 0).toString("utf16le")
    : buf.toString("utf-8");
  const lines = text.split("\n").filter((l) => l.trim().length > 0);

  if (lines.length < 2) {
    throw new Error(`WEO file appears empty or malformed: ${filePath}`);
  }

  const headers = lines[0].split("\t").map((h) => h.trim().replace(/\r/g, ""));

  const subjectCodeIdx = headers.findIndex((h) => h === "WEO Subject Code");
  const estimatesIdx   = headers.findIndex((h) => h === "Estimates Start After");
  const countryColIdx  =
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
      fileType === "countries" ? rawCode : (GROUP_CODE_MAP_LEGACY[rawCode] ?? null);
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
  const allVariables  = await db.select().from(variables);
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

  // Route to the correct parser based on which file type is configured
  let allRows: WeoRow[];
  if (vintage.xlsx_file) {
    const xlsxPath = join(DATA_DIR, vintage.xlsx_file);
    const fallbackEstimatesYear = vintage.year - 1;
    allRows = parseWeoXlsxFile(xlsxPath, fallbackEstimatesYear);
    console.log(`  Format: xlsx workbook (${vintage.xlsx_file})`);
  } else if (vintage.csv_file) {
    const csvPath = join(DATA_DIR, vintage.csv_file);
    // fallback for group rows where LATEST_ACTUAL_ANNUAL_DATA is empty:
    // use year prior to publication (e.g. 2024 for the Oct-2025 or Apr-2026 release)
    const fallbackEstimatesYear = vintage.year - 1;
    allRows = parseWeoCsvFile(csvPath, fallbackEstimatesYear);
    console.log(`  Format: new CSV (${vintage.csv_file})`);
  } else if (vintage.countries_file && vintage.groups_file) {
    const countriesPath = join(DATA_DIR, vintage.countries_file);
    const groupsPath    = join(DATA_DIR, vintage.groups_file);
    const countriesRows = parseWeoLegacyFile(countriesPath, "countries");
    const groupsRows    = parseWeoLegacyFile(groupsPath, "groups");
    allRows = [...countriesRows, ...groupsRows];
    console.log(`  Format: legacy tab-delimited (${vintage.countries_file} + ${vintage.groups_file})`);
  } else {
    throw new Error(`Vintage "${vintage.label}" has no file configured — check WEO_VINTAGES in imf-weo.ts`);
  }

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
    const variableId   = variableMap.get(`${variableName}|${row.countryCode}`);

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
  return WEO_VINTAGES.filter((v) => {
    if (v.xlsx_file) return existsSync(join(DATA_DIR, v.xlsx_file));
    if (v.csv_file)  return existsSync(join(DATA_DIR, v.csv_file));
    return (
      existsSync(join(DATA_DIR, v.countries_file!)) &&
      existsSync(join(DATA_DIR, v.groups_file!))
    );
  });
}
