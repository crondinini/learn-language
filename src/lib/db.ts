import Database from "better-sqlite3";
import path from "path";

let _db: Database.Database | null = null;

// Skip DB initialization during Next.js build
const isBuildTime = process.env.NEXT_PHASE === "phase-production-build";

function getDb(): Database.Database {
  if (isBuildTime) {
    // Return a dummy proxy during build to prevent errors
    return new Proxy({} as Database.Database, {
      get() {
        return () => [];
      },
    });
  }

  if (_db) return _db;

  const dbPath = path.join(process.cwd(), "data", "learn-language.db");
  _db = new Database(dbPath);
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");

  // Initialize schema
  _db.exec(`
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
      image_url TEXT,                -- Optional image for visual learning
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

    -- Homework table: assignments for the class
    CREATE TABLE IF NOT EXISTS homework (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      description TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'recording',  -- Type of homework (recording, etc.)
      status TEXT NOT NULL DEFAULT 'pending',  -- pending, completed
      recording_url TEXT,                       -- URL to recorded audio (for recording type)
      created_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_homework_status ON homework(status);
    CREATE INDEX IF NOT EXISTS idx_homework_created_at ON homework(created_at);

    -- Reading texts table: paragraphs and sentences for reading practice
    CREATE TABLE IF NOT EXISTS texts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      arabic TEXT NOT NULL,
      translation TEXT NOT NULL,
      category TEXT,
      recording_url TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Linking table between texts and cards (vocabulary words in texts)
    CREATE TABLE IF NOT EXISTS text_cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      text_id INTEGER NOT NULL,
      card_id INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (text_id) REFERENCES texts(id) ON DELETE CASCADE,
      FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE,
      UNIQUE(text_id, card_id)
    );

    CREATE INDEX IF NOT EXISTS idx_texts_category ON texts(category);
    CREATE INDEX IF NOT EXISTS idx_text_cards_text_id ON text_cards(text_id);
    CREATE INDEX IF NOT EXISTS idx_text_cards_card_id ON text_cards(card_id);
  `);

  // Migration: Add image_url column if it doesn't exist (for existing databases)
  const cardColumns = _db.prepare("PRAGMA table_info(cards)").all() as { name: string }[];
  if (!cardColumns.some((col) => col.name === "image_url")) {
    _db.exec("ALTER TABLE cards ADD COLUMN image_url TEXT");
  }

  // Migration: Add recording_url column to texts if it doesn't exist
  const textColumns = _db.prepare("PRAGMA table_info(texts)").all() as { name: string }[];
  if (textColumns.length > 0 && !textColumns.some((col) => col.name === "recording_url")) {
    _db.exec("ALTER TABLE texts ADD COLUMN recording_url TEXT");
  }

  return _db;
}

export default getDb();

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
  image_url: string | null;
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

// Homework interface
export interface Homework {
  id: number;
  description: string;
  type: 'recording';  // More types can be added later
  status: 'pending' | 'completed';
  recording_url: string | null;
  created_at: string;
  completed_at: string | null;
}

// Homework types enum
export const HomeworkType = {
  Recording: 'recording',
} as const;

// Homework status enum
export const HomeworkStatus = {
  Pending: 'pending',
  Completed: 'completed',
} as const;

// Text interface for reading practice
export interface Text {
  id: number;
  title: string | null;
  arabic: string;
  translation: string;
  category: string | null;
  recording_url: string | null;
  created_at: string;
  updated_at: string;
}

// TextCard linking interface
export interface TextCard {
  id: number;
  text_id: number;
  card_id: number;
  created_at: string;
}
