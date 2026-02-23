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
  source: text("source").notNull().default("manual"), // 'manual' | 'healthkit'
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
  type: text("type").notNull(), // 'cramps' | 'headache' | 'bloating' | 'mood_swings' | 'fatigue' | 'acne' | 'breast_tenderness' | 'backache'
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
