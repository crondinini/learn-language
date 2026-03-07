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
- Phase-synced exercise and nutrition recommendations
- Training plan support with cycle-aware tips
- Partner sharing (invite by email, share periods + predictions)
- PWA: installable, offline font caching, service worker

## Hosting

- Not deployed yet (local development)
- API on port 3040, Vite dev server on port 5173

## Recent Changes

- Initial project creation: full API + PWA frontend
- Ported from Flutter period-tracker app (same API, new React frontend)
- Added training plan support with cycle-phase tips
- Removed HealthKit sync (not relevant for PWA)
