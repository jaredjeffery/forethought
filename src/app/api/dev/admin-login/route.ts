// Local-only admin login helper for reviewing subscriber/admin-only UI without OAuth.

import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sessions, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const DEV_ADMIN_EMAIL = "admin@farfield.local";
const SESSION_DAYS = 7;
const DEV_ADMIN_COOKIE = "farfield-dev-admin";

function isEnabled() {
  return process.env.NODE_ENV === "development" || process.env.ENABLE_DEV_ADMIN_LOGIN === "1";
}

function safeCallbackUrl(request: Request) {
  const url = new URL(request.url);
  const callbackUrl = url.searchParams.get("callbackUrl") ?? "/variables/gdp-growth-rate-usa";
  return callbackUrl.startsWith("/") ? callbackUrl : "/variables/gdp-growth-rate-usa";
}

function localRedirectUrl(request: Request) {
  const host = request.headers.get("host") ?? "127.0.0.1:3000";
  const protocol = request.headers.get("x-forwarded-proto") ?? "http";
  return new URL(safeCallbackUrl(request), `${protocol}://${host}`);
}

export async function GET(request: Request) {
  if (!isEnabled()) {
    return NextResponse.json({ error: "Dev admin login is disabled" }, { status: 404 });
  }

  const [user] = await db
    .insert(users)
    .values({
      email: DEV_ADMIN_EMAIL,
      name: "Farfield Dev Admin",
      role: "ADMIN",
    })
    .onConflictDoUpdate({
      target: users.email,
      set: {
        name: "Farfield Dev Admin",
        role: "ADMIN",
      },
    })
    .returning({ id: users.id });

  await db.delete(sessions).where(eq(sessions.userId, user.id));

  const sessionToken = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await db.insert(sessions).values({
    sessionToken,
    userId: user.id,
    expires,
  });

  const response = NextResponse.redirect(localRedirectUrl(request));
  response.cookies.set("authjs.session-token", sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    expires,
  });
  response.cookies.set(DEV_ADMIN_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    expires,
  });

  return response;
}
