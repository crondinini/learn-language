import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  googleId: text("google_id").notNull().unique(),
  email: text("email").notNull(),
  name: text("name").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const periods = sqliteTable("periods", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  startDate: text("start_date").notNull(),
  endDate: text("end_date"),
  source: text("source").notNull().default("manual"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const periodDays = sqliteTable("period_days", {
  id: text("id").primaryKey(),
  periodId: text("period_id")
    .notNull()
    .references(() => periods.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  flow: text("flow").notNull(), // 'light' | 'medium' | 'heavy' | 'spotting'
});

export const symptoms = sqliteTable("symptoms", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  date: text("date").notNull(),
  type: text("type").notNull(),
  severity: integer("severity").notNull(), // 1-3
  notes: text("notes"),
});

export const partnerships = sqliteTable("partnerships", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  partnerEmail: text("partner_email").notNull(),
  status: text("status").notNull().default("pending"), // 'pending' | 'accepted'
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const predictions = sqliteTable("predictions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  predictedStart: text("predicted_start").notNull(),
  predictedEnd: text("predicted_end").notNull(),
  avgCycleLength: integer("avg_cycle_length").notNull(),
  confidence: real("confidence").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const trainingPlans = sqliteTable("training_plans", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  daysPerWeek: integer("days_per_week").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const trainingDays = sqliteTable("training_days", {
  id: text("id").primaryKey(),
  planId: text("plan_id")
    .notNull()
    .references(() => trainingPlans.id, { onDelete: "cascade" }),
  dayNumber: integer("day_number").notNull(), // 1-7
  name: text("name").notNull(), // e.g. "Lower Body A: Glute & Hamstring Focus"
  emphasis: text("emphasis"), // e.g. "Posterior chain + glute medius rehab"
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const trainingExercises = sqliteTable("training_exercises", {
  id: text("id").primaryKey(),
  dayId: text("day_id")
    .notNull()
    .references(() => trainingDays.id, { onDelete: "cascade" }),
  orderIndex: integer("order_index").notNull(),
  label: text("label").notNull(), // e.g. "A1", "B", "Warm-up", "Finisher"
  name: text("name").notNull(),
  setsReps: text("sets_reps"), // e.g. "4 x 12"
  rest: text("rest"), // e.g. "60s"
  notes: text("notes"),
  isWarmup: integer("is_warmup", { mode: "boolean" }).notNull().default(false),
  isFinisher: integer("is_finisher", { mode: "boolean" }).notNull().default(false),
});

export const cycleTrainingTips = sqliteTable("cycle_training_tips", {
  id: text("id").primaryKey(),
  planId: text("plan_id")
    .notNull()
    .references(() => trainingPlans.id, { onDelete: "cascade" }),
  phase: text("phase").notNull(), // 'menstruation' | 'follicular' | 'ovulation' | 'luteal'
  tip: text("tip").notNull(),
  orderIndex: integer("order_index").notNull().default(0),
});
