export interface User {
  id: string;
  email: string;
  name: string;
}

export interface PeriodDay {
  id: string;
  periodId: string;
  date: string;
  flow: "light" | "medium" | "heavy" | "spotting";
}

export interface Period {
  id: string;
  userId: string;
  startDate: string;
  endDate: string | null;
  source: string;
  periodDays: PeriodDay[];
}

export type SymptomType =
  | "cramps"
  | "headache"
  | "bloating"
  | "mood_swings"
  | "fatigue"
  | "acne"
  | "breast_tenderness"
  | "backache";

export interface Symptom {
  id: string;
  userId: string;
  date: string;
  type: SymptomType;
  severity: number;
  notes: string | null;
}

export interface Prediction {
  predictedStart: string;
  predictedEnd: string;
  avgCycleLength: number;
  avgPeriodDuration: number;
  confidence: number;
}

export interface Partnership {
  id: string;
  partnerEmail: string;
  status: "pending" | "accepted";
  partner: { id: string; name: string; email: string } | null;
}

export interface PartnerData {
  partner: { id: string; name: string; email: string };
  periods: Period[];
  prediction: Prediction | null;
}

export interface TrainingPlan {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  daysPerWeek: number;
  days: TrainingDay[];
  cycleTips: CycleTrainingTip[];
}

export interface TrainingDay {
  id: string;
  planId: string;
  dayNumber: number;
  name: string;
  emphasis: string | null;
  exercises: TrainingExercise[];
}

export interface TrainingExercise {
  id: string;
  dayId: string;
  orderIndex: number;
  label: string;
  name: string;
  setsReps: string | null;
  rest: string | null;
  notes: string | null;
  isWarmup: boolean;
  isFinisher: boolean;
}

export interface CycleTrainingTip {
  id: string;
  planId: string;
  phase: string;
  tip: string;
  orderIndex: number;
}

export type CyclePhase = "Period" | "Follicular" | "Ovulation" | "Luteal";

export interface CycleInfo {
  cycleDay: number;
  cycleLength: number;
  periodDuration: number;
  phaseName: CyclePhase;
  daysUntilNext: number;
}
