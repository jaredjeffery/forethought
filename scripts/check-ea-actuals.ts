import { db } from "../src/lib/db";
import { actuals, variables } from "../src/lib/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  const rows = await db.select({
    name: variables.name, period: actuals.targetPeriod,
    value: actuals.value, source: actuals.source,
  })
  .from(actuals)
  .innerJoin(variables, eq(actuals.variableId, variables.id))
  .where(eq(variables.countryCode, "EA"))
  .orderBy(variables.name, actuals.targetPeriod);

  if (rows.length === 0) { console.log("No EA actuals found"); }
  else rows.forEach(r => console.log(r.source, `|`, r.name, `|`, r.period, `|`, r.value));
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
