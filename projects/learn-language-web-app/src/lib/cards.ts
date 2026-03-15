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

/** Verify a card belongs to a user (via its deck) */
export function verifyCardOwnership(cardId: number, userId: number): Card | undefined {
  const stmt = db.prepare(`
    SELECT c.* FROM cards c
    JOIN decks d ON c.deck_id = d.id
    WHERE c.id = ? AND d.user_id = ?
  `);
  return stmt.get(cardId, userId) as Card | undefined;
}

/** Verify a deck belongs to a user */
export function verifyDeckOwnership(deckId: number, userId: number): boolean {
  const result = db.prepare("SELECT 1 FROM decks WHERE id = ? AND user_id = ?").get(deckId, userId);
  return !!result;
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

export function getDueCards(userId: number, deckId?: number, limit: number = 20, language?: string): Card[] {
  const deckFilter = deckId ? " AND cards.deck_id = ?" : "";
  const langFilter = language ? " AND decks.language = ?" : "";
  const deckParams = deckId ? [deckId] : [];
  const langParams = language ? [language] : [];

  // 1. Review/Relearning cards that are due (highest priority)
  const reviewCards = db.prepare(`
    SELECT cards.* FROM cards
    JOIN decks ON cards.deck_id = decks.id
    WHERE cards.due <= datetime('now') AND cards.state IN (2, 3) AND decks.user_id = ?${deckFilter}${langFilter}
    ORDER BY cards.due ASC
    LIMIT ?
  `).all(userId, ...deckParams, ...langParams, limit) as Card[];

  const remaining = limit - reviewCards.length;
  if (remaining <= 0) return reviewCards;

  // 2. Learning cards that are due
  const learningCards = db.prepare(`
    SELECT cards.* FROM cards
    JOIN decks ON cards.deck_id = decks.id
    WHERE cards.due <= datetime('now') AND cards.state = 1 AND decks.user_id = ?${deckFilter}${langFilter}
    ORDER BY cards.due ASC
    LIMIT ?
  `).all(userId, ...deckParams, ...langParams, remaining) as Card[];

  const remaining2 = Math.min(remaining - learningCards.length, NEW_CARDS_PER_SESSION);
  if (remaining2 <= 0) return [...reviewCards, ...learningCards];

  // 3. New cards (capped)
  const newCards = db.prepare(`
    SELECT cards.* FROM cards
    JOIN decks ON cards.deck_id = decks.id
    WHERE cards.due <= datetime('now') AND cards.state = 0 AND decks.user_id = ?${deckFilter}${langFilter}
    ORDER BY RANDOM()
    LIMIT ?
  `).all(userId, ...deckParams, ...langParams, remaining2) as Card[];

  return [...reviewCards, ...learningCards, ...newCards];
}

export function getStrugglingCards(userId: number, deckId?: number, limit: number = 50, language?: string): Card[] {
  const deckFilter = deckId ? " AND cards.deck_id = ?" : "";
  const langFilter = language ? " AND decks.language = ?" : "";
  const deckParams = deckId ? [deckId] : [];
  const langParams = language ? [language] : [];

  return db.prepare(`
    SELECT cards.* FROM cards
    JOIN decks ON cards.deck_id = decks.id
    WHERE cards.reps > 0 AND (cards.difficulty > 7 OR cards.lapses > 0) AND decks.user_id = ?${deckFilter}${langFilter}
    ORDER BY cards.difficulty DESC, cards.lapses DESC
    LIMIT ?
  `).all(userId, ...deckParams, ...langParams, limit) as Card[];
}

export function getNewCards(userId: number, deckId?: number, limit: number = 20, language?: string): Card[] {
  const deckFilter = deckId ? " AND cards.deck_id = ?" : "";
  const langFilter = language ? " AND decks.language = ?" : "";
  const deckParams = deckId ? [deckId] : [];
  const langParams = language ? [language] : [];

  return db.prepare(`
    SELECT cards.* FROM cards
    JOIN decks ON cards.deck_id = decks.id
    WHERE cards.state = 0 AND decks.user_id = ?${deckFilter}${langFilter}
    ORDER BY RANDOM()
    LIMIT ?
  `).all(userId, ...deckParams, ...langParams, limit) as Card[];
}
