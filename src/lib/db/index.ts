// Database connection using the postgres driver and Drizzle ORM.
// Exports a single `db` instance used throughout the application.

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// DATABASE_URL must be set before any DB operation is called.
// In Next.js this is enforced at startup; in scripts, load .env.local first
// via --env-file (see npm scripts in package.json).
const client = postgres(process.env.DATABASE_URL!, {
  // In serverless environments (Vercel), max: 1 prevents connection exhaustion.
  max: process.env.NODE_ENV === "production" ? 1 : 10,
});

export const db = drizzle(client, { schema });
export type DB = typeof db;
