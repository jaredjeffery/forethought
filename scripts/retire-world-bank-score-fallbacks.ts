// Retires score rows that used legacy World Bank actuals as a fallback baseline.

import { db } from "../src/lib/db";
import { actuals, forecastScores, variables } from "../src/lib/db/schema";
import { count, desc, eq, inArray, like } from "drizzle-orm";

async function main() {
  const rows = await db
    .select({
      scoreId: forecastScores.id,
      variableName: variables.name,
      countryCode: variables.countryCode,
    })
    .from(forecastScores)
    .innerJoin(actuals, eq(forecastScores.actualId, actuals.id))
    .innerJoin(variables, eq(actuals.variableId, variables.id))
    .where(like(actuals.source, "World Bank%"));

  if (rows.length === 0) {
    console.log("No World Bank-scored fallback rows found.");
    process.exit(0);
  }

  const byVariable = await db
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
    .orderBy(desc(count(forecastScores.id)));

  console.log("Retiring World Bank-scored fallback rows:");
  for (const row of byVariable) {
    console.log(`- ${row.variableName} ${row.countryCode}: ${row.n}`);
  }

  const batchSize = 200;
  for (let i = 0; i < rows.length; i += batchSize) {
    const ids = rows.slice(i, i + batchSize).map((row) => row.scoreId);
    await db.delete(forecastScores).where(inArray(forecastScores.id, ids));
  }

  console.log(`Deleted ${rows.length} forecast_scores row(s).`);
  console.log("World Bank actuals are now legacy/reference-only for scoring.");
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
