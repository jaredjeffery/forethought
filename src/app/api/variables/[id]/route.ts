// GET /api/variables/[id]
// Returns a single variable with actuals and non-leaky forecast coverage.

import { db } from "@/lib/db";
import { variables, forecasts, actuals } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
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

    const coverageRows = await db
      .select({
        forecasterId: forecasts.forecasterId,
        targetPeriod: forecasts.targetPeriod,
      })
      .from(forecasts)
      .where(eq(forecasts.variableId, id));

    // All actuals for this variable
    const observedActuals = await db
      .select()
      .from(actuals)
      .where(eq(actuals.variableId, id))
      .orderBy(actuals.targetPeriod);

    return ok({
      variable,
      actuals: observedActuals,
      forecastCoverage: {
        forecasterCount: new Set(coverageRows.map((row) => row.forecasterId)).size,
        targetPeriodCount: new Set(coverageRows.map((row) => row.targetPeriod)).size,
      },
    });
  } catch (err) {
    return handleError(err);
  }
}
