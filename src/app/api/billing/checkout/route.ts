// POST /api/billing/checkout creates a Stripe Checkout session for subscriber access.

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { subscriptions, users } from "@/lib/db/schema";
import { getAppUrl, getStripeClient, getSubscriberPriceId } from "@/lib/payments/stripe";
import { error, handleError, ok } from "@/lib/api-helpers";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";

const requestSchema = z.object({
  returnPath: z.string().startsWith("/").optional(),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return error("Sign in before starting checkout", 401);

    const body = request.headers.get("content-type")?.includes("application/json")
      ? await request.json()
      : {};
    const params = requestSchema.parse(body);

    const [user] = await db
      .select({ email: users.email, name: users.name })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) return error("User account not found", 404);

    const [latestSubscription] = await db
      .select({ stripeCustomerId: subscriptions.stripeCustomerId })
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);

    const stripe = getStripeClient();
    const appUrl = getAppUrl();
    const returnPath = params.returnPath ?? "/pricing";

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: latestSubscription?.stripeCustomerId,
      customer_email: latestSubscription?.stripeCustomerId ? undefined : user.email,
      line_items: [{ price: getSubscriberPriceId(), quantity: 1 }],
      success_url: `${appUrl}${returnPath}?checkout=success`,
      cancel_url: `${appUrl}${returnPath}?checkout=cancelled`,
      client_reference_id: userId,
      metadata: {
        userId,
        planKey: "subscriber",
      },
      subscription_data: {
        metadata: {
          userId,
          planKey: "subscriber",
        },
      },
    });

    return ok({ url: checkoutSession.url });
  } catch (err) {
    return handleError(err);
  }
}
