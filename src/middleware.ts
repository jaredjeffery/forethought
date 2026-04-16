// Auth middleware — protects /dashboard routes.
// Uses the lightweight auth config (no database) so it runs in the Edge Runtime.
// Public showcase pages (/, /variables, /forecasters) are unrestricted.

import NextAuth from "next-auth";
import authConfig from "@/auth.config";

const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  matcher: ["/dashboard/:path*"],
};
