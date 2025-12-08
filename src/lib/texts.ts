import db, { Text, TextCard, Card } from "./db";

export interface CreateTextInput {
  title?: string;
  arabic: string;
  translation: string;
  category?: string;
}

export interface UpdateTextInput {
  title?: string;
  arabic?: string;
  translation?: string;
  category?: string;
}

export interface TextWithCards extends Text {
  cards: Card[];
}

// Get all texts
export function getAllTexts(): Text[] {
  const stmt = db.prepare(`
    SELECT * FROM texts
    ORDER BY created_at DESC
  `);
  return stmt.all() as Text[];
}

// Get texts by category
export function getTextsByCategory(category: string): Text[] {
  const stmt = db.prepare(`
    SELECT * FROM texts
    WHERE category = ?
    ORDER BY created_at DESC
  `);
  return stmt.all(category) as Text[];
}

// Get a single text by ID
export function getTextById(id: number): Text | undefined {
  const stmt = db.prepare("SELECT * FROM texts WHERE id = ?");
  return stmt.get(id) as Text | undefined;
}

// Get a text with its linked cards
export function getTextWithCards(id: number): TextWithCards | undefined {
  const text = getTextById(id);
  if (!text) return undefined;

  const stmt = db.prepare(`
    SELECT c.* FROM cards c
    INNER JOIN text_cards tc ON c.id = tc.card_id
    WHERE tc.text_id = ?
    ORDER BY c.front
  `);
  const cards = stmt.all(id) as Card[];

  return { ...text, cards };
}

// Create a new text
export function createText(input: CreateTextInput): Text {
  const stmt = db.prepare(`
    INSERT INTO texts (title, arabic, translation, category)
    VALUES (?, ?, ?, ?)
  `);
  const result = stmt.run(
    input.title || null,
    input.arabic,
    input.translation,
    input.category || null
  );
  return getTextById(result.lastInsertRowid as number) as Text;
}

// Create multiple texts at once
export function createTexts(texts: CreateTextInput[]): Text[] {
  const stmt = db.prepare(`
    INSERT INTO texts (title, arabic, translation, category)
    VALUES (?, ?, ?, ?)
  `);

  const insertMany = db.transaction((items: CreateTextInput[]) => {
    const ids: number[] = [];
    for (const text of items) {
      const result = stmt.run(
        text.title || null,
        text.arabic,
        text.translation,
        text.category || null
      );
      ids.push(result.lastInsertRowid as number);
    }
    return ids;
  });

  const ids = insertMany(texts);
  return ids.map((id) => getTextById(id) as Text);
}

// Update a text
export function updateText(id: number, input: UpdateTextInput): Text | undefined {
  const text = getTextById(id);
  if (!text) return undefined;

  const stmt = db.prepare(`
    UPDATE texts
    SET title = ?, arabic = ?, translation = ?, category = ?, updated_at = datetime('now')
    WHERE id = ?
  `);
  stmt.run(
    input.title ?? text.title,
    input.arabic ?? text.arabic,
    input.translation ?? text.translation,
    input.category ?? text.category,
    id
  );
  return getTextById(id);
}

// Delete a text
export function deleteText(id: number): boolean {
  const stmt = db.prepare("DELETE FROM texts WHERE id = ?");
  const result = stmt.run(id);
  return result.changes > 0;
}

// Link a card to a text
export function linkCardToText(textId: number, cardId: number): TextCard | undefined {
  try {
    const stmt = db.prepare(`
      INSERT INTO text_cards (text_id, card_id)
      VALUES (?, ?)
    `);
    const result = stmt.run(textId, cardId);
    return getTextCardById(result.lastInsertRowid as number);
  } catch {
    // Unique constraint violation - link already exists
    return undefined;
  }
}

// Link multiple cards to a text
export function linkCardsToText(textId: number, cardIds: number[]): TextCard[] {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO text_cards (text_id, card_id)
    VALUES (?, ?)
  `);

  const insertMany = db.transaction((ids: number[]) => {
    for (const cardId of ids) {
      stmt.run(textId, cardId);
    }
  });

  insertMany(cardIds);
  return getTextCardsByTextId(textId);
}

// Unlink a card from a text
export function unlinkCardFromText(textId: number, cardId: number): boolean {
  const stmt = db.prepare(`
    DELETE FROM text_cards
    WHERE text_id = ? AND card_id = ?
  `);
  const result = stmt.run(textId, cardId);
  return result.changes > 0;
}

// Get all text_cards for a text
export function getTextCardsByTextId(textId: number): TextCard[] {
  const stmt = db.prepare(`
    SELECT * FROM text_cards
    WHERE text_id = ?
  `);
  return stmt.all(textId) as TextCard[];
}

// Get a single text_card by ID
export function getTextCardById(id: number): TextCard | undefined {
  const stmt = db.prepare("SELECT * FROM text_cards WHERE id = ?");
  return stmt.get(id) as TextCard | undefined;
}

// Get all categories
export function getTextCategories(): string[] {
  const stmt = db.prepare(`
    SELECT DISTINCT category FROM texts
    WHERE category IS NOT NULL
    ORDER BY category
  `);
  const results = stmt.all() as { category: string }[];
  return results.map((r) => r.category);
}

// Find cards that match words in a text (helper for auto-linking)
export function findMatchingCards(textId: number): Card[] {
  const text = getTextById(textId);
  if (!text) return [];

  // Get all cards and check if their front (Arabic) appears in the text
  const stmt = db.prepare(`
    SELECT * FROM cards
    WHERE ? LIKE '%' || front || '%'
  `);
  return stmt.all(text.arabic) as Card[];
}
