// One-time seed: inserts the scoring_methodologies v1.0 record.
// Run with: npx tsx scripts/seed-methodology.ts

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { scoringMethodologies } from "../src/lib/db/schema";
import { config } from "dotenv";

config({ path: ".env.local" });

async function main() {
  const client = postgres(process.env.DATABASE_URL!, { ssl: "require", max: 1 });
  const db = drizzle(client);

  await db
    .insert(scoringMethodologies)
    .values({
      version: "v1.0",
      effectiveFrom: "2025-01-01",
      description:
        "Initial scoring methodology. Computes absolute error, percentage error, " +
        "signed error, directional accuracy, and score vs consensus for continuous variables. " +
        "Primary score uses first-release actuals (release_number = 1).",
      codeRef: "src/lib/scoring/index.ts",
      vintagePolicy:
        "Score against first-release actuals (release_number = 1). " +
        "Secondary score against latest benchmark-revised actuals is not yet implemented.",
      publishedAt: new Date("2025-01-01T00:00:00Z"),
    })
    .onConflictDoNothing();

  console.log("Seeded scoring_methodologies v1.0");
  await client.end();
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
