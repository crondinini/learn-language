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

## Repository Structure

```
.github/workflows/     # GitHub Actions for CI/CD
projects/
├── learn-language-web-app/    # Next.js web application
│   ├── CLAUDE.md              # Project-specific instructions
│   └── STATE.md               # Current state of project
└── audio-to-cards/            # Python audio processing tools (local only)
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
