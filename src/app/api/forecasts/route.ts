// GET /api/forecasts
// Returns forecasts with optional filters.
// Query params: variable_id, forecaster_id, target_period, vintage

import { db } from "@/lib/db";
import { forecasts, forecastScores } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { ok, handleError } from "@/lib/api-helpers";

const querySchema = z.object({
  variable_id:  z.string().uuid().optional(),
  forecaster_id: z.string().uuid().optional(),
  target_period: z.string().optional(),
  vintage:       z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const params = querySchema.parse({
      variable_id:   searchParams.get("variable_id")   ?? undefined,
      forecaster_id: searchParams.get("forecaster_id") ?? undefined,
      target_period: searchParams.get("target_period") ?? undefined,
      vintage:       searchParams.get("vintage")       ?? undefined,
    });

    const conditions = [];
    if (params.variable_id)   conditions.push(eq(forecasts.variableId,    params.variable_id));
    if (params.forecaster_id) conditions.push(eq(forecasts.forecasterId,   params.forecaster_id));
    if (params.target_period) conditions.push(eq(forecasts.targetPeriod,  params.target_period));
    if (params.vintage)       conditions.push(eq(forecasts.vintage,        params.vintage));

    const rows = await db
      .select({
        id:               forecasts.id,
        forecasterId:     forecasts.forecasterId,
        variableId:       forecasts.variableId,
        targetPeriod:     forecasts.targetPeriod,
        value:            forecasts.value,
        lowerCi:          forecasts.lowerCi,
        upperCi:          forecasts.upperCi,
        submittedAt:      forecasts.submittedAt,
        vintage:          forecasts.vintage,
        absoluteError:    forecastScores.absoluteError,
        percentageError:  forecastScores.percentageError,
        scoreVsConsensus: forecastScores.scoreVsConsensus,
        directionalCorrect: forecastScores.directionalCorrect,
      })
      .from(forecasts)
      .leftJoin(forecastScores, eq(forecastScores.forecastId, forecasts.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(forecasts.targetPeriod, forecasts.submittedAt)
      .limit(500);

    return ok(rows);
  } catch (err) {
    return handleError(err);
  }
}
