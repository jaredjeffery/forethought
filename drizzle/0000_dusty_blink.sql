CREATE TYPE "public"."forecaster_type" AS ENUM('INSTITUTION', 'ANALYST');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('ANALYST', 'BUYER', 'ADMIN');--> statement-breakpoint
CREATE TYPE "public"."variable_category" AS ENUM('MACRO', 'COMMODITY', 'FINANCIAL', 'POLITICAL');--> statement-breakpoint
CREATE TYPE "public"."variable_frequency" AS ENUM('ANNUAL', 'QUARTERLY', 'MONTHLY');--> statement-breakpoint
CREATE TABLE "actuals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"variable_id" uuid NOT NULL,
	"target_period" text NOT NULL,
	"value" numeric(20, 6) NOT NULL,
	"published_at" timestamp with time zone NOT NULL,
	"source" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "actuals_variable_period_unique" UNIQUE("variable_id","target_period")
);
--> statement-breakpoint
CREATE TABLE "consensus_forecasts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"variable_id" uuid NOT NULL,
	"target_period" text NOT NULL,
	"simple_mean" numeric(20, 6) NOT NULL,
	"weighted_mean" numeric(20, 6),
	"n_forecasters" integer NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "consensus_variable_period_unique" UNIQUE("variable_id","target_period")
);
--> statement-breakpoint
CREATE TABLE "forecast_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"forecast_id" uuid NOT NULL,
	"absolute_error" numeric(20, 6),
	"percentage_error" numeric(20, 6),
	"directional_correct" boolean,
	"score_vs_consensus" numeric(20, 6),
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "forecast_scores_forecast_id_unique" UNIQUE("forecast_id")
);
--> statement-breakpoint
CREATE TABLE "forecasters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" "forecaster_type" NOT NULL,
	"slug" text NOT NULL,
	"user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "forecasters_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "forecasts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"forecaster_id" uuid NOT NULL,
	"variable_id" uuid NOT NULL,
	"target_period" text NOT NULL,
	"value" numeric(20, 6) NOT NULL,
	"lower_ci" numeric(20, 6),
	"upper_ci" numeric(20, 6),
	"submitted_at" timestamp with time zone NOT NULL,
	"vintage" text,
	"source_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "forecasts_unique_vintage" UNIQUE("forecaster_id","variable_id","target_period","vintage")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"role" "user_role" DEFAULT 'ANALYST' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "variables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"country_code" text NOT NULL,
	"category" "variable_category" NOT NULL,
	"unit" text NOT NULL,
	"frequency" "variable_frequency" NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "variables_name_country_unique" UNIQUE("name","country_code")
);
--> statement-breakpoint
ALTER TABLE "actuals" ADD CONSTRAINT "actuals_variable_id_variables_id_fk" FOREIGN KEY ("variable_id") REFERENCES "public"."variables"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consensus_forecasts" ADD CONSTRAINT "consensus_forecasts_variable_id_variables_id_fk" FOREIGN KEY ("variable_id") REFERENCES "public"."variables"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forecast_scores" ADD CONSTRAINT "forecast_scores_forecast_id_forecasts_id_fk" FOREIGN KEY ("forecast_id") REFERENCES "public"."forecasts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forecasters" ADD CONSTRAINT "forecasters_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forecasts" ADD CONSTRAINT "forecasts_forecaster_id_forecasters_id_fk" FOREIGN KEY ("forecaster_id") REFERENCES "public"."forecasters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forecasts" ADD CONSTRAINT "forecasts_variable_id_variables_id_fk" FOREIGN KEY ("variable_id") REFERENCES "public"."variables"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "forecasts_variable_period_idx" ON "forecasts" USING btree ("variable_id","target_period");--> statement-breakpoint
CREATE INDEX "forecasts_forecaster_idx" ON "forecasts" USING btree ("forecaster_id");--> statement-breakpoint
CREATE INDEX "variables_country_code_idx" ON "variables" USING btree ("country_code");