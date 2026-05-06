ALTER TABLE "variables" ADD COLUMN "slug" text;--> statement-breakpoint
UPDATE "variables"
SET "slug" = regexp_replace(
	regexp_replace(lower("name" || '-' || "country_code"), '[^a-z0-9]+', '-', 'g'),
	'(^-|-$)',
	'',
	'g'
);--> statement-breakpoint
ALTER TABLE "variables" ALTER COLUMN "slug" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "variables" ADD CONSTRAINT "variables_slug_unique" UNIQUE("slug");
