// DB query helpers for forecaster profile pages.
// Centralises the complex Drizzle queries (including raw sql fragments) that
// back the public forecaster profile, keeping page components free of DB logic.

import { db } from "./db";
import { forecasters, forecasts, variables, forecastScores } from "./db/schema";
import { eq, avg, count, sql, and, isNotNull } from "drizzle-orm";

export async function getForecasterBySlug(slug: string) {
  const [forecaster] = await db
    .select()
    .from(forecasters)
    .where(eq(forecasters.slug, slug))
    .limit(1);
  return forecaster ?? null;
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
