// GET /api/consensus
// Returns consensus forecasts for a variable, optionally filtered by target period.
// Query params: variable_id (required), target_period (optional)

import { db } from "@/lib/db";
import { consensusForecasts, actuals } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { ok, handleError } from "@/lib/api-helpers";

const querySchema = z.object({
  variable_id:   z.string().uuid("variable_id must be a valid UUID"),
  target_period: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const params = querySchema.parse({
      variable_id:   searchParams.get("variable_id") ?? undefined,
      target_period: searchParams.get("target_period") ?? undefined,
    });

    const conditions = [eq(consensusForecasts.variableId, params.variable_id)];
    if (params.target_period) {
      conditions.push(eq(consensusForecasts.targetPeriod, params.target_period));
    }

    const consensusRows = await db
      .select()
      .from(consensusForecasts)
      .where(and(...conditions))
      .orderBy(consensusForecasts.targetPeriod);

    // Also include actuals for the same periods so the UI can show forecast vs actual
    const actualRows = params.target_period
      ? await db
          .select()
          .from(actuals)
          .where(
            and(
              eq(actuals.variableId, params.variable_id),
              eq(actuals.targetPeriod, params.target_period)
            )
          )
      : await db
          .select()
          .from(actuals)
          .where(eq(actuals.variableId, params.variable_id))
          .orderBy(actuals.targetPeriod);

    return ok({ consensus: consensusRows, actuals: actualRows });
  } catch (err) {
    return handleError(err);
  }
}
