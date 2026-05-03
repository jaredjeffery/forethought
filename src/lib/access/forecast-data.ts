// Server-side access helpers for forecast and consensus data.
// Keep forecast values out of public/free responses before they are serialized.

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { subscriptions, users } from "@/lib/db/schema";
import { and, eq, gt, inArray } from "drizzle-orm";
import { cookies } from "next/headers";

export type ForecastDataAccess = "public" | "free" | "subscriber" | "admin";

export function canAccessPremiumForecastData(access: ForecastDataAccess) {
  return access === "subscriber" || access === "admin";
}

export async function hasActiveSubscription(userId: string) {
  const [activeSubscription] = await db
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, userId),
        inArray(subscriptions.status, ["ACTIVE", "TRIALING"]),
        gt(subscriptions.currentPeriodEnd, new Date()),
      )
    )
    .limit(1);

  return Boolean(activeSubscription);
}

export async function getForecastDataAccess(): Promise<ForecastDataAccess> {
  if (process.env.NODE_ENV === "development") {
    const cookieStore = await cookies();
    if (cookieStore.get("farfield-dev-admin")?.value === "1") {
      return "admin";
    }
  }

  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;

  if (!userId) return "public";

  const [user] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) return "public";
  if (user.role === "ADMIN") return "admin";
  if (await hasActiveSubscription(userId)) return "subscriber";

  return "free";
}
