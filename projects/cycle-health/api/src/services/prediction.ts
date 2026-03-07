import { db } from "../db/index.js";
import { periods, predictions } from "../db/schema.js";
import { eq, asc } from "drizzle-orm";
import { v4 as uuid } from "uuid";

interface PredictionResult {
  predictedStart: string;
  predictedEnd: string;
  avgCycleLength: number;
  avgPeriodDuration: number;
  confidence: number;
}

function daysBetween(dateA: string, dateB: string): number {
  const a = new Date(dateA);
  const b = new Date(dateB);
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
}

function stdDev(values: number[]): number {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map((v) => (v - mean) ** 2);
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
}

export async function predictNextPeriod(
  userId: string
): Promise<PredictionResult | null> {
  const userPeriods = await db.query.periods.findMany({
    where: eq(periods.userId, userId),
    orderBy: asc(periods.startDate),
  });

  const completedPeriods = userPeriods.filter((p) => p.endDate);
  if (completedPeriods.length < 3) {
    return null;
  }

  const recent = completedPeriods.slice(-6);

  const cycleLengths: number[] = [];
  for (let i = 1; i < recent.length; i++) {
    cycleLengths.push(daysBetween(recent[i - 1].startDate, recent[i].startDate));
  }

  const periodDurations = recent.map((p) =>
    daysBetween(p.startDate, p.endDate!)
  );

  const avgCycleLength = Math.round(
    cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length
  );
  const avgPeriodDuration = Math.round(
    periodDurations.reduce((a, b) => a + b, 0) / periodDurations.length
  );

  const lastPeriod = userPeriods[userPeriods.length - 1];
  const predictedStart = addDays(lastPeriod.startDate, avgCycleLength);
  const predictedEnd = addDays(predictedStart, avgPeriodDuration);

  const sd = stdDev(cycleLengths);
  const confidence = Math.max(0.3, Math.min(0.95, 1 - sd / avgCycleLength));

  return {
    predictedStart,
    predictedEnd,
    avgCycleLength,
    avgPeriodDuration,
    confidence: Math.round(confidence * 100) / 100,
  };
}

export async function savePrediction(
  userId: string,
  prediction: PredictionResult
) {
  const id = uuid();
  await db.insert(predictions).values({
    id,
    userId,
    predictedStart: prediction.predictedStart,
    predictedEnd: prediction.predictedEnd,
    avgCycleLength: prediction.avgCycleLength,
    confidence: prediction.confidence,
  });
  return id;
}
