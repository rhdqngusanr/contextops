ALTER TABLE "context_item_revisions" ADD COLUMN "title" text NOT NULL;--> statement-breakpoint
ALTER TABLE "context_item_revisions" ADD COLUMN "body" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "context_item_revisions" ADD COLUMN "tags" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "context_item_revisions" ADD COLUMN "valid_from" text;--> statement-breakpoint
ALTER TABLE "context_item_revisions" ADD COLUMN "valid_until" text;--> statement-breakpoint
ALTER TABLE "context_items" ADD COLUMN "public_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "expires_at" timestamp with time zone NOT NULL;--> statement-breakpoint
ALTER TABLE "repos" ADD COLUMN "last_scan" jsonb;--> statement-breakpoint
ALTER TABLE "repos" ADD COLUMN "last_scan_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "context_items" ADD CONSTRAINT "context_items_project_public_id_uq" UNIQUE("project_id","public_id");