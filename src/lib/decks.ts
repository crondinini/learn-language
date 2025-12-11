import db, { Deck } from "./db";

export interface CreateDeckInput {
  name: string;
  description?: string;
}

export interface UpdateDeckInput {
  name?: string;
  description?: string;
}

export interface DeckWithStats extends Deck {
  total_cards: number;
  due_cards: number;
  new_cards: number;
  learning_cards: number;
  learned_cards: number;
}

export function getAllDecks(): DeckWithStats[] {
  const stmt = db.prepare(`
    SELECT
      d.*,
      COUNT(c.id) as total_cards,
      SUM(CASE WHEN c.due <= datetime('now') THEN 1 ELSE 0 END) as due_cards,
      SUM(CASE WHEN c.state = 0 THEN 1 ELSE 0 END) as new_cards,
      SUM(CASE WHEN c.state IN (0, 1) THEN 1 ELSE 0 END) as learning_cards,
      SUM(CASE WHEN c.state IN (2, 3) THEN 1 ELSE 0 END) as learned_cards
    FROM decks d
    LEFT JOIN cards c ON c.deck_id = d.id
    GROUP BY d.id
    ORDER BY d.updated_at DESC
  `);
  return stmt.all() as DeckWithStats[];
}

export function getDeckById(id: number): DeckWithStats | undefined {
  const stmt = db.prepare(`
    SELECT
      d.*,
      COUNT(c.id) as total_cards,
      SUM(CASE WHEN c.due <= datetime('now') THEN 1 ELSE 0 END) as due_cards,
      SUM(CASE WHEN c.state = 0 THEN 1 ELSE 0 END) as new_cards,
      SUM(CASE WHEN c.state IN (0, 1) THEN 1 ELSE 0 END) as learning_cards,
      SUM(CASE WHEN c.state IN (2, 3) THEN 1 ELSE 0 END) as learned_cards
    FROM decks d
    LEFT JOIN cards c ON c.deck_id = d.id
    WHERE d.id = ?
    GROUP BY d.id
  `);
  return stmt.get(id) as DeckWithStats | undefined;
}

export function createDeck(input: CreateDeckInput): Deck {
  const stmt = db.prepare(`
    INSERT INTO decks (name, description)
    VALUES (?, ?)
  `);
  const result = stmt.run(input.name, input.description || null);
  return getDeckById(result.lastInsertRowid as number) as Deck;
}

export function updateDeck(id: number, input: UpdateDeckInput): Deck | undefined {
  const deck = getDeckById(id);
  if (!deck) return undefined;

  const stmt = db.prepare(`
    UPDATE decks
    SET name = ?, description = ?, updated_at = datetime('now')
    WHERE id = ?
  `);
  stmt.run(
    input.name ?? deck.name,
    input.description ?? deck.description,
    id
  );
  return getDeckById(id);
}

export function deleteDeck(id: number): boolean {
  const stmt = db.prepare("DELETE FROM decks WHERE id = ?");
  const result = stmt.run(id);
  return result.changes > 0;
}
