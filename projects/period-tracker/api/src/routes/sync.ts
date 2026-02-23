import { Hono } from "hono";
import { db } from "../db/index.js";
import { periods, periodDays } from "../db/schema.js";
import { eq, and } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { authMiddleware, type AuthUser } from "../middleware/auth.js";

const syncRouter = new Hono<{ Variables: { user: AuthUser } }>();
syncRouter.use("*", authMiddleware);

interface HealthKitEntry {
  startDate: string;
  endDate: string;
  flow?: string; // 'unspecified' | 'light' | 'medium' | 'heavy'
}

// Receive HealthKit menstrual data batch
syncRouter.post("/healthkit", async (c) => {
  const { userId } = c.get("user");
  const body = await c.req.json<{ entries: HealthKitEntry[] }>();

  if (!body.entries || !Array.isArray(body.entries)) {
    return c.json({ error: "entries array is required" }, 400);
  }

  let created = 0;
  let skipped = 0;

  for (const entry of body.entries) {
    // Check if we already have a period starting on this date
    const existing = await db.query.periods.findFirst({
      where: and(
        eq(periods.userId, userId),
        eq(periods.startDate, entry.startDate)
      ),
    });

    if (existing) {
      skipped++;
      continue;
    }

    const periodId = uuid();
    await db.insert(periods).values({
      id: periodId,
      userId,
      startDate: entry.startDate,
      endDate: entry.endDate,
      source: "healthkit",
    });

    // Add flow data if available
    if (entry.flow && entry.flow !== "unspecified") {
      const flowMap: Record<string, string> = {
        light: "light",
        medium: "medium",
        heavy: "heavy",
      };
      const mappedFlow = flowMap[entry.flow] || "medium";

      await db.insert(periodDays).values({
        id: uuid(),
        periodId,
        date: entry.startDate,
        flow: mappedFlow,
      });
    }

    created++;
  }

  return c.json({ created, skipped });
});

export default syncRouter;
