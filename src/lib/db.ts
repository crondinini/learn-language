import Database from "better-sqlite3";
import path from "path";

const dbPath = path.join(process.cwd(), "learn-language.db");

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Initialize schema
db.exec(`
  -- Decks table: collections of cards
  CREATE TABLE IF NOT EXISTS decks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  -- Cards table: vocabulary items
  CREATE TABLE IF NOT EXISTS cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    deck_id INTEGER NOT NULL,
    front TEXT NOT NULL,           -- Arabic word/phrase
    back TEXT NOT NULL,            -- English translation
    notes TEXT,                    -- Optional notes, examples, etc.
    audio_url TEXT,                -- Optional audio pronunciation
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),

    -- FSRS scheduling fields
    stability REAL DEFAULT 0,      -- Memory stability (days)
    difficulty REAL DEFAULT 0,     -- Card difficulty (0-10)
    elapsed_days INTEGER DEFAULT 0,
    scheduled_days INTEGER DEFAULT 0,
    reps INTEGER DEFAULT 0,        -- Number of reviews
    lapses INTEGER DEFAULT 0,      -- Number of times forgotten
    state INTEGER DEFAULT 0,       -- 0=New, 1=Learning, 2=Review, 3=Relearning
    due TEXT DEFAULT (datetime('now')),
    last_review TEXT,

    FOREIGN KEY (deck_id) REFERENCES decks(id) ON DELETE CASCADE
  );

  -- Review history for analytics and optimization
  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    card_id INTEGER NOT NULL,
    rating INTEGER NOT NULL,       -- 1=Again, 2=Hard, 3=Good, 4=Easy
    review_time TEXT DEFAULT (datetime('now')),
    elapsed_days INTEGER,
    scheduled_days INTEGER,
    state INTEGER,

    FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
  );

  -- Indexes for performance
  CREATE INDEX IF NOT EXISTS idx_cards_deck_id ON cards(deck_id);
  CREATE INDEX IF NOT EXISTS idx_cards_due ON cards(due);
  CREATE INDEX IF NOT EXISTS idx_cards_state ON cards(state);
  CREATE INDEX IF NOT EXISTS idx_reviews_card_id ON reviews(card_id);
`);

export default db;

// Types
export interface Deck {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Card {
  id: number;
  deck_id: number;
  front: string;
  back: string;
  notes: string | null;
  audio_url: string | null;
  created_at: string;
  updated_at: string;
  // FSRS fields
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: number; // 0=New, 1=Learning, 2=Review, 3=Relearning
  due: string;
  last_review: string | null;
}

export interface Review {
  id: number;
  card_id: number;
  rating: number;
  review_time: string;
  elapsed_days: number;
  scheduled_days: number;
  state: number;
}

// Card states enum
export const CardState = {
  New: 0,
  Learning: 1,
  Review: 2,
  Relearning: 3,
} as const;

// Rating enum
export const Rating = {
  Again: 1,
  Hard: 2,
  Good: 3,
  Easy: 4,
} as const;
