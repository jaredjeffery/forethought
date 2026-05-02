// Terminal QA summary for Phase 0.5 data provenance and score integrity checks.

import { getDataQaSnapshot } from "../src/lib/admin/data-qa";

function count(value: number) {
  return value.toLocaleString("en-ZA");
}

function shortDate(value: Date | string | null) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("en-ZA", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(date);
}

function truncate(value: string | null | undefined, max = 90) {
  if (!value) return "-";
  return value.length > max ? `${value.slice(0, max - 1)}...` : value;
}

async function main() {
  const snapshot = await getDataQaSnapshot();

  console.log("\nData QA summary");
  console.table([
    { check: "Attention runs", count: snapshot.summaries.attentionRunCount },
    { check: "Running imports", count: snapshot.summaries.runningRunCount },
    { check: "Open quality flags", count: snapshot.summaries.openFlagCount },
    { check: "Score reference issues", count: snapshot.summaries.scoreIssueCount },
    { check: "Source docs missing hash", count: snapshot.summaries.sourceDocumentsMissingHashCount },
    { check: "Source docs without rows", count: snapshot.summaries.sourceDocumentsWithoutRowsCount },
  ]);

  console.log("\nDocuments by source");
  console.table(
    snapshot.summaries.documentsBySource.map((row) => ({
      source: row.sourceName,
      documents: count(Number(row.documentCount)),
    })),
  );

  console.log("\nRuns by source/status");
  console.table(
    snapshot.summaries.runsBySourceStatus.map((row) => ({
      source: row.sourceName,
      status: row.status,
      runs: count(Number(row.runCount)),
    })),
  );

  console.log("\nMappings by source");
  console.table(
    snapshot.summaries.mappingsBySource.map((row) => ({
      source: row.sourceName,
      mappings: count(Number(row.mappingCount)),
    })),
  );

  console.log("\nLatest ingestion runs");
  console.table(
    snapshot.ingestionRuns.slice(0, 12).map((run) => ({
      source: run.sourceName,
      vintage: run.vintageLabel ?? "-",
      status: run.status,
      created: run.recordsCreated,
      updated: run.recordsUpdated,
      skipped: run.recordsSkipped,
      started: shortDate(run.startedAt),
      errors: truncate(run.errors ? JSON.stringify(run.errors) : null),
    })),
  );

  console.log("\nLatest source documents");
  console.table(
    snapshot.sourceDocuments.slice(0, 12).map((doc) => ({
      source: doc.sourceName,
      vintage: doc.vintageLabel,
      forecasts: Number(doc.forecastCount),
      actuals: Number(doc.actualCount),
      hash: doc.fileHash ? doc.fileHash.slice(0, 12) : "missing",
      ingested: shortDate(doc.ingestedAt),
    })),
  );

  const strictFailures =
    snapshot.summaries.attentionRunCount +
    snapshot.summaries.runningRunCount +
    snapshot.summaries.openFlagCount +
    snapshot.summaries.scoreIssueCount;

  if (process.env.QA_STRICT === "1" && strictFailures > 0) {
    throw new Error(`Data QA found ${strictFailures} strict issue(s).`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
