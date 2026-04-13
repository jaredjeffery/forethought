// GET /api/variables/[id]
// Returns a single variable with its recent forecasts and latest actuals.

import { db } from "@/lib/db";
import { variables, forecasts, actuals, forecasters, forecastScores } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { ok, error, handleError } from "@/lib/api-helpers";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [variable] = await db
      .select()
      .from(variables)
      .where(eq(variables.id, id))
      .limit(1);

    if (!variable) return error("Variable not found", 404);

    // Recent forecasts with forecaster names and scores
    const recentForecasts = await db
      .select({
        id: forecasts.id,
        forecasterId: forecasts.forecasterId,
        forecasterName: forecasters.name,
        forecasterSlug: forecasters.slug,
        targetPeriod: forecasts.targetPeriod,
        value: forecasts.value,
        lowerCi: forecasts.lowerCi,
        upperCi: forecasts.upperCi,
        submittedAt: forecasts.submittedAt,
        vintage: forecasts.vintage,
        absoluteError: forecastScores.absoluteError,
        scoreVsConsensus: forecastScores.scoreVsConsensus,
      })
      .from(forecasts)
      .innerJoin(forecasters, eq(forecasts.forecasterId, forecasters.id))
      .leftJoin(forecastScores, eq(forecastScores.forecastId, forecasts.id))
      .where(eq(forecasts.variableId, id))
      .orderBy(desc(forecasts.submittedAt))
      .limit(200);

    // All actuals for this variable
    const observedActuals = await db
      .select()
      .from(actuals)
      .where(eq(actuals.variableId, id))
      .orderBy(actuals.targetPeriod);

    return ok({ variable, forecasts: recentForecasts, actuals: observedActuals });
  } catch (err) {
    return handleError(err);
  }
}
