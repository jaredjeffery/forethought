// One-time script: applies migration 0002 directly via SQL statements.
// Handles each statement individually to skip already-applied ones.
// Run with: npx tsx scripts/apply-migration.ts

import postgres from "postgres";
import { config } from "dotenv";
import fs from "fs";
import path from "path";

config({ path: ".env.local" });

const sql = postgres(process.env.DATABASE_URL!, { ssl: "require", max: 1 });

async function main() {
  console.log("Connecting to database...");

  // Check which migrations have already been applied
  const applied = await sql`
    SELECT name FROM drizzle.__drizzle_migrations ORDER BY created_at
  `.catch(() => [] as { name: string }[]);

  const appliedNames = new Set(applied.map((r: { name: string }) => r.name));
  console.log("Already applied:", [...appliedNames]);

  if (appliedNames.has("0002_whole_forgotten_one")) {
    console.log("Migration 0002 already applied, nothing to do.");
    await sql.end();
    process.exit(0);
  }

  console.log("Applying migration 0002...");

  // Apply each statement individually
  const statements = [
    `ALTER TYPE "public"."user_role" ADD VALUE IF NOT EXISTS 'VIEWER' BEFORE 'ANALYST'`,
    `CREATE TABLE IF NOT EXISTS "scoring_methodologies" (
      "version" text PRIMARY KEY NOT NULL,
      "effective_from" date NOT NULL,
      "description" text NOT NULL,
      "code_ref" text NOT NULL,
      "vintage_policy" text NOT NULL,
      "published_at" timestamp with time zone NOT NULL
    )`,
    `ALTER TABLE "actuals" DROP CONSTRAINT IF EXISTS "actuals_variable_period_unique"`,
    `ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'VIEWER'`,
    `ALTER TABLE "actuals" ADD COLUMN IF NOT EXISTS "vintage_date" date`,
    `ALTER TABLE "actuals" ADD COLUMN IF NOT EXISTS "release_number" integer DEFAULT 1 NOT NULL`,
    `ALTER TABLE "actuals" ADD COLUMN IF NOT EXISTS "is_latest" boolean DEFAULT true NOT NULL`,
    `ALTER TABLE "forecast_scores" ADD COLUMN IF NOT EXISTS "actual_id" uuid`,
    `ALTER TABLE "forecast_scores" ADD COLUMN IF NOT EXISTS "methodology_version" text`,
    `ALTER TABLE "forecast_scores" ADD COLUMN IF NOT EXISTS "horizon_months" integer`,
    `ALTER TABLE "forecast_scores" ADD COLUMN IF NOT EXISTS "signed_error" numeric(20, 6)`,
    `ALTER TABLE "forecasts" ADD COLUMN IF NOT EXISTS "forecast_made_at" timestamp with time zone`,
    `ALTER TABLE "forecast_scores" ADD CONSTRAINT "forecast_scores_actual_id_actuals_id_fk"
      FOREIGN KEY ("actual_id") REFERENCES "public"."actuals"("id") ON DELETE no action ON UPDATE no action`,
    `ALTER TABLE "forecast_scores" ADD CONSTRAINT "forecast_scores_methodology_version_scoring_methodologies_version_fk"
      FOREIGN KEY ("methodology_version") REFERENCES "public"."scoring_methodologies"("version") ON DELETE no action ON UPDATE no action`,
    `ALTER TABLE "actuals" ADD CONSTRAINT "actuals_variable_period_source_release_unique"
      UNIQUE("variable_id","target_period","source","release_number")`,
  ];

  for (const stmt of statements) {
    try {
      await sql.unsafe(stmt);
      console.log(`  OK: ${stmt.slice(0, 60)}...`);
    } catch (e: any) {
      if (
        e.code === "42701" || // column already exists
        e.code === "42710" || // constraint already exists
        e.code === "42P07" || // relation already exists
        e.code === "42704" || // constraint does not exist (drop IF NOT EXISTS handles this)
        e.message?.includes("already exists")
      ) {
        console.log(`  SKIP (already exists): ${stmt.slice(0, 60)}...`);
      } else {
        console.error(`  ERROR on: ${stmt.slice(0, 80)}`);
        console.error(`  Code: ${e.code}, Message: ${e.message}`);
        throw e;
      }
    }
  }

  // Record the migration as applied
  await sql`
    INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
    VALUES ('0002_whole_forgotten_one', ${Date.now()})
    ON CONFLICT DO NOTHING
  `.catch(async () => {
    // Try alternate column name
    await sql`
      INSERT INTO drizzle.__drizzle_migrations (name, created_at)
      VALUES ('0002_whole_forgotten_one', NOW())
      ON CONFLICT DO NOTHING
    `.catch(() => console.log("  Could not record migration in drizzle table (non-fatal)"));
  });

  console.log("Migration 0002 applied successfully.");
  await sql.end();
  process.exit(0);
}

main().catch(async (e) => {
  console.error("FAILED:", e.message);
  await sql.end();
  process.exit(1);
});
