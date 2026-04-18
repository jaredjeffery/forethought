// GET /api/forecasters/[slug]
// Returns a forecaster's profile with their forecast history and accuracy summary.

import { db } from "@/lib/db";
import { forecasters, forecasts, variables, forecastScores } from "@/lib/db/schema";
import { eq, avg, count } from "drizzle-orm";
import { z } from "zod";
import { ok, error, handleError } from "@/lib/api-helpers";

const slugSchema = z.object({
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, "Invalid slug format"),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const parsed = slugSchema.safeParse(await params);
    if (!parsed.success) return error("Invalid slug", 400);
    const { slug } = parsed.data;

    const [forecaster] = await db
      .select()
      .from(forecasters)
      .where(eq(forecasters.slug, slug))
      .limit(1);

    if (!forecaster) return error("Forecaster not found", 404);

    // Accuracy summary: average absolute error and score vs consensus per variable
    const accuracySummary = await db
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
      .where(eq(forecasts.forecasterId, forecaster.id))
      .groupBy(variables.id, variables.name, variables.countryCode)
      .orderBy(variables.countryCode, variables.name);

    return ok({ forecaster, accuracySummary });
  } catch (err) {
    return handleError(err);
  }
}
