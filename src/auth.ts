// Auth.js v5 configuration for Forethought.
// Full config with Drizzle adapter — used in server components and API routes.
// Middleware uses auth.config.ts (no database) to stay Edge-compatible.

import NextAuth from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/lib/db";
import { users, accounts, sessions, verificationTokens } from "@/lib/db/schema";
import authConfig from "@/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  callbacks: {
    session({ session, user }) {
      // Expose user id in the session so client code can use it
      session.user.id = user.id;
      return session;
    },
  },
});
