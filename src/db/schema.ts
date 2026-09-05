import { pgTable, uuid, varchar, text, timestamp, pgEnum, primaryKey, jsonb, boolean, integer, index, uniqueIndex } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const projectRoleEnum = pgEnum("project_role", ["OWNER", "MANAGER", "MEMBER"]);
export const projectStatusEnum = pgEnum("project_status", ["new", "preparation", "in_progress", "ready_to_submit", "submitted", "waiting_result", "completed", "cancelled"]);
export const projectPriorityEnum = pgEnum("project_priority", ["high", "medium", "low"]);
export const taskStatusEnum = pgEnum("task_status", ["TODO", "IN_PROGRESS", "REVIEW", "DONE"]);
export const taskPriorityEnum = pgEnum("task_priority", ["high", "medium", "low"]);
export const globalRoleEnum = pgEnum("global_role", ["ADMIN", "USER"]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  fullName: varchar("full_name", { length: 255 }),
  role: globalRoleEnum("role").default("USER").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const competitions = pgTable("competitions", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  organizer: varchar("organizer", { length: 255 }),
  type: varchar("type", { length: 50 }).default("other").notNull(), // Switched from enum due to scraper issues
  url: varchar("url", { length: 2048 }),
  source: varchar("source", { length: 100 }),
  sourceId: varchar("source_id", { length: 100 }),
  deadline: timestamp("deadline"),
  startAt: timestamp("start_at"),
  resultAt: timestamp("result_at"),
  prizeFund: varchar("prize_fund", { length: 255 }),
  status: varchar("status", { length: 50 }).default("published").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  sourceIdIdx: uniqueIndex("source_id_idx").on(table.sourceId),
}));

export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  competitionId: uuid("competition_id").references(() => competitions.id, { onDelete: "set null" }), 
  url: varchar("url", { length: 2048 }),
  status: projectStatusEnum("status").default("new").notNull(),
  priority: projectPriorityEnum("priority").default("medium").notNull(),
  responsibleUserId: uuid("responsible_user_id").references(() => users.id, { onDelete: "set null" }),
  startAt: timestamp("start_at"),
  deadlineAt: timestamp("deadline_at"),
  result: jsonb("result"), // Storing project result details as JSONB for flexibility
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  competitionIdIdx: index("competition_id_idx").on(table.competitionId),
  responsibleUserIdIdx: index("responsible_user_id_idx").on(table.responsibleUserId),
}));

export const projectComments = pgTable("project_comments", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  mentions: jsonb("mentions"), // Array of user IDs
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const projectMembers = pgTable("project_members", {
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: projectRoleEnum("role").default("MEMBER").notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.projectId, t.userId] }),
}));

export const tasks = pgTable("tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  status: taskStatusEnum("status").default("TODO").notNull(),
  priority: taskPriorityEnum("priority").default("medium").notNull(),
  deadline: timestamp("deadline"),
  assigneeId: uuid("assignee_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const taskComments = pgTable("task_comments", {
  id: uuid("id").defaultRandom().primaryKey(),
  taskId: uuid("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  mentions: jsonb("mentions"), // Array of user IDs
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const competitionTypeEnum = pgEnum("competition_type", ["competition", "grant", "hackathon", "tournament", "olympiad", "forum", "accelerator", "championship", "other"]);
export const competitionStatusEnum = pgEnum("competition_status", ["published", "draft", "archived"]);

export const notificationTypeEnum = pgEnum("notification_type", ["task_assigned", "comment_added", "deadline_approaching", "deadline_changed", "project_completed", "deadline_14", "deadline_7", "deadline_3", "deadline_1", "deadline_passed"]);

export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: notificationTypeEnum("type").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  referenceId: varchar("reference_id", { length: 255 }),
  referenceType: varchar("reference_type", { length: 50 }),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const files = pgTable("files", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  originalName: varchar("original_name", { length: 255 }).notNull(),
  mimeType: varchar("mime_type", { length: 255 }).notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  taskId: uuid("task_id").references(() => tasks.id, { onDelete: "cascade" }),
  uploadedBy: uuid("uploaded_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  storagePath: varchar("storage_path", { length: 1024 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});


export const usersRelations = relations(users, ({ many }) => ({
  projectMembers: many(projectMembers),
  assignedTasks: many(tasks),
  comments: many(projectComments),
}));

export const projectsRelations = relations(projects, ({ many }) => ({
  members: many(projectMembers),
  tasks: many(tasks),
  comments: many(projectComments),
}));

export const projectCommentsRelations = relations(projectComments, ({ one }) => ({
  project: one(projects, {
    fields: [projectComments.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [projectComments.userId],
    references: [users.id],
  }),
}));

export const projectMembersRelations = relations(projectMembers, ({ one }) => ({
  project: one(projects, {
    fields: [projectMembers.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [projectMembers.userId],
    references: [users.id],
  }),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
  assignee: one(users, {
    fields: [tasks.assigneeId],
    references: [users.id],
  }),
  comments: many(taskComments),
}));

export const taskCommentsRelations = relations(taskComments, ({ one }) => ({
  task: one(tasks, {
    fields: [taskComments.taskId],
    references: [tasks.id],
  }),
  user: one(users, {
    fields: [taskComments.userId],
    references: [users.id],
  }),
}));
