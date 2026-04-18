ALTER TYPE "public"."user_role" ADD VALUE 'VIEWER' BEFORE 'ANALYST';--> statement-breakpoint
CREATE TABLE "scoring_methodologies" (
	"version" text PRIMARY KEY NOT NULL,
	"effective_from" date NOT NULL,
	"description" text NOT NULL,
	"code_ref" text NOT NULL,
	"vintage_policy" text NOT NULL,
	"published_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "actuals" DROP CONSTRAINT "actuals_variable_period_unique";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'VIEWER';--> statement-breakpoint
ALTER TABLE "actuals" ADD COLUMN "vintage_date" date;--> statement-breakpoint
ALTER TABLE "actuals" ADD COLUMN "release_number" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "actuals" ADD COLUMN "is_latest" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "forecast_scores" ADD COLUMN "actual_id" uuid;--> statement-breakpoint
ALTER TABLE "forecast_scores" ADD COLUMN "methodology_version" text;--> statement-breakpoint
ALTER TABLE "forecast_scores" ADD COLUMN "horizon_months" integer;--> statement-breakpoint
ALTER TABLE "forecast_scores" ADD COLUMN "signed_error" numeric(20, 6);--> statement-breakpoint
ALTER TABLE "forecasts" ADD COLUMN "forecast_made_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "forecast_scores" ADD CONSTRAINT "forecast_scores_actual_id_actuals_id_fk" FOREIGN KEY ("actual_id") REFERENCES "public"."actuals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forecast_scores" ADD CONSTRAINT "forecast_scores_methodology_version_scoring_methodologies_version_fk" FOREIGN KEY ("methodology_version") REFERENCES "public"."scoring_methodologies"("version") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "actuals" ADD CONSTRAINT "actuals_variable_period_source_release_unique" UNIQUE("variable_id","target_period","source","release_number");