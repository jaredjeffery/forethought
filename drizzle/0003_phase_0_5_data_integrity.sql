CREATE TABLE "data_quality_flags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid,
	"severity" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"message" text NOT NULL,
	"source_document_id" uuid,
	"ingestion_run_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "ingestion_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_document_id" uuid,
	"source_name" text NOT NULL,
	"status" text NOT NULL,
	"records_created" integer DEFAULT 0 NOT NULL,
	"records_updated" integer DEFAULT 0 NOT NULL,
	"records_skipped" integer DEFAULT 0 NOT NULL,
	"errors" jsonb,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "source_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_name" text NOT NULL,
	"publication_name" text NOT NULL,
	"publication_date" date NOT NULL,
	"vintage_label" text NOT NULL,
	"source_url" text,
	"storage_url" text,
	"file_hash" text,
	"ingested_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "source_documents_source_vintage_unique" UNIQUE("source_name","vintage_label")
);
--> statement-breakpoint
CREATE TABLE "variable_source_mappings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_name" text NOT NULL,
	"source_variable_code" text NOT NULL,
	"source_variable_name" text,
	"farfield_variable_id" uuid NOT NULL,
	"unit_transform" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "variable_source_mappings_unique" UNIQUE("source_name","source_variable_code","farfield_variable_id")
);
--> statement-breakpoint
ALTER TABLE "consensus_forecasts" DROP CONSTRAINT "consensus_variable_period_unique";--> statement-breakpoint
ALTER TABLE "consensus_forecasts" ALTER COLUMN "n_forecasters" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "actuals" ADD COLUMN "source_document_id" uuid;--> statement-breakpoint
ALTER TABLE "consensus_forecasts" ADD COLUMN "as_of_date" date DEFAULT CURRENT_DATE NOT NULL;--> statement-breakpoint
ALTER TABLE "consensus_forecasts" ADD COLUMN "methodology_version" text DEFAULT 'v1.0' NOT NULL;--> statement-breakpoint
ALTER TABLE "consensus_forecasts" ADD COLUMN "included_forecast_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE "consensus_forecasts" SET "included_forecast_count" = "n_forecasters";--> statement-breakpoint
ALTER TABLE "consensus_forecasts" ALTER COLUMN "as_of_date" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "consensus_forecasts" ALTER COLUMN "included_forecast_count" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "consensus_forecasts" ADD COLUMN "source_document_id" uuid;--> statement-breakpoint
ALTER TABLE "forecasts" ADD COLUMN "source_document_id" uuid;--> statement-breakpoint
ALTER TABLE "data_quality_flags" ADD CONSTRAINT "data_quality_flags_source_document_id_source_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."source_documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_quality_flags" ADD CONSTRAINT "data_quality_flags_ingestion_run_id_ingestion_runs_id_fk" FOREIGN KEY ("ingestion_run_id") REFERENCES "public"."ingestion_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingestion_runs" ADD CONSTRAINT "ingestion_runs_source_document_id_source_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."source_documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variable_source_mappings" ADD CONSTRAINT "variable_source_mappings_farfield_variable_id_variables_id_fk" FOREIGN KEY ("farfield_variable_id") REFERENCES "public"."variables"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "data_quality_flags_status_idx" ON "data_quality_flags" USING btree ("status");--> statement-breakpoint
CREATE INDEX "data_quality_flags_entity_idx" ON "data_quality_flags" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "ingestion_runs_source_started_idx" ON "ingestion_runs" USING btree ("source_name","started_at");--> statement-breakpoint
ALTER TABLE "actuals" ADD CONSTRAINT "actuals_source_document_id_source_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."source_documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consensus_forecasts" ADD CONSTRAINT "consensus_forecasts_source_document_id_source_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."source_documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forecasts" ADD CONSTRAINT "forecasts_source_document_id_source_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."source_documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consensus_forecasts" ADD CONSTRAINT "consensus_variable_period_asof_method_unique" UNIQUE("variable_id","target_period","as_of_date","methodology_version");
