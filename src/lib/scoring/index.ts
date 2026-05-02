// Forecast scoring engine.
// Computes accuracy metrics for individual forecasts once actuals are available,
// and populates the forecast_scores table.
//
// Metrics computed:
//   absolute_error      — |forecast - actual|. Simple, interpretable.
//   percentage_error    — (forecast - actual) / |actual| × 100. Allows comparison
//                         across variables with different scales.
//   directional_correct — Whether the forecast correctly predicted whether the
//                         variable would be above or below the prior year's actual.
//                         Null when no prior actual exists.
//   score_vs_consensus  — (|forecast - actual|) - (|consensus - actual|).
//                         Negative = forecaster beat the consensus. Null when no
//                         consensus exists for the same variable/period.
//   signed_error        — forecast - actual (positive = forecaster was too high).
//                         Used for bias analysis.
//
// Scoring policy:
//   - Always scores against the first-release actual (release_number = 1).
//   - Stores actual_id, methodology_version ("v1.0"), and horizon_months on
//     every score row for traceability and analysis.

import { db } from "../db";
import { forecasts, actuals, consensusForecasts, forecastScores } from "../db/schema";
import { eq, and, isNull, sql, desc } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Metric functions — pure, no DB access
// ---------------------------------------------------------------------------

/** |forecast - actual| */
export function computeAbsoluteError(forecast: number, actual: number): number {
  return Math.abs(forecast - actual);
}

/** (forecast - actual) / |actual| × 100 */
export function computePercentageError(forecast: number, actual: number): number {
  if (actual === 0) return NaN; // undefined when actual is zero
  return ((forecast - actual) / Math.abs(actual)) * 100;
}

/**
 * Whether the forecast correctly predicted the direction of change.
 * Direction is defined as: actual > priorActual → positive change (true if forecast > priorActual).
 * Returns null when priorActual is not available.
 */
export function computeDirectionalAccuracy(
  forecast: number,
  actual: number,
  priorActual: number | null
): boolean | null {
  if (priorActual === null) return null;
  const actualDirection = actual > priorActual;
  const forecastDirection = forecast > priorActual;
  return actualDirection === forecastDirection;
}

/**
 * Score vs consensus: this forecaster's absolute error minus the consensus absolute error.
 * Negative = beat the consensus. Null when no consensus is available.
 */
export function computeScoreVsConsensus(
  forecast: number,
  actual: number,
  consensus: number | null
): number | null {
  if (consensus === null) return null;
  const forecastError = Math.abs(forecast - actual);
  const consensusError = Math.abs(consensus - actual);
  return forecastError - consensusError;
}

/** forecast - actual (positive = forecaster was too high). Used for bias analysis. */
export function computeSignedError(forecast: number, actual: number): number {
  return forecast - actual;
}

/**
 * How many months ahead the forecast was made relative to the end of the target period.
 * Returns null when forecastMadeAt is not available.
 */
function computeHorizonMonths(forecastMadeAt: Date | null, targetPeriod: string): number | null {
  if (!forecastMadeAt) return null;
  // For annual periods ("2024"), target is approximately Dec 31 of that year
  if (/^\d{4}$/.test(targetPeriod)) {
    const targetDate = new Date(`${targetPeriod}-12-31`);
    const months = (targetDate.getFullYear() - forecastMadeAt.getFullYear()) * 12
      + (targetDate.getMonth() - forecastMadeAt.getMonth());
    return Math.max(0, months);
  }
  // For quarterly periods ("2024Q1"), target is last month of quarter
  const qMatch = targetPeriod.match(/^(\d{4})Q([1-4])$/);
  if (qMatch) {
    const year = parseInt(qMatch[1]);
    const quarter = parseInt(qMatch[2]);
    const endMonth = quarter * 3 - 1; // 0-indexed: Q1 ends in Feb (2), Q4 ends in Nov (11)
    const targetDate = new Date(year, endMonth, 1);
    const months = (targetDate.getFullYear() - forecastMadeAt.getFullYear()) * 12
      + (targetDate.getMonth() - forecastMadeAt.getMonth());
    return Math.max(0, months);
  }
  return null;
}

// ---------------------------------------------------------------------------
// Score a single forecast (by ID)
// ---------------------------------------------------------------------------

export async function scoreForecast(forecastId: string): Promise<boolean> {
  // Fetch the forecast
  const [forecast] = await db
    .select()
    .from(forecasts)
    .where(eq(forecasts.id, forecastId))
    .limit(1);

  if (!forecast) return false;

  // Fetch the first-release actual (release_number = 1) for this variable + period.
  // Scoring policy: always use the initial release, not revisions.
  const [actual] = await db
    .select()
    .from(actuals)
    .where(
      and(
        eq(actuals.variableId, forecast.variableId),
        eq(actuals.targetPeriod, forecast.targetPeriod),
        eq(actuals.releaseNumber, 1)
      )
    )
    .limit(1);

  if (!actual) return false; // no first-release actual yet; skip

  const fv = parseFloat(forecast.value);
  const av = parseFloat(actual.value);

  // Directional accuracy only applies to annual periods (plain 4-digit year).
  // Quarterly ("2024Q1") and monthly ("2024-03") formats are not supported here —
  // parseInt would silently truncate them to a year, producing a wrong prior period.
  const isAnnual = /^\d{4}$/.test(forecast.targetPeriod);
  let priorActual: number | null = null;
  if (isAnnual) {
    const priorYear = String(parseInt(forecast.targetPeriod, 10) - 1);
    const [priorActualRow] = await db
      .select({ value: actuals.value })
      .from(actuals)
      .where(
        and(
          eq(actuals.variableId, forecast.variableId),
          eq(actuals.targetPeriod, priorYear),
          eq(actuals.releaseNumber, 1)
        )
      )
      .limit(1);
    priorActual = priorActualRow ? parseFloat(priorActualRow.value) : null;
  }

  // Fetch consensus for this variable + period
  const [consensus] = await db
    .select({ simpleMean: consensusForecasts.simpleMean })
    .from(consensusForecasts)
    .where(
      and(
        eq(consensusForecasts.variableId, forecast.variableId),
        eq(consensusForecasts.targetPeriod, forecast.targetPeriod)
      )
    )
    .orderBy(desc(consensusForecasts.asOfDate), desc(consensusForecasts.computedAt))
    .limit(1);
  const consensusValue = consensus ? parseFloat(consensus.simpleMean) : null;

  const absoluteError = computeAbsoluteError(fv, av);
  const percentageError = computePercentageError(fv, av);
  const directionalCorrect = computeDirectionalAccuracy(fv, av, priorActual);
  const scoreVsConsensus = computeScoreVsConsensus(fv, av, consensusValue);
  const signedError = computeSignedError(fv, av);
  const horizonMonths = computeHorizonMonths(forecast.forecastMadeAt ?? null, forecast.targetPeriod);

  // Upsert the score row (unique on forecast_id)
  await db
    .insert(forecastScores)
    .values({
      forecastId,
      actualId: actual.id,
      methodologyVersion: "v1.0",
      absoluteError: isNaN(absoluteError) ? null : String(absoluteError),
      percentageError: isNaN(percentageError) ? null : String(percentageError),
      directionalCorrect: directionalCorrect,
      scoreVsConsensus: scoreVsConsensus !== null && !isNaN(scoreVsConsensus)
        ? String(scoreVsConsensus)
        : null,
      signedError: isNaN(signedError) ? null : String(signedError),
      horizonMonths: horizonMonths,
    })
    .onConflictDoUpdate({
      target: forecastScores.forecastId,
      set: {
        actualId: actual.id,
        methodologyVersion: "v1.0",
        absoluteError: isNaN(absoluteError) ? null : String(absoluteError),
        percentageError: isNaN(percentageError) ? null : String(percentageError),
        directionalCorrect: directionalCorrect,
        scoreVsConsensus: scoreVsConsensus !== null && !isNaN(scoreVsConsensus)
          ? String(scoreVsConsensus)
          : null,
        signedError: isNaN(signedError) ? null : String(signedError),
        horizonMonths: horizonMonths,
        computedAt: new Date(),
      },
    });

  return true;
}

// ---------------------------------------------------------------------------
// Score all forecasts that have an available actual but no score yet
// ---------------------------------------------------------------------------

export async function scoreAllPending(): Promise<{ scored: number; skipped: number }> {
  // Find forecasts with a matching first-release actual but no score row
  const pending = await db
    .select({ id: forecasts.id })
    .from(forecasts)
    .innerJoin(
      actuals,
      and(
        eq(actuals.variableId, forecasts.variableId),
        eq(actuals.targetPeriod, forecasts.targetPeriod),
        eq(actuals.releaseNumber, 1)
      )
    )
    .leftJoin(forecastScores, eq(forecastScores.forecastId, forecasts.id))
    .where(isNull(forecastScores.id));

  let scored = 0;
  let skipped = 0;

  // N+1: each scoreForecast call makes 3-4 DB queries. Acceptable for Phase 1
  // volumes; replace with a batched upsert before this runs over ~10k forecasts.
  for (const { id } of pending) {
    const ok = await scoreForecast(id);
    if (ok) scored++;
    else skipped++;
  }

  return { scored, skipped };
}

// ---------------------------------------------------------------------------
// Re-score all forecasts (e.g. after actuals or consensus are updated)
// Uses bulk queries instead of N+1 to avoid Neon connection resets.
// ---------------------------------------------------------------------------

export async function rescoreAll(): Promise<{ scored: number; skipped: number }> {
  // 1. All (forecast, actual) pairs in one JOIN
  const pairs = await db
    .select({
      forecastId: forecasts.id,
      variableId: forecasts.variableId,
      targetPeriod: forecasts.targetPeriod,
      forecastValue: forecasts.value,
      forecastMadeAt: forecasts.forecastMadeAt,
      actualId: actuals.id,
      actualValue: actuals.value,
    })
    .from(forecasts)
    .innerJoin(
      actuals,
      and(
        eq(actuals.variableId, forecasts.variableId),
        eq(actuals.targetPeriod, forecasts.targetPeriod),
        eq(actuals.releaseNumber, 1)
      )
    );

  if (pairs.length === 0) return { scored: 0, skipped: 0 };

  // 2. All first-release actuals (for prior-year directional accuracy lookups)
  const allActuals = await db
    .select({ variableId: actuals.variableId, targetPeriod: actuals.targetPeriod, value: actuals.value })
    .from(actuals)
    .where(eq(actuals.releaseNumber, 1));
  const actualByKey = new Map<string, number>();
  for (const a of allActuals) {
    actualByKey.set(`${a.variableId}|${a.targetPeriod}`, parseFloat(a.value));
  }

  // 3. All consensus forecasts
  const allConsensus = await db
    .select({ variableId: consensusForecasts.variableId, targetPeriod: consensusForecasts.targetPeriod, simpleMean: consensusForecasts.simpleMean })
    .from(consensusForecasts)
    .orderBy(consensusForecasts.variableId, consensusForecasts.targetPeriod, consensusForecasts.asOfDate);
  const consensusByKey = new Map<string, number>();
  for (const c of allConsensus) {
    consensusByKey.set(`${c.variableId}|${c.targetPeriod}`, parseFloat(c.simpleMean));
  }

  // 4. Compute scores in memory
  const scoreRows: (typeof forecastScores.$inferInsert)[] = [];
  for (const p of pairs) {
    const fv = parseFloat(p.forecastValue);
    const av = parseFloat(p.actualValue);

    const isAnnual = /^\d{4}$/.test(p.targetPeriod);
    const priorActual = isAnnual
      ? (actualByKey.get(`${p.variableId}|${String(parseInt(p.targetPeriod, 10) - 1)}`) ?? null)
      : null;
    const consensusValue = consensusByKey.get(`${p.variableId}|${p.targetPeriod}`) ?? null;

    const absoluteError     = computeAbsoluteError(fv, av);
    const percentageError   = computePercentageError(fv, av);
    const directionalCorrect = computeDirectionalAccuracy(fv, av, priorActual);
    const scoreVsConsensus  = computeScoreVsConsensus(fv, av, consensusValue);
    const signedError       = computeSignedError(fv, av);
    const horizonMonths     = computeHorizonMonths(p.forecastMadeAt ?? null, p.targetPeriod);

    scoreRows.push({
      forecastId: p.forecastId,
      actualId: p.actualId,
      methodologyVersion: "v1.0",
      absoluteError:    isNaN(absoluteError)    ? null : String(absoluteError),
      percentageError:  isNaN(percentageError)  ? null : String(percentageError),
      directionalCorrect,
      scoreVsConsensus: scoreVsConsensus !== null && !isNaN(scoreVsConsensus) ? String(scoreVsConsensus) : null,
      signedError:      isNaN(signedError)      ? null : String(signedError),
      horizonMonths,
    });
  }

  // 5. Batch upsert in chunks of 500
  const BATCH = 500;
  for (let i = 0; i < scoreRows.length; i += BATCH) {
    await db
      .insert(forecastScores)
      .values(scoreRows.slice(i, i + BATCH))
      .onConflictDoUpdate({
        target: forecastScores.forecastId,
        set: {
          actualId:          sql`excluded.actual_id`,
          methodologyVersion: sql`excluded.methodology_version`,
          absoluteError:     sql`excluded.absolute_error`,
          percentageError:   sql`excluded.percentage_error`,
          directionalCorrect: sql`excluded.directional_correct`,
          scoreVsConsensus:  sql`excluded.score_vs_consensus`,
          signedError:       sql`excluded.signed_error`,
          horizonMonths:     sql`excluded.horizon_months`,
          computedAt:        new Date(),
        },
      });
  }

  return { scored: scoreRows.length, skipped: 0 };
}
