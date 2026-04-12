// Database connection using the postgres driver and Drizzle ORM.
// Exports a single `db` instance used throughout the application.

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// In serverless environments (Vercel), max: 1 prevents connection exhaustion.
// For long-running scripts, this can be increased.
const client = postgres(process.env.DATABASE_URL, {
  max: process.env.NODE_ENV === "production" ? 1 : 10,
});

export const db = drizzle(client, { schema });
export type DB = typeof db;
