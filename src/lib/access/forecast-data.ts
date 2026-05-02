// Server-side access helpers for forecast and consensus data.
// Keep forecast values out of public/free responses before they are serialized.

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export type ForecastDataAccess = "public" | "free" | "subscriber" | "admin";

export function canAccessPremiumForecastData(access: ForecastDataAccess) {
  return access === "subscriber" || access === "admin";
}

export async function getForecastDataAccess(): Promise<ForecastDataAccess> {
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
  if (user.role === "BUYER") return "subscriber";

  return "free";
}
