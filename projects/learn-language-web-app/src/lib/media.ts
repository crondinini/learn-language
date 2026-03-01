import db from "./db";

interface MediaRow {
  id: number;
  data: Buffer;
  content_type: string;
  filename: string | null;
  created_at: string;
}

export function saveMedia(
  data: Buffer,
  contentType: string,
  filename?: string
): number {
  const stmt = db.prepare(
    "INSERT INTO media (data, content_type, filename) VALUES (?, ?, ?)"
  );
  const result = stmt.run(data, contentType, filename || null);
  return result.lastInsertRowid as number;
}

export function getMedia(
  id: number
): { data: Buffer; content_type: string; filename: string | null } | undefined {
  const stmt = db.prepare(
    "SELECT data, content_type, filename FROM media WHERE id = ?"
  );
  const row = stmt.get(id) as MediaRow | undefined;
  if (!row) return undefined;
  return { data: row.data, content_type: row.content_type, filename: row.filename };
}

export function deleteMedia(id: number): boolean {
  const stmt = db.prepare("DELETE FROM media WHERE id = ?");
  const result = stmt.run(id);
  return result.changes > 0;
}

/**
 * Extract media ID from a URL like /api/media/123
 * Returns null for external URLs or non-media URLs
 */
export function parseMediaId(url: string): number | null {
  const match = url.match(/^\/api\/media\/(\d+)$/);
  return match ? parseInt(match[1]) : null;
}
