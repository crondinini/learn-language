# Extract homework data layer (`src/lib/homework.ts`)

## Problem

All homework API routes (`src/app/api/homework/**`) use raw `db.prepare()` calls directly instead of going through a data layer module. During the multi-user migration, I had to add `AND user_id = ?` to the same `SELECT * FROM homework WHERE id = ?` query in **5 separate route files**. Every other entity (decks, cards, verbs, lessons, texts, generations) has a `src/lib/{entity}.ts` with reusable functions.

## What to do

Create `src/lib/homework.ts` with functions like:

- `getAllHomework(userId, status?)`
- `getHomeworkById(id, userId)`
- `createHomework(input, userId)`
- `updateHomework(id, input, userId)`
- `deleteHomework(id, userId)`

Then update the 6 route files under `src/app/api/homework/` to use these instead of inline SQL.

## Files affected

- `src/app/api/homework/route.ts` (GET, POST)
- `src/app/api/homework/[id]/route.ts` (GET, PUT, DELETE)
- `src/app/api/homework/[id]/recording/route.ts`
- `src/app/api/homework/[id]/image/route.ts`
- `src/app/api/homework/[id]/audio/route.ts`
- `src/app/api/homework/[id]/transcribe/route.ts`
