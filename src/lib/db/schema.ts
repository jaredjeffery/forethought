// Drizzle ORM schema for Forethought.
// All tables needed for Phase 1 (Forecast Observatory).
// Phase 2 tables (content, briefs, subscriptions) will be added later.

import {
  pgTable,
  pgEnum,
  uuid,
  text,
  numeric,
  boolean,
  integer,
  timestamp,
  unique,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const userRoleEnum = pgEnum("user_role", [
  "ANALYST",
  "BUYER",
  "ADMIN",
]);

export const forecasterTypeEnum = pgEnum("forecaster_type", [
  "INSTITUTION",
  "ANALYST",
]);

export const variableCategoryEnum = pgEnum("variable_category", [
  "MACRO",
  "COMMODITY",
  "FINANCIAL",
  "POLITICAL",
]);

export const variableFrequencyEnum = pgEnum("variable_frequency", [
  "ANNUAL",
  "QUARTERLY",
  "MONTHLY",
]);

// ---------------------------------------------------------------------------
// Users
// Stores platform accounts. Analysts and buyers are both users.
// ---------------------------------------------------------------------------

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: userRoleEnum("role").notNull().default("ANALYST"),
  // Auth.js required fields
  emailVerified: timestamp("email_verified", { mode: "date", withTimezone: true }),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Forecasters
// Represents any entity that submits forecasts — institutions (IMF, World Bank)
// or individual analysts. Institutions are seeded; analysts are created on signup.
// ---------------------------------------------------------------------------

export const forecasters = pgTable("forecasters", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  type: forecasterTypeEnum("type").notNull(),
  // URL-friendly identifier, e.g. "imf", "world-bank", "john-doe-42"
  slug: text("slug").notNull().unique(),
  // For ANALYST type, links to a users row
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Variables
// A specific measurable economic quantity, e.g. "GDP Growth Rate — South Africa".
// country_code uses ISO 3166-1 alpha-3 (ZAF, USA) plus special codes:
//   WLD = World aggregate, ADV = Advanced economies, EME = Emerging & developing
// ---------------------------------------------------------------------------

export const variables = pgTable("variables", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Short human-readable name, e.g. "GDP Growth Rate"
  name: text("name").notNull(),
  // ISO alpha-3 or aggregate code
  countryCode: text("country_code").notNull(),
  category: variableCategoryEnum("category").notNull(),
  // Unit of measurement, e.g. "% YoY", "% of GDP", "USD billions"
  unit: text("unit").notNull(),
  frequency: variableFrequencyEnum("frequency").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  // Common lookup: all variables for a country
  index("variables_country_code_idx").on(table.countryCode),
  // Enforce uniqueness of variable identity
  unique("variables_name_country_unique").on(table.name, table.countryCode),
]);

// ---------------------------------------------------------------------------
// Forecasts
// A single forecast: a forecaster's prediction of a variable's value for a
// specific target period. Multiple vintages (publication dates) are allowed to
// track forecast revisions over time.
//
// target_period format follows variable frequency:
//   ANNUAL    → "2024"
//   QUARTERLY → "2024Q1"
//   MONTHLY   → "2024-03"
//
// value stored as numeric (not float) to preserve decimal precision.
// ---------------------------------------------------------------------------

export const forecasts = pgTable("forecasts", {
  id: uuid("id").primaryKey().defaultRandom(),
  forecasterId: uuid("forecaster_id").notNull().references(() => forecasters.id, { onDelete: "cascade" }),
  variableId: uuid("variable_id").notNull().references(() => variables.id, { onDelete: "cascade" }),
  targetPeriod: text("target_period").notNull(),
  // The forecast value — DECIMAL, never FLOAT
  value: numeric("value", { precision: 20, scale: 6 }).notNull(),
  // Optional 90% confidence interval bounds
  lowerCi: numeric("lower_ci", { precision: 20, scale: 6 }),
  upperCi: numeric("upper_ci", { precision: 20, scale: 6 }),
  // When this forecast was published or submitted
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull(),
  // The publication vintage (WEO edition date, etc.) — used to track revisions
  vintage: text("vintage"),
  sourceUrl: text("source_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("forecasts_variable_period_idx").on(table.variableId, table.targetPeriod),
  index("forecasts_forecaster_idx").on(table.forecasterId),
  // One forecast per forecaster/variable/period/vintage combination
  unique("forecasts_unique_vintage").on(
    table.forecasterId,
    table.variableId,
    table.targetPeriod,
    table.vintage,
  ),
]);

// ---------------------------------------------------------------------------
// Actuals
// The real outcome for a variable+period, used to score forecasts.
// One row per variable+period (latest published revision wins).
// ---------------------------------------------------------------------------

export const actuals = pgTable("actuals", {
  id: uuid("id").primaryKey().defaultRandom(),
  variableId: uuid("variable_id").notNull().references(() => variables.id, { onDelete: "cascade" }),
  targetPeriod: text("target_period").notNull(),
  // Actual outcome — DECIMAL, never FLOAT
  value: numeric("value", { precision: 20, scale: 6 }).notNull(),
  // When the statistical agency published this figure
  publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
  // e.g. "IMF WEO October 2024" or "Statistics South Africa"
  source: text("source").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  // One actual per variable+period
  unique("actuals_variable_period_unique").on(table.variableId, table.targetPeriod),
]);

// ---------------------------------------------------------------------------
// Forecast scores
// Computed accuracy metrics for each forecast, populated once an actual is
// available. All metrics are nullable — some may not apply (e.g. directional
// accuracy requires a prior consensus to compare against).
// ---------------------------------------------------------------------------

export const forecastScores = pgTable("forecast_scores", {
  id: uuid("id").primaryKey().defaultRandom(),
  forecastId: uuid("forecast_id").notNull().references(() => forecasts.id, { onDelete: "cascade" }).unique(),
  // |forecast - actual|
  absoluteError: numeric("absolute_error", { precision: 20, scale: 6 }),
  // (forecast - actual) / |actual| * 100
  percentageError: numeric("percentage_error", { precision: 20, scale: 6 }),
  // Whether the forecast was in the same direction as the actual (vs prior period or vs zero)
  directionalCorrect: boolean("directional_correct"),
  // Forecast error minus consensus error — negative means better than consensus
  scoreVsConsensus: numeric("score_vs_consensus", { precision: 20, scale: 6 }),
  computedAt: timestamp("computed_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Consensus forecasts
// Aggregated forecasts across all forecasters for a variable+period.
// Recomputed whenever new forecasts arrive or actuals are published.
// ---------------------------------------------------------------------------

export const consensusForecasts = pgTable("consensus_forecasts", {
  id: uuid("id").primaryKey().defaultRandom(),
  variableId: uuid("variable_id").notNull().references(() => variables.id, { onDelete: "cascade" }),
  targetPeriod: text("target_period").notNull(),
  // Unweighted mean across all forecasters
  simpleMean: numeric("simple_mean", { precision: 20, scale: 6 }).notNull(),
  // Weighted mean (Phase 2 — null until enough history exists)
  weightedMean: numeric("weighted_mean", { precision: 20, scale: 6 }),
  // How many forecasters contributed to this consensus
  nForecasters: integer("n_forecasters").notNull(),
  computedAt: timestamp("computed_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique("consensus_variable_period_unique").on(table.variableId, table.targetPeriod),
]);

// ---------------------------------------------------------------------------
// Auth.js adapter tables (accounts, sessions, verificationTokens)
// Required by @auth/drizzle-adapter for OAuth sign-in flows.
// ---------------------------------------------------------------------------

export const accounts = pgTable("accounts", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").$type<AdapterAccountType>().notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("provider_account_id").notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: text("token_type"),
  scope: text("scope"),
  id_token: text("id_token"),
  session_state: text("session_state"),
}, (table) => [
  primaryKey({ columns: [table.provider, table.providerAccountId] }),
]);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date", withTimezone: true }).notNull(),
});

export const verificationTokens = pgTable("verification_tokens", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull(),
  expires: timestamp("expires", { mode: "date", withTimezone: true }).notNull(),
}, (table) => [
  primaryKey({ columns: [table.identifier, table.token] }),
]);
