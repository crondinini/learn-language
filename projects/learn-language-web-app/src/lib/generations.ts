import db, { Generation } from "./db";

export interface CreateGenerationInput {
  session_id: string;
  input_words: string[];
  result?: string;
  cost?: number;
  duration?: number;
}

export function createGeneration(input: CreateGenerationInput): Generation {
  const stmt = db.prepare(`
    INSERT INTO generations (session_id, input_words, result, cost, duration)
    VALUES (?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    input.session_id,
    JSON.stringify(input.input_words),
    input.result ?? null,
    input.cost ?? null,
    input.duration ?? null
  );
  return db.prepare("SELECT * FROM generations WHERE id = ?").get(result.lastInsertRowid) as Generation;
}

export function getGenerations(limit = 20): Generation[] {
  const stmt = db.prepare(`
    SELECT * FROM generations
    ORDER BY created_at DESC
    LIMIT ?
  `);
  return stmt.all(limit) as Generation[];
}
