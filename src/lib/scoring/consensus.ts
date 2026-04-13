// Consensus computation.
// Aggregates individual forecasts into a simple mean consensus for each
// variable + target period combination, and stores the result in the
// consensus_forecasts table.
//
// The consensus is the unweighted mean across all forecasters. Weighted
// consensus (Phase 2) will be added once enough accuracy history exists.
// Score_vs_consensus in forecast_scores is only meaningful after consensus
// has been computed — run this before or after scoring, then rescore.

import { db } from "../db";
import { forecasts, consensusForecasts } from "../db/schema";
import { eq, and, avg, count, sql } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Compute consensus for a specific variable + target period
// ---------------------------------------------------------------------------

export async function computeConsensus(
  variableId: string,
  targetPeriod: string
): Promise<{ mean: number; n: number } | null> {
  const [result] = await db
    .select({
      mean: avg(sql<string>`${forecasts.value}::numeric`),
      n: count(forecasts.id),
    })
    .from(forecasts)
    .where(
      and(
        eq(forecasts.variableId, variableId),
        eq(forecasts.targetPeriod, targetPeriod)
      )
    );

  if (!result || result.n === 0 || result.mean === null) return null;

  const mean = parseFloat(result.mean);
  const n = Number(result.n);

  // Upsert into consensus_forecasts
  await db
    .insert(consensusForecasts)
    .values({
      variableId,
      targetPeriod,
      simpleMean: String(mean),
      nForecasters: n,
    })
    .onConflictDoUpdate({
      target: [consensusForecasts.variableId, consensusForecasts.targetPeriod],
      set: {
        simpleMean: String(mean),
        nForecasters: n,
        computedAt: new Date(),
      },
    });

  return { mean, n };
}

// ---------------------------------------------------------------------------
// Compute consensus for all variable + period combinations that have forecasts
// ---------------------------------------------------------------------------

export async function computeAllConsensus(): Promise<{
  computed: number;
  skipped: number;
}> {
  // Get all distinct variable + period combinations with at least 1 forecast
  const pairs = await db
    .selectDistinct({
      variableId: forecasts.variableId,
      targetPeriod: forecasts.targetPeriod,
    })
    .from(forecasts);

  let computed = 0;
  let skipped = 0;

  for (const { variableId, targetPeriod } of pairs) {
    const result = await computeConsensus(variableId, targetPeriod);
    if (result) computed++;
    else skipped++;
  }

  return { computed, skipped };
}
