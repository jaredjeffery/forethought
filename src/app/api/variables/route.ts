// GET /api/variables
// Returns the list of tracked variables with optional filters.
// Query params: country (ISO alpha-3), category (MACRO|COMMODITY|FINANCIAL|POLITICAL)

import { db } from "@/lib/db";
import { variables } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { ok, handleError } from "@/lib/api-helpers";

const querySchema = z.object({
  country: z.string().optional(),
  category: z.enum(["MACRO", "COMMODITY", "FINANCIAL", "POLITICAL"]).optional(),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const { country, category } = querySchema.parse({
      country: searchParams.get("country") ?? undefined,
      category: searchParams.get("category") ?? undefined,
    });

    const conditions = [];
    if (country) conditions.push(eq(variables.countryCode, country));
    if (category) conditions.push(eq(variables.category, category));

    const rows = await db
      .select()
      .from(variables)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(variables.countryCode, variables.name);

    return ok(rows);
  } catch (err) {
    return handleError(err);
  }
}
