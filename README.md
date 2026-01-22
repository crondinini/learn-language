# Learn Arabic - Spaced Repetition Language Learning App

A modern, clean alternative to Anki for learning Arabic, built with the FSRS (Free Spaced Repetition Scheduler) algorithm.

## Overview

This app addresses common frustrations with existing flashcard apps:
- **No manual card creation hassle** - Simple, intuitive interface for adding vocabulary
- **Clean, modern UI** - Not the dated interface of traditional SRS apps
- **Arabic-first design** - Proper RTL (right-to-left) text support
- **FSRS algorithm** - State-of-the-art spaced repetition scheduling
- **Native pronunciation** - Google Cloud TTS or ElevenLabs AI-generated Arabic audio
- **Visual learning** - Image support for vocabulary cards

## Tech Stack

| Technology | Purpose |
|------------|---------|
| Next.js 16 | React framework with App Router |
| TypeScript | Type safety |
| SQLite (better-sqlite3) | Local database |
| Tailwind CSS | Styling |
| [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs) | Spaced repetition algorithm |
| Google Cloud TTS | AI text-to-speech for Arabic (recommended) |
| ElevenLabs | Alternative AI text-to-speech |
| Web Speech API | Fallback pronunciation |

## Requirements

- Node.js 18+
- npm or yarn
- Google Cloud TTS credentials OR ElevenLabs API key (optional, for audio)

## Deployment

The app is deployed on a Hetzner server with automatic deployments via GitHub Actions.

**Live URL**: https://learn.rocksbythesea.uk

### How it works

1. Push to `main` branch triggers GitHub Action
2. Action SSHs to Hetzner server
3. Server pulls latest code via git (using deploy key)
4. Docker image is built locally on server (fast, uses cache)
5. Containers are restarted with new image

### Infrastructure

| Component | Details |
|-----------|---------|
| Server | Hetzner Cloud (Debian) |
| Storage | Hetzner Volume mounted at `/mnt/HC_Volume_104464186/` |
| HTTPS | Cloudflare Tunnel (systemd service) |
| Database | SQLite on persistent volume |
| Container | Docker Compose |

### GitHub Secrets Required

| Secret | Description |
|--------|-------------|
| `HETZNER_HOST` | Server IP address |
| `HETZNER_USER` | SSH username (root) |
| `HETZNER_SSH_KEY` | Private SSH key for authentication |

### Manual Deployment

```bash
# SSH to server
ssh root@<HETZNER_HOST>

# Deploy
cd ~/learn-language
git pull
docker compose -f docker-compose.hetzner.yml build
docker compose -f docker-compose.hetzner.yml up -d
```

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local (see Environment Variables section)

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
│   │   ├── page.tsx                # Deck detail - card management & preview
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
│       ├── audio/
│       │   └── route.ts            # POST/DELETE /api/audio
│       └── images/
│           └── route.ts            # POST/DELETE /api/images
├── lib/
│   ├── db.ts                       # SQLite connection + schema
│   ├── decks.ts                    # Deck CRUD operations
│   ├── cards.ts                    # Card CRUD operations
│   ├── fsrs.ts                     # FSRS wrapper (uses ts-fsrs)
│   └── speech.ts                   # Web Speech API utility
└── components/
    └── SpeakerButton.tsx           # Audio playback component

public/
├── audio/                          # Generated audio files (card-{id}-{word}.mp3)
└── images/                         # Uploaded card images

tts/                                # Google Cloud TTS credentials (gitignored)
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
| notes | TEXT | Optional notes/example sentences |
| audio_url | TEXT | Path to generated audio file |
| image_url | TEXT | Path to uploaded image |
| stability | REAL | FSRS: Memory stability (days) |
| difficulty | REAL | FSRS: Card difficulty (0-10) |
| elapsed_days | INTEGER | Days since last review |
| scheduled_days | INTEGER | Days until next review |
| reps | INTEGER | Consecutive successful reviews (resets on Again) |
| lapses | INTEGER | Times forgotten (pressed Again) |
| state | INTEGER | 0=New, 1=Learning, 2=Review, 3=Relearning |
| due | TEXT | Next review timestamp |
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
- [x] Google Cloud TTS audio generation (Modern Standard Arabic)
- [x] ElevenLabs audio generation (alternative provider)
- [x] Local audio file storage with descriptive filenames
- [x] Image upload and storage for cards

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
- [x] Keyboard shortcuts:
  - `Space` / `Enter` - Flip card
  - `1` / `2` / `3` / `4` - Rate (Again/Hard/Good/Easy)
  - `←` / `→` - Navigate cards without rating
- [x] "Study Now" button in header (global review across all decks)
- [x] Deck-specific review sessions
- [x] "Again" adds card to end of queue (see it again this session)
- [x] Ratings saved immediately (stop anytime, progress preserved)

### Card Preview
- [x] Click any card in deck view to preview
- [x] Full flashcard preview with flip animation
- [x] Arrow navigation to browse all cards
- [x] Keyboard shortcuts (←/→ navigate, Space flip, Escape close)
- [x] Quick access to edit from preview

### Audio Pronunciation
- [x] Google Cloud TTS integration (recommended for Arabic)
- [x] ElevenLabs AI text-to-speech (alternative)
- [x] Configurable TTS provider via environment variable
- [x] On-demand audio generation (click speaker button)
- [x] Local audio file caching (generates once, plays forever)
- [x] Descriptive filenames (e.g., `card-5-hello.mp3`)
- [x] Web Speech API fallback (when no TTS configured)
- [x] Visual feedback (gray/yellow/green/blue button states)
- [x] Right-click to regenerate audio

### Card Images
- [x] Upload images for vocabulary cards
- [x] Image display in card list (thumbnail)
- [x] Image display on flashcard front during review
- [x] Image-only mode toggle (hide Arabic text, show only image)
- [x] Delete/replace images via edit modal

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
- [ ] **Example Sentences** - Dedicated field for context

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
POST   /api/decks/:id/cards    # Create card(s) { front, back, notes?, image_url? }
                               # Supports array for bulk creation
GET    /api/cards/:id          # Get card by ID
PATCH  /api/cards/:id          # Update card { front?, back?, notes?, image_url? }
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
POST   /api/audio              # Generate audio { cardId, regenerate?: boolean }
DELETE /api/audio?cardId=X     # Delete audio for card
```

### Images

```
POST   /api/images             # Upload image (FormData: cardId, image file)
DELETE /api/images?cardId=X    # Delete image for card
```

## Environment Variables

Create a `.env.local` file:

```bash
# TTS Provider: "google" (recommended) or "elevenlabs"
TTS_PROVIDER=google

# Google Cloud TTS (recommended for Arabic)
# Download service account JSON from Google Cloud Console
GOOGLE_APPLICATION_CREDENTIALS=./tts/your-credentials.json

# ElevenLabs API (alternative)
# Get your API key from: https://elevenlabs.io/app/settings/api-keys
ELEVENLABS_API_KEY=your_api_key_here

# Optional: Custom ElevenLabs voice ID
# ELEVENLABS_VOICE_ID=pMsXgVXv3BLzUgSXRplE
```

### Setting up Google Cloud TTS

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Enable the "Cloud Text-to-Speech API"
4. Go to IAM & Admin > Service Accounts
5. Create a service account
6. Create a JSON key and download it
7. Save to `tts/` folder and update `GOOGLE_APPLICATION_CREDENTIALS`

## FSRS Algorithm

This app uses the [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs) library, implementing the Free Spaced Repetition Scheduler (FSRS) - a modern alternative to SM-2 (used by Anki).

### Key Concepts

| Field | Description |
|-------|-------------|
| **Stability** | How long the memory will last (in days) |
| **Difficulty** | Inherent difficulty of the card (0-10) |
| **State** | New (0) → Learning (1) → Review (2), or Relearning (3) if forgotten |
| **Reps** | Consecutive successful reviews (resets when you press Again) |
| **Lapses** | Total times you forgot the card |
| **Due** | Timestamp when card becomes available for review |

### Rating Effects

| Rating | Effect |
|--------|--------|
| **Again (1)** | Card goes to Relearning, short interval, reps reset, lapses +1 |
| **Hard (2)** | Shorter interval than Good, reps +1 |
| **Good (3)** | Normal interval based on stability, reps +1 |
| **Easy (4)** | Longer interval, reps +1 |

### Scheduling Formula

```
R(t) = (1 + t / (9 * S))^(-1)
```

Where `t` is time since last review and `S` is stability.

Learn more: [FSRS4Anki](https://github.com/open-spaced-repetition/fsrs4anki)

## License

MIT
