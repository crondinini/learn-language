import { db } from "../db/index.js";
import {
  trainingPlans,
  trainingDays,
  trainingExercises,
  cycleTrainingTips,
} from "../db/schema.js";
import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";

// Seed the default training plan for a user
export async function seedDefaultPlan(userId: string): Promise<string> {
  // Check if user already has a plan
  const existing = await db.query.trainingPlans.findFirst({
    where: eq(trainingPlans.userId, userId),
  });
  if (existing) return existing.id;

  return createPlan(userId);
}

// Delete existing plan and re-create with latest data
export async function reseedPlan(userId: string): Promise<string> {
  const existing = await db.query.trainingPlans.findFirst({
    where: eq(trainingPlans.userId, userId),
  });
  if (existing) {
    await db.delete(trainingPlans).where(eq(trainingPlans.id, existing.id));
  }
  return createPlan(userId);
}

async function createPlan(userId: string): Promise<string> {
  const planId = uuid();
  await db.insert(trainingPlans).values({
    id: planId,
    userId,
    name: "4-Day Fat Loss Plan",
    description:
      "Evidence-based, designed for women. Fat loss + functional strength. 60 min sessions.",
    daysPerWeek: 4,
  });

  // Day 1 — Lower Body A (Monday, dayNumber=1)
  const day1Id = uuid();
  await db.insert(trainingDays).values({
    id: day1Id,
    planId,
    dayNumber: 1,
    name: "Lower Body A: Glute & Hamstring Focus",
    emphasis: "Posterior chain + glute medius rehab",
  });

  const day1Exercises = [
    { label: "Warm-up", name: "5 min bike + banded lateral walks", setsReps: null, rest: null, notes: "Mini band above knees, 10 steps each way x 2 — fires up glute medius", isWarmup: true, isFinisher: false },
    { label: "A1", name: "Barbell hip thrust", setsReps: "4 x 12", rest: null, notes: "Superset with A2. Follicular phase (days 8-14): try adding 2.5-5kg", isWarmup: false, isFinisher: false },
    { label: "A2", name: "Leg curl (seated or lying)", setsReps: "4 x 12", rest: "60s", notes: "Hamstring focus. No rest before this — go straight from A1", isWarmup: false, isFinisher: false },
    { label: "B", name: "Romanian deadlift (DB or barbell)", setsReps: "4 x 10", rest: "60s", notes: "Hinge pattern — core + hamstrings + glutes. Follicular phase: try adding 2.5-5kg", isWarmup: false, isFinisher: false },
    { label: "C1", name: "Bulgarian split squat", setsReps: "3 x 10/side", rest: null, notes: "Back foot on bench. Superset with C2", isWarmup: false, isFinisher: false },
    { label: "C2", name: "Single-leg glute bridge", setsReps: "3 x 10/side", rest: "60s", notes: "Bodyweight only to start. Squeeze at top for 2 sec", isWarmup: false, isFinisher: false },
    { label: "D", name: "Cable hip abduction (standing)", setsReps: "3 x 15/side", rest: "45s", notes: "Key for glute medius + lower back. Stand sideways, ankle strap, push leg out", isWarmup: false, isFinisher: false },
    { label: "Finisher", name: "Incline treadmill walk", setsReps: "8 min", rest: null, notes: "10-12% incline, moderate pace", isWarmup: false, isFinisher: true },
  ];

  for (let i = 0; i < day1Exercises.length; i++) {
    const ex = day1Exercises[i];
    await db.insert(trainingExercises).values({
      id: uuid(), dayId: day1Id, orderIndex: i, ...ex,
    });
  }

  // Day 2 — Upper Body (Tuesday, dayNumber=2)
  const day2Id = uuid();
  await db.insert(trainingDays).values({
    id: day2Id,
    planId,
    dayNumber: 2,
    name: "Upper Body",
    emphasis: "Efficient, superset-based",
  });

  const day2Exercises = [
    { label: "Warm-up", name: "5 min bike", setsReps: null, rest: null, notes: "Easy pace", isWarmup: true, isFinisher: false },
    { label: "A1", name: "Dumbbell bench press", setsReps: "4 x 12", rest: null, notes: "Superset with A2", isWarmup: false, isFinisher: false },
    { label: "A2", name: "Cable seated row", setsReps: "4 x 12", rest: "60s", notes: "Squeeze shoulder blades", isWarmup: false, isFinisher: false },
    { label: "B1", name: "Dumbbell overhead press", setsReps: "3 x 12", rest: null, notes: "Superset with B2", isWarmup: false, isFinisher: false },
    { label: "B2", name: "Lat pulldown", setsReps: "3 x 12", rest: "45s", notes: "Wide grip. Luteal phase: take 60s rest instead of 45s if energy dips", isWarmup: false, isFinisher: false },
    { label: "C1", name: "Cable lateral raises", setsReps: "3 x 15", rest: null, notes: "Superset with C2", isWarmup: false, isFinisher: false },
    { label: "C2", name: "Face pulls", setsReps: "3 x 15", rest: "45s", notes: "Light, rear delts + posture. Luteal: 60s rest if needed", isWarmup: false, isFinisher: false },
    { label: "D1", name: "Incline dumbbell curl", setsReps: "3 x 15", rest: null, notes: "Superset with D2", isWarmup: false, isFinisher: false },
    { label: "D2", name: "Cable tricep pushdown", setsReps: "3 x 15", rest: "45s", notes: "Luteal: 60s rest if needed", isWarmup: false, isFinisher: false },
    { label: "Finisher", name: "Spin bike", setsReps: "10 min", rest: null, notes: "Moderate effort", isWarmup: false, isFinisher: true },
  ];

  for (let i = 0; i < day2Exercises.length; i++) {
    const ex = day2Exercises[i];
    await db.insert(trainingExercises).values({
      id: uuid(), dayId: day2Id, orderIndex: i, ...ex,
    });
  }

  // Day 3 — Lower Body B (Thursday, dayNumber=4)
  const day3Id = uuid();
  await db.insert(trainingDays).values({
    id: day3Id,
    planId,
    dayNumber: 4,
    name: "Lower Body B: Quad & Functional",
    emphasis: "Quads, functional movement, core stability",
  });

  const day3Exercises = [
    { label: "Warm-up", name: "5 min bike + banded clamshells", setsReps: null, rest: null, notes: "15/side — glute medius activation", isWarmup: true, isFinisher: false },
    { label: "A", name: "Goblet squat (to box/bench)", setsReps: "4 x 12", rest: "60s", notes: "Box squat limits knee travel — go deeper if comfortable", isWarmup: false, isFinisher: false },
    { label: "B", name: "Leg press (feet high on platform)", setsReps: "4 x 15", rest: "60s", notes: "Higher reps for Type I fibres", isWarmup: false, isFinisher: false },
    { label: "C1", name: "Walking lunge (DB)", setsReps: "3 x 10/side", rest: null, notes: "Quad + glute combo. Superset with C2. Around ovulation: use controlled tempos", isWarmup: false, isFinisher: false },
    { label: "C2", name: "Cable Pallof press", setsReps: "3 x 10/side", rest: "60s", notes: "Anti-rotation — directly addresses lower back", isWarmup: false, isFinisher: false },
    { label: "D1", name: "Single-leg Romanian deadlift (DB)", setsReps: "3 x 10/side", rest: null, notes: "Hold DB in opposite hand. Around ovulation: controlled tempo, no explosive movements", isWarmup: false, isFinisher: false },
    { label: "D2", name: "Dead bug", setsReps: "3 x 10/side", rest: "60s", notes: "Slow and controlled — core stability for lower back", isWarmup: false, isFinisher: false },
    { label: "E", name: "Standing calf raises", setsReps: "3 x 15", rest: "45s", notes: null, isWarmup: false, isFinisher: false },
    { label: "Finisher", name: "Spin bike intervals", setsReps: "8 min", rest: null, notes: "30s hard / 30s easy", isWarmup: false, isFinisher: true },
  ];

  for (let i = 0; i < day3Exercises.length; i++) {
    const ex = day3Exercises[i];
    await db.insert(trainingExercises).values({
      id: uuid(), dayId: day3Id, orderIndex: i, ...ex,
    });
  }

  // Day 4 — Full Body (Saturday, dayNumber=6)
  const day4Id = uuid();
  await db.insert(trainingDays).values({
    id: day4Id,
    planId,
    dayNumber: 6,
    name: "Full Body Functional",
    emphasis: "Strength, movement quality, glute medius — one station, busy-gym friendly",
  });

  const day4Exercises = [
    { label: "Warm-up", name: "5 min bike + banded lateral walks", setsReps: null, rest: null, notes: "On period: if energy is low, reduce all weights 10-15% and focus on movement quality", isWarmup: true, isFinisher: false },
    { label: "A1", name: "Dumbbell bench press (or push-ups)", setsReps: "3 x 12", rest: null, notes: "Upper body push — keeps pressing frequency at 2x/week. Superset with A2", isWarmup: false, isFinisher: false },
    { label: "A2", name: "Single-arm dumbbell row", setsReps: "3 x 12/side", rest: "60s", notes: "Upper body pull", isWarmup: false, isFinisher: false },
    { label: "B1", name: "Farmer's carry", setsReps: "3 x 30-40m", rest: null, notes: "Heavy dumbbells, walk tall. Works entire core and grip. Superset with B2", isWarmup: false, isFinisher: false },
    { label: "B2", name: "Cable hip abduction", setsReps: "3 x 15/side", rest: "60s", notes: "More glute medius work", isWarmup: false, isFinisher: false },
    { label: "C1", name: "Bulgarian split squat", setsReps: "3 x 10/side", rest: null, notes: "Second time this week — builds serious single-leg strength. Superset with C2", isWarmup: false, isFinisher: false },
    { label: "C2", name: "Cable Pallof press", setsReps: "3 x 10/side", rest: "60s", notes: "Anti-rotation for lower back", isWarmup: false, isFinisher: false },
    { label: "D1", name: "Dumbbell reverse lunge (short step)", setsReps: "3 x 10/side", rest: null, notes: "Superset with D2", isWarmup: false, isFinisher: false },
    { label: "D2", name: "Dead bug", setsReps: "3 x 10/side", rest: "60s", notes: null, isWarmup: false, isFinisher: false },
    { label: "Cool-down", name: "Stretching", setsReps: "5-10 min", rest: null, notes: "Pigeon stretch, hip flexor stretch, child's pose", isWarmup: false, isFinisher: true },
  ];

  for (let i = 0; i < day4Exercises.length; i++) {
    const ex = day4Exercises[i];
    await db.insert(trainingExercises).values({
      id: uuid(), dayId: day4Id, orderIndex: i, ...ex,
    });
  }

  // Cycle training tips (general, phase-level)
  const tips = [
    { phase: "menstruation", tip: "Days 1-5: You might feel lower energy. Reduce weights by 10-15% and focus on technique. If you feel fine, train normally. Prioritise iron-rich foods." },
    { phase: "follicular", tip: "Days 6-14: Estrogen is rising. Many women feel strongest here. Good time to attempt heavier weights or push for extra reps. Your body accesses stored carbs more efficiently." },
    { phase: "ovulation", tip: "Days 15-16: Estrogen peaks. Some women feel powerful here. Focus on controlled movements rather than explosive maximal efforts (slightly increased injury risk from ligament laxity)." },
    { phase: "luteal", tip: "Days 17-28: Progesterone rises, body temperature increases. If sluggish, shift to lighter weights with higher reps (12-15 instead of 10-12). You may feel hungrier — metabolism increases ~5-10%." },
  ];

  for (let i = 0; i < tips.length; i++) {
    await db.insert(cycleTrainingTips).values({
      id: uuid(),
      planId,
      phase: tips[i].phase,
      tip: tips[i].tip,
      orderIndex: i,
    });
  }

  return planId;
}
