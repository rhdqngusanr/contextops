CREATE TYPE "public"."ai_job_status" AS ENUM('queued', 'running', 'succeeded', 'failed');--> statement-breakpoint
CREATE TABLE "ai_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"feature" "ai_feature" NOT NULL,
	"status" "ai_job_status" DEFAULT 'queued' NOT NULL,
	"input" jsonb NOT NULL,
	"result" jsonb,
	"error_code" text,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_jobs_feature_ck" CHECK ("feature" in ('structure', 'conflict')),
	CONSTRAINT "ai_jobs_started_at_shape_ck" CHECK (("started_at" is not null) = ("status" in ('running', 'succeeded', 'failed'))),
	CONSTRAINT "ai_jobs_finished_at_shape_ck" CHECK (("finished_at" is not null) = ("status" in ('succeeded', 'failed'))),
	CONSTRAINT "ai_jobs_result_shape_ck" CHECK (("result" is not null) = ("status" in ('succeeded'))),
	CONSTRAINT "ai_jobs_error_code_shape_ck" CHECK (("error_code" is not null) = ("status" in ('failed')))
);
--> statement-breakpoint
ALTER TABLE "ai_jobs" ADD CONSTRAINT "ai_jobs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_jobs_project_created_idx" ON "ai_jobs" USING btree ("project_id","created_at" DESC NULLS LAST);