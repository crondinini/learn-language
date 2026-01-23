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
      type TEXT NOT NULL DEFAULT 'recording',  -- Type of homework (recording, written)
      status TEXT NOT NULL DEFAULT 'pending',  -- pending, completed
      recording_url TEXT,                       -- URL to recorded audio (for recording type)
      transcription TEXT,                       -- Speech-to-text transcription of recording
      written_text TEXT,                        -- Text content (for written type)
      image_url TEXT,                           -- URL to uploaded image (for written type)
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

    -- OAuth access tokens table: persist access tokens across restarts
    CREATE TABLE IF NOT EXISTS oauth_tokens (
      token TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      expires_at INTEGER NOT NULL,  -- Unix timestamp in milliseconds
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_oauth_tokens_expires_at ON oauth_tokens(expires_at);

    -- OAuth refresh tokens table: long-lived tokens for getting new access tokens
    CREATE TABLE IF NOT EXISTS oauth_refresh_tokens (
      token TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      expires_at INTEGER NOT NULL,  -- Unix timestamp in milliseconds
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_oauth_refresh_tokens_expires_at ON oauth_refresh_tokens(expires_at);

    -- Verbs table: master list of verbs with root and meaning
    CREATE TABLE IF NOT EXISTS verbs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      root TEXT NOT NULL,                    -- 'ك ت ب' (the 3-letter root)
      root_transliteration TEXT,             -- 'k-t-b'
      form INTEGER DEFAULT 1,                -- Verb form I-X
      meaning TEXT NOT NULL,                 -- 'to write'
      past_3ms TEXT NOT NULL,                -- كَتَبَ (he wrote) - dictionary form
      present_3ms TEXT NOT NULL,             -- يَكْتُبُ (he writes)
      masdar TEXT,                           -- كِتَابَة (verbal noun)
      active_participle TEXT,                -- كَاتِب
      passive_participle TEXT,               -- مَكْتُوب
      notes TEXT,
      audio_url TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Individual conjugation forms (one row per verb × tense × person)
    CREATE TABLE IF NOT EXISTS verb_conjugations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      verb_id INTEGER NOT NULL,
      tense TEXT NOT NULL,                   -- 'past', 'present', 'subjunctive', 'jussive', 'imperative'
      person TEXT NOT NULL,                  -- 'ana', 'nahnu', 'anta', 'anti', 'antum', 'huwa', 'hiya', 'hum', 'hunna'
      pronoun_arabic TEXT NOT NULL,          -- أنا
      conjugated_form TEXT NOT NULL,         -- كَتَبْتُ
      audio_url TEXT,

      FOREIGN KEY (verb_id) REFERENCES verbs(id) ON DELETE CASCADE,
      UNIQUE(verb_id, tense, person)
    );

    -- FSRS progress tracking per conjugation
    CREATE TABLE IF NOT EXISTS conjugation_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      verb_conjugation_id INTEGER NOT NULL UNIQUE,

      stability REAL DEFAULT 0,
      difficulty REAL DEFAULT 0,
      elapsed_days INTEGER DEFAULT 0,
      scheduled_days INTEGER DEFAULT 0,
      reps INTEGER DEFAULT 0,
      lapses INTEGER DEFAULT 0,
      state INTEGER DEFAULT 0,               -- 0=New, 1=Learning, 2=Review, 3=Relearning
      due TEXT DEFAULT (datetime('now')),
      last_review TEXT,

      FOREIGN KEY (verb_conjugation_id) REFERENCES verb_conjugations(id) ON DELETE CASCADE
    );

    -- Review history for conjugations
    CREATE TABLE IF NOT EXISTS conjugation_reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conjugation_progress_id INTEGER NOT NULL,
      rating INTEGER NOT NULL,               -- 1=Again, 2=Hard, 3=Good, 4=Easy
      review_time TEXT DEFAULT (datetime('now')),
      elapsed_days INTEGER,
      scheduled_days INTEGER,
      state INTEGER,

      FOREIGN KEY (conjugation_progress_id) REFERENCES conjugation_progress(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_verbs_root ON verbs(root);
    CREATE INDEX IF NOT EXISTS idx_verb_conjugations_verb_id ON verb_conjugations(verb_id);
    CREATE INDEX IF NOT EXISTS idx_verb_conjugations_tense ON verb_conjugations(tense);
    CREATE INDEX IF NOT EXISTS idx_conjugation_progress_due ON conjugation_progress(due);
    CREATE INDEX IF NOT EXISTS idx_conjugation_progress_state ON conjugation_progress(state);

    -- Resources table: useful websites and links
    CREATE TABLE IF NOT EXISTS resources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
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

  // Migration: Add written_text, image_url, transcription, and audio_url columns to homework if they don't exist
  const homeworkColumns = _db.prepare("PRAGMA table_info(homework)").all() as { name: string }[];
  if (homeworkColumns.length > 0) {
    if (!homeworkColumns.some((col) => col.name === "written_text")) {
      _db.exec("ALTER TABLE homework ADD COLUMN written_text TEXT");
    }
    if (!homeworkColumns.some((col) => col.name === "image_url")) {
      _db.exec("ALTER TABLE homework ADD COLUMN image_url TEXT");
    }
    if (!homeworkColumns.some((col) => col.name === "transcription")) {
      _db.exec("ALTER TABLE homework ADD COLUMN transcription TEXT");
    }
    if (!homeworkColumns.some((col) => col.name === "audio_url")) {
      _db.exec("ALTER TABLE homework ADD COLUMN audio_url TEXT");
    }
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
  type: 'recording' | 'written' | 'listening';
  status: 'pending' | 'completed';
  recording_url: string | null;
  transcription: string | null;
  written_text: string | null;
  image_url: string | null;
  audio_url: string | null;  // For listening type - uploaded audio file
  created_at: string;
  completed_at: string | null;
}

// Homework types enum
export const HomeworkType = {
  Recording: 'recording',
  Written: 'written',
  Listening: 'listening',
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

// OAuth token interface
export interface OAuthToken {
  token: string;
  client_id: string;
  expires_at: number;  // Unix timestamp in milliseconds
  created_at: string;
}

// Verb interface
export interface Verb {
  id: number;
  root: string;
  root_transliteration: string | null;
  form: number;
  meaning: string;
  past_3ms: string;
  present_3ms: string;
  masdar: string | null;
  active_participle: string | null;
  passive_participle: string | null;
  notes: string | null;
  audio_url: string | null;
  created_at: string;
  updated_at: string;
}

// Verb conjugation interface
export interface VerbConjugation {
  id: number;
  verb_id: number;
  tense: string;
  person: string;
  pronoun_arabic: string;
  conjugated_form: string;
  audio_url: string | null;
}

// Conjugation progress (FSRS state) interface
export interface ConjugationProgress {
  id: number;
  verb_conjugation_id: number;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: number;
  due: string;
  last_review: string | null;
}

// Conjugation review history interface
export interface ConjugationReview {
  id: number;
  conjugation_progress_id: number;
  rating: number;
  review_time: string;
  elapsed_days: number;
  scheduled_days: number;
  state: number;
}

// Person codes for conjugation (simplified - no dual forms)
export const ConjugationPerson = {
  Ana: 'ana',           // أنا - I
  Nahnu: 'nahnu',       // نحن - We
  Anta: 'anta',         // أنتَ - You (m.s.)
  Anti: 'anti',         // أنتِ - You (f.s.)
  Antum: 'antum',       // أنتم - You (m.pl.)
  Huwa: 'huwa',         // هو - He
  Hiya: 'hiya',         // هي - She
  Hum: 'hum',           // هم - They (m.pl.)
  Hunna: 'hunna',       // هن - They (f.pl.)
} as const;

// Tense codes
export const ConjugationTense = {
  Past: 'past',
  Present: 'present',
  Subjunctive: 'subjunctive',
  Jussive: 'jussive',
  Imperative: 'imperative',
} as const;

// Re-export PersonInfo from constants for backwards compatibility
export { PersonInfo } from './constants';

// Resource interface for useful websites
export interface Resource {
  id: number;
  url: string;
  title: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}
