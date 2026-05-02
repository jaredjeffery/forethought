// Shared helpers for source-document provenance and ingestion-run audit records.

import { createHash } from "crypto";
import { db } from "../db";
import {
  ingestionRuns,
  sourceDocuments,
  variableSourceMappings,
} from "../db/schema";
import { eq, sql } from "drizzle-orm";

export function hashTextParts(parts: string[]) {
  const hash = createHash("sha256");
  for (const part of parts) {
    hash.update(part);
  }
  return hash.digest("hex");
}

export function serializeIngestionError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return { message: String(error) };
}

export async function upsertSourceDocument(input: {
  sourceName: string;
  publicationName: string;
  publicationDate: string;
  vintageLabel: string;
  sourceUrl?: string;
  storageUrl?: string;
  fileHash?: string;
}) {
  const [doc] = await db
    .insert(sourceDocuments)
    .values({
      sourceName: input.sourceName,
      publicationName: input.publicationName,
      publicationDate: input.publicationDate,
      vintageLabel: input.vintageLabel,
      sourceUrl: input.sourceUrl,
      storageUrl: input.storageUrl,
      fileHash: input.fileHash,
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

export async function startIngestionRun(input: {
  sourceDocumentId?: string;
  sourceName: string;
}) {
  const [run] = await db
    .insert(ingestionRuns)
    .values({
      sourceDocumentId: input.sourceDocumentId,
      sourceName: input.sourceName,
      status: "running",
      startedAt: new Date(),
    })
    .returning({ id: ingestionRuns.id });

  return run.id;
}

export async function finishIngestionRun(input: {
  ingestionRunId: string;
  status: "success" | "failed" | "skipped";
  recordsCreated?: number;
  recordsUpdated?: number;
  recordsSkipped?: number;
  errors?: unknown;
}) {
  await db
    .update(ingestionRuns)
    .set({
      status: input.status,
      recordsCreated: input.recordsCreated ?? 0,
      recordsUpdated: input.recordsUpdated ?? 0,
      recordsSkipped: input.recordsSkipped ?? 0,
      errors: input.errors,
      finishedAt: new Date(),
    })
    .where(eq(ingestionRuns.id, input.ingestionRunId));
}

export async function upsertVariableSourceMappings(
  mappings: (typeof variableSourceMappings.$inferInsert)[],
) {
  if (mappings.length === 0) return;

  const BATCH = 500;
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
}
