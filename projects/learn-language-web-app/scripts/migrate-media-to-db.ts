#!/usr/bin/env tsx
/**
 * Migration script: moves audio/image files from filesystem into SQLite media table.
 *
 * Run on the server BEFORE deploying the new code that removes symlinks:
 *   cd /opt/learn-language
 *   npx tsx scripts/migrate-media-to-db.ts
 *
 * Or from the project directory:
 *   npx tsx scripts/migrate-media-to-db.ts
 *
 * What it does:
 * 1. Reads all cards and verbs with audio_url / image_url pointing to filesystem paths
 * 2. For each file that exists, inserts the blob into the media table
 * 3. Updates the URL to /api/media/{id}
 * 4. For files that don't exist (already lost), sets the URL to NULL
 * 5. Skips external URLs (https://)
 */

import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const dbPath = path.join(process.cwd(), "data", "learn-language.db");

if (!fs.existsSync(dbPath)) {
  console.error(`Database not found at ${dbPath}`);
  process.exit(1);
}

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Ensure media table exists
db.exec(`
  CREATE TABLE IF NOT EXISTS media (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    data BLOB NOT NULL,
    content_type TEXT NOT NULL,
    filename TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

const contentTypes: Record<string, string> = {
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".webm": "audio/webm",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

const insertMedia = db.prepare(
  "INSERT INTO media (data, content_type, filename) VALUES (?, ?, ?)"
);

/**
 * Resolve a stored URL to a filesystem path.
 * Handles both /api/media/audio/x.mp3 and /audio/x.mp3 formats.
 */
function urlToFilePath(url: string): string {
  let relative = url;
  if (relative.startsWith("/api/media/")) {
    relative = relative.replace("/api/media/", "");
  } else if (relative.startsWith("/")) {
    relative = relative.slice(1);
  }
  return path.join(process.cwd(), "public", relative);
}

function isExternalUrl(url: string): boolean {
  return url.startsWith("http://") || url.startsWith("https://");
}

function isAlreadyMigrated(url: string): boolean {
  return /^\/api\/media\/\d+$/.test(url);
}

let migrated = 0;
let cleared = 0;
let skipped = 0;

function migrateUrl(
  table: string,
  column: string,
  id: number,
  url: string
): void {
  if (isExternalUrl(url) || isAlreadyMigrated(url)) {
    skipped++;
    return;
  }

  const filePath = urlToFilePath(url);

  if (fs.existsSync(filePath)) {
    const data = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const contentType = contentTypes[ext] || "application/octet-stream";
    const filename = path.basename(filePath);

    const result = insertMedia.run(data, contentType, filename);
    const mediaId = result.lastInsertRowid;
    const newUrl = `/api/media/${mediaId}`;

    db.prepare(
      `UPDATE ${table} SET ${column} = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(newUrl, id);

    console.log(`  ✓ ${table}#${id} ${column}: ${filename} → /api/media/${mediaId}`);
    migrated++;
  } else {
    // File is gone — clear the reference
    db.prepare(
      `UPDATE ${table} SET ${column} = NULL, updated_at = datetime('now') WHERE id = ?`
    ).run(id);

    console.log(`  ✗ ${table}#${id} ${column}: file missing (${path.basename(url)}), cleared`);
    cleared++;
  }
}

// Wrap everything in a transaction
const migrate = db.transaction(() => {
  // Migrate card audio
  console.log("\n--- Cards: audio_url ---");
  const cardsWithAudio = db
    .prepare("SELECT id, audio_url FROM cards WHERE audio_url IS NOT NULL")
    .all() as { id: number; audio_url: string }[];

  for (const card of cardsWithAudio) {
    migrateUrl("cards", "audio_url", card.id, card.audio_url);
  }

  // Migrate card images
  console.log("\n--- Cards: image_url ---");
  const cardsWithImages = db
    .prepare("SELECT id, image_url FROM cards WHERE image_url IS NOT NULL")
    .all() as { id: number; image_url: string }[];

  for (const card of cardsWithImages) {
    migrateUrl("cards", "image_url", card.id, card.image_url);
  }

  // Migrate verb audio
  console.log("\n--- Verbs: audio_url ---");
  const verbsWithAudio = db
    .prepare("SELECT id, audio_url FROM verbs WHERE audio_url IS NOT NULL")
    .all() as { id: number; audio_url: string }[];

  for (const verb of verbsWithAudio) {
    migrateUrl("verbs", "audio_url", verb.id, verb.audio_url);
  }
});

console.log("Starting media migration...");
migrate();

console.log(`\nDone!`);
console.log(`  Migrated: ${migrated}`);
console.log(`  Cleared (file missing): ${cleared}`);
console.log(`  Skipped (external/already migrated): ${skipped}`);
