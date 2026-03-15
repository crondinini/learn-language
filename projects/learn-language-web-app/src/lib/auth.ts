import { cookies, headers } from "next/headers";
import db, { User } from "./db";

/**
 * Find or create a user by email. On first-ever user creation,
 * backfills all existing data (NULL user_id rows) to that user.
 */
export function getOrCreateUser(email: string, name?: string): User {
  const existing = db
    .prepare("SELECT * FROM users WHERE email = ?")
    .get(email) as User | undefined;

  if (existing) return existing;

  // Create new user
  const result = db
    .prepare("INSERT INTO users (email, name) VALUES (?, ?)")
    .run(email, name || null);

  const userId = result.lastInsertRowid as number;

  // Check if this is the first user — if so, backfill all NULL user_id rows
  const userCount = db
    .prepare("SELECT COUNT(*) as count FROM users")
    .get() as { count: number };

  if (userCount.count === 1) {
    const tables = ["decks", "verbs", "homework", "lessons", "texts", "generations"];
    for (const table of tables) {
      db.prepare(`UPDATE ${table} SET user_id = ? WHERE user_id IS NULL`).run(userId);
    }
  }

  return db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as User;
}

/**
 * Get the current user from the request context.
 * - Bearer API_TOKEN → admin user (uses AUTH_USERNAME env var)
 * - Cookie auth-token → extracts email, calls getOrCreateUser
 */
export async function getCurrentUser(): Promise<User> {
  const headerStore = await headers();
  const authHeader = headerStore.get("Authorization");

  // Bearer token auth (API/MCP)
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const expectedToken = process.env.API_TOKEN;
    if (expectedToken && token === expectedToken) {
      const adminEmail = process.env.AUTH_USERNAME;
      if (!adminEmail) {
        throw new Error("AUTH_USERNAME not configured");
      }
      return getOrCreateUser(adminEmail);
    }
  }

  // Cookie auth
  const cookieStore = await cookies();
  const token = cookieStore.get("auth-token")?.value;

  if (token) {
    try {
      const decoded = Buffer.from(token, "base64").toString();
      const [email, timestamp, secret] = decoded.split(":");
      const expectedSecret = process.env.AUTH_SECRET || "default-secret";

      if (email && timestamp && secret === expectedSecret) {
        const tokenAge = Date.now() - parseInt(timestamp);
        if (tokenAge < 30 * 24 * 60 * 60 * 1000) {
          return getOrCreateUser(email);
        }
      }
    } catch {
      // Invalid token
    }
  }

  throw new Error("Unauthorized");
}

/**
 * Check if an email is in the allowlist.
 * If ALLOWED_EMAILS is not set, all emails are allowed.
 */
export function isEmailAllowed(email: string): boolean {
  const allowedEmails = process.env.ALLOWED_EMAILS;
  if (!allowedEmails) return true;

  const list = allowedEmails.split(",").map((e) => e.trim().toLowerCase());
  return list.includes(email.toLowerCase());
}
