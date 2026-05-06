// IMF World Economic Outlook (WEO) ingestion.
// Reads from a locally downloaded WEO file and imports forecasts plus
// WEO-carried actuals for the core variables tracked in Phase 1.
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

import { createHash } from "crypto";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import * as XLSX from "xlsx";
import { eq, sql } from "drizzle-orm";
import { db } from "../db";
import {
  actuals,
  forecasters,
  forecasts,
  ingestionRuns,
  sourceDocuments,
  variableSourceMappings,
  variables,
} from "../db/schema";

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
  historicalDataSource: string | null;
  actualCutoffSource: "latest_actual_annual_data" | "estimates_start_after" | "fallback_estimates_year";
  isCountryGroup: boolean;
  sourceNotes: string | null;
}

interface ParsedWeoVintage {
  rows: WeoRow[];
  format: string;
  fileNames: string[];
  filePaths: string[];
  fileHash: string;
}

const WEO_SOURCE_NAME = "IMF-WEO";

function cleanCell(value: string | number | null | undefined): string {
  return String(value ?? "").trim();
}

function isCsvGroupCode(code: string): boolean {
  return /^G\d+$/.test(code);
}

function parseLatestActualYear(
  rawLatest: string,
  fallbackEstimatesYear: number,
  sourceNotes?: string | null,
): number {
  if (!rawLatest) return fallbackEstimatesYear;

  const calendarYearMatch = rawLatest.match(/^(\d{4})$/);
  if (calendarYearMatch) return parseInt(calendarYearMatch[1], 10);

  const fiscalYearMatch = rawLatest.match(/^FY(\d{4})(?:\/\d{2,4})?$/i);
  if (fiscalYearMatch) {
    const startYear = parseInt(fiscalYearMatch[1], 10);
    const normalizedNotes = sourceNotes?.replace(/\s+/g, " ") ?? "";
    if (/FY\(t-1\/t\)\s*=\s*CY\(t\)/.test(normalizedNotes)) {
      return startYear + 1;
    }
    return startYear;
  }

  return NaN;
}

function hasActualMetadata(row: WeoRow): boolean {
  if (row.historicalDataSource) return true;
  if (row.actualCutoffSource === "estimates_start_after") return true;
  return row.isCountryGroup && row.actualCutoffSource === "fallback_estimates_year";
}

function getSourceUrl(vintage: WeoVintage): string {
  return `https://www.imf.org/en/Publications/WEO/weo-database/${vintage.year}/${vintage.month}`;
}

function hashFiles(filePaths: string[]): string {
  const hash = createHash("sha256");
  for (const filePath of filePaths) {
    hash.update(readFileSync(filePath));
  }
  return hash.digest("hex");
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
    const historicalSourceIdx = headers.findIndex((h) => h === "HISTORICAL_DATA_SOURCE");
    const sourceNotesIdx = headers.findIndex((h) =>
      h === "METHODOLOGY_NOTES" ||
      h === "FULL_SOURCE_CITATION" ||
      h === "SHORT_SOURCE_CITATION"
    );

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
      if (isCsvGroupCode(rawCountryCode)) {
        countryCode = GROUP_CODE_MAP_CSV[rawCountryCode] ?? null;
      } else {
        countryCode = rawCountryCode;
      }
      if (!countryCode) continue;

      const rawLatest = cleanCell(cols[latestActualIdx]);
      const historicalDataSource =
        historicalSourceIdx >= 0 ? cleanCell(cols[historicalSourceIdx]) || null : null;
      const sourceNotes =
        sourceNotesIdx >= 0 ? cleanCell(cols[sourceNotesIdx]) || null : null;
      const estimatesStartAfter = parseLatestActualYear(
        rawLatest,
        fallbackEstimatesYear,
        sourceNotes,
      );
      if (isNaN(estimatesStartAfter)) continue;

      const yearData: Record<string, string> = {};
      for (const { index, year } of yearCols) {
        const val = cols[index];
        if (val != null && val !== "" && val !== ".." && val !== "n/a" && val !== "--") {
          yearData[year] = String(val);
        }
      }

      rows.push({
        countryCode,
        subjectCode,
        yearData,
        estimatesStartAfter,
        historicalDataSource,
        actualCutoffSource: rawLatest ? "latest_actual_annual_data" : "fallback_estimates_year",
        isCountryGroup: isCsvGroupCode(rawCountryCode),
        sourceNotes,
      });
    }
  }

  return rows;
}

// ---------------------------------------------------------------------------
// Parse quoted CSV records, including embedded newlines inside quoted fields.
// ---------------------------------------------------------------------------

function parseCSVRecords(text: string): string[][] {
  const records: string[][] = [];
  let record: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      // Handle escaped double-quotes ("") within a quoted field
      if (inQuotes && text[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (!inQuotes && ch === ",") {
      record.push(current);
      current = "";
    } else if (!inQuotes && (ch === "\n" || ch === "\r")) {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      record.push(current);
      if (record.some((value) => value.trim().length > 0)) {
        records.push(record);
      }
      record = [];
      current = "";
    } else {
      current += ch;
    }
  }

  record.push(current);
  if (record.some((value) => value.trim().length > 0)) {
    records.push(record);
  }

  return records;
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
  const records = parseCSVRecords(text);

  if (records.length < 2) {
    throw new Error(`WEO CSV file appears empty or malformed: ${filePath}`);
  }

  const headers = records[0];

  const seriesIdx       = headers.indexOf("SERIES_CODE");
  const latestActualIdx = headers.indexOf("LATEST_ACTUAL_ANNUAL_DATA");
  const historicalSourceIdx = headers.indexOf("HISTORICAL_DATA_SOURCE");
  const sourceNotesIdx = headers.indexOf("METHODOLOGY_NOTES") >= 0
    ? headers.indexOf("METHODOLOGY_NOTES")
    : headers.indexOf("FULL_SOURCE_CITATION") >= 0
      ? headers.indexOf("FULL_SOURCE_CITATION")
      : headers.indexOf("SHORT_SOURCE_CITATION");

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

  for (let i = 1; i < records.length; i++) {
    const cols = records[i];
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
    if (isCsvGroupCode(rawCountryCode)) {
      countryCode = GROUP_CODE_MAP_CSV[rawCountryCode] ?? null;
    } else {
      countryCode = rawCountryCode; // Standard ISO 3-letter code
    }
    if (!countryCode) continue;

    // LATEST_ACTUAL_ANNUAL_DATA is empty for most group rows (WLD, ADV, EME, G7)
    // in the new CSV format. Fall back to vintageYear - 1 in that case.
    const rawLatest = cleanCell(cols[latestActualIdx]);
    const historicalDataSource =
      historicalSourceIdx >= 0 ? cleanCell(cols[historicalSourceIdx]) || null : null;
    const sourceNotes =
      sourceNotesIdx >= 0 ? cleanCell(cols[sourceNotesIdx]) || null : null;
    const estimatesStartAfter = parseLatestActualYear(
      rawLatest,
      fallbackEstimatesYear,
      sourceNotes,
    );
    if (isNaN(estimatesStartAfter)) continue;

    const yearData: Record<string, string> = {};
    for (const { index, year } of yearCols) {
      const val = (cols[index] ?? "").replace(/,/g, "").trim();
      if (val && val !== ".." && val !== "n/a" && val !== "--") {
        yearData[year] = val;
      }
    }

    rows.push({
      countryCode,
      subjectCode,
      yearData,
      estimatesStartAfter,
      historicalDataSource,
      actualCutoffSource: rawLatest ? "latest_actual_annual_data" : "fallback_estimates_year",
      isCountryGroup: isCsvGroupCode(rawCountryCode),
      sourceNotes,
    });
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
  const sourceNotesIdx = headers.findIndex((h) => h === "Country/Series-specific Notes");
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
    const sourceNotes =
      sourceNotesIdx >= 0 ? cleanCell(cols[sourceNotesIdx]) || null : null;

    const yearData: Record<string, string> = {};
    for (const { index, year } of yearCols) {
      const val = (cols[index] ?? "").replace(/,/g, "");
      if (val && val !== ".." && val !== "n/a" && val !== "--") {
        yearData[year] = val;
      }
    }

    rows.push({
      countryCode,
      subjectCode,
      yearData,
      estimatesStartAfter,
      historicalDataSource: null,
      actualCutoffSource: "estimates_start_after",
      isCountryGroup: fileType === "groups",
      sourceNotes,
    });
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
// Source provenance helpers
// ---------------------------------------------------------------------------

function loadWeoVintage(vintage: WeoVintage): ParsedWeoVintage {
  if (vintage.xlsx_file) {
    const filePath = join(DATA_DIR, vintage.xlsx_file);
    return {
      rows: parseWeoXlsxFile(filePath, vintage.year - 1),
      format: `xlsx workbook (${vintage.xlsx_file})`,
      fileNames: [vintage.xlsx_file],
      filePaths: [filePath],
      fileHash: hashFiles([filePath]),
    };
  }

  if (vintage.csv_file) {
    const filePath = join(DATA_DIR, vintage.csv_file);
    return {
      rows: parseWeoCsvFile(filePath, vintage.year - 1),
      format: `new CSV (${vintage.csv_file})`,
      fileNames: [vintage.csv_file],
      filePaths: [filePath],
      fileHash: hashFiles([filePath]),
    };
  }

  if (vintage.countries_file && vintage.groups_file) {
    const countriesPath = join(DATA_DIR, vintage.countries_file);
    const groupsPath = join(DATA_DIR, vintage.groups_file);
    const filePaths = [countriesPath, groupsPath];
    return {
      rows: [
        ...parseWeoLegacyFile(countriesPath, "countries"),
        ...parseWeoLegacyFile(groupsPath, "groups"),
      ],
      format: `legacy tab-delimited (${vintage.countries_file} + ${vintage.groups_file})`,
      fileNames: [vintage.countries_file, vintage.groups_file],
      filePaths,
      fileHash: hashFiles(filePaths),
    };
  }

  throw new Error(`Vintage "${vintage.label}" has no file configured - check WEO_VINTAGES in imf-weo.ts`);
}

async function upsertSourceDocument(vintage: WeoVintage, parsed: ParsedWeoVintage): Promise<string> {
  const [doc] = await db
    .insert(sourceDocuments)
    .values({
      sourceName: WEO_SOURCE_NAME,
      publicationName: "World Economic Outlook",
      publicationDate: vintage.publication_date,
      vintageLabel: vintage.label,
      sourceUrl: getSourceUrl(vintage),
      storageUrl: parsed.fileNames.map((name) => `data/weo/${name}`).join(";"),
      fileHash: parsed.fileHash,
    })
    .onConflictDoUpdate({
      target: [sourceDocuments.sourceName, sourceDocuments.vintageLabel],
      set: {
        publicationDate: sql`excluded.publication_date`,
        sourceUrl: sql`excluded.source_url`,
        storageUrl: sql`excluded.storage_url`,
        fileHash: sql`excluded.file_hash`,
        ingestedAt: new Date(),
      },
    })
    .returning({ id: sourceDocuments.id });

  return doc.id;
}

async function assignActualReleaseNumbers(rows: (typeof actuals.$inferInsert)[]): Promise<void> {
  if (rows.length === 0) return;

  const existingRows = await db
    .select({
      variableId: actuals.variableId,
      targetPeriod: actuals.targetPeriod,
      releaseNumber: actuals.releaseNumber,
      vintageDate: actuals.vintageDate,
    })
    .from(actuals)
    .where(eq(actuals.source, WEO_SOURCE_NAME));

  const maxReleaseByKey = new Map<string, number>();
  const releaseByVintageKey = new Map<string, number>();

  for (const row of existingRows) {
    const key = `${row.variableId}|${row.targetPeriod}`;
    const vintageKey = `${key}|${row.vintageDate ?? ""}`;
    maxReleaseByKey.set(key, Math.max(maxReleaseByKey.get(key) ?? 0, row.releaseNumber));
    releaseByVintageKey.set(vintageKey, row.releaseNumber);
  }

  for (const row of rows) {
    const key = `${row.variableId}|${row.targetPeriod}`;
    const vintageKey = `${key}|${row.vintageDate ?? ""}`;
    const existingRelease = releaseByVintageKey.get(vintageKey);
    if (existingRelease) {
      row.releaseNumber = existingRelease;
      continue;
    }

    const nextRelease = (maxReleaseByKey.get(key) ?? 0) + 1;
    row.releaseNumber = nextRelease;
    maxReleaseByKey.set(key, nextRelease);
    releaseByVintageKey.set(vintageKey, nextRelease);
  }
}

// ---------------------------------------------------------------------------
// Ingest a single WEO vintage
// ---------------------------------------------------------------------------

export async function ingestWeoVintage(vintage: WeoVintage): Promise<{
  forecasts_inserted: number;
  actuals_upserted: number;
  skipped_no_variable: number;
  skipped_actual_metadata: number;
}> {
  console.log(`\nIngesting WEO ${vintage.label} from local files...`);
  const parsed = loadWeoVintage(vintage);
  const allRows = parsed.rows;
  console.log(`  Format: ${parsed.format}`);
  console.log(`  Parsed ${allRows.length} matching rows`);

  const sourceDocumentId = await upsertSourceDocument(vintage, parsed);
  const [run] = await db
    .insert(ingestionRuns)
    .values({
      sourceDocumentId,
      sourceName: WEO_SOURCE_NAME,
      status: "running",
      startedAt: new Date(),
    })
    .returning({ id: ingestionRuns.id });

  const { variableMap, forecasterIds } = await buildLookupMaps();
  const imfId = forecasterIds.get("imf");
  if (!imfId) throw new Error("IMF forecaster not found - run npm run seed first");

  const submittedAt = new Date(vintage.publication_date);
  let forecastsInserted = 0;
  let actualsUpserted = 0;
  let skippedNoVariable = 0;
  let skippedActualMetadata = 0;

  const forecastRows: (typeof forecasts.$inferInsert)[] = [];
  const actualRows: (typeof actuals.$inferInsert)[] = [];
  const mappingRows = new Map<string, typeof variableSourceMappings.$inferInsert>();

  for (const row of allRows) {
    const variableName = SUBJECT_CODE_MAP[row.subjectCode];
    const variableId = variableMap.get(`${variableName}|${row.countryCode}`);

    if (!variableId) {
      skippedNoVariable++;
      continue;
    }

    mappingRows.set(`${row.subjectCode}|${variableId}`, {
      sourceName: WEO_SOURCE_NAME,
      sourceVariableCode: row.subjectCode,
      sourceVariableName: variableName,
      farfieldVariableId: variableId,
      unitTransform: "none",
      notes: row.historicalDataSource
        ? `WEO historical data source: ${row.historicalDataSource}`
        : row.sourceNotes,
    });

    for (const [yearStr, value] of Object.entries(row.yearData)) {
      const year = parseInt(yearStr, 10);
      if (year <= row.estimatesStartAfter) {
        if (!hasActualMetadata(row)) {
          skippedActualMetadata++;
          continue;
        }

        actualRows.push({
          variableId,
          targetPeriod: yearStr,
          value,
          publishedAt: submittedAt,
          source: WEO_SOURCE_NAME,
          vintageDate: vintage.publication_date,
          releaseNumber: 1,
          isLatest: true,
          sourceDocumentId,
        });
      } else {
        forecastRows.push({
          forecasterId: imfId,
          variableId,
          targetPeriod: yearStr,
          value,
          submittedAt,
          forecastMadeAt: submittedAt,
          vintage: vintage.label,
          sourceUrl: getSourceUrl(vintage),
          sourceDocumentId,
        });
      }
    }
  }

  const BATCH = 500;
  await assignActualReleaseNumbers(actualRows);

  const mappings = Array.from(mappingRows.values());
  for (let i = 0; i < mappings.length; i += BATCH) {
    await db
      .insert(variableSourceMappings)
      .values(mappings.slice(i, i + BATCH))
      .onConflictDoUpdate({
        target: [
          variableSourceMappings.sourceName,
          variableSourceMappings.sourceVariableCode,
          variableSourceMappings.farfieldVariableId,
        ],
        set: {
          sourceVariableName: sql`excluded.source_variable_name`,
          unitTransform: sql`excluded.unit_transform`,
          notes: sql`excluded.notes`,
          updatedAt: new Date(),
        },
      });
  }

  for (let i = 0; i < actualRows.length; i += BATCH) {
    const result = await db
      .insert(actuals)
      .values(actualRows.slice(i, i + BATCH))
      .onConflictDoUpdate({
        target: [actuals.variableId, actuals.targetPeriod, actuals.source, actuals.releaseNumber],
        set: {
          value: sql`excluded.value`,
          publishedAt: sql`excluded.published_at`,
          vintageDate: sql`excluded.vintage_date`,
          isLatest: sql`excluded.is_latest`,
          sourceDocumentId: sql`excluded.source_document_id`,
        },
      })
      .returning({ id: actuals.id });
    actualsUpserted += result.length;
  }

  for (let i = 0; i < forecastRows.length; i += BATCH) {
    const result = await db
      .insert(forecasts)
      .values(forecastRows.slice(i, i + BATCH))
      .onConflictDoNothing()
      .returning({ id: forecasts.id });
    forecastsInserted += result.length;
  }

  await db
    .update(ingestionRuns)
    .set({
      status: "success",
      recordsCreated: forecastsInserted + actualsUpserted,
      recordsSkipped: skippedNoVariable + skippedActualMetadata,
      finishedAt: new Date(),
    })
    .where(eq(ingestionRuns.id, run.id));

  return {
    forecasts_inserted: forecastsInserted,
    actuals_upserted: actualsUpserted,
    skipped_no_variable: skippedNoVariable,
    skipped_actual_metadata: skippedActualMetadata,
  };
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
