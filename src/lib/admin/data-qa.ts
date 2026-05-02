// Data integrity QA queries shared by the admin page and terminal script.

import { db } from "../db";
import {
  actuals,
  dataQualityFlags,
  forecastScores,
  forecasts,
  forecasters,
  ingestionRuns,
  scoringMethodologies,
  sourceDocuments,
  variableSourceMappings,
  variables,
} from "../db/schema";
import { count, countDistinct, desc, eq, isNull, or } from "drizzle-orm";

export async function getDataQaSnapshot() {
  const [
    sourceDocumentRows,
    ingestionRunRows,
    mappingRows,
    flagRows,
    scoreRows,
    documentSummaryRows,
    runSummaryRows,
    mappingSummaryRows,
    scoreIssueRows,
  ] = await Promise.all([
    db
      .select({
        id: sourceDocuments.id,
        sourceName: sourceDocuments.sourceName,
        publicationName: sourceDocuments.publicationName,
        publicationDate: sourceDocuments.publicationDate,
        vintageLabel: sourceDocuments.vintageLabel,
        sourceUrl: sourceDocuments.sourceUrl,
        storageUrl: sourceDocuments.storageUrl,
        fileHash: sourceDocuments.fileHash,
        ingestedAt: sourceDocuments.ingestedAt,
        forecastCount: countDistinct(forecasts.id),
        actualCount: countDistinct(actuals.id),
      })
      .from(sourceDocuments)
      .leftJoin(forecasts, eq(forecasts.sourceDocumentId, sourceDocuments.id))
      .leftJoin(actuals, eq(actuals.sourceDocumentId, sourceDocuments.id))
      .groupBy(
        sourceDocuments.id,
        sourceDocuments.sourceName,
        sourceDocuments.publicationName,
        sourceDocuments.publicationDate,
        sourceDocuments.vintageLabel,
        sourceDocuments.sourceUrl,
        sourceDocuments.storageUrl,
        sourceDocuments.fileHash,
        sourceDocuments.ingestedAt,
      )
      .orderBy(desc(sourceDocuments.ingestedAt))
      .limit(18),

    db
      .select({
        id: ingestionRuns.id,
        sourceName: ingestionRuns.sourceName,
        status: ingestionRuns.status,
        recordsCreated: ingestionRuns.recordsCreated,
        recordsUpdated: ingestionRuns.recordsUpdated,
        recordsSkipped: ingestionRuns.recordsSkipped,
        errors: ingestionRuns.errors,
        startedAt: ingestionRuns.startedAt,
        finishedAt: ingestionRuns.finishedAt,
        vintageLabel: sourceDocuments.vintageLabel,
      })
      .from(ingestionRuns)
      .leftJoin(sourceDocuments, eq(sourceDocuments.id, ingestionRuns.sourceDocumentId))
      .orderBy(desc(ingestionRuns.startedAt))
      .limit(24),

    db
      .select({
        id: variableSourceMappings.id,
        sourceName: variableSourceMappings.sourceName,
        sourceVariableCode: variableSourceMappings.sourceVariableCode,
        sourceVariableName: variableSourceMappings.sourceVariableName,
        unitTransform: variableSourceMappings.unitTransform,
        notes: variableSourceMappings.notes,
        updatedAt: variableSourceMappings.updatedAt,
        variableName: variables.name,
        countryCode: variables.countryCode,
        unit: variables.unit,
      })
      .from(variableSourceMappings)
      .innerJoin(variables, eq(variables.id, variableSourceMappings.farfieldVariableId))
      .orderBy(desc(variableSourceMappings.updatedAt))
      .limit(30),

    db
      .select({
        id: dataQualityFlags.id,
        entityType: dataQualityFlags.entityType,
        entityId: dataQualityFlags.entityId,
        severity: dataQualityFlags.severity,
        status: dataQualityFlags.status,
        message: dataQualityFlags.message,
        createdAt: dataQualityFlags.createdAt,
        resolvedAt: dataQualityFlags.resolvedAt,
        sourceName: sourceDocuments.sourceName,
        vintageLabel: sourceDocuments.vintageLabel,
      })
      .from(dataQualityFlags)
      .leftJoin(sourceDocuments, eq(sourceDocuments.id, dataQualityFlags.sourceDocumentId))
      .orderBy(desc(dataQualityFlags.createdAt))
      .limit(30),

    db
      .select({
        id: forecastScores.id,
        forecastId: forecastScores.forecastId,
        actualId: forecastScores.actualId,
        methodologyVersion: forecastScores.methodologyVersion,
        absoluteError: forecastScores.absoluteError,
        signedError: forecastScores.signedError,
        horizonMonths: forecastScores.horizonMonths,
        computedAt: forecastScores.computedAt,
        forecasterName: forecasters.name,
        variableName: variables.name,
        countryCode: variables.countryCode,
        targetPeriod: forecasts.targetPeriod,
        vintage: forecasts.vintage,
        actualSource: actuals.source,
        methodologyDescription: scoringMethodologies.description,
      })
      .from(forecastScores)
      .innerJoin(forecasts, eq(forecasts.id, forecastScores.forecastId))
      .innerJoin(forecasters, eq(forecasters.id, forecasts.forecasterId))
      .innerJoin(variables, eq(variables.id, forecasts.variableId))
      .leftJoin(actuals, eq(actuals.id, forecastScores.actualId))
      .leftJoin(
        scoringMethodologies,
        eq(scoringMethodologies.version, forecastScores.methodologyVersion),
      )
      .orderBy(desc(forecastScores.computedAt))
      .limit(24),

    db
      .select({
        sourceName: sourceDocuments.sourceName,
        documentCount: count(sourceDocuments.id),
      })
      .from(sourceDocuments)
      .groupBy(sourceDocuments.sourceName),

    db
      .select({
        sourceName: ingestionRuns.sourceName,
        status: ingestionRuns.status,
        runCount: count(ingestionRuns.id),
      })
      .from(ingestionRuns)
      .groupBy(ingestionRuns.sourceName, ingestionRuns.status),

    db
      .select({
        sourceName: variableSourceMappings.sourceName,
        mappingCount: count(variableSourceMappings.id),
      })
      .from(variableSourceMappings)
      .groupBy(variableSourceMappings.sourceName),

    db
      .select({
        id: forecastScores.id,
      })
      .from(forecastScores)
      .where(
        or(
          isNull(forecastScores.actualId),
          isNull(forecastScores.methodologyVersion),
        ),
      ),
  ]);

  const attentionRuns = ingestionRunRows.filter((run) =>
    ["failed", "skipped"].includes(run.status),
  );
  const runningRuns = ingestionRunRows.filter((run) =>
    run.status === "running" && run.finishedAt === null,
  );
  const sourceDocumentsMissingHash = sourceDocumentRows.filter((doc) => !doc.fileHash);
  const sourceDocumentsWithoutRows = sourceDocumentRows.filter((doc) =>
    Number(doc.forecastCount) === 0 && Number(doc.actualCount) === 0,
  );
  const openFlags = flagRows.filter((flag) => flag.status === "open");
  const scoreRowsMissingActual = scoreRows.filter((score) => score.actualId === null);
  const scoreRowsMissingMethodology = scoreRows.filter((score) =>
    score.methodologyVersion === null || score.methodologyDescription === null,
  );

  return {
    sourceDocuments: sourceDocumentRows,
    ingestionRuns: ingestionRunRows,
    variableMappings: mappingRows,
    dataQualityFlags: flagRows,
    scoreReviewRows: scoreRows,
    summaries: {
      documentsBySource: documentSummaryRows,
      runsBySourceStatus: runSummaryRows,
      mappingsBySource: mappingSummaryRows,
      scoreIssueCount: scoreIssueRows.length,
      attentionRunCount: attentionRuns.length,
      runningRunCount: runningRuns.length,
      openFlagCount: openFlags.length,
      sourceDocumentsMissingHashCount: sourceDocumentsMissingHash.length,
      sourceDocumentsWithoutRowsCount: sourceDocumentsWithoutRows.length,
      scoreRowsMissingActualCount: scoreRowsMissingActual.length,
      scoreRowsMissingMethodologyCount: scoreRowsMissingMethodology.length,
    },
  };
}
