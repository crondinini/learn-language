import { Hono } from "hono";
import { db } from "../db/index.js";
import { partnerships, users, periods } from "../db/schema.js";
import { eq, and, desc } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { authMiddleware, type AuthUser } from "../middleware/auth.js";
import { predictNextPeriod } from "../services/prediction.js";

const partnersRouter = new Hono<{ Variables: { user: AuthUser } }>();
partnersRouter.use("*", authMiddleware);

// GET /partners — get current partnership status + partner info
partnersRouter.get("/", async (c) => {
  const { userId } = c.get("user");

  const partnership = await db.query.partnerships.findFirst({
    where: eq(partnerships.userId, userId),
  });

  if (!partnership) {
    return c.json({ partnership: null });
  }

  // Look up partner user info
  const partner = await db.query.users.findFirst({
    where: eq(users.email, partnership.partnerEmail),
  });

  return c.json({
    partnership: {
      ...partnership,
      partner: partner
        ? { id: partner.id, name: partner.name, email: partner.email }
        : null,
    },
  });
});

// POST /partners/invite — invite partner by email
partnersRouter.post("/invite", async (c) => {
  const { userId, email: myEmail } = c.get("user");
  const body = await c.req.json<{ email: string }>();

  if (!body.email) {
    return c.json({ error: "email is required" }, 400);
  }

  const partnerEmail = body.email.toLowerCase().trim();

  // Can't invite yourself
  if (partnerEmail === myEmail) {
    return c.json({ error: "You cannot invite yourself" }, 400);
  }

  // Check partner exists in system
  const partnerUser = await db.query.users.findFirst({
    where: eq(users.email, partnerEmail),
  });

  if (!partnerUser) {
    return c.json({ error: "No user found with that email" }, 404);
  }

  // Can't invite if you already have a partnership
  const existing = await db.query.partnerships.findFirst({
    where: eq(partnerships.userId, userId),
  });

  if (existing) {
    return c.json({ error: "You already have a partnership" }, 409);
  }

  // Can't invite if partner already has a partnership
  const partnerExisting = await db.query.partnerships.findFirst({
    where: eq(partnerships.userId, partnerUser.id),
  });

  if (partnerExisting) {
    return c.json({ error: "That person already has a partner" }, 409);
  }

  // Create two rows: one for each user
  const myRow = uuid();
  const theirRow = uuid();

  await db.insert(partnerships).values([
    {
      id: myRow,
      userId,
      partnerEmail,
      status: "pending",
    },
    {
      id: theirRow,
      userId: partnerUser.id,
      partnerEmail: myEmail,
      status: "pending",
    },
  ]);

  return c.json({ success: true, status: "pending" }, 201);
});

// POST /partners/accept — accept a pending invite
partnersRouter.post("/accept", async (c) => {
  const { userId } = c.get("user");

  const myPartnership = await db.query.partnerships.findFirst({
    where: and(
      eq(partnerships.userId, userId),
      eq(partnerships.status, "pending")
    ),
  });

  if (!myPartnership) {
    return c.json({ error: "No pending invite found" }, 404);
  }

  // Flip both rows to accepted
  // My row
  await db
    .update(partnerships)
    .set({ status: "accepted" })
    .where(eq(partnerships.id, myPartnership.id));

  // Partner's row (their userId + my email as partnerEmail)
  const partnerUser = await db.query.users.findFirst({
    where: eq(users.email, myPartnership.partnerEmail),
  });

  if (partnerUser) {
    const me = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (me) {
      await db
        .update(partnerships)
        .set({ status: "accepted" })
        .where(
          and(
            eq(partnerships.userId, partnerUser.id),
            eq(partnerships.partnerEmail, me.email)
          )
        );
    }
  }

  return c.json({ success: true, status: "accepted" });
});

// DELETE /partners/remove — remove partnership (deletes both rows)
partnersRouter.delete("/remove", async (c) => {
  const { userId } = c.get("user");

  const myPartnership = await db.query.partnerships.findFirst({
    where: eq(partnerships.userId, userId),
  });

  if (!myPartnership) {
    return c.json({ error: "No partnership found" }, 404);
  }

  // Find partner's user
  const partnerUser = await db.query.users.findFirst({
    where: eq(users.email, myPartnership.partnerEmail),
  });

  // Delete my row
  await db
    .delete(partnerships)
    .where(eq(partnerships.userId, userId));

  // Delete partner's row
  if (partnerUser) {
    await db
      .delete(partnerships)
      .where(eq(partnerships.userId, partnerUser.id));
  }

  return c.json({ success: true });
});

// GET /partners/data — get partner's periods + predictions (NOT symptoms)
partnersRouter.get("/data", async (c) => {
  const { userId } = c.get("user");

  const myPartnership = await db.query.partnerships.findFirst({
    where: and(
      eq(partnerships.userId, userId),
      eq(partnerships.status, "accepted")
    ),
  });

  if (!myPartnership) {
    return c.json({ error: "No accepted partnership" }, 404);
  }

  const partnerUser = await db.query.users.findFirst({
    where: eq(users.email, myPartnership.partnerEmail),
  });

  if (!partnerUser) {
    return c.json({ error: "Partner not found" }, 404);
  }

  // Get partner's periods (with periodDays but NOT symptoms)
  const partnerPeriods = await db.query.periods.findMany({
    where: eq(periods.userId, partnerUser.id),
    orderBy: desc(periods.startDate),
    with: { periodDays: true },
  });

  // Get partner's prediction
  const prediction = await predictNextPeriod(partnerUser.id);

  return c.json({
    partner: {
      id: partnerUser.id,
      name: partnerUser.name,
      email: partnerUser.email,
    },
    periods: partnerPeriods,
    prediction,
  });
});

export default partnersRouter;
