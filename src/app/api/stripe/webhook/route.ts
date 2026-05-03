// POST /api/stripe/webhook verifies Stripe events and syncs subscription state.

import Stripe from "stripe";
import { db } from "@/lib/db";
import { stripeWebhookEvents } from "@/lib/db/schema";
import { error, handleError, ok } from "@/lib/api-helpers";
import { getStripeClient, upsertStripeSubscription } from "@/lib/payments/stripe";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

async function alreadyProcessed(eventId: string) {
  const [existing] = await db
    .select({ id: stripeWebhookEvents.id })
    .from(stripeWebhookEvents)
    .where(eq(stripeWebhookEvents.id, eventId))
    .limit(1);

  return Boolean(existing);
}

async function recordProcessed(event: Stripe.Event) {
  await db.insert(stripeWebhookEvents).values({
    id: event.id,
    type: event.type,
    payload: JSON.parse(JSON.stringify(event)) as Record<string, unknown>,
  });
}

export async function POST(request: Request) {
  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) return error("Stripe webhook secret is not configured", 500);

    const signature = request.headers.get("stripe-signature");
    if (!signature) return error("Missing Stripe signature", 400);

    const rawBody = await request.text();
    const event = getStripeClient().webhooks.constructEvent(rawBody, signature, webhookSecret);

    if (await alreadyProcessed(event.id)) {
      return ok({ received: true, duplicate: true });
    }

    if (event.type === "checkout.session.completed") {
      const checkoutSession = event.data.object as Stripe.Checkout.Session;
      if (checkoutSession.subscription) {
        const subscriptionId =
          typeof checkoutSession.subscription === "string"
            ? checkoutSession.subscription
            : checkoutSession.subscription.id;
        const subscription = await getStripeClient().subscriptions.retrieve(subscriptionId);
        await upsertStripeSubscription(subscription, checkoutSession.client_reference_id);
      }
    }

    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      await upsertStripeSubscription(event.data.object as Stripe.Subscription);
    }

    await recordProcessed(event);
    return ok({ received: true });
  } catch (err) {
    if (err instanceof Stripe.errors.StripeSignatureVerificationError) {
      return error("Invalid Stripe signature", 400);
    }

    return handleError(err);
  }
}
