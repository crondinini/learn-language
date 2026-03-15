import db, { Card } from "./db";

export interface CreateCardInput {
  deck_id: number;
  front: string;
  back: string;
  notes?: string;
  audio_url?: string;
  image_url?: string;
}

export interface UpdateCardInput {
  front?: string;
  back?: string;
  notes?: string;
  audio_url?: string;
  image_url?: string;
  deck_id?: number;
}

export function getCardsByDeckId(deckId: number): Card[] {
  const stmt = db.prepare(`
    SELECT * FROM cards
    WHERE deck_id = ?
    ORDER BY created_at DESC
  `);
  return stmt.all(deckId) as Card[];
}

export function getCardById(id: number): Card | undefined {
  const stmt = db.prepare("SELECT * FROM cards WHERE id = ?");
  return stmt.get(id) as Card | undefined;
}

export function createCard(input: CreateCardInput): Card {
  const stmt = db.prepare(`
    INSERT INTO cards (deck_id, front, back, notes, audio_url, image_url)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    input.deck_id,
    input.front,
    input.back,
    input.notes || null,
    input.audio_url || null,
    input.image_url || null
  );
  return getCardById(result.lastInsertRowid as number) as Card;
}

export function createCards(cards: CreateCardInput[]): Card[] {
  const stmt = db.prepare(`
    INSERT INTO cards (deck_id, front, back, notes, audio_url, image_url)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((items: CreateCardInput[]) => {
    const ids: number[] = [];
    for (const card of items) {
      const result = stmt.run(
        card.deck_id,
        card.front,
        card.back,
        card.notes || null,
        card.audio_url || null,
        card.image_url || null
      );
      ids.push(result.lastInsertRowid as number);
    }
    return ids;
  });

  const ids = insertMany(cards);
  return ids.map((id) => getCardById(id) as Card);
}

export function updateCard(id: number, input: UpdateCardInput): Card | undefined {
  const card = getCardById(id);
  if (!card) return undefined;

  const stmt = db.prepare(`
    UPDATE cards
    SET front = ?, back = ?, notes = ?, audio_url = ?, image_url = ?, deck_id = ?, updated_at = datetime('now')
    WHERE id = ?
  `);
  stmt.run(
    input.front ?? card.front,
    input.back ?? card.back,
    input.notes ?? card.notes,
    input.audio_url ?? card.audio_url,
    input.image_url ?? card.image_url,
    input.deck_id ?? card.deck_id,
    id
  );
  return getCardById(id);
}

export function deleteCard(id: number): boolean {
  const stmt = db.prepare("DELETE FROM cards WHERE id = ?");
  const result = stmt.run(id);
  return result.changes > 0;
}

export function getLessonCards(lessonId: number): Card[] {
  const stmt = db.prepare(`
    SELECT c.* FROM cards c
    JOIN lesson_cards lc ON lc.card_id = c.id
    WHERE lc.lesson_id = ?
    ORDER BY RANDOM()
  `);
  return stmt.all(lessonId) as Card[];
}

const NEW_CARDS_PER_SESSION = 10;

export function getDueCards(deckId?: number, limit: number = 20): Card[] {
  const deckFilter = deckId ? " AND deck_id = ?" : "";
  const deckParams = deckId ? [deckId] : [];

  // 1. Review/Relearning cards that are due (highest priority)
  const reviewCards = db.prepare(`
    SELECT * FROM cards
    WHERE due <= datetime('now') AND state IN (2, 3)${deckFilter}
    ORDER BY due ASC
    LIMIT ?
  `).all(...deckParams, limit) as Card[];

  const remaining = limit - reviewCards.length;
  if (remaining <= 0) return reviewCards;

  // 2. Learning cards that are due
  const learningCards = db.prepare(`
    SELECT * FROM cards
    WHERE due <= datetime('now') AND state = 1${deckFilter}
    ORDER BY due ASC
    LIMIT ?
  `).all(...deckParams, remaining) as Card[];

  const remaining2 = Math.min(remaining - learningCards.length, NEW_CARDS_PER_SESSION);
  if (remaining2 <= 0) return [...reviewCards, ...learningCards];

  // 3. New cards (capped)
  const newCards = db.prepare(`
    SELECT * FROM cards
    WHERE due <= datetime('now') AND state = 0${deckFilter}
    ORDER BY RANDOM()
    LIMIT ?
  `).all(...deckParams, remaining2) as Card[];

  return [...reviewCards, ...learningCards, ...newCards];
}

export function getStrugglingCards(deckId?: number, limit: number = 50): Card[] {
  const deckFilter = deckId ? " AND deck_id = ?" : "";
  const deckParams = deckId ? [deckId] : [];

  // Cards with high difficulty (>7) or lapses, that have been reviewed at least once
  return db.prepare(`
    SELECT * FROM cards
    WHERE reps > 0 AND (difficulty > 7 OR lapses > 0)${deckFilter}
    ORDER BY difficulty DESC, lapses DESC
    LIMIT ?
  `).all(...deckParams, limit) as Card[];
}

export function getNewCards(deckId?: number, limit: number = 20): Card[] {
  const deckFilter = deckId ? " AND deck_id = ?" : "";
  const deckParams = deckId ? [deckId] : [];

  return db.prepare(`
    SELECT * FROM cards
    WHERE state = 0${deckFilter}
    ORDER BY RANDOM()
    LIMIT ?
  `).all(...deckParams, limit) as Card[];
}
