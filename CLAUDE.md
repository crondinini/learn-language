# Learn Language Monorepo

This is a monorepo containing language learning projects.

## Keeping Documentation Updated

Each project has a `STATE.md` file that captures the current state of the project. **Keep these files updated:**

- When adding a new project, create a `STATE.md` with: stack, features, hosting, and a "Recent Changes" section
- When making significant changes, add an entry to "Recent Changes"
- Periodically clean up "Recent Changes" - remove entries that are superseded or no longer relevant (git history preserves the archaeology)
- The goal is that `STATE.md` always reflects the **current** state, not a historical log

## Projects

| Project | Description | State |
|---------|-------------|-------|
| [learn-language-web-app](./projects/learn-language-web-app) | Arabic flashcard app with spaced repetition | [STATE.md](./projects/learn-language-web-app/STATE.md) |
| [audio-to-cards](./projects/audio-to-cards) | Local tools for extracting Arabic vocabulary from audio | [STATE.md](./projects/audio-to-cards/STATE.md) |
| [period-tracker](./projects/period-tracker) | Period tracking app with partner sharing (Flutter + Hono API) | [STATE.md](./projects/period-tracker/STATE.md) |
| [cycle-health](./projects/cycle-health) | Period tracking PWA with cycle-synced fitness (React + Hono) | [STATE.md](./projects/cycle-health/STATE.md) |
| [chrome-extension](./projects/chrome-extension) | Netflix dual subtitle extension (Arabic + English) | [STATE.md](./projects/chrome-extension/STATE.md) |
| [telegram-bot](./projects/telegram-bot) | Telegram bot for Arabic conversation practice | [STATE.md](./projects/telegram-bot/STATE.md) |

## Repository Structure

```
.github/workflows/     # GitHub Actions for CI/CD
projects/
├── learn-language-web-app/    # Next.js web application
│   ├── CLAUDE.md              # Project-specific instructions
│   └── STATE.md               # Current state of project
├── audio-to-cards/            # Python audio processing tools (local only)
│   ├── CLAUDE.md
│   └── STATE.md
├── period-tracker/            # Flutter + Hono period tracker with partner sharing
│   ├── api/                   # TypeScript backend
│   ├── app/                   # Flutter mobile app
│   ├── CLAUDE.md
│   └── STATE.md
├── cycle-health/              # Period tracking PWA (React + Hono)
│   ├── api/                   # TypeScript backend (adapted from period-tracker)
│   ├── web/                   # Vite React PWA
│   ├── CLAUDE.md
│   └── STATE.md
├── chrome-extension/          # Netflix dual subtitle Chrome extension
│   └── STATE.md
└── telegram-bot/              # Telegram bot for Arabic conversation practice
    ├── CLAUDE.md
    └── STATE.md
```

## Infrastructure

- **Hosting**: Hetzner VPS (Debian)
- **Domains**: rocksbythesea.uk
- **CI/CD**: GitHub Actions with path filters per project

## Deployment

- **learn-language-web-app**: Auto-deploys to Hetzner on push to `main` (only when files in that project change)
  - URL: https://learn.rocksbythesea.uk
  - See [projects/learn-language-web-app/CLAUDE.md](./projects/learn-language-web-app/CLAUDE.md) for deployment details

## Adding New Projects

When adding a new project:
1. Create a folder under `projects/`
2. Add a `CLAUDE.md` with project-specific instructions
3. Add a `STATE.md` with current state (stack, features, hosting, recent changes)
4. Add a GitHub Actions workflow if needed (with path filters)
5. Update the Projects table above
