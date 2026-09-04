import { z } from "zod";

export const createProjectSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().optional(),
  competition_id: z.string().optional(),
  url: z.string().url().optional().or(z.literal("")),
  status: z.enum(["new", "preparation", "in_progress", "ready_to_submit", "submitted", "waiting_result", "completed", "cancelled"]).optional(),
  priority: z.enum(["high", "medium", "low"]).optional(),
  responsible_user_id: z.string().uuid().optional(),
  members: z.array(z.string().uuid()).optional(),
  start_at: z.string().datetime().optional(),
  deadline_at: z.string().datetime().optional(),
});

export const updateProjectSchema = createProjectSchema.partial();

export const addProjectCommentSchema = z.object({
  text: z.string().min(1, "Comment text is required"),
  mentions: z.array(z.string().uuid()).optional(),
});

export const setProjectResultSchema = z.object({
  type: z.enum(["victory", "1st_place", "2nd_place", "3rd_place", "finalist", "participation", "not_passed"]),
  prize: z.string().optional(),
  amount: z.number().optional(),
  result_date: z.string().datetime().optional(),
  comment: z.string().optional(),
  results_url: z.string().url().optional().or(z.literal("")),
  files: z.array(z.string()).optional(),
});

export const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "REVIEW", "DONE"]).optional(),
  deadline: z.string().datetime().optional(),
  assigneeId: z.string().uuid().optional(),
});

export const updateTaskSchema = createTaskSchema.partial();

export const createCompetitionSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().optional(),
  organizer: z.string().optional(),
  type: z.enum(["competition", "grant", "hackathon", "tournament", "olympiad", "forum", "accelerator", "championship", "other"]).optional(),
  official_url: z.string().url().optional().or(z.literal("")),
  source: z.string().optional(),
  source_id: z.string().optional(),
  deadline: z.string().datetime().optional(),
  start_at: z.string().datetime().optional(),
  result_at: z.string().datetime().optional(),
  prize_fund: z.string().optional(),
  status: z.enum(["published", "draft", "archived"]).optional(),
});

export const updateCompetitionSchema = createCompetitionSchema.partial();
