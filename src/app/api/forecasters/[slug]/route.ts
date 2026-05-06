// GET /api/forecasters/[slug]
// Returns a non-leaky public forecaster profile and coverage summary.

import { getForecasterBySlug, getForecasterPublicProfileData } from "@/lib/forecaster-queries";
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

    const forecaster = await getForecasterBySlug(parsed.data.slug);
    if (!forecaster) return error("Forecaster not found", 404);

    const publicProfile = await getForecasterPublicProfileData(forecaster.id);

    return ok({
      forecaster,
      publicProfile,
      lockedModules: [
        "accuracy_by_variable",
        "accuracy_by_horizon",
        "consensus_comparison",
        "vintage_history",
        "exports",
      ],
    });
  } catch (err) {
    return handleError(err);
  }
}
