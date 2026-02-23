import { relations } from "drizzle-orm";
import { users, periods, periodDays, symptoms, predictions, partnerships } from "./schema.js";

export const usersRelations = relations(users, ({ many }) => ({
  periods: many(periods),
  symptoms: many(symptoms),
  predictions: many(predictions),
  partnerships: many(partnerships),
}));

export const periodsRelations = relations(periods, ({ one, many }) => ({
  user: one(users, {
    fields: [periods.userId],
    references: [users.id],
  }),
  periodDays: many(periodDays),
}));

export const periodDaysRelations = relations(periodDays, ({ one }) => ({
  period: one(periods, {
    fields: [periodDays.periodId],
    references: [periods.id],
  }),
}));

export const symptomsRelations = relations(symptoms, ({ one }) => ({
  user: one(users, {
    fields: [symptoms.userId],
    references: [users.id],
  }),
}));

export const predictionsRelations = relations(predictions, ({ one }) => ({
  user: one(users, {
    fields: [predictions.userId],
    references: [users.id],
  }),
}));

export const partnershipsRelations = relations(partnerships, ({ one }) => ({
  user: one(users, {
    fields: [partnerships.userId],
    references: [users.id],
  }),
}));
