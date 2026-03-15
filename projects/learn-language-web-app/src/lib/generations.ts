import db, { Generation } from "./db";

export interface CreateGenerationInput {
  session_id: string;
  input_words: string[];
  result?: string;
  cost?: number;
  duration?: number;
}

export function createGeneration(input: CreateGenerationInput, userId?: number): Generation {
  const stmt = db.prepare(`
    INSERT INTO generations (session_id, input_words, result, cost, duration, user_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    input.session_id,
    JSON.stringify(input.input_words),
    input.result ?? null,
    input.cost ?? null,
    input.duration ?? null,
    userId ?? null
  );
  return db.prepare("SELECT * FROM generations WHERE id = ?").get(result.lastInsertRowid) as Generation;
}

export function getGenerations(userId: number, limit = 20): Generation[] {
  const stmt = db.prepare(`
    SELECT * FROM generations
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `);
  return stmt.all(userId, limit) as Generation[];
}
