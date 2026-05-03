// Stripe helpers for Phase 2 subscriber billing and webhook synchronization.

import Stripe from "stripe";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

type SubscriptionStatus = typeof subscriptions.$inferInsert.status;

const STRIPE_STATUS_TO_DB: Record<Stripe.Subscription.Status, SubscriptionStatus> = {
  incomplete: "INCOMPLETE",
  incomplete_expired: "INCOMPLETE_EXPIRED",
  trialing: "TRIALING",
  active: "ACTIVE",
  past_due: "PAST_DUE",
  canceled: "CANCELED",
  unpaid: "UNPAID",
  paused: "PAUSED",
};

export function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }

  return new Stripe(secretKey);
}

export function getSubscriberPriceId() {
  const priceId = process.env.STRIPE_SUBSCRIBER_PRICE_ID;
  if (!priceId) {
    throw new Error("STRIPE_SUBSCRIBER_PRICE_ID is not configured.");
  }

  return priceId;
}

export function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

function fromStripeTimestamp(value: number | null | undefined) {
  return value ? new Date(value * 1000) : null;
}

function getSubscriptionPriceId(subscription: Stripe.Subscription) {
  return subscription.items.data[0]?.price.id ?? null;
}

export async function upsertStripeSubscription(
  subscription: Stripe.Subscription,
  userIdOverride?: string | null,
) {
  const [existing] = await db
    .select({ userId: subscriptions.userId })
    .from(subscriptions)
    .where(eq(subscriptions.stripeSubscriptionId, subscription.id))
    .limit(1);

  const userId = userIdOverride ?? subscription.metadata.userId ?? existing?.userId;
  if (!userId) return false;

  const values = {
    userId,
    stripeCustomerId:
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer.id,
    stripeSubscriptionId: subscription.id,
    stripePriceId: getSubscriptionPriceId(subscription),
    planKey: subscription.metadata.planKey ?? "subscriber",
    status: STRIPE_STATUS_TO_DB[subscription.status],
    currentPeriodStart: fromStripeTimestamp(subscription.current_period_start),
    currentPeriodEnd: fromStripeTimestamp(subscription.current_period_end),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    canceledAt: fromStripeTimestamp(subscription.canceled_at),
    trialEnd: fromStripeTimestamp(subscription.trial_end),
    updatedAt: new Date(),
  };

  await db
    .insert(subscriptions)
    .values(values)
    .onConflictDoUpdate({
      target: subscriptions.stripeSubscriptionId,
      set: values,
    });

  return true;
}
