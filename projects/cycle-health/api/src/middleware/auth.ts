import { createMiddleware } from "hono/factory";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";

export interface AuthUser {
  userId: string;
  email: string;
}

export function signToken(payload: AuthUser): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "30d" });
}

export function verifyToken(token: string): AuthUser {
  return jwt.verify(token, JWT_SECRET) as AuthUser;
}

export const authMiddleware = createMiddleware<{
  Variables: { user: AuthUser };
}>(async (c, next) => {
  const header = c.req.header("Authorization");
  if (!header?.startsWith("Bearer ")) {
    return c.json({ error: "Missing authorization token" }, 401);
  }

  try {
    const token = header.slice(7);
    const user = verifyToken(token);
    c.set("user", user);
    await next();
  } catch {
    return c.json({ error: "Invalid or expired token" }, 401);
  }
});
