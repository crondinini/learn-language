import { Hono } from "hono";
import { db } from "../db/index.js";
import {
  trainingPlans,
  trainingDays,
  trainingExercises,
  cycleTrainingTips,
} from "../db/schema.js";
import { eq, and, asc } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { authMiddleware, type AuthUser } from "../middleware/auth.js";
import { reseedPlan } from "../services/training-seed.js";

const trainingRouter = new Hono<{ Variables: { user: AuthUser } }>();
trainingRouter.use("*", authMiddleware);

// GET /training/plans — list user's training plans
trainingRouter.get("/plans", async (c) => {
  const { userId } = c.get("user");
  const plans = await db.query.trainingPlans.findMany({
    where: eq(trainingPlans.userId, userId),
  });
  return c.json(plans);
});

// GET /training/plans/:id — get full plan with days, exercises, cycle tips
trainingRouter.get("/plans/:id", async (c) => {
  const { userId } = c.get("user");
  const planId = c.req.param("id");

  const plan = await db.query.trainingPlans.findFirst({
    where: and(eq(trainingPlans.id, planId), eq(trainingPlans.userId, userId)),
    with: {
      days: {
        orderBy: asc(trainingDays.dayNumber),
        with: {
          exercises: {
            orderBy: asc(trainingExercises.orderIndex),
          },
        },
      },
      cycleTips: {
        orderBy: asc(cycleTrainingTips.orderIndex),
      },
    },
  });

  if (!plan) {
    return c.json({ error: "Plan not found" }, 404);
  }

  return c.json(plan);
});

// POST /training/plans — create a full training plan (with days, exercises, tips)
trainingRouter.post("/plans", async (c) => {
  const { userId } = c.get("user");
  const body = await c.req.json<{
    name: string;
    description?: string;
    daysPerWeek: number;
    days: Array<{
      dayNumber: number;
      name: string;
      emphasis?: string;
      exercises: Array<{
        label: string;
        name: string;
        setsReps?: string;
        rest?: string;
        notes?: string;
        isWarmup?: boolean;
        isFinisher?: boolean;
      }>;
    }>;
    cycleTips?: Array<{
      phase: string;
      tip: string;
    }>;
  }>();

  if (!body.name || !body.daysPerWeek || !body.days?.length) {
    return c.json({ error: "name, daysPerWeek, and days are required" }, 400);
  }

  const planId = uuid();
  await db.insert(trainingPlans).values({
    id: planId,
    userId,
    name: body.name,
    description: body.description || null,
    daysPerWeek: body.daysPerWeek,
  });

  for (const day of body.days) {
    const dayId = uuid();
    await db.insert(trainingDays).values({
      id: dayId,
      planId,
      dayNumber: day.dayNumber,
      name: day.name,
      emphasis: day.emphasis || null,
    });

    for (let i = 0; i < day.exercises.length; i++) {
      const ex = day.exercises[i];
      await db.insert(trainingExercises).values({
        id: uuid(),
        dayId,
        orderIndex: i,
        label: ex.label,
        name: ex.name,
        setsReps: ex.setsReps || null,
        rest: ex.rest || null,
        notes: ex.notes || null,
        isWarmup: ex.isWarmup || false,
        isFinisher: ex.isFinisher || false,
      });
    }
  }

  if (body.cycleTips) {
    for (let i = 0; i < body.cycleTips.length; i++) {
      const tip = body.cycleTips[i];
      await db.insert(cycleTrainingTips).values({
        id: uuid(),
        planId,
        phase: tip.phase,
        tip: tip.tip,
        orderIndex: i,
      });
    }
  }

  const created = await db.query.trainingPlans.findFirst({
    where: eq(trainingPlans.id, planId),
    with: {
      days: {
        orderBy: asc(trainingDays.dayNumber),
        with: {
          exercises: {
            orderBy: asc(trainingExercises.orderIndex),
          },
        },
      },
      cycleTips: {
        orderBy: asc(cycleTrainingTips.orderIndex),
      },
    },
  });

  return c.json(created, 201);
});

// DELETE /training/plans/:id — delete a plan
trainingRouter.delete("/plans/:id", async (c) => {
  const { userId } = c.get("user");
  const planId = c.req.param("id");

  const existing = await db.query.trainingPlans.findFirst({
    where: and(eq(trainingPlans.id, planId), eq(trainingPlans.userId, userId)),
  });

  if (!existing) {
    return c.json({ error: "Plan not found" }, 404);
  }

  await db.delete(trainingPlans).where(eq(trainingPlans.id, planId));
  return c.json({ success: true });
});

// GET /training/today — get today's training based on cycle phase and plan
trainingRouter.get("/today", async (c) => {
  const { userId } = c.get("user");
  const dayOfWeek = c.req.query("dayOfWeek"); // 1-7 (Mon-Sun)

  if (!dayOfWeek) {
    return c.json({ error: "dayOfWeek query parameter required (1-7)" }, 400);
  }

  const dayNum = parseInt(dayOfWeek);

  // Get the user's plan
  const plan = await db.query.trainingPlans.findFirst({
    where: eq(trainingPlans.userId, userId),
    with: {
      days: {
        orderBy: asc(trainingDays.dayNumber),
        with: {
          exercises: {
            orderBy: asc(trainingExercises.orderIndex),
          },
        },
      },
      cycleTips: true,
    },
  });

  if (!plan) {
    return c.json({ plan: null, message: "No training plan set up" });
  }

  // Find the training day that matches
  const trainingDay = plan.days.find((d) => d.dayNumber === dayNum);

  if (!trainingDay) {
    return c.json({
      plan: { id: plan.id, name: plan.name },
      today: null,
      isRestDay: true,
      message: "Rest day",
    });
  }

  return c.json({
    plan: { id: plan.id, name: plan.name },
    today: trainingDay,
    isRestDay: false,
    cycleTips: plan.cycleTips,
  });
});

// POST /training/reseed — delete existing plan and re-create with latest seed data
trainingRouter.post("/reseed", async (c) => {
  const { userId } = c.get("user");
  const planId = await reseedPlan(userId);
  return c.json({ success: true, planId });
});

export default trainingRouter;
