# learn-language-web-app

Arabic flashcard web application with spaced repetition learning.

## Stack

- **Framework**: Next.js 16 (App Router) with TypeScript
- **Database**: SQLite with Prisma-style direct access (better-sqlite3)
- **Styling**: Tailwind CSS 4
- **Learning Algorithm**: FSRS (ts-fsrs) - Free Spaced Repetition Scheduler
- **TTS**: Google Cloud Text-to-Speech (primary), ElevenLabs (alternative)

## UI Features

| Page | Description |
|------|-------------|
| `/` | Home - deck list with stats, create deck, study button |
| `/vocab` | Vocabulary dashboard - filter by status/deck, search |
| `/deck/[id]` | Deck detail - card list, add/edit/delete cards, images, audio |
| `/deck/[id]/review` | Deck-specific flashcard review session |
| `/review` | Global review - cards due across all decks |
| `/conjugation` | Arabic verb conjugation practice with FSRS |
| `/homework` | Recording and written homework assignments |
| `/generate` | Generate Arabic vocabulary from English words via Claude Code skill |
| `/lessons` | Class lessons with transcripts, AI summaries, and card generation |
| `/lessons/[id]` | Lesson detail: transcript, summarize, generate cards, notes |
| `/reading` | Arabic reading passages with linked vocabulary |

## MCP Server

Endpoint: `https://learn.rocksbythesea.uk/mcp`

| Tool | Purpose |
|------|---------|
| `list_decks` | List all vocabulary decks |
| `create_deck` | Create new deck |
| `add_word` / `add_words` | Add vocabulary |
| `delete_word` | Delete vocabulary by card ID |
| `move_word` | Move card between decks |
| `get_learning_words` | Get words by learning status |
| `list_verbs` / `add_verb` | Verb conjugation management |
| `review_flashcards` | Interactive MCP app for review |

## Hosting

- **Server**: Hetzner VPS (Debian)
- **URL**: https://learn.rocksbythesea.uk
- **HTTPS**: Cloudflare Tunnel
- **Deploy**: Auto on push to `main` via GitHub Actions (bare-metal systemd, no Docker)
- **Data**: Hetzner volume at `/mnt/HC_Volume_104464186/learn-language/`

## Skills

| Skill | Purpose |
|-------|---------|
| `add-word` | Add single Arabic word with duplicate check |
| `import-vocabulary` | Extract vocabulary from Word docs |
| `generate-card-image` | Download Unsplash images for cards |
| `download-playaling-audio` | Get Arabic pronunciation from Playaling |
| `resize-and-upload-card-image` | Process and upload card images |
| `generate-words` | Generate Arabic vocabulary from English word lists |

## Recent Changes

<!-- Keep only relevant/current changes. Remove entries that are superseded or no longer applicable. -->

- **2026-02**: Added Lessons feature — class transcripts with AI summarization and card generation (continuable conversations via Claude `--resume`)
- **2026-02**: Migrated deployment from Docker to bare-metal systemd service (builds on server, runs as `/opt/learn-language/server.js`)
- **2026-02**: Added generation history - past generations are persisted in SQLite and shown on `/generate` page
- **2026-02**: Added `/generate` page and `generate-words` skill for batch English-to-Arabic vocabulary generation
- **2025-02**: Reorganized into monorepo structure under `projects/`
- **2025-02**: Added `delete_word` MCP tool
- **2025-02**: Added verb audio support, moved edit/delete buttons to breadcrumb
- **2025-01**: Added Arabic verb conjugation module with FSRS scheduling
- **2025-01**: Added PWA support with offline caching
- **2024-12**: Switched to GitHub Actions deployment (builds on Hetzner)
