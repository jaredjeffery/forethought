// Backfills forecast_made_at on existing WEO forecast rows.
// Uses the publication_date from WEO_VINTAGES for each vintage label.
// Issues one UPDATE per vintage label — fast even for large tables.
// Safe to re-run: WHERE clause filters to null forecast_made_at only.

import { eq, isNull, and } from "drizzle-orm";
import { db } from "../src/lib/db";
import { forecasts } from "../src/lib/db/schema";
import { WEO_VINTAGES } from "../src/lib/ingestion/imf-weo";

async function main() {
  let totalUpdated = 0;

  for (const v of WEO_VINTAGES) {
    const pubDate = new Date(v.publication_date);

    const result = await db
      .update(forecasts)
      .set({ forecastMadeAt: pubDate })
      .where(
        and(
          eq(forecasts.vintage, v.label),
          isNull(forecasts.forecastMadeAt)
        )
      )
      .returning({ id: forecasts.id });

    if (result.length > 0) {
      console.log(`  ${v.label}: updated ${result.length} rows → ${v.publication_date}`);
      totalUpdated += result.length;
    }
  }

  console.log(`\nDone: ${totalUpdated} rows backfilled`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });
