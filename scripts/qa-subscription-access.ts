// Verifies subscriber access is based on active subscription records, not user roles.

import { hasActiveSubscription } from "../src/lib/access/forecast-data";
import { db } from "../src/lib/db";
import { subscriptions, users } from "../src/lib/db/schema";
import { eq } from "drizzle-orm";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

async function main() {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const past = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [user] = await db
    .insert(users)
    .values({
      email: `qa-subscription-${suffix}@farfield.local`,
      name: "QA Subscription User",
      role: "BUYER",
    })
    .returning({ id: users.id });

  try {
    assert(!(await hasActiveSubscription(user.id)), "BUYER role must not unlock access without a subscription.");

    const [subscription] = await db
      .insert(subscriptions)
      .values({
        userId: user.id,
        stripeCustomerId: `cus_qa_${suffix}`,
        stripeSubscriptionId: `sub_qa_${suffix}`,
        stripePriceId: "price_qa",
        status: "ACTIVE",
        currentPeriodStart: new Date(),
        currentPeriodEnd: future,
      })
      .returning({ id: subscriptions.id });

    assert(await hasActiveSubscription(user.id), "ACTIVE subscription with future period should unlock access.");

    await db
      .update(subscriptions)
      .set({ status: "CANCELED", updatedAt: new Date() })
      .where(eq(subscriptions.id, subscription.id));
    assert(!(await hasActiveSubscription(user.id)), "CANCELED subscription must not unlock access.");

    await db
      .update(subscriptions)
      .set({ status: "ACTIVE", currentPeriodEnd: past, updatedAt: new Date() })
      .where(eq(subscriptions.id, subscription.id));
    assert(!(await hasActiveSubscription(user.id)), "Expired ACTIVE subscription must not unlock access.");

    await db
      .update(subscriptions)
      .set({ status: "TRIALING", currentPeriodEnd: future, updatedAt: new Date() })
      .where(eq(subscriptions.id, subscription.id));
    assert(await hasActiveSubscription(user.id), "TRIALING subscription with future period should unlock access.");

    console.log("Subscription access QA passed.");
  } finally {
    await db.delete(users).where(eq(users.id, user.id));
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
