// Drizzle ORM schema for Farfield.
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
  jsonb,
  timestamp,
  date,
  unique,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const userRoleEnum = pgEnum("user_role", [
  "VIEWER",
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
  role: userRoleEnum("role").notNull().default("VIEWER"),
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
  // Stable public route identifier, e.g. "gdp-growth-rate-usa".
  slug: text("slug").notNull().unique(),
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
  // When this forecast was *made* (for ingested institutional data: the publication date of
  // the vintage, NOT the ingestion time). Used for horizon calculation and fair scoring.
  forecastMadeAt: timestamp("forecast_made_at", { withTimezone: true }),
  // The publication vintage (WEO edition date, etc.) — used to track revisions
  vintage: text("vintage"),
  sourceUrl: text("source_url"),
  sourceDocumentId: uuid("source_document_id").references(() => sourceDocuments.id),
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
  // vintage_date: when this specific value was published by the source (DATE only)
  vintageDate: date("vintage_date"),
  // 1 = initial release, 2 = first revision, etc.
  releaseNumber: integer("release_number").notNull().default(1),
  // Convenience flag — true for the most recent release of each (variable, period, source)
  isLatest: boolean("is_latest").notNull().default(true),
  sourceDocumentId: uuid("source_document_id").references(() => sourceDocuments.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  // Multiple releases per (variable, period, source) — scored against release_number = 1 (first release)
  unique("actuals_variable_period_source_release_unique").on(
    table.variableId, table.targetPeriod, table.source, table.releaseNumber
  ),
]);

// ---------------------------------------------------------------------------
// Source provenance and ingestion audit
// Records source documents, parser runs, variable mappings, and review flags.
// ---------------------------------------------------------------------------

export const sourceDocuments = pgTable("source_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceName: text("source_name").notNull(),
  publicationName: text("publication_name").notNull(),
  publicationDate: date("publication_date").notNull(),
  vintageLabel: text("vintage_label").notNull(),
  sourceUrl: text("source_url"),
  storageUrl: text("storage_url"),
  fileHash: text("file_hash"),
  ingestedAt: timestamp("ingested_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique("source_documents_source_vintage_unique").on(table.sourceName, table.vintageLabel),
]);

export const ingestionRuns = pgTable("ingestion_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceDocumentId: uuid("source_document_id").references(() => sourceDocuments.id, { onDelete: "set null" }),
  sourceName: text("source_name").notNull(),
  status: text("status").notNull(),
  recordsCreated: integer("records_created").notNull().default(0),
  recordsUpdated: integer("records_updated").notNull().default(0),
  recordsSkipped: integer("records_skipped").notNull().default(0),
  errors: jsonb("errors"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
}, (table) => [
  index("ingestion_runs_source_started_idx").on(table.sourceName, table.startedAt),
]);

export const variableSourceMappings = pgTable("variable_source_mappings", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceName: text("source_name").notNull(),
  sourceVariableCode: text("source_variable_code").notNull(),
  sourceVariableName: text("source_variable_name"),
  farfieldVariableId: uuid("farfield_variable_id").notNull().references(() => variables.id, { onDelete: "cascade" }),
  unitTransform: text("unit_transform"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique("variable_source_mappings_unique").on(
    table.sourceName,
    table.sourceVariableCode,
    table.farfieldVariableId,
  ),
]);

export const dataQualityFlags = pgTable("data_quality_flags", {
  id: uuid("id").primaryKey().defaultRandom(),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id"),
  severity: text("severity").notNull(),
  status: text("status").notNull().default("open"),
  message: text("message").notNull(),
  sourceDocumentId: uuid("source_document_id").references(() => sourceDocuments.id, { onDelete: "set null" }),
  ingestionRunId: uuid("ingestion_run_id").references(() => ingestionRuns.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
}, (table) => [
  index("data_quality_flags_status_idx").on(table.status),
  index("data_quality_flags_entity_idx").on(table.entityType, table.entityId),
]);

// ---------------------------------------------------------------------------
// Scoring methodologies
// Every forecast_scores row references the version it was computed under.
// If formulae change, old scores are preserved under the old version.
// ---------------------------------------------------------------------------

export const scoringMethodologies = pgTable("scoring_methodologies", {
  version: text("version").primaryKey(),
  effectiveFrom: date("effective_from").notNull(),
  description: text("description").notNull(),
  // Git SHA or file path to the canonical implementation
  codeRef: text("code_ref").notNull(),
  // e.g. "score against first-release actuals (release_number = 1)"
  vintagePolicy: text("vintage_policy").notNull(),
  publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
});

// ---------------------------------------------------------------------------
// Forecast scores
// Computed accuracy metrics for each forecast, populated once an actual is
// available. All metrics are nullable — some may not apply (e.g. directional
// accuracy requires a prior consensus to compare against).
// ---------------------------------------------------------------------------

export const forecastScores = pgTable("forecast_scores", {
  id: uuid("id").primaryKey().defaultRandom(),
  forecastId: uuid("forecast_id").notNull().references(() => forecasts.id, { onDelete: "cascade" }).unique(),
  // Which actual this was scored against (release_number = 1 = first release)
  actualId: uuid("actual_id").references(() => actuals.id),
  // Which scoring methodology version was used
  methodologyVersion: text("methodology_version").references(() => scoringMethodologies.version),
  // How many months ahead the forecast was made (derived from forecast_made_at vs target period)
  horizonMonths: integer("horizon_months"),
  // |forecast - actual|
  absoluteError: numeric("absolute_error", { precision: 20, scale: 6 }),
  // (forecast - actual) / |actual| * 100
  percentageError: numeric("percentage_error", { precision: 20, scale: 6 }),
  // forecast - actual (positive = forecaster was too high). Used for bias calculation.
  signedError: numeric("signed_error", { precision: 20, scale: 6 }),
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
  asOfDate: date("as_of_date").notNull(),
  methodologyVersion: text("methodology_version").notNull().default("v1.0"),
  // Unweighted mean across all forecasters
  simpleMean: numeric("simple_mean", { precision: 20, scale: 6 }).notNull(),
  // Weighted mean (Phase 2 — null until enough history exists)
  weightedMean: numeric("weighted_mean", { precision: 20, scale: 6 }),
  // How many forecasters contributed to this consensus
  nForecasters: integer("n_forecasters").notNull().default(0),
  includedForecastCount: integer("included_forecast_count").notNull(),
  sourceDocumentId: uuid("source_document_id").references(() => sourceDocuments.id),
  computedAt: timestamp("computed_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique("consensus_variable_period_asof_method_unique").on(
    table.variableId,
    table.targetPeriod,
    table.asOfDate,
    table.methodologyVersion,
  ),
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
