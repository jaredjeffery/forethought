// Checks drizzle migration table structure and records migration 0002.
// Run with: npx tsx scripts/record-migration.ts

import postgres from "postgres";
import { config } from "dotenv";

config({ path: ".env.local" });

const sql = postgres(process.env.DATABASE_URL!, { ssl: "require", max: 1 });

async function main() {
  // Inspect the migrations table columns
  const cols = await sql`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'drizzle' AND table_name = '__drizzle_migrations'
    ORDER BY ordinal_position
  `;
  console.log("Migration table columns:", cols);

  const rows = await sql`SELECT * FROM drizzle.__drizzle_migrations`;
  console.log("Current rows:", rows);

  await sql.end();
  process.exit(0);
}

main().catch(async (e) => {
  console.error(e.message);
  await sql.end();
  process.exit(1);
});
