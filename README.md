# Learn Arabic - Spaced Repetition Language Learning App

A modern, clean alternative to Anki for learning Arabic, built with the FSRS (Free Spaced Repetition Scheduler) algorithm.

## Overview

This app addresses common frustrations with existing flashcard apps:
- **No manual card creation hassle** - Simple, intuitive interface for adding vocabulary
- **Clean, modern UI** - Not the dated interface of traditional SRS apps
- **Arabic-first design** - Proper RTL (right-to-left) text support
- **FSRS algorithm** - State-of-the-art spaced repetition scheduling

## Tech Stack

| Technology | Purpose |
|------------|---------|
| Next.js 16 | React framework with App Router |
| TypeScript | Type safety |
| SQLite (better-sqlite3) | Local database |
| Tailwind CSS | Styling |
| FSRS | Spaced repetition algorithm |

## Requirements

- Node.js 18+
- npm or yarn

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Home page - deck list
│   ├── deck/[id]/page.tsx    # Deck detail - card management
│   ├── globals.css           # Global styles
│   └── api/
│       ├── decks/
│       │   ├── route.ts          # GET/POST /api/decks
│       │   └── [id]/
│       │       ├── route.ts      # GET/PATCH/DELETE /api/decks/:id
│       │       └── cards/
│       │           └── route.ts  # GET/POST /api/decks/:id/cards
│       └── cards/
│           └── [id]/
│               └── route.ts      # GET/PATCH/DELETE /api/cards/:id
├── lib/
│   ├── db.ts                 # SQLite connection + schema
│   ├── decks.ts              # Deck CRUD operations
│   └── cards.ts              # Card CRUD operations
└── components/               # Reusable UI components (future)

scripts/
└── test-db.ts                # Database integration tests
```

## Database Schema

### Decks
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| name | TEXT | Deck name |
| description | TEXT | Optional description |
| created_at | TEXT | Creation timestamp |
| updated_at | TEXT | Last update timestamp |

### Cards
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| deck_id | INTEGER | Foreign key to decks |
| front | TEXT | Arabic word/phrase |
| back | TEXT | English translation |
| notes | TEXT | Optional notes |
| audio_url | TEXT | Optional audio URL |
| stability | REAL | FSRS: Memory stability |
| difficulty | REAL | FSRS: Card difficulty (0-10) |
| elapsed_days | INTEGER | Days since last review |
| scheduled_days | INTEGER | Days until next review |
| reps | INTEGER | Number of reviews |
| lapses | INTEGER | Times forgotten |
| state | INTEGER | 0=New, 1=Learning, 2=Review, 3=Relearning |
| due | TEXT | Next review date |
| last_review | TEXT | Last review timestamp |

### Reviews (for analytics)
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| card_id | INTEGER | Foreign key to cards |
| rating | INTEGER | 1=Again, 2=Hard, 3=Good, 4=Easy |
| review_time | TEXT | When the review occurred |

## Implemented Features

### Backend
- [x] SQLite database with FSRS-ready schema
- [x] Deck CRUD operations with card statistics
- [x] Card CRUD operations (single and bulk create)
- [x] Due card retrieval for review sessions
- [x] RESTful API routes

### Frontend
- [x] Home page with deck list and statistics
- [x] Create/delete deck functionality
- [x] Deck detail page with card list
- [x] Add/edit/delete cards
- [x] RTL Arabic text input and display
- [x] Clean, modern Tailwind CSS styling
- [x] Dark mode support (via system preference)
- [x] Responsive design

## Features To Implement

### Core Learning
- [ ] **FSRS Review System** - The actual spaced repetition study mode
  - Flashcard flip interaction
  - Rating buttons (Again, Hard, Good, Easy)
  - FSRS scheduling algorithm integration
  - Session progress tracking

### Gamification
- [ ] **Streaks** - Daily learning streak tracking
- [ ] **XP System** - Points for completed reviews
- [ ] **Levels** - Progress milestones
- [ ] **Daily Goals** - Configurable card review targets
- [ ] **Statistics Dashboard** - Retention rates, review history graphs

### Content Management
- [ ] **Bulk Import** - Paste vocabulary lists for auto card creation
- [ ] **AI Card Generation** - Generate cards from text/topics
- [ ] **Audio Pronunciation** - Text-to-speech for Arabic words
- [ ] **Example Sentences** - Context for vocabulary

### User Experience
- [ ] **Search/Filter Cards** - Find specific vocabulary
- [ ] **Tags/Categories** - Organize cards within decks
- [ ] **Deck Sharing** - Export/import deck files
- [ ] **Mobile App** - React Native version
- [ ] **User Authentication** - Multi-device sync

## API Reference

### Decks

```
GET    /api/decks          # List all decks (with stats)
POST   /api/decks          # Create deck { name, description? }
GET    /api/decks/:id      # Get deck by ID
PATCH  /api/decks/:id      # Update deck { name?, description? }
DELETE /api/decks/:id      # Delete deck (cascades to cards)
```

### Cards

```
GET    /api/decks/:id/cards    # List cards in deck
POST   /api/decks/:id/cards    # Create card(s) { front, back, notes? }
                               # Supports array for bulk creation
GET    /api/cards/:id          # Get card by ID
PATCH  /api/cards/:id          # Update card { front?, back?, notes? }
DELETE /api/cards/:id          # Delete card
```

## Running Tests

```bash
# Run database integration tests
npx tsx scripts/test-db.ts
```

## FSRS Algorithm

This app uses the Free Spaced Repetition Scheduler (FSRS), a modern alternative to SM-2 (used by Anki).

Key concepts:
- **Stability (S)** - How long a memory will last
- **Difficulty (D)** - Inherent difficulty of the card
- **Retrievability (R)** - Probability of recall at any given time

The scheduling formula:
```
R(t) = (1 + t / (9 * S))^(-1)
```

Where `t` is time since last review and `S` is stability.

Learn more: [FSRS4Anki](https://github.com/open-spaced-repetition/fsrs4anki)

## License

MIT
