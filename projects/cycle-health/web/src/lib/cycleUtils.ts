import type { Period, Prediction, CycleInfo, CyclePhase } from "./types";

export function calculateCycleInfo(
  periods: Period[],
  prediction: Prediction | null
): CycleInfo | null {
  if (periods.length === 0) return null;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const lastPeriod = periods[0]; // sorted desc by startDate

  // Check if currently on period
  let currentPeriod: Period | null = null;
  for (const p of periods) {
    const start = new Date(p.startDate);
    const end = p.endDate ? new Date(p.endDate) : now;
    if (today >= start && today <= end) {
      currentPeriod = p;
      break;
    }
  }

  const cycleLength = prediction?.avgCycleLength ?? 28;
  const periodDuration =
    prediction?.avgPeriodDuration ??
    Math.max(1, Math.min(14, lastPeriod.periodDays.length));

  const lastStart = new Date(lastPeriod.startDate);
  let cycleDay =
    Math.round(
      (today.getTime() - lastStart.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;
  if (cycleDay > cycleLength) cycleDay = cycleDay % cycleLength;

  let phaseName: CyclePhase;
  if (currentPeriod && cycleDay <= periodDuration) {
    phaseName = "Period";
  } else if (cycleDay <= 13) {
    phaseName = "Follicular";
  } else if (cycleDay <= 16) {
    phaseName = "Ovulation";
  } else {
    phaseName = "Luteal";
  }

  const daysUntilNext = cycleLength - cycleDay + 1;

  return {
    cycleDay,
    cycleLength,
    periodDuration,
    phaseName,
    daysUntilNext,
  };
}

export function getPeriodDaySet(periods: Period[]): Set<string> {
  const days = new Set<string>();
  for (const period of periods) {
    for (const pd of period.periodDays) {
      days.add(pd.date);
    }
  }
  return days;
}

export function getPredictedDaySet(prediction: Prediction | null): Set<string> {
  if (!prediction) return new Set();
  const days = new Set<string>();
  const start = new Date(prediction.predictedStart);
  const end = new Date(prediction.predictedEnd);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    days.add(formatDate(d));
  }
  return days;
}

export function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}
