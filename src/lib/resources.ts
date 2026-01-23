import db, { Resource } from "./db";

export interface CreateResourceInput {
  url: string;
  title: string;
  description?: string;
}

export interface UpdateResourceInput {
  url?: string;
  title?: string;
  description?: string;
}

export function getAllResources(): Resource[] {
  const stmt = db.prepare(`
    SELECT * FROM resources
    ORDER BY created_at DESC
  `);
  return stmt.all() as Resource[];
}

export function getResourceById(id: number): Resource | undefined {
  const stmt = db.prepare(`
    SELECT * FROM resources
    WHERE id = ?
  `);
  return stmt.get(id) as Resource | undefined;
}

export function createResource(input: CreateResourceInput): Resource {
  const stmt = db.prepare(`
    INSERT INTO resources (url, title, description)
    VALUES (?, ?, ?)
  `);
  const result = stmt.run(input.url, input.title, input.description || null);
  return getResourceById(result.lastInsertRowid as number) as Resource;
}

export function updateResource(id: number, input: UpdateResourceInput): Resource | undefined {
  const resource = getResourceById(id);
  if (!resource) return undefined;

  const stmt = db.prepare(`
    UPDATE resources
    SET url = ?, title = ?, description = ?, updated_at = datetime('now')
    WHERE id = ?
  `);
  stmt.run(
    input.url ?? resource.url,
    input.title ?? resource.title,
    input.description ?? resource.description,
    id
  );
  return getResourceById(id);
}

export function deleteResource(id: number): boolean {
  const stmt = db.prepare("DELETE FROM resources WHERE id = ?");
  const result = stmt.run(id);
  return result.changes > 0;
}
