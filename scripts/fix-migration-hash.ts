// Fix the migration hash in drizzle.__drizzle_migrations.
// Drizzle uses SHA-256 of the SQL file content as the hash.
// Run with: npx tsx scripts/fix-migration-hash.ts

import postgres from "postgres";
import { config } from "dotenv";
import fs from "fs";
import crypto from "crypto";
import path from "path";

config({ path: ".env.local" });

const sql = postgres(process.env.DATABASE_URL!, { ssl: "require", max: 1 });

async function main() {
  const migrationPath = path.join(
    process.cwd(),
    "drizzle",
    "0002_whole_forgotten_one.sql"
  );
  const content = fs.readFileSync(migrationPath, "utf-8");
  const hash = crypto.createHash("sha256").update(content).digest("hex");
  console.log("Computed hash:", hash);

  // Update the placeholder hash we inserted
  const result = await sql`
    UPDATE drizzle.__drizzle_migrations
    SET hash = ${hash}, created_at = 1776539475434
    WHERE hash = '0002_whole_forgotten_one'
    RETURNING id, hash
  `;
  console.log("Updated rows:", result);

  // Also verify all 3 rows now look correct
  const rows = await sql`SELECT id, hash, created_at FROM drizzle.__drizzle_migrations ORDER BY id`;
  console.log("Final rows:", rows);

  await sql.end();
  process.exit(0);
}

main().catch(async (e) => {
  console.error(e.message);
  await sql.end();
  process.exit(1);
});
