// OECD Economic Outlook ingestion via SDMX API.
//
// The OECD maintains edition-specific dataflows (EO_114 through EO_118) that ARE
// genuine vintage snapshots — each edition's forecasts differ. Confirmed by comparing
// Germany GDP 2025: EO_115=+1.11%, EO_117=+0.39%, EO_118=+1.24%.
//
// API endpoint:
//   https://sdmx.oecd.org/public/rest/data/OECD.ECO.MAD,{dataflowId},1.0/{countries}.{measures}.A
//
// Variables mapped:
//   GDPV_ANNPCT  → GDP Growth Rate          (% change, annual)
//   CPI          → Inflation (CPI)          (price level → compute % YoY change)
//   UNR          → Unemployment Rate        (%)
//   NLGQ         → Government Balance       (net lending/borrowing, % GDP)
//   CBGDPR       → Current Account Balance  (% GDP)
//
// Run with: npx tsx --env-file=.env.local scripts/ingest-oecd-eo.ts

import { execSync } from "child_process";
import { db } from "../db";
import { forecasters, variables, forecasts, variableSourceMappings } from "../db/schema";
import { eq, sql } from "drizzle-orm";
import {
  finishIngestionRun,
  hashTextParts,
  serializeIngestionError,
  startIngestionRun,
  upsertSourceDocument,
  upsertVariableSourceMappings,
} from "./provenance";

// ---------------------------------------------------------------------------
// Vintage definitions
// ---------------------------------------------------------------------------

export interface OecdEoVintage {
  edition: number;
  label: string;            // stored as forecasts.vintage, e.g. "OECD-EO-118"
  publication_date: string; // ISO date (approximate release date)
  dataflowId: string;       // OECD SDMX dataflow ID
  year: number;             // publication year — only import years >= this as forecasts
}

export const OECD_EO_VINTAGES: OecdEoVintage[] = [
  {
    edition: 118, label: "OECD-EO-118", publication_date: "2025-12-03",
    dataflowId: "DSD_EO@DF_EO", year: 2025,
  },
  {
    edition: 117, label: "OECD-EO-117", publication_date: "2025-05-28",
    dataflowId: "DSD_EO_117@DF_EO_117", year: 2025,
  },
  {
    edition: 116, label: "OECD-EO-116", publication_date: "2024-12-04",
    dataflowId: "DSD_EO_116@DF_EO_116", year: 2024,
  },
  {
    edition: 115, label: "OECD-EO-115", publication_date: "2024-05-02",
    dataflowId: "DSD_EO_115@DF_EO_115", year: 2024,
  },
  {
    edition: 114, label: "OECD-EO-114", publication_date: "2023-11-29",
    dataflowId: "DSD_EO_114@DF_EO_114", year: 2023,
  },
];

// ---------------------------------------------------------------------------
// Code mappings
// ---------------------------------------------------------------------------

// Our countryCode → OECD REF_AREA code (CL_AREA codelist)
// EA uses the evolving-composition "EA" code (not EA19/EA20)
const OUR_TO_OECD_COUNTRY: Record<string, string> = {
  "EA": "EA",
  "G7": "G7",
};
// Countries with no OECD EO equivalent — skip silently
const SKIP_COUNTRIES = new Set(["WLD", "ADV", "EME"]);

// OECD REF_AREA → our countryCode (for mapping back from API response)
// Identity mapping for most; only non-identity entries needed here
const OECD_TO_OUR_COUNTRY: Record<string, string> = {};

// OECD MEASURE → our variable name (direct mapping)
const MEASURE_TO_VARIABLE: Record<string, string> = {
  "GDPV_ANNPCT": "GDP Growth Rate",
  "UNR":         "Unemployment Rate",
  "NLGQ":        "Government Balance",
  "CBGDPR":      "Current Account Balance",
};

const CPI_MEASURE = "CPI";
const CPI_VARIABLE_NAME = "Inflation (CPI)";

const ALL_MEASURES = [...Object.keys(MEASURE_TO_VARIABLE), CPI_MEASURE];
const SDMX_BASE = "https://sdmx.oecd.org/public/rest/data";
const OECD_SOURCE_NAME = "OECD-EO";
const OECD_PUBLICATION_NAME = "OECD Economic Outlook";
const OECD_PUBLICATION_URL = "https://www.oecd.org/en/publications/oecd-economic-outlook_16097408.html";

// ---------------------------------------------------------------------------
// SDMX CSV parser (minimal — handles the simple OECD csvfile format)
// ---------------------------------------------------------------------------

interface OecdRow {
  refArea: string;
  measure: string;
  timePeriod: number;
  obsValue: number;
}

function parseCsv(text: string): OecdRow[] {
  const lines = text.trim().split("\n").filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = lines[0].split(",");
  const refAreaIdx   = headers.findIndex((h) => h.trim() === "REF_AREA");
  const measureIdx   = headers.findIndex((h) => h.trim() === "MEASURE");
  const periodIdx    = headers.findIndex((h) => h.trim() === "TIME_PERIOD");
  const valueIdx     = headers.findIndex((h) => h.trim() === "OBS_VALUE");

  if (refAreaIdx === -1 || measureIdx === -1 || periodIdx === -1 || valueIdx === -1) {
    throw new Error(`Unexpected OECD CSV headers: ${lines[0]}`);
  }

  const rows: OecdRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    const value = parseFloat(cols[valueIdx] ?? "");
    if (isNaN(value)) continue;
    rows.push({
      refArea:    cols[refAreaIdx]?.trim() ?? "",
      measure:    cols[measureIdx]?.trim() ?? "",
      timePeriod: parseInt(cols[periodIdx] ?? "", 10),
      obsValue:   value,
    });
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Fetch one vintage from the OECD SDMX API
// ---------------------------------------------------------------------------

async function fetchEdition(
  vintage: OecdEoVintage,
  oecdCountryCodes: string[],
): Promise<{ rows: OecdRow[]; sourceUrls: string[]; responseHash: string }> {
  const measuresParam = ALL_MEASURES.join("+");
  const startPeriod   = vintage.year - 1;
  const endPeriod     = vintage.year + 3;

  // OECD API returns 500 for large country lists — batch into groups of 5
  const COUNTRY_BATCH = 5;
  const allRows: OecdRow[] = [];
  const sourceUrls: string[] = [];
  const responseParts: string[] = [];

  for (let i = 0; i < oecdCountryCodes.length; i += COUNTRY_BATCH) {
    const batch        = oecdCountryCodes.slice(i, i + COUNTRY_BATCH);
    const countriesParam = batch.join("+");
    const url = `${SDMX_BASE}/OECD.ECO.MAD,${vintage.dataflowId},1.0/${countriesParam}.${measuresParam}.A?startPeriod=${startPeriod}&endPeriod=${endPeriod}&format=csvfile`;
    sourceUrls.push(url);

    // Node.js fetch is blocked by Cloudflare; use curl instead
    let text: string;
    try {
      text = execSync(
        `curl -sf -H "Accept: application/vnd.sdmx.data+csv; charset=utf-8" "${url}"`,
        { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 },
      );
    } catch (err: unknown) {
      // curl -f exits non-zero on HTTP 4xx/5xx; exit code 22 = HTTP error
      const errorLike = err as { status?: number; code?: number; message?: string };
      const code = errorLike.status ?? errorLike.code;
      if (code === 22) { continue; } // 404 or other HTTP error — no data
      console.warn(`  Batch [${batch.join(",")}] curl error — skipping. ${errorLike.message ?? String(err)}`);
      continue;
    }
    responseParts.push(text);
    allRows.push(...parseCsv(text));
  }

  return {
    rows: allRows,
    sourceUrls,
    responseHash: hashTextParts(responseParts),
  };
}

// ---------------------------------------------------------------------------
// Main ingestion function
// ---------------------------------------------------------------------------

export async function ingestOecdEoVintage(vintage: OecdEoVintage): Promise<{
  forecasts_inserted: number;
  forecasts_updated: number;
  skipped_no_variable: number;
}> {
  console.log(`\nIngesting OECD EO ${vintage.label} (edition ${vintage.edition})...`);

  // 1. Look up OECD forecaster
  const [oecd] = await db
    .select({ id: forecasters.id })
    .from(forecasters)
    .where(eq(forecasters.slug, "oecd"))
    .limit(1);
  if (!oecd) throw new Error("OECD forecaster not found — run npm run seed");

  // 2. Build variable lookup: "name|countryCode" → id
  const allVars = await db
    .select({ id: variables.id, name: variables.name, countryCode: variables.countryCode })
    .from(variables)
    .where(eq(variables.category, "MACRO"));

  const variableMap = new Map<string, string>();
  for (const v of allVars) {
    variableMap.set(`${v.name}|${v.countryCode}`, v.id);
  }

  // 3. Build the OECD country code list and reverse map
  const oecdCodes: string[] = [];
  const oecdToOur = new Map<string, string>(Object.entries(OECD_TO_OUR_COUNTRY));

  for (const ourCode of [...new Set(allVars.map((v) => v.countryCode))]) {
    if (SKIP_COUNTRIES.has(ourCode)) continue;
    const oecdCode = OUR_TO_OECD_COUNTRY[ourCode] ?? ourCode;
    oecdCodes.push(oecdCode);
    if (oecdCode !== ourCode) oecdToOur.set(oecdCode, ourCode);
  }

  const sourceDocumentId = await upsertSourceDocument({
    sourceName: OECD_SOURCE_NAME,
    publicationName: OECD_PUBLICATION_NAME,
    publicationDate: vintage.publication_date,
    vintageLabel: vintage.label,
    sourceUrl: OECD_PUBLICATION_URL,
  });
  const ingestionRunId = await startIngestionRun({
    sourceDocumentId,
    sourceName: OECD_SOURCE_NAME,
  });

  // 4. Fetch data from API
  let fetched: Awaited<ReturnType<typeof fetchEdition>>;
  try {
    fetched = await fetchEdition(vintage, [...new Set(oecdCodes)]);
  } catch (error) {
    await finishIngestionRun({
      ingestionRunId,
      status: "failed",
      errors: serializeIngestionError(error),
    });
    throw error;
  }
  const rows = fetched.rows;
  console.log(`  Received ${rows.length} data points from OECD SDMX`);

  await upsertSourceDocument({
    sourceName: OECD_SOURCE_NAME,
    publicationName: OECD_PUBLICATION_NAME,
    publicationDate: vintage.publication_date,
    vintageLabel: vintage.label,
    sourceUrl: OECD_PUBLICATION_URL,
    storageUrl: fetched.sourceUrls.join("\n"),
    fileHash: fetched.responseHash,
  });

  // 5. Group CPI by (country, year) for % change computation
  const cpiByCountryYear = new Map<string, number>(); // "AREA|YEAR" → level
  for (const row of rows) {
    if (row.measure === CPI_MEASURE) {
      cpiByCountryYear.set(`${row.refArea}|${row.timePeriod}`, row.obsValue);
    }
  }

  const pubDate = new Date(vintage.publication_date);
  const forecastRows: (typeof forecasts.$inferInsert)[] = [];
  const mappingRows = new Map<string, typeof variableSourceMappings.$inferInsert>();
  let skippedNoVariable = 0;

  // 6. Build forecast rows for direct-mapped measures
  for (const row of rows) {
    if (row.timePeriod < vintage.year) continue; // only forecast years
    if (row.measure === CPI_MEASURE) continue;   // handled separately below

    const variableName = MEASURE_TO_VARIABLE[row.measure];
    if (!variableName) continue;

    const ourCountry = oecdToOur.get(row.refArea) ?? row.refArea;
    const variableId = variableMap.get(`${variableName}|${ourCountry}`);
    if (!variableId) { skippedNoVariable++; continue; }
    mappingRows.set(`${row.measure}|${variableId}`, {
      sourceName: OECD_SOURCE_NAME,
      sourceVariableCode: row.measure,
      sourceVariableName: variableName,
      farfieldVariableId: variableId,
      unitTransform: "none",
      notes: `OECD EO ${vintage.edition} annual forecast series`,
    });

    forecastRows.push({
      forecasterId: oecd.id,
      variableId,
      targetPeriod: String(row.timePeriod),
      value: String(row.obsValue),
      submittedAt: pubDate,
      forecastMadeAt: pubDate,
      vintage: vintage.label,
      sourceUrl: OECD_PUBLICATION_URL,
      sourceDocumentId,
    });
  }

  // 7. Build forecast rows for CPI (compute % YoY change from price level)
  const cpiCountries = new Set(
    [...cpiByCountryYear.keys()].map((k) => k.split("|")[0])
  );
  for (const oecdArea of cpiCountries) {
    const ourCountry = oecdToOur.get(oecdArea) ?? oecdArea;
    const variableId = variableMap.get(`${CPI_VARIABLE_NAME}|${ourCountry}`);
    if (!variableId) { skippedNoVariable++; continue; }
    mappingRows.set(`${CPI_MEASURE}|${variableId}`, {
      sourceName: OECD_SOURCE_NAME,
      sourceVariableCode: CPI_MEASURE,
      sourceVariableName: CPI_VARIABLE_NAME,
      farfieldVariableId: variableId,
      unitTransform: "percent_change_from_index_level",
      notes: `OECD EO ${vintage.edition} CPI level converted to annual percent change`,
    });

    for (let year = vintage.year; year <= vintage.year + 3; year++) {
      const current = cpiByCountryYear.get(`${oecdArea}|${year}`);
      const prior   = cpiByCountryYear.get(`${oecdArea}|${year - 1}`);
      if (current == null || prior == null || prior === 0) continue;

      const pctChange = ((current / prior) - 1) * 100;

      forecastRows.push({
        forecasterId: oecd.id,
        variableId,
        targetPeriod: String(year),
        value: String(pctChange),
        submittedAt: pubDate,
        forecastMadeAt: pubDate,
        vintage: vintage.label,
        sourceUrl: OECD_PUBLICATION_URL,
        sourceDocumentId,
      });
    }
  }

  await upsertVariableSourceMappings(Array.from(mappingRows.values()));

  const existingForecasts = await db
    .select({
      variableId: forecasts.variableId,
      targetPeriod: forecasts.targetPeriod,
      vintage: forecasts.vintage,
    })
    .from(forecasts)
    .where(eq(forecasts.forecasterId, oecd.id));
  const existingKeys = new Set(
    existingForecasts.map((row) => `${row.variableId}|${row.targetPeriod}|${row.vintage}`),
  );
  const createdCount = forecastRows.filter(
    (row) => !existingKeys.has(`${row.variableId}|${row.targetPeriod}|${row.vintage}`),
  ).length;
  const updatedCount = forecastRows.length - createdCount;

  // 8. Batch upsert (500 at a time), refreshing provenance on existing rows
  const BATCH = 500;
  for (let i = 0; i < forecastRows.length; i += BATCH) {
    const batch = forecastRows.slice(i, i + BATCH);
    await db
      .insert(forecasts)
      .values(batch)
      .onConflictDoUpdate({
        target: [
          forecasts.forecasterId,
          forecasts.variableId,
          forecasts.targetPeriod,
          forecasts.vintage,
        ],
        set: {
          value: sql`excluded.value`,
          submittedAt: sql`excluded.submitted_at`,
          forecastMadeAt: sql`excluded.forecast_made_at`,
          sourceUrl: sql`excluded.source_url`,
          sourceDocumentId: sql`excluded.source_document_id`,
        },
      });
  }

  await finishIngestionRun({
    ingestionRunId,
    status: "success",
    recordsCreated: createdCount,
    recordsUpdated: updatedCount,
    recordsSkipped: skippedNoVariable,
  });

  console.log(
    `  Created: ${createdCount}  |  Updated: ${updatedCount}  |  Skipped (no variable): ${skippedNoVariable}`,
  );
  return {
    forecasts_inserted: createdCount,
    forecasts_updated: updatedCount,
    skipped_no_variable: skippedNoVariable,
  };
}
