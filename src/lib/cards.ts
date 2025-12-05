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
    SET front = ?, back = ?, notes = ?, audio_url = ?, image_url = ?, updated_at = datetime('now')
    WHERE id = ?
  `);
  stmt.run(
    input.front ?? card.front,
    input.back ?? card.back,
    input.notes ?? card.notes,
    input.audio_url ?? card.audio_url,
    input.image_url ?? card.image_url,
    id
  );
  return getCardById(id);
}

export function deleteCard(id: number): boolean {
  const stmt = db.prepare("DELETE FROM cards WHERE id = ?");
  const result = stmt.run(id);
  return result.changes > 0;
}

export function getDueCards(deckId?: number, limit: number = 20): Card[] {
  let query = `
    SELECT * FROM cards
    WHERE due <= datetime('now')
  `;
  const params: (number | string)[] = [];

  if (deckId) {
    query += " AND deck_id = ?";
    params.push(deckId);
  }

  query += " ORDER BY due ASC LIMIT ?";
  params.push(limit);

  const stmt = db.prepare(query);
  return stmt.all(...params) as Card[];
}
