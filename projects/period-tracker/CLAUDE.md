# Synced — Period Tracker

A period tracking app with partner sharing. Flutter mobile app + TypeScript API.

## Project Structure

```
period-tracker/
├── api/                         # TypeScript backend (Hono + Drizzle + SQLite)
│   ├── src/
│   │   ├── index.ts             # Entry point, route registration
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
│   │   │   └── sync.ts          # HealthKit sync
│   │   ├── middleware/
│   │   │   └── auth.ts          # JWT auth middleware + signToken/verifyToken
│   │   └── services/
│   │       └── prediction.ts    # Cycle prediction algorithm
│   ├── drizzle.config.ts
│   └── package.json
├── app/                         # Flutter mobile app
│   └── lib/
│       ├── main.dart            # Entry point
│       ├── theme.dart            # AppColors + AppTheme (earthy palette)
│       ├── models/
│       │   ├── user.dart
│       │   ├── period.dart       # Period + PeriodDay
│       │   ├── symptom.dart      # SymptomType enum + Symptom
│       │   ├── prediction.dart
│       │   └── partnership.dart  # Partnership, PartnerInfo, PartnerData
│       ├── providers/
│       │   └── providers.dart    # All Riverpod providers + notifiers
│       ├── services/
│       │   ├── api_client.dart   # Dio HTTP client with JWT interceptor
│       │   ├── auth_service.dart # Google Sign-In flow
│       │   └── health_service.dart # HealthKit integration
│       └── screens/
│           ├── synced_home_screen.dart    # Main screen (week garden, cycle card, partner card)
│           ├── settings_screen.dart       # Account, HealthKit toggle, partner sharing link
│           ├── partner_settings_screen.dart # Invite/pending/accepted partner states
│           ├── day_detail_screen.dart     # Day view with symptoms
│           └── ...
└── mockup-*.html                # Design mockups (HTML)
```

## Backend API

- **Port**: 3040 (configurable via `PORT` env)
- **Start**: `cd api && npm run dev` (tsx watch with hot reload)
- **DB push**: `cd api && npx drizzle-kit push` (apply schema changes)

### Environment Variables
Copy `api/.env.example` to `api/.env`:
- `GOOGLE_CLIENT_ID` — from Google Cloud Console
- `JWT_SECRET` — random secret for signing tokens

### Database Tables
- **users** — id, googleId, email, name
- **periods** — id, userId, startDate, endDate, source (manual|healthkit)
- **periodDays** — id, periodId, date, flow (light|medium|heavy|spotting)
- **symptoms** — id, userId, date, type, severity (1-3), notes
- **predictions** — id, userId, predictedStart, predictedEnd, avgCycleLength, confidence
- **partnerships** — id, userId, partnerEmail, status (pending|accepted)

### Route Pattern
All routes use Hono with typed middleware. Auth via `authMiddleware` which sets `c.get("user")` with `{ userId, email }`.

## Flutter App

- Uses **Riverpod 3.x** `AsyncNotifier` pattern (not StateNotifier)
- Google Sign-In 7.x uses `GoogleSignIn.instance.authenticate()`
- Health package 13.x uses `HealthDataType.MENSTRUATION_FLOW`
- API base URL in `ApiClient._baseUrl` (`app/lib/services/api_client.dart`)
- Design: earthy palette (terracotta, sage, cream, bark), Google Fonts (Fraunces headings, Outfit body)

### Providers (in `providers.dart`)
- `userProvider` — auth state
- `periodsProvider` — period CRUD
- `symptomsProvider` — symptom CRUD
- `predictionProvider` — cycle predictions
- `partnershipProvider` — partnership state (invite/accept/remove)
- `partnerDataProvider` — partner's periods + prediction

## Key Patterns

- All API routes require JWT except `POST /auth/google`
- Prediction needs 3+ completed periods (with end dates)
- HealthKit entitlements in `app/ios/Runner/Runner.entitlements`
- Partnerships: two rows per link (one per user), both flip status together
- Partner data: shares periods + predictions, NOT symptoms
