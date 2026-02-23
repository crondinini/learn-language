# Period Tracker - Current State

## Stack

### Mobile App (`app/`)
- **Framework**: Flutter 3.38 (Dart 3.10)
- **State Management**: Riverpod 3.x (AsyncNotifier pattern)
- **HTTP Client**: Dio
- **Auth**: Google Sign-In 7.x
- **HealthKit**: health 13.x
- **Calendar**: table_calendar

### Backend API (`api/`)
- **Runtime**: Node.js with TypeScript
- **Framework**: Hono
- **ORM**: Drizzle ORM
- **Database**: SQLite (better-sqlite3)
- **Auth**: Google OAuth token verification + JWT

## Features

- Google Sign-In authentication
- Period logging (start/end dates)
- Flow intensity tracking per day (spotting, light, medium, heavy)
- Symptom tracking (cramps, headache, bloating, mood swings, fatigue, acne, breast tenderness, backache) with severity 1-3
- Period prediction based on average cycle length from last 6 periods (needs 3+ completed periods)
- Prediction confidence scoring
- Apple Health (HealthKit) integration for reading/writing menstrual data
- Calendar view with period days highlighted and predicted days outlined
- Cycle history with statistics (avg cycle length, avg duration)
- Partner sharing: invite by email, see each other's cycle phase (symptoms stay private)

## Hosting

- **API**: To be deployed on Hetzner VPS (port 3040)
- **App**: iOS (Apple App Store) / Android (Google Play Store)

## Running Locally

```bash
# API
cd api && npm run dev

# Flutter app (iOS simulator)
cd app && flutter run
```

## Recent Changes

- Added partner sharing feature (invite/accept/remove, bidirectional, shows cycle phase on home screen)
