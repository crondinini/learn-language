# Cycle Health — State

## Stack

- **Frontend**: React 19 + TypeScript, Vite 6, vite-plugin-pwa
- **Backend**: Hono 4 + Drizzle ORM + better-sqlite3
- **Auth**: Google OAuth (`@react-oauth/google` on web, `google-auth-library` on server)
- **Data fetching**: TanStack Query v5
- **Routing**: React Router v7
- **Styling**: Vanilla CSS with CSS custom properties (bloom design system)

## Features

- Period tracking with flow logging (spotting, light, medium, heavy)
- Symptom tracking (8 types, severity 1-3)
- Cycle prediction algorithm (needs 3+ completed periods)
- Cycle phase detection (Period, Follicular, Ovulation, Luteal)
- **Fit tab** (default landing): today's training with time estimate, exercise count, metric pills (sets/reps/rest), cycle-aware phase tip
- **Plan tab**: browse all training days with day-selector chips, superset grouping with visual connector, stats header (time/exercises/supersets)
- 4-day fat loss training plan auto-seeded on signup with cycle-specific guidance baked into exercise notes
- Phase-synced nutrition recommendations
- Cycle-aware training tips per phase (general + per-exercise)
- Partner sharing (invite by email, share periods + predictions)
- PWA: installable, offline font caching, service worker
- API: `POST /training/reseed` to re-create plan from latest seed data

## Hosting

- Not deployed yet (local development)
- API on port 3040, Vite dev server on port 5173

## Recent Changes

- Added Plan page with day-selector chips and tab switching between training days
- Redesigned exercise cards: badge column layout, inline metric pills (sets/reps/rest), superset connector bars
- Added time estimate and exercise/superset count to training day headers
- Baked cycle-specific guidance into individual exercise notes (follicular weight increases, ovulation tempo cues, luteal rest adjustments, period scaling)
- Added `POST /training/reseed` endpoint and `reseedPlan()` service function
