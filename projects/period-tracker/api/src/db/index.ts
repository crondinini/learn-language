import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema.js";
import * as relations from "./relations.js";
import { mkdirSync } from "fs";

const dbPath = process.env.DATABASE_URL || "./data/period-tracker.db";

// Ensure data directory exists
mkdirSync("./data", { recursive: true });

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema: { ...schema, ...relations } });
export type DB = typeof db;
