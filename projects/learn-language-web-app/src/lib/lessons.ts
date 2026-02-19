import db, { Lesson, LessonCard, Card } from "./db";

export interface CreateLessonInput {
  title: string;
  lesson_date: string;
  transcript?: string;
}

export interface UpdateLessonInput {
  title?: string;
  lesson_date?: string;
  transcript?: string;
  summary?: string | null;
  grammar_notes?: string | null;
  notes?: string | null;
  session_id?: string | null;
}

export interface LessonWithCards extends Lesson {
  cards: (Card & { deck_name: string })[];
}

export function getAllLessons(): Lesson[] {
  return db.prepare(`
    SELECT * FROM lessons ORDER BY lesson_date DESC, created_at DESC
  `).all() as Lesson[];
}

export function getLessonById(id: number): Lesson | undefined {
  return db.prepare("SELECT * FROM lessons WHERE id = ?").get(id) as Lesson | undefined;
}

export function getLessonWithCards(id: number): LessonWithCards | undefined {
  const lesson = getLessonById(id);
  if (!lesson) return undefined;

  const cards = db.prepare(`
    SELECT c.*, d.name as deck_name
    FROM lesson_cards lc
    JOIN cards c ON c.id = lc.card_id
    JOIN decks d ON d.id = c.deck_id
    WHERE lc.lesson_id = ?
    ORDER BY lc.created_at DESC
  `).all(id) as (Card & { deck_name: string })[];

  return { ...lesson, cards };
}

export function createLesson(input: CreateLessonInput): Lesson {
  const stmt = db.prepare(`
    INSERT INTO lessons (title, lesson_date, transcript)
    VALUES (?, ?, ?)
  `);
  const result = stmt.run(input.title, input.lesson_date, input.transcript || "");
  return getLessonById(result.lastInsertRowid as number) as Lesson;
}

export function updateLesson(id: number, input: UpdateLessonInput): Lesson | undefined {
  const lesson = getLessonById(id);
  if (!lesson) return undefined;

  const updates: string[] = [];
  const values: (string | null)[] = [];

  if (input.title !== undefined) {
    updates.push("title = ?");
    values.push(input.title);
  }
  if (input.lesson_date !== undefined) {
    updates.push("lesson_date = ?");
    values.push(input.lesson_date);
  }
  if (input.transcript !== undefined) {
    updates.push("transcript = ?");
    values.push(input.transcript);
  }
  if (input.summary !== undefined) {
    updates.push("summary = ?");
    values.push(input.summary);
  }
  if (input.grammar_notes !== undefined) {
    updates.push("grammar_notes = ?");
    values.push(input.grammar_notes);
  }
  if (input.notes !== undefined) {
    updates.push("notes = ?");
    values.push(input.notes);
  }
  if (input.session_id !== undefined) {
    updates.push("session_id = ?");
    values.push(input.session_id);
  }

  if (updates.length === 0) return lesson;

  updates.push("updated_at = datetime('now')");
  values.push(String(id));

  db.prepare(`UPDATE lessons SET ${updates.join(", ")} WHERE id = ?`).run(...values);
  return getLessonById(id);
}

export function deleteLesson(id: number): boolean {
  const result = db.prepare("DELETE FROM lessons WHERE id = ?").run(id);
  return result.changes > 0;
}

export function linkCardsToLesson(lessonId: number, cardIds: number[]): void {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO lesson_cards (lesson_id, card_id) VALUES (?, ?)
  `);
  const insertMany = db.transaction((ids: number[]) => {
    for (const cardId of ids) {
      stmt.run(lessonId, cardId);
    }
  });
  insertMany(cardIds);
}

export function getLessonCardIds(lessonId: number): number[] {
  const rows = db.prepare(
    "SELECT card_id FROM lesson_cards WHERE lesson_id = ?"
  ).all(lessonId) as LessonCard[];
  return rows.map((r) => r.card_id);
}
