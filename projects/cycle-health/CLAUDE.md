# Cycle Health — Period Tracker PWA

A mobile-first PWA for period tracking, cycle-synced fitness, and partner sharing. React + Hono API.

## Project Structure

```
cycle-health/
├── api/                         # TypeScript backend (Hono + Drizzle + SQLite)
│   ├── src/
│   │   ├── index.ts             # Entry point, route registration (port 3040)
│   │   ├── db/
│   │   │   ├── schema.ts        # Drizzle table definitions
│   │   │   ├── relations.ts     # Drizzle relation definitions
│   │   │   └── index.ts         # DB connection (better-sqlite3, WAL mode)
│   │   ├── routes/
│   │   │   ├── auth.ts          # POST /auth/google, GET /auth/me
│   │   │   ├── periods.ts       # CRUD /periods, POST /periods/:id/days
│   │   │   ├── symptoms.ts      # CRUD /symptoms
│   │   │   ├── predictions.ts   # GET /predictions
│   │   │   ├── partners.ts      # Partner sharing routes
│   │   │   └── training.ts      # Training plan routes
│   │   ├── middleware/
│   │   │   └── auth.ts          # JWT auth middleware + signToken/verifyToken
│   │   └── services/
│   │       ├── prediction.ts    # Cycle prediction algorithm
│   │       └── training-seed.ts # Default 4-day training plan seeder
│   ├── drizzle.config.ts
│   └── package.json
├── web/                         # Vite React PWA
│   └── src/
│       ├── api/client.ts        # Fetch wrapper with JWT from localStorage
│       ├── hooks/useData.ts     # TanStack Query hooks
│       ├── context/AuthContext.tsx # Auth state (user, token, login/logout)
│       ├── components/
│       │   ├── Layout.tsx       # Bottom nav + Outlet
│       │   ├── WeekGarden.tsx   # 7-day week view
│       │   └── CycleRing.tsx    # SVG cycle progress ring
│       ├── pages/
│       │   ├── LoginPage.tsx    # Google Sign-In
│       │   ├── HomePage.tsx     # Greeting, week garden, cycle card, partner
│       │   ├── CalendarPage.tsx # Month grid calendar
│       │   ├── DayDetailPage.tsx # Flow + symptom logging
│       │   ├── FitPage.tsx      # Training + exercise + nutrition by phase
│       │   ├── PartnerPage.tsx  # Invite/manage partner
│       │   └── SettingsPage.tsx # Account, partner link, sign out
│       ├── lib/
│       │   ├── types.ts         # TypeScript interfaces
│       │   ├── cycleUtils.ts    # Cycle phase calculation
│       │   ├── colors.ts        # Color palette
│       │   └── fitData.ts       # Exercise/nutrition/partner tip data
│       └── styles/global.css    # CSS with custom properties
├── CLAUDE.md
└── STATE.md
```

## Backend API

- **Port**: 3040
- **Start**: `cd api && npm run dev`
- **DB push**: `cd api && npx drizzle-kit push`

### Environment Variables
Copy `api/.env.example` to `api/.env`:
- `GOOGLE_CLIENT_ID` — from Google Cloud Console
- `JWT_SECRET` — random secret for signing tokens

## Frontend (Web PWA)

- **Start**: `cd web && npm run dev` (Vite dev server on port 5173)
- **Build**: `cd web && npm run build`
- **Preview**: `cd web && npm run preview`

### Environment Variables
Copy `web/.env.example` to `web/.env`:
- `VITE_GOOGLE_CLIENT_ID` — same Google Client ID

### Dev Proxy
Vite proxies `/api/*` to `http://localhost:3040` (strips the `/api` prefix).

## Key Patterns

- All API routes require JWT except `POST /auth/google`
- Prediction needs 3+ completed periods (with end dates)
- Partnerships: two rows per link (one per user), both flip status together
- Partner data: shares periods + predictions, NOT symptoms
- Training plans support cycle-phase-specific tips
- PWA: service worker auto-updates, Google Fonts cached offline
- Design: earthy palette (terracotta, sage, cream, bark), Fraunces headings + Outfit body
