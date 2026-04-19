// One-off script: re-score all existing forecast rows.
// Populates signed_error, methodology_version, horizon_months on all forecast_scores.

import { rescoreAll } from "../src/lib/scoring/index";

rescoreAll()
  .then((r) => { console.log(JSON.stringify(r, null, 2)); process.exit(0); })
  .catch((e) => { console.error(e); process.exit(1); });
