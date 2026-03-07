import { Hono } from "hono";
import { db } from "../db/index.js";
import { periods, periodDays } from "../db/schema.js";
import { eq, and, desc, asc } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { authMiddleware, type AuthUser } from "../middleware/auth.js";

const periodsRouter = new Hono<{ Variables: { user: AuthUser } }>();
periodsRouter.use("*", authMiddleware);

async function syncPeriodDates(periodId: string) {
  const days = await db.query.periodDays.findMany({
    where: eq(periodDays.periodId, periodId),
    orderBy: asc(periodDays.date),
  });

  if (days.length === 0) {
    await db
      .update(periods)
      .set({ endDate: null })
      .where(eq(periods.id, periodId));
    return;
  }

  const startDate = days[0].date;
  const endDate = days[days.length - 1].date;

  await db
    .update(periods)
    .set({ startDate, endDate: startDate === endDate ? null : endDate })
    .where(eq(periods.id, periodId));
}

periodsRouter.get("/", async (c) => {
  const { userId } = c.get("user");
  const result = await db.query.periods.findMany({
    where: eq(periods.userId, userId),
    orderBy: desc(periods.startDate),
    with: { periodDays: true },
  });
  return c.json(result);
});

periodsRouter.post("/", async (c) => {
  const { userId } = c.get("user");
  const body = await c.req.json<{
    startDate: string;
    endDate?: string;
    source?: string;
  }>();

  if (!body.startDate) {
    return c.json({ error: "startDate is required" }, 400);
  }

  const id = uuid();
  await db.insert(periods).values({
    id,
    userId,
    startDate: body.startDate,
    endDate: body.endDate || null,
    source: body.source || "manual",
  });

  const created = await db.query.periods.findFirst({
    where: eq(periods.id, id),
    with: { periodDays: true },
  });

  return c.json(created, 201);
});

periodsRouter.put("/:id", async (c) => {
  const { userId } = c.get("user");
  const periodId = c.req.param("id");
  const body = await c.req.json<{
    startDate?: string;
    endDate?: string | null;
  }>();

  const existing = await db.query.periods.findFirst({
    where: and(eq(periods.id, periodId), eq(periods.userId, userId)),
  });

  if (!existing) {
    return c.json({ error: "Period not found" }, 404);
  }

  await db
    .update(periods)
    .set({
      ...(body.startDate !== undefined && { startDate: body.startDate }),
      ...(body.endDate !== undefined && { endDate: body.endDate }),
    })
    .where(eq(periods.id, periodId));

  const updated = await db.query.periods.findFirst({
    where: eq(periods.id, periodId),
    with: { periodDays: true },
  });

  return c.json(updated);
});

periodsRouter.delete("/:id", async (c) => {
  const { userId } = c.get("user");
  const periodId = c.req.param("id");

  const existing = await db.query.periods.findFirst({
    where: and(eq(periods.id, periodId), eq(periods.userId, userId)),
  });

  if (!existing) {
    return c.json({ error: "Period not found" }, 404);
  }

  await db.delete(periods).where(eq(periods.id, periodId));
  return c.json({ success: true });
});

periodsRouter.post("/:id/days", async (c) => {
  const { userId } = c.get("user");
  const periodId = c.req.param("id");
  const body = await c.req.json<{ date: string; flow: string }>();

  const existing = await db.query.periods.findFirst({
    where: and(eq(periods.id, periodId), eq(periods.userId, userId)),
  });

  if (!existing) {
    return c.json({ error: "Period not found" }, 404);
  }

  if (!["light", "medium", "heavy", "spotting"].includes(body.flow)) {
    return c.json({ error: "Invalid flow value" }, 400);
  }

  const existingDay = await db.query.periodDays.findFirst({
    where: and(eq(periodDays.periodId, periodId), eq(periodDays.date, body.date)),
  });

  if (existingDay) {
    await db
      .update(periodDays)
      .set({ flow: body.flow })
      .where(eq(periodDays.id, existingDay.id));

    await syncPeriodDates(periodId);

    const updated = await db.query.periodDays.findFirst({
      where: eq(periodDays.id, existingDay.id),
    });
    return c.json(updated);
  }

  const id = uuid();
  await db.insert(periodDays).values({
    id,
    periodId,
    date: body.date,
    flow: body.flow,
  });

  await syncPeriodDates(periodId);

  const created = await db.query.periodDays.findFirst({
    where: eq(periodDays.id, id),
  });

  return c.json(created, 201);
});

periodsRouter.delete("/:id/days/:date", async (c) => {
  const { userId } = c.get("user");
  const periodId = c.req.param("id");
  const date = c.req.param("date");

  const existing = await db.query.periods.findFirst({
    where: and(eq(periods.id, periodId), eq(periods.userId, userId)),
  });

  if (!existing) {
    return c.json({ error: "Period not found" }, 404);
  }

  const day = await db.query.periodDays.findFirst({
    where: and(eq(periodDays.periodId, periodId), eq(periodDays.date, date)),
  });

  if (!day) {
    return c.json({ error: "Day not found" }, 404);
  }

  await db.delete(periodDays).where(eq(periodDays.id, day.id));
  await syncPeriodDates(periodId);
  return c.json({ success: true });
});

export default periodsRouter;
