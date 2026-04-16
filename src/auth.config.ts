// Lightweight auth config used in middleware (no database adapter).
// Must not import any Node.js-only modules (postgres, fs, etc.) so it can
// run in the Vercel Edge Runtime.

import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

export default {
  providers: [Google],
  pages: {
    signIn: "/signin",
  },
} satisfies NextAuthConfig;
