CREATE TYPE "public"."project_priority" AS ENUM('high', 'medium', 'low');--> statement-breakpoint
CREATE TYPE "public"."project_status" AS ENUM('new', 'preparation', 'in_progress', 'ready_to_submit', 'submitted', 'waiting_result', 'completed', 'cancelled');--> statement-breakpoint
CREATE TABLE "project_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"text" text NOT NULL,
	"mentions" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "competition_id" varchar(255);--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "url" varchar(2048);--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "status" "project_status" DEFAULT 'new' NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "priority" "project_priority" DEFAULT 'medium' NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "responsible_user_id" uuid;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "start_at" timestamp;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "deadline_at" timestamp;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "result" jsonb;--> statement-breakpoint
ALTER TABLE "project_comments" ADD CONSTRAINT "project_comments_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_comments" ADD CONSTRAINT "project_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_responsible_user_id_users_id_fk" FOREIGN KEY ("responsible_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;