// Drizzle Kit configuration — used for generating and running migrations.
// Run `npm run db:generate` to create a migration from schema changes.
// Run `npm run db:migrate` to apply pending migrations to the database.

import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

// Load .env.local so DATABASE_URL is available when running drizzle-kit commands
config({ path: ".env.local" });

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // DATABASE_URL must be set in .env.local before running db:migrate or db:studio
    url: process.env.DATABASE_URL ?? "",
  },
  verbose: true,
  strict: true,
});
