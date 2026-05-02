// Seed script: populates the variables and forecasters tables.
// Run with: npm run seed
//
// Variables: the 6 core IMF WEO indicators tracked for Phase 1.
// Countries: world/regional aggregates + top 20 economies + key emerging markets.
// Forecasters: major institutional forecasters seeded without accounts.

// DATABASE_URL and other env vars are loaded via --env-file=.env.local in package.json

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { variables, forecasters } from "../src/lib/db/schema";
import { sql } from "drizzle-orm";
import { createVariableSlug } from "../src/lib/slugs";

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

// ---------------------------------------------------------------------------
// Variable definitions
// Each entry seeds one variable name × all country codes below.
// ---------------------------------------------------------------------------

const VARIABLE_DEFINITIONS = [
  {
    name: "GDP Growth Rate",
    category: "MACRO" as const,
    unit: "% change (constant prices)",
    frequency: "ANNUAL" as const,
    description: "Annual percentage change in real GDP at constant prices.",
  },
  {
    name: "Inflation (CPI)",
    category: "MACRO" as const,
    unit: "% change (period average)",
    frequency: "ANNUAL" as const,
    description: "Annual average change in the consumer price index.",
  },
  {
    name: "Unemployment Rate",
    category: "MACRO" as const,
    unit: "% of labour force",
    frequency: "ANNUAL" as const,
    description: "Unemployed persons as a percentage of the total labour force.",
  },
  {
    name: "Current Account Balance",
    category: "MACRO" as const,
    unit: "% of GDP",
    frequency: "ANNUAL" as const,
    description: "Current account balance expressed as a percentage of GDP.",
  },
  {
    name: "Government Balance",
    category: "MACRO" as const,
    unit: "% of GDP",
    frequency: "ANNUAL" as const,
    description: "General government net lending (+) / borrowing (–) as a percentage of GDP.",
  },
  {
    name: "Government Gross Debt",
    category: "MACRO" as const,
    unit: "% of GDP",
    frequency: "ANNUAL" as const,
    description: "General government gross debt as a percentage of GDP.",
  },
] as const;

// ---------------------------------------------------------------------------
// Country codes to seed
// Aggregate codes: WLD (World), ADV (Advanced Economies), EME (Emerging &
// Developing Economies), EA (Euro Area).
// Individual codes: ISO 3166-1 alpha-3.
// ---------------------------------------------------------------------------

const COUNTRY_CODES: { code: string; label: string }[] = [
  // Aggregates
  { code: "WLD", label: "World" },
  { code: "ADV", label: "Advanced Economies" },
  { code: "EME", label: "Emerging Market and Developing Economies" },
  { code: "EA",  label: "Euro Area" },
  { code: "G7",  label: "G7" },
  // Major individual economies
  { code: "USA", label: "United States" },
  { code: "CHN", label: "China" },
  { code: "DEU", label: "Germany" },
  { code: "JPN", label: "Japan" },
  { code: "IND", label: "India" },
  { code: "GBR", label: "United Kingdom" },
  { code: "FRA", label: "France" },
  { code: "BRA", label: "Brazil" },
  { code: "ITA", label: "Italy" },
  { code: "CAN", label: "Canada" },
  { code: "RUS", label: "Russia" },
  { code: "KOR", label: "South Korea" },
  { code: "AUS", label: "Australia" },
  { code: "MEX", label: "Mexico" },
  { code: "ESP", label: "Spain" },
  { code: "IDN", label: "Indonesia" },
  { code: "NLD", label: "Netherlands" },
  { code: "SAU", label: "Saudi Arabia" },
  { code: "TUR", label: "Turkey" },
  { code: "CHE", label: "Switzerland" },
  // Key emerging markets
  { code: "ZAF", label: "South Africa" },
  { code: "ARG", label: "Argentina" },
  { code: "NGA", label: "Nigeria" },
  { code: "EGY", label: "Egypt" },
  { code: "POL", label: "Poland" },
  { code: "THA", label: "Thailand" },
  { code: "MYS", label: "Malaysia" },
  { code: "COL", label: "Colombia" },
];

// ---------------------------------------------------------------------------
// Institutional forecasters to seed
// ---------------------------------------------------------------------------

const FORECASTER_DEFINITIONS = [
  { name: "International Monetary Fund",             slug: "imf" },
  { name: "World Bank",                              slug: "world-bank" },
  { name: "OECD",                                    slug: "oecd" },
  { name: "European Central Bank",                   slug: "ecb" },
  { name: "Federal Reserve",                         slug: "federal-reserve" },
  { name: "Bank of England",                         slug: "bank-of-england" },
  { name: "United Nations",                          slug: "united-nations" },
  { name: "Asian Development Bank",                  slug: "adb" },
  { name: "African Development Bank",                slug: "afdb" },
  { name: "European Commission",                     slug: "european-commission" },
] as const;

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("Seeding variables...");

  // Build all variable rows: each indicator × each country
  const variableRows = VARIABLE_DEFINITIONS.flatMap((def) =>
    COUNTRY_CODES.map((country) => ({
      slug: createVariableSlug(def.name, country.code),
      name: def.name,
      countryCode: country.code,
      category: def.category,
      unit: def.unit,
      frequency: def.frequency,
      description: def.description,
    }))
  );

  // Upsert — skip on conflict so re-running is safe
  const inserted = await db
    .insert(variables)
    .values(variableRows)
    .onConflictDoNothing()
    .returning({ id: variables.id, name: variables.name, countryCode: variables.countryCode });

  console.log(`  Inserted ${inserted.length} variables (${variableRows.length - inserted.length} already existed)`);

  // Count total variables
  const [{ count }] = await db.execute<{ count: string }>(
    sql`SELECT COUNT(*)::text AS count FROM variables`
  );
  console.log(`  Total variables in DB: ${count}`);

  console.log("\nSeeding forecasters...");

  const forecasterRows = FORECASTER_DEFINITIONS.map((def) => ({
    name: def.name,
    type: "INSTITUTION" as const,
    slug: def.slug,
  }));

  const insertedForecasters = await db
    .insert(forecasters)
    .values(forecasterRows)
    .onConflictDoNothing()
    .returning({ id: forecasters.id, name: forecasters.name });

  console.log(`  Inserted ${insertedForecasters.length} forecasters (${forecasterRows.length - insertedForecasters.length} already existed)`);

  const [{ fcount }] = await db.execute<{ fcount: string }>(
    sql`SELECT COUNT(*)::text AS fcount FROM forecasters`
  );
  console.log(`  Total forecasters in DB: ${fcount}`);

  console.log("\nSeed complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
