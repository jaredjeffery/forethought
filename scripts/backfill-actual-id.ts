// Backfills forecast_scores.actual_id for existing scored forecasts.
// Matches each score's forecast → variable+period → actuals WHERE release_number = 1.
// Run with: npx tsx scripts/backfill-actual-id.ts

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { forecasts, actuals, forecastScores } from "../src/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { config } from "dotenv";

config({ path: ".env.local" });

async function main() {
  const client = postgres(process.env.DATABASE_URL!, { ssl: "require", max: 1 });
  const db = drizzle(client);

  // Get all scored forecasts that don't have actual_id set
  const scores = await db
    .select({
      scoreId: forecastScores.id,
      forecastId: forecastScores.forecastId,
      variableId: forecasts.variableId,
      targetPeriod: forecasts.targetPeriod,
    })
    .from(forecastScores)
    .innerJoin(forecasts, eq(forecasts.id, forecastScores.forecastId))
    .where(isNull(forecastScores.actualId));

  console.log(`Found ${scores.length} scores to backfill`);
  let updated = 0;

  for (const score of scores) {
    const [actual] = await db
      .select({ id: actuals.id })
      .from(actuals)
      .where(
        and(
          eq(actuals.variableId, score.variableId),
          eq(actuals.targetPeriod, score.targetPeriod),
          eq(actuals.releaseNumber, 1)
        )
      )
      .limit(1);

    if (actual) {
      await db
        .update(forecastScores)
        .set({ actualId: actual.id })
        .where(eq(forecastScores.id, score.scoreId));
      updated++;
    }
  }

  console.log(`Updated ${updated} of ${scores.length} score rows`);
  await client.end();
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
