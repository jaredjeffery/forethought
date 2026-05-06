// ECB/Eurosystem Macroeconomic Projection Database (MPD) ingestion via ECB SDW SDMX API.
//
// The ECB MPD contains official Eurosystem staff macroeconomic projections for the
// euro area, published 3 times per year:
//   W## = Winter (March), S## = Spring (June), A## = Autumn (December)
//   where ## = 2-digit year (01=2001 … 25=2025)
//
// API endpoint (path-based dimension filter):
//   https://data-api.ecb.europa.eu/service/data/MPD/A.U2.{items}..{vintage}.0000?format=csvdata
//
// Variables mapped (Euro Area only, countryCode "EA"):
//   YER → GDP Growth Rate    (annual % change, SERIES_DENOM=A)
//   HIC → Inflation (CPI)    (HICP annual % change, SERIES_DENOM=A)
//   URX → Unemployment Rate  (%, SERIES_DENOM=F)
//
// OBS_STATUS = F identifies genuine forecasts (vs A = actual historical observations).
//
// Run with: npx tsx --env-file=.env.local scripts/ingest-ecb-mpd.ts

import { db } from "../db";
import { forecasters, variables, forecasts, variableSourceMappings } from "../db/schema";
import { eq, and, sql } from "drizzle-orm";
import {
  finishIngestionRun,
  hashTextParts,
  serializeIngestionError,
  startIngestionRun,
  upsertSourceDocument,
  upsertVariableSourceMappings,
} from "./provenance";

// ---------------------------------------------------------------------------
// Vintage definitions (2015 onwards by default; ECB archive goes back to 2001)
// ---------------------------------------------------------------------------

export interface EcbMpdVintage {
  code: string;          // e.g. "A25", "S25", "W25"
  label: string;         // stored as forecasts.vintage, e.g. "ECB-MPD-A25"
  publication_date: string; // ISO date (approximate release date)
  year: number;          // publication year
}

export function buildVintages(fromYear = 2015, toYear = 2025): EcbMpdVintage[] {
  const vintages: EcbMpdVintage[] = [];
  for (let y = toYear; y >= fromYear; y--) {
    const yy = String(y).slice(-2);
    vintages.push(
      { code: `A${yy}`, label: `ECB-MPD-A${yy}`, publication_date: `${y}-12-12`, year: y },
      { code: `S${yy}`, label: `ECB-MPD-S${yy}`, publication_date: `${y}-06-06`, year: y },
      { code: `W${yy}`, label: `ECB-MPD-W${yy}`, publication_date: `${y}-03-06`, year: y },
    );
  }
  return vintages;
}

export const ECB_MPD_VINTAGES = buildVintages();

// ---------------------------------------------------------------------------
// Code mappings
// ---------------------------------------------------------------------------

const ITEM_TO_VARIABLE: Record<string, string> = {
  "YER": "GDP Growth Rate",
  "HIC": "Inflation (CPI)",
  "URX": "Unemployment Rate",
};

const ITEMS_PARAM = Object.keys(ITEM_TO_VARIABLE).join("+");
const ECB_API_BASE = "https://data-api.ecb.europa.eu/service/data";
const ECB_SOURCE_NAME = "ECB-MPD";
const ECB_PUBLICATION_NAME = "ECB Macroeconomic Projection Database";
const SOURCE_URL = "https://www.ecb.europa.eu/pub/projections/html/index.en.html";

// ---------------------------------------------------------------------------
// CSV parser
// ---------------------------------------------------------------------------

interface EcbRow {
  pdItem: string;
  timePeriod: number;
  obsValue: number;
  obsStatus: string; // "F" = forecast, "A" = actual
}

function parseCsv(text: string): EcbRow[] {
  const lines = text.trim().split("\n").filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = lines[0].split(",");
  const itemIdx   = headers.findIndex((h) => h.trim() === "PD_ITEM");
  const periodIdx = headers.findIndex((h) => h.trim() === "TIME_PERIOD");
  const valueIdx  = headers.findIndex((h) => h.trim() === "OBS_VALUE");
  const statusIdx = headers.findIndex((h) => h.trim() === "OBS_STATUS");

  if (itemIdx === -1 || periodIdx === -1 || valueIdx === -1 || statusIdx === -1) {
    throw new Error(`Unexpected ECB MPD CSV headers: ${lines[0]}`);
  }

  const rows: EcbRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    const value = parseFloat(cols[valueIdx] ?? "");
    if (isNaN(value)) continue;
    rows.push({
      pdItem:     cols[itemIdx]?.trim() ?? "",
      timePeriod: parseInt(cols[periodIdx] ?? "", 10),
      obsValue:   value,
      obsStatus:  cols[statusIdx]?.trim() ?? "",
    });
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Main ingestion function
// ---------------------------------------------------------------------------

export async function ingestEcbMpdVintage(vintage: EcbMpdVintage): Promise<{
  forecasts_inserted: number;
  forecasts_updated: number;
  skipped_no_variable: number;
}> {
  console.log(`\nIngesting ECB MPD ${vintage.label}...`);

  // 1. Look up ECB forecaster
  const [ecb] = await db
    .select({ id: forecasters.id })
    .from(forecasters)
    .where(eq(forecasters.slug, "ecb"))
    .limit(1);
  if (!ecb) throw new Error("ECB forecaster not found — run npm run seed");

  // 2. Look up the three EA variable IDs
  const allVars = await db
    .select({ id: variables.id, name: variables.name, countryCode: variables.countryCode })
    .from(variables)
    .where(and(eq(variables.category, "MACRO"), eq(variables.countryCode, "EA")));

  const variableByName = new Map<string, string>();
  for (const v of allVars) {
    variableByName.set(v.name, v.id);
  }

  // 3. Fetch from ECB SDW
  const url = `${ECB_API_BASE}/MPD/A.U2.${ITEMS_PARAM}..${vintage.code}.0000?format=csvdata`;
  const sourceDocumentId = await upsertSourceDocument({
    sourceName: ECB_SOURCE_NAME,
    publicationName: ECB_PUBLICATION_NAME,
    publicationDate: vintage.publication_date,
    vintageLabel: vintage.label,
    sourceUrl: SOURCE_URL,
    storageUrl: url,
  });
  const ingestionRunId = await startIngestionRun({
    sourceDocumentId,
    sourceName: ECB_SOURCE_NAME,
  });

  const resp = await fetch(url);
  if (!resp.ok) {
    console.warn(`  HTTP ${resp.status} — skipping ${vintage.label}`);
    await finishIngestionRun({
      ingestionRunId,
      status: "skipped",
      recordsSkipped: 0,
      errors: { status: resp.status, statusText: resp.statusText },
    });
    return { forecasts_inserted: 0, forecasts_updated: 0, skipped_no_variable: 0 };
  }
  const text = await resp.text();
  await upsertSourceDocument({
    sourceName: ECB_SOURCE_NAME,
    publicationName: ECB_PUBLICATION_NAME,
    publicationDate: vintage.publication_date,
    vintageLabel: vintage.label,
    sourceUrl: SOURCE_URL,
    storageUrl: url,
    fileHash: hashTextParts([text]),
  });
  let rows: EcbRow[];
  try {
    rows = parseCsv(text);
  } catch (error) {
    await finishIngestionRun({
      ingestionRunId,
      status: "failed",
      errors: serializeIngestionError(error),
    });
    throw error;
  }
  console.log(`  Received ${rows.length} data points`);

  // 4. Build forecast rows (OBS_STATUS = F only)
  const pubDate = new Date(vintage.publication_date);
  const forecastRows: (typeof forecasts.$inferInsert)[] = [];
  const mappingRows = new Map<string, typeof variableSourceMappings.$inferInsert>();
  let skippedNoVariable = 0;

  for (const row of rows) {
    if (row.obsStatus !== "F") continue;

    const variableName = ITEM_TO_VARIABLE[row.pdItem];
    if (!variableName) continue;

    const variableId = variableByName.get(variableName);
    if (!variableId) { skippedNoVariable++; continue; }

    mappingRows.set(`${row.pdItem}:${variableId}`, {
      sourceName: ECB_SOURCE_NAME,
      sourceVariableCode: row.pdItem,
      sourceVariableName: variableName,
      farfieldVariableId: variableId,
      unitTransform: "identity",
      notes: "ECB MPD annual euro area projection item mapped to Farfield macro variable.",
    });

    forecastRows.push({
      forecasterId: ecb.id,
      variableId,
      targetPeriod: String(row.timePeriod),
      value: String(row.obsValue),
      submittedAt: pubDate,
      forecastMadeAt: pubDate,
      vintage: vintage.label,
      sourceUrl: SOURCE_URL,
      sourceDocumentId,
    });
  }

  await upsertVariableSourceMappings(Array.from(mappingRows.values()));

  const existingForecasts = await db
    .select({
      variableId: forecasts.variableId,
      targetPeriod: forecasts.targetPeriod,
      vintage: forecasts.vintage,
    })
    .from(forecasts)
    .where(eq(forecasts.forecasterId, ecb.id));

  const existingKeys = new Set(
    existingForecasts.map(
      (row) => `${row.variableId}|${row.targetPeriod}|${row.vintage}`,
    ),
  );
  const createdCount = forecastRows.filter(
    (row) => !existingKeys.has(`${row.variableId}|${row.targetPeriod}|${row.vintage}`),
  ).length;
  const updatedCount = forecastRows.length - createdCount;

  // 5. Batch upsert so provenance is refreshed for previously imported vintages.
  const BATCH = 500;
  for (let i = 0; i < forecastRows.length; i += BATCH) {
    await db
      .insert(forecasts)
      .values(forecastRows.slice(i, i + BATCH))
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
    `  Inserted: ${createdCount}  |  Updated: ${updatedCount}  |  Skipped (no variable): ${skippedNoVariable}`,
  );
  return {
    forecasts_inserted: createdCount,
    forecasts_updated: updatedCount,
    skipped_no_variable: skippedNoVariable,
  };
}
