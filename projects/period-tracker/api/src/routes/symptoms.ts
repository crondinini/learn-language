import { Hono } from "hono";
import { db } from "../db/index.js";
import { symptoms } from "../db/schema.js";
import { eq, and, between } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { authMiddleware, type AuthUser } from "../middleware/auth.js";

const VALID_TYPES = [
  "cramps",
  "headache",
  "bloating",
  "mood_swings",
  "fatigue",
  "acne",
  "breast_tenderness",
  "backache",
] as const;

const symptomsRouter = new Hono<{ Variables: { user: AuthUser } }>();
symptomsRouter.use("*", authMiddleware);

// Get symptoms for a date range
symptomsRouter.get("/", async (c) => {
  const { userId } = c.get("user");
  const from = c.req.query("from");
  const to = c.req.query("to");

  let result;
  if (from && to) {
    result = await db.query.symptoms.findMany({
      where: and(
        eq(symptoms.userId, userId),
        between(symptoms.date, from, to)
      ),
    });
  } else {
    result = await db.query.symptoms.findMany({
      where: eq(symptoms.userId, userId),
    });
  }

  return c.json(result);
});

// Log a symptom
symptomsRouter.post("/", async (c) => {
  const { userId } = c.get("user");
  const body = await c.req.json<{
    date: string;
    type: string;
    severity: number;
    notes?: string;
  }>();

  if (!body.date || !body.type || !body.severity) {
    return c.json({ error: "date, type, and severity are required" }, 400);
  }

  if (!VALID_TYPES.includes(body.type as (typeof VALID_TYPES)[number])) {
    return c.json({ error: `Invalid symptom type. Must be one of: ${VALID_TYPES.join(", ")}` }, 400);
  }

  if (body.severity < 1 || body.severity > 3) {
    return c.json({ error: "Severity must be between 1 and 3" }, 400);
  }

  const id = uuid();
  await db.insert(symptoms).values({
    id,
    userId,
    date: body.date,
    type: body.type,
    severity: body.severity,
    notes: body.notes || null,
  });

  const created = await db.query.symptoms.findFirst({
    where: eq(symptoms.id, id),
  });

  return c.json(created, 201);
});

// Delete a symptom
symptomsRouter.delete("/:id", async (c) => {
  const { userId } = c.get("user");
  const symptomId = c.req.param("id");

  const existing = await db.query.symptoms.findFirst({
    where: and(eq(symptoms.id, symptomId), eq(symptoms.userId, userId)),
  });

  if (!existing) {
    return c.json({ error: "Symptom not found" }, 404);
  }

  await db.delete(symptoms).where(eq(symptoms.id, symptomId));
  return c.json({ success: true });
});

export default symptomsRouter;
