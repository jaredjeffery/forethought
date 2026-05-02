// Reports actuals-source coverage and scoring baselines for ingestion QA.

import { db } from "../src/lib/db";
import { actuals, forecastScores, variables } from "../src/lib/db/schema";
import { count, desc, eq, sql } from "drizzle-orm";

async function main() {
  const bySource = await db
    .select({ source: actuals.source, n: count(actuals.id) })
    .from(actuals)
    .groupBy(actuals.source)
    .orderBy(desc(count(actuals.id)));

  const coreBySource = await db
    .select({
      source: actuals.source,
      variableName: variables.name,
      n: count(actuals.id),
    })
    .from(actuals)
    .innerJoin(variables, eq(actuals.variableId, variables.id))
    .where(eq(variables.category, "MACRO"))
    .groupBy(actuals.source, variables.name)
    .orderBy(actuals.source, variables.name);

  const scoreBaseline = await db
    .select({ source: actuals.source, n: count(forecastScores.id) })
    .from(forecastScores)
    .innerJoin(actuals, eq(forecastScores.actualId, actuals.id))
    .groupBy(actuals.source)
    .orderBy(desc(count(forecastScores.id)));

  const worldBankScored = await db
    .select({
      variableName: variables.name,
      countryCode: variables.countryCode,
      n: count(forecastScores.id),
    })
    .from(forecastScores)
    .innerJoin(actuals, eq(forecastScores.actualId, actuals.id))
    .innerJoin(variables, eq(actuals.variableId, variables.id))
    .where(sql`${actuals.source} LIKE 'World Bank%'`)
    .groupBy(variables.name, variables.countryCode)
    .orderBy(desc(count(forecastScores.id)))
    .limit(20);

  console.log("=== Actuals by source ===");
  for (const row of bySource) {
    console.log(`${row.source.padEnd(36)} ${String(row.n).padStart(6)}`);
  }

  console.log("\n=== Core macro actuals by source and variable ===");
  for (const row of coreBySource) {
    console.log(`${row.source.padEnd(36)} ${row.variableName.padEnd(28)} ${String(row.n).padStart(6)}`);
  }

  console.log("\n=== Scores by actual source ===");
  for (const row of scoreBaseline) {
    console.log(`${row.source.padEnd(36)} ${String(row.n).padStart(6)}`);
  }

  if (worldBankScored.length > 0) {
    console.log("\n=== Remaining World Bank-scored core rows (top 20) ===");
    for (const row of worldBankScored) {
      console.log(`${row.variableName.padEnd(28)} ${row.countryCode.padEnd(4)} ${String(row.n).padStart(6)}`);
    }
  }

  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
