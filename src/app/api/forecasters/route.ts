// GET /api/forecasters
// Returns all forecasters. Optional filter: type (INSTITUTION|ANALYST)

import { db } from "@/lib/db";
import { forecasters } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { ok, handleError } from "@/lib/api-helpers";

const querySchema = z.object({
  type: z.enum(["INSTITUTION", "ANALYST"]).optional(),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const { type } = querySchema.parse({
      type: searchParams.get("type") ?? undefined,
    });

    const rows = await db
      .select()
      .from(forecasters)
      .where(type ? eq(forecasters.type, type) : undefined)
      .orderBy(forecasters.name);

    return ok(rows);
  } catch (err) {
    return handleError(err);
  }
}
