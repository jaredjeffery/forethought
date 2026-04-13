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

import { db } from "../db";
import { forecasts, actuals, consensusForecasts, forecastScores } from "../db/schema";
import { eq, and, isNull, isNotNull } from "drizzle-orm";

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

  // Fetch the actual for this variable + period
  const [actual] = await db
    .select()
    .from(actuals)
    .where(
      and(
        eq(actuals.variableId, forecast.variableId),
        eq(actuals.targetPeriod, forecast.targetPeriod)
      )
    )
    .limit(1);

  if (!actual) return false; // can't score without an actual

  const fv = parseFloat(forecast.value);
  const av = parseFloat(actual.value);

  // Fetch the prior year's actual for directional accuracy
  const priorYear = String(parseInt(forecast.targetPeriod, 10) - 1);
  const [priorActualRow] = await db
    .select({ value: actuals.value })
    .from(actuals)
    .where(
      and(
        eq(actuals.variableId, forecast.variableId),
        eq(actuals.targetPeriod, priorYear)
      )
    )
    .limit(1);
  const priorActual = priorActualRow ? parseFloat(priorActualRow.value) : null;

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
    .limit(1);
  const consensusValue = consensus ? parseFloat(consensus.simpleMean) : null;

  const absoluteError = computeAbsoluteError(fv, av);
  const percentageError = computePercentageError(fv, av);
  const directionalCorrect = computeDirectionalAccuracy(fv, av, priorActual);
  const scoreVsConsensus = computeScoreVsConsensus(fv, av, consensusValue);

  // Upsert the score row (unique on forecast_id)
  await db
    .insert(forecastScores)
    .values({
      forecastId,
      absoluteError: isNaN(absoluteError) ? null : String(absoluteError),
      percentageError: isNaN(percentageError) ? null : String(percentageError),
      directionalCorrect: directionalCorrect,
      scoreVsConsensus: scoreVsConsensus !== null && !isNaN(scoreVsConsensus)
        ? String(scoreVsConsensus)
        : null,
    })
    .onConflictDoUpdate({
      target: forecastScores.forecastId,
      set: {
        absoluteError: isNaN(absoluteError) ? null : String(absoluteError),
        percentageError: isNaN(percentageError) ? null : String(percentageError),
        directionalCorrect: directionalCorrect,
        scoreVsConsensus: scoreVsConsensus !== null && !isNaN(scoreVsConsensus)
          ? String(scoreVsConsensus)
          : null,
        computedAt: new Date(),
      },
    });

  return true;
}

// ---------------------------------------------------------------------------
// Score all forecasts that have an available actual but no score yet
// ---------------------------------------------------------------------------

export async function scoreAllPending(): Promise<{ scored: number; skipped: number }> {
  // Find forecasts with a matching actual but no score row
  const pending = await db
    .select({ id: forecasts.id })
    .from(forecasts)
    .innerJoin(
      actuals,
      and(
        eq(actuals.variableId, forecasts.variableId),
        eq(actuals.targetPeriod, forecasts.targetPeriod)
      )
    )
    .leftJoin(forecastScores, eq(forecastScores.forecastId, forecasts.id))
    .where(isNull(forecastScores.id));

  let scored = 0;
  let skipped = 0;

  for (const { id } of pending) {
    const ok = await scoreForecast(id);
    if (ok) scored++;
    else skipped++;
  }

  return { scored, skipped };
}

// ---------------------------------------------------------------------------
// Re-score all forecasts (e.g. after actuals or consensus are updated)
// ---------------------------------------------------------------------------

export async function rescoreAll(): Promise<{ scored: number; skipped: number }> {
  const all = await db
    .select({ id: forecasts.id })
    .from(forecasts)
    .innerJoin(
      actuals,
      and(
        eq(actuals.variableId, forecasts.variableId),
        eq(actuals.targetPeriod, forecasts.targetPeriod)
      )
    );

  let scored = 0;
  let skipped = 0;

  for (const { id } of all) {
    const ok = await scoreForecast(id);
    if (ok) scored++;
    else skipped++;
  }

  return { scored, skipped };
}
