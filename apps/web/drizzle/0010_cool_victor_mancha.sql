CREATE TABLE "rate_hits" (
	"bucket" text PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 1 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "rate_hits" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "rate_hits_expires_idx" ON "rate_hits" USING btree ("expires_at");