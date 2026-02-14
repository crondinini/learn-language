# Learn Language Monorepo

This is a monorepo containing language learning projects.

## Projects

- **[projects/learn-language-web-app](./projects/learn-language-web-app)**: Arabic flashcard web app with spaced repetition

## Repository Structure

```
.github/workflows/     # GitHub Actions for CI/CD
projects/
└── learn-language-web-app/    # Next.js web application (see its CLAUDE.md for details)
```

## Deployment

- **learn-language-web-app**: Auto-deploys to Hetzner on push to `main` (only when files in that project change)
  - URL: https://learn.rocksbythesea.uk
  - See [projects/learn-language-web-app/CLAUDE.md](./projects/learn-language-web-app/CLAUDE.md) for deployment details

## Adding New Projects

When adding a new project:
1. Create a folder under `projects/`
2. Add a CLAUDE.md with project-specific instructions
3. Add a GitHub Actions workflow if needed (with path filters)
