// POST /api/billing/portal creates a Stripe Billing Portal session for subscribers.

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { error, handleError, ok } from "@/lib/api-helpers";
import { getAppUrl, getStripeClient } from "@/lib/payments/stripe";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";

const requestSchema = z.object({
  returnPath: z.string().startsWith("/").optional(),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return error("Sign in before opening billing", 401);

    const body = request.headers.get("content-type")?.includes("application/json")
      ? await request.json()
      : {};
    const params = requestSchema.parse(body);

    const [latestSubscription] = await db
      .select({ stripeCustomerId: subscriptions.stripeCustomerId })
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);

    if (!latestSubscription) {
      return error("No Stripe customer is linked to this account", 404);
    }

    const portalSession = await getStripeClient().billingPortal.sessions.create({
      customer: latestSubscription.stripeCustomerId,
      return_url: `${getAppUrl()}${params.returnPath ?? "/pricing"}`,
    });

    return ok({ url: portalSession.url });
  } catch (err) {
    return handleError(err);
  }
}
