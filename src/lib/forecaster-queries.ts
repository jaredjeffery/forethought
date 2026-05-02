// DB query helpers for forecaster profile pages.
// Centralises the complex Drizzle queries (including raw sql fragments) that
// back the public forecaster profile, keeping page components free of DB logic.

import { db } from "./db";
import { forecasters, forecasts, variables, forecastScores } from "./db/schema";
import { eq, avg, count, countDistinct, sql, and, isNotNull, desc } from "drizzle-orm";

export async function getForecasterBySlug(slug: string) {
  const [forecaster] = await db
    .select()
    .from(forecasters)
    .where(eq(forecasters.slug, slug))
    .limit(1);
  return forecaster ?? null;
}

export async function getForecasterPublicProfileData(forecasterId: string) {
  const [summary] = await db
    .select({
      forecastCount: countDistinct(forecasts.id),
      scoredCount: countDistinct(forecastScores.id),
      variableCount: countDistinct(forecasts.variableId),
      countryCount: countDistinct(variables.countryCode),
      latestVintage: sql<string | null>`MAX(${forecasts.vintage})`,
    })
    .from(forecasters)
    .leftJoin(forecasts, eq(forecasts.forecasterId, forecasters.id))
    .leftJoin(forecastScores, eq(forecastScores.forecastId, forecasts.id))
    .leftJoin(variables, eq(variables.id, forecasts.variableId))
    .where(eq(forecasters.id, forecasterId));

  const coverageByIndicator = await db
    .select({
      indicatorName: variables.name,
      forecastCount: countDistinct(forecasts.id),
      scoredCount: countDistinct(forecastScores.id),
      countryCount: countDistinct(variables.countryCode),
    })
    .from(forecasts)
    .innerJoin(variables, eq(forecasts.variableId, variables.id))
    .leftJoin(forecastScores, eq(forecastScores.forecastId, forecasts.id))
    .where(eq(forecasts.forecasterId, forecasterId))
    .groupBy(variables.name)
    .orderBy(desc(countDistinct(forecasts.id)), variables.name);

  const coverageByCountry = await db
    .select({
      countryCode: variables.countryCode,
      forecastCount: countDistinct(forecasts.id),
      scoredCount: countDistinct(forecastScores.id),
      variableCount: countDistinct(forecasts.variableId),
    })
    .from(forecasts)
    .innerJoin(variables, eq(forecasts.variableId, variables.id))
    .leftJoin(forecastScores, eq(forecastScores.forecastId, forecasts.id))
    .where(eq(forecasts.forecasterId, forecasterId))
    .groupBy(variables.countryCode)
    .orderBy(desc(countDistinct(forecasts.id)), variables.countryCode);

  const vintages = await db
    .selectDistinct({ vintage: forecasts.vintage })
    .from(forecasts)
    .where(eq(forecasts.forecasterId, forecasterId))
    .orderBy(desc(forecasts.vintage))
    .limit(8);

  return {
    summary: summary ?? {
      forecastCount: 0,
      scoredCount: 0,
      variableCount: 0,
      countryCount: 0,
      latestVintage: null,
    },
    coverageByIndicator,
    coverageByCountry,
    vintages: vintages.filter((row) => row.vintage != null),
  };
}

export async function getForecasterProfileData(forecasterId: string) {
  // Overall stats: scored count, avg bias, beat-consensus rate
  const [overallStats] = await db
    .select({
      scoredCount: count(forecastScores.id),
      avgBias: avg(forecastScores.percentageError),
      beatConsensusCount: sql<string>`COUNT(CASE WHEN ${forecastScores.scoreVsConsensus} < 0 THEN 1 END)`,
      vsConsensusTotal: sql<string>`COUNT(CASE WHEN ${forecastScores.scoreVsConsensus} IS NOT NULL THEN 1 END)`,
    })
    .from(forecasts)
    .innerJoin(forecastScores, eq(forecastScores.forecastId, forecasts.id))
    .where(eq(forecasts.forecasterId, forecasterId));

  // Accuracy by indicator (variable name, aggregated across all countries)
  const accuracyByIndicator = await db
    .select({
      indicatorName: variables.name,
      scoredCount: count(forecastScores.id),
      avgAbsoluteError: avg(forecastScores.absoluteError),
      avgBias: avg(forecastScores.percentageError),
    })
    .from(forecasts)
    .innerJoin(variables, eq(forecasts.variableId, variables.id))
    .innerJoin(forecastScores, eq(forecastScores.forecastId, forecasts.id))
    .where(eq(forecasts.forecasterId, forecasterId))
    .groupBy(variables.name)
    .orderBy(avg(forecastScores.absoluteError));

  // Accuracy by country
  const accuracyByCountry = await db
    .select({
      countryCode: variables.countryCode,
      scoredCount: count(forecastScores.id),
      avgAbsoluteError: avg(forecastScores.absoluteError),
      avgBias: avg(forecastScores.percentageError),
    })
    .from(forecasts)
    .innerJoin(variables, eq(forecasts.variableId, variables.id))
    .innerJoin(forecastScores, eq(forecastScores.forecastId, forecasts.id))
    .where(eq(forecasts.forecasterId, forecasterId))
    .groupBy(variables.countryCode)
    .orderBy(avg(forecastScores.absoluteError));

  // Accuracy by forecast horizon (target_year − vintage_year).
  // Uses SPLIT_PART which is PostgreSQL-specific — kept in lib, not page code.
  const horizonExpr = sql<number>`CAST(${forecasts.targetPeriod} AS INTEGER) - CAST(SPLIT_PART(${forecasts.vintage}, '-', 1) AS INTEGER)`;
  const accuracyByHorizon = await db
    .select({
      horizon: horizonExpr,
      scoredCount: count(forecastScores.id),
      avgAbsoluteError: avg(forecastScores.absoluteError),
      avgBias: avg(forecastScores.percentageError),
    })
    .from(forecasts)
    .innerJoin(forecastScores, eq(forecastScores.forecastId, forecasts.id))
    .where(and(
      eq(forecasts.forecasterId, forecasterId),
      isNotNull(forecasts.vintage),
    ))
    .groupBy(horizonExpr)
    .orderBy(horizonExpr);

  // Full breakdown by individual variable
  const accuracyByVariable = await db
    .select({
      variableId: variables.id,
      variableName: variables.name,
      countryCode: variables.countryCode,
      forecastCount: count(forecasts.id),
      avgAbsoluteError: avg(forecastScores.absoluteError),
      avgScoreVsConsensus: avg(forecastScores.scoreVsConsensus),
    })
    .from(forecasts)
    .innerJoin(variables, eq(forecasts.variableId, variables.id))
    .leftJoin(forecastScores, eq(forecastScores.forecastId, forecasts.id))
    .where(eq(forecasts.forecasterId, forecasterId))
    .groupBy(variables.id, variables.name, variables.countryCode)
    .orderBy(variables.countryCode, variables.name);

  return { overallStats, accuracyByIndicator, accuracyByCountry, accuracyByHorizon, accuracyByVariable };
}
