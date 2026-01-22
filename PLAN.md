# Offline Support Implementation Plan

## Overview

Add full offline functionality so users can review flashcards without internet, with automatic sync when back online.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Browser                             │
│  ┌──────────────┐    ┌──────────────┐    ┌───────────┐  │
│  │   React UI   │◄──►│  useOffline  │◄──►│ IndexedDB │  │
│  │  Components  │    │    Hooks     │    │  (Dexie)  │  │
│  └──────────────┘    └──────────────┘    └───────────┘  │
│                             │                    ▲       │
│                             ▼                    │       │
│                      ┌──────────────┐            │       │
│                      │   SyncQueue  │────────────┘       │
│                      └──────────────┘                    │
└─────────────────────────────────────────────────────────┘
                             │ Online only
                             ▼
┌─────────────────────────────────────────────────────────┐
│                    Server (Pi)                           │
│  ┌──────────────┐    ┌──────────────┐    ┌───────────┐  │
│  │  Next.js API │◄──►│   db.ts      │◄──►│  SQLite   │  │
│  └──────────────┘    └──────────────┘    └───────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Implementation Steps

### Step 1: Add Dexie.js for IndexedDB

Create `src/lib/offline-db.ts`:
- Define IndexedDB schema matching server data (decks, cards, reviews, syncQueue)
- Use Dexie.js for cleaner IndexedDB API

```typescript
// Schema
decks: 'id, name, updated_at'
cards: 'id, deck_id, due, state, updated_at'
pendingReviews: '++id, cardId, rating, timestamp'
syncMeta: 'key' // lastSync timestamp, etc.
```

### Step 2: Create Sync Service

Create `src/lib/sync.ts`:
- `initialSync()` - Download all decks and cards on first load
- `incrementalSync()` - Fetch only changes since lastSync
- `pushPendingReviews()` - Send queued reviews to server
- `isOnline()` - Check network status

Sync strategy:
1. On app load (online): Fetch all data, store in IndexedDB
2. On review submit (offline): Store in pendingReviews queue
3. On coming back online: Push pending reviews, then pull updates

### Step 3: Create Offline-Aware Hooks

Create `src/hooks/useOfflineDecks.ts`:
```typescript
function useOfflineDecks() {
  // 1. Load from IndexedDB immediately (fast)
  // 2. If online, fetch from server and update IndexedDB
  // 3. Return combined state with loading/syncing indicators
}
```

Create `src/hooks/useOfflineCards.ts`:
```typescript
function useOfflineCards(deckId: number) {
  // Same pattern - IndexedDB first, then server sync
}
```

Create `src/hooks/useOfflineReview.ts`:
```typescript
function useOfflineReview() {
  // Submit review to IndexedDB immediately
  // Queue for server sync
  // Update local card scheduling using FSRS
}
```

### Step 4: Update Components

Modify existing components to use offline hooks:
- `src/app/page.tsx` - Use `useOfflineDecks()`
- `src/app/deck/[id]/page.tsx` - Use `useOfflineCards()`
- `src/components/ReviewSession.tsx` - Use `useOfflineReview()`

### Step 5: Add Online/Offline Status UI

Create `src/components/SyncStatus.tsx`:
- Show online/offline indicator
- Show pending reviews count
- Show last sync time
- Manual sync button

### Step 6: Background Sync

Update service worker to:
- Register for background sync events
- Trigger sync when coming back online

## File Changes Summary

**New files:**
- `src/lib/offline-db.ts` - IndexedDB schema and helpers
- `src/lib/sync.ts` - Sync logic
- `src/hooks/useOfflineDecks.ts`
- `src/hooks/useOfflineCards.ts`
- `src/hooks/useOfflineReview.ts`
- `src/hooks/useOnlineStatus.ts`
- `src/components/SyncStatus.tsx`

**Modified files:**
- `src/app/page.tsx` - Use offline hooks
- `src/app/deck/[id]/page.tsx` - Use offline hooks
- `src/components/ReviewSession.tsx` - Use offline review
- `src/app/layout.tsx` - Add SyncStatus component
- `public/sw.js` - Add background sync
- `package.json` - Add dexie dependency

## API Changes

Add new endpoint for incremental sync:
- `GET /api/sync?since=<timestamp>` - Returns changes since timestamp

## Data Flow Examples

**Offline Review:**
1. User taps "Good" on card
2. `useOfflineReview` calculates new FSRS scheduling locally
3. Updates card in IndexedDB
4. Adds review to pendingReviews queue
5. UI shows "1 pending sync"

**Coming Back Online:**
1. `navigator.onLine` triggers sync
2. Push all pendingReviews to `POST /api/review`
3. Server processes and returns updated cards
4. Clear pendingReviews queue
5. Pull any server-side changes via `/api/sync`
6. Update IndexedDB with latest data

## Dependencies

```json
{
  "dexie": "^4.0.0"
}
```
