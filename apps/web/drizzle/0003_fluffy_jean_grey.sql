CREATE TYPE "public"."conflict_severity" AS ENUM('high', 'medium', 'low');--> statement-breakpoint
ALTER TABLE "conflicts" ALTER COLUMN "a_ref" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "conflicts" ADD COLUMN "a_item_id" text;--> statement-breakpoint
ALTER TABLE "conflicts" ADD COLUMN "b_item_id" text;--> statement-breakpoint
ALTER TABLE "conflicts" ADD COLUMN "severity" "conflict_severity";--> statement-breakpoint
ALTER TABLE "conflicts" ADD CONSTRAINT "conflicts_a_item_fk" FOREIGN KEY ("project_id","a_item_id") REFERENCES "public"."context_items"("project_id","public_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conflicts" ADD CONSTRAINT "conflicts_b_item_fk" FOREIGN KEY ("project_id","b_item_id") REFERENCES "public"."context_items"("project_id","public_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conflicts" ADD CONSTRAINT "conflicts_a_item_id_shape_ck" CHECK (("a_item_id" is not null) = ("kind" in ('contradiction', 'stale', 'duplicate', 'doc_vs_code')));--> statement-breakpoint
ALTER TABLE "conflicts" ADD CONSTRAINT "conflicts_b_item_id_shape_ck" CHECK (("b_item_id" is not null) = ("kind" in ('contradiction', 'stale', 'duplicate', 'doc_vs_code')));--> statement-breakpoint
ALTER TABLE "conflicts" ADD CONSTRAINT "conflicts_a_ref_shape_ck" CHECK (("a_ref" is not null) = ("kind" in ('open_question')));--> statement-breakpoint
ALTER TABLE "conflicts" ADD CONSTRAINT "conflicts_b_ref_shape_ck" CHECK ("b_ref" is null);--> statement-breakpoint
ALTER TABLE "conflicts" ADD CONSTRAINT "conflicts_severity_shape_ck" CHECK (("severity" is not null) = ("kind" in ('contradiction', 'stale', 'duplicate', 'doc_vs_code')));