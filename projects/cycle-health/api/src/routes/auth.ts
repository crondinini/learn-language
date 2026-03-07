import { Hono } from "hono";
import { OAuth2Client } from "google-auth-library";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { signToken, authMiddleware, type AuthUser } from "../middleware/auth.js";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const googleClient = new OAuth2Client();

const auth = new Hono<{ Variables: { user: AuthUser } }>();

auth.post("/google", async (c) => {
  const { idToken } = await c.req.json<{ idToken: string }>();

  if (!idToken) {
    return c.json({ error: "Missing idToken" }, 400);
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.sub || !payload.email) {
      return c.json({ error: "Invalid Google token" }, 401);
    }

    // Find or create user
    let user = await db.query.users.findFirst({
      where: eq(users.googleId, payload.sub),
    });

    if (!user) {
      const id = uuid();
      await db.insert(users).values({
        id,
        googleId: payload.sub,
        email: payload.email,
        name: payload.name || payload.email,
      });
      user = await db.query.users.findFirst({
        where: eq(users.id, id),
      });
    }

    if (!user) {
      return c.json({ error: "Failed to create user" }, 500);
    }

    const token = signToken({ userId: user.id, email: user.email });

    return c.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    console.error("Google auth error:", error);
    return c.json({ error: "Authentication failed" }, 401);
  }
});

// Dev login — creates/finds a test user without Google OAuth
auth.post("/dev-login", async (c) => {
  const DEV_GOOGLE_ID = "dev-user-001";
  const DEV_EMAIL = "dev@example.com";
  const DEV_NAME = "Dev User";

  let user = await db.query.users.findFirst({
    where: eq(users.googleId, DEV_GOOGLE_ID),
  });

  if (!user) {
    const id = uuid();
    await db.insert(users).values({
      id,
      googleId: DEV_GOOGLE_ID,
      email: DEV_EMAIL,
      name: DEV_NAME,
    });
    user = await db.query.users.findFirst({
      where: eq(users.id, id),
    });
  }

  if (!user) {
    return c.json({ error: "Failed to create dev user" }, 500);
  }

  const token = signToken({ userId: user.id, email: user.email });

  return c.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
  });
});

auth.get("/me", authMiddleware, async (c) => {
  const { userId } = c.get("user");
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    return c.json({ error: "User not found" }, 404);
  }

  return c.json({
    id: user.id,
    email: user.email,
    name: user.name,
  });
});

export default auth;
