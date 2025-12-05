# Learn Arabic - Spaced Repetition Language Learning App

A modern, clean alternative to Anki for learning Arabic, built with the FSRS (Free Spaced Repetition Scheduler) algorithm.

## Overview

This app addresses common frustrations with existing flashcard apps:
- **No manual card creation hassle** - Simple, intuitive interface for adding vocabulary
- **Clean, modern UI** - Not the dated interface of traditional SRS apps
- **Arabic-first design** - Proper RTL (right-to-left) text support
- **FSRS algorithm** - State-of-the-art spaced repetition scheduling
- **Native pronunciation** - ElevenLabs AI-generated Arabic audio

## Tech Stack

| Technology | Purpose |
|------------|---------|
| Next.js 16 | React framework with App Router |
| TypeScript | Type safety |
| SQLite (better-sqlite3) | Local database |
| Tailwind CSS | Styling |
| [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs) | Spaced repetition algorithm |
| ElevenLabs | AI text-to-speech for Arabic |
| Web Speech API | Fallback pronunciation |

## Requirements

- Node.js 18+
- npm or yarn
- ElevenLabs API key (optional, for high-quality audio)

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment variables (optional, for ElevenLabs audio)
cp .env.example .env.local
# Edit .env.local and add your ELEVENLABS_API_KEY

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Home page - deck list
│   ├── vocab/
│   │   └── page.tsx                # Vocabulary dashboard - stats & filtering
│   ├── review/
│   │   └── page.tsx                # Global review - study all decks
│   ├── deck/[id]/
│   │   ├── page.tsx                # Deck detail - card management
│   │   └── review/
│   │       └── page.tsx            # Deck review - study single deck
│   ├── globals.css                 # Global styles
│   └── api/
│       ├── decks/
│       │   ├── route.ts            # GET/POST /api/decks
│       │   └── [id]/
│       │       ├── route.ts        # GET/PATCH/DELETE /api/decks/:id
│       │       └── cards/
│       │           └── route.ts    # GET/POST /api/decks/:id/cards
│       ├── cards/
│       │   └── [id]/
│       │       └── route.ts        # GET/PATCH/DELETE /api/cards/:id
│       ├── review/
│       │   └── route.ts            # GET/POST /api/review
│       ├── vocab/
│       │   └── route.ts            # GET /api/vocab (stats + filtering)
│       └── audio/
│           └── route.ts            # POST/DELETE /api/audio
├── lib/
│   ├── db.ts                       # SQLite connection + schema
│   ├── decks.ts                    # Deck CRUD operations
│   ├── cards.ts                    # Card CRUD operations
│   ├── fsrs.ts                     # FSRS wrapper (uses ts-fsrs)
│   └── speech.ts                   # Web Speech API utility
└── components/
    └── SpeakerButton.tsx           # Audio playback component

public/
└── audio/                          # Generated audio files (card-{id}.mp3)

scripts/
└── test-db.ts                      # Database integration tests
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
| audio_url | TEXT | Path to generated audio file |
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
- [x] FSRS scheduling with ts-fsrs library
- [x] Review submission and card scheduling updates
- [x] ElevenLabs audio generation API
- [x] Local audio file storage

### Frontend
- [x] Home page with deck list and statistics
- [x] Create/delete deck functionality
- [x] Deck detail page with card list
- [x] Add/edit/delete cards
- [x] RTL Arabic text input and display
- [x] Clean, modern Tailwind CSS styling
- [x] Dark mode support (via system preference)
- [x] Responsive design
- [x] Consistent navigation header (Decks | Vocabulary)
- [x] Breadcrumb navigation on subpages

### Vocabulary Dashboard
- [x] View all vocabulary across all decks
- [x] Stats overview (total, not learned, learning, mastered, this week)
- [x] Filter by status (All, Not Learned, Learning, Mastered, This Week)
- [x] Search words by Arabic, English, or notes
- [x] View deck, review count, and last review date

### Core Learning (FSRS Review System)
- [x] Flashcard flip interaction with 3D animation
- [x] Rating buttons (Again, Hard, Good, Easy) with interval preview
- [x] FSRS scheduling algorithm integration (ts-fsrs)
- [x] Session progress tracking and summary
- [x] Keyboard shortcuts (Space to flip, 1-4 for ratings)
- [x] "Study Now" button in header (global review across all decks)
- [x] Deck-specific review sessions

### Audio Pronunciation
- [x] ElevenLabs AI text-to-speech integration
- [x] On-demand audio generation (click speaker button)
- [x] Local audio file caching (generates once, plays forever)
- [x] Web Speech API fallback (when no ElevenLabs key)
- [x] Visual feedback (gray/yellow/green/blue button states)
- [x] Right-click to regenerate audio

## Features To Implement

### Gamification
- [ ] **Streaks** - Daily learning streak tracking
- [ ] **XP System** - Points for completed reviews
- [ ] **Levels** - Progress milestones
- [ ] **Daily Goals** - Configurable card review targets
- [ ] **Advanced Statistics** - Retention rates, review history graphs

### Content Management
- [ ] **Bulk Import** - Paste vocabulary lists for auto card creation
- [ ] **AI Card Generation** - Generate cards from text/topics
- [ ] **Example Sentences** - Context for vocabulary
- [ ] **Card Images** - Add images to vocabulary cards for visual learning

### User Experience
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

### Review

```
GET    /api/review?deckId=X&limit=20    # Get due cards for review (deckId optional)
POST   /api/review                       # Submit review { cardId, rating: 1-4 }
```

### Vocabulary

```
GET    /api/vocab                        # Get all vocabulary with stats
       ?filter=new|learning|mastered|week
       &search=query
       &deckId=X
```

### Audio

```
POST   /api/audio              # Generate audio { cardId }
DELETE /api/audio?cardId=X     # Delete audio for card
```

## Environment Variables

Create a `.env.local` file:

```bash
# ElevenLabs API (optional - falls back to Web Speech API)
ELEVENLABS_API_KEY=your_api_key_here

# Optional: Custom voice ID
# ELEVENLABS_VOICE_ID=pMsXgVXv3BLzUgSXRplE
```

Get your API key from: https://elevenlabs.io/app/settings/api-keys

## Running Tests

```bash
# Run database integration tests
npx tsx scripts/test-db.ts
```

## FSRS Algorithm

This app uses the [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs) library, implementing the Free Spaced Repetition Scheduler (FSRS) - a modern alternative to SM-2 (used by Anki).

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
