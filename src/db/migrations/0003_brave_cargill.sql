CREATE TYPE "public"."competition_status" AS ENUM('published', 'draft', 'archived');--> statement-breakpoint
CREATE TYPE "public"."competition_type" AS ENUM('competition', 'grant', 'hackathon', 'tournament', 'olympiad', 'forum', 'accelerator', 'championship', 'other');--> statement-breakpoint
ALTER TABLE "competitions" ADD COLUMN "organizer" varchar(255);--> statement-breakpoint
ALTER TABLE "competitions" ADD COLUMN "type" "competition_type" DEFAULT 'other' NOT NULL;--> statement-breakpoint
ALTER TABLE "competitions" ADD COLUMN "source_id" varchar(100);--> statement-breakpoint
ALTER TABLE "competitions" ADD COLUMN "start_at" timestamp;--> statement-breakpoint
ALTER TABLE "competitions" ADD COLUMN "result_at" timestamp;--> statement-breakpoint
ALTER TABLE "competitions" ADD COLUMN "prize_fund" varchar(255);--> statement-breakpoint
ALTER TABLE "competitions" ADD COLUMN "status" "competition_status" DEFAULT 'published' NOT NULL;