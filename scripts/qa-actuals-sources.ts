// Reports actuals-source coverage and scoring baselines for ingestion QA.

import { db } from "../src/lib/db";
import { actuals, forecastScores, variables } from "../src/lib/db/schema";
import { count, desc, eq, like } from "drizzle-orm";

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
    .where(like(actuals.source, "World Bank%"))
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

  console.log("\n=== World Bank actuals policy ===");
  console.log("World Bank actuals are legacy/reference-only and should not back forecast_scores.");

  if (worldBankScored.length > 0) {
    console.log("\n=== World Bank-scored rows requiring retirement (top 20) ===");
    for (const row of worldBankScored) {
      console.log(`${row.variableName.padEnd(28)} ${row.countryCode.padEnd(4)} ${String(row.n).padStart(6)}`);
    }
    if (process.env.QA_STRICT === "1") {
      throw new Error("World Bank actuals are still used by forecast_scores.");
    }
  } else {
    console.log("No forecast_scores rows use World Bank actuals.");
  }

  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
