---
name: generate-card-image
description: Download an image for a vocabulary card using Unsplash. Use when the user wants to add an image to a card, get an image for a word, or says "add image to [word]" or "generate image for card [id]".
---

# Generate Card Image

This skill downloads images for vocabulary cards using the Unsplash API.

## API Configuration

- **Base URL:** `https://learn.rocksbythesea.uk`
- **API Token:** Get from `.env.local` (`API_TOKEN`)
- All API requests must include: `-H "Authorization: Bearer $API_TOKEN"`

## Workflow

1. **Find card** → Get card ID and English translation
2. **Create query** → Use translation or custom search term
3. **Run script** → Execute generate-image.py (downloads + uploads via API)

## Step 1: Find the Card

Get the card by searching for the Arabic word:

```bash
curl -s -H "Authorization: Bearer $API_TOKEN" https://learn.rocksbythesea.uk/api/decks | jq -r '.[].id' | while read id; do
  curl -s -H "Authorization: Bearer $API_TOKEN" "https://learn.rocksbythesea.uk/api/decks/$id/cards" | jq '.[] | select(.front | contains("WORD")) | {id, front, back, image_url}'
done
```

Or get a specific card by ID:
```bash
curl -s -H "Authorization: Bearer $API_TOKEN" https://learn.rocksbythesea.uk/api/cards/{card_id} | jq '{id, front, back, image_url}'
```

## Step 2: Create a Query

The script uses the English translation by default. For better results, you can provide a custom query:

| Word | Default Query | Better Query |
|------|---------------|--------------|
| key | key | metal key |
| cold | cold | ice cold winter |
| father | father | father family |

## Step 3: Run the Script

```bash
python3 scripts/generate-image.py {card_id} ["{custom_query}"]
```

Examples:
```bash
python3 scripts/generate-image.py 24              # Uses "key" as query
python3 scripts/generate-image.py 24 "metal key"  # Custom query
```

The script will:
1. Load API_URL, API_TOKEN, and UNSPLASH_ACCESS_KEY from .env.local
2. Fetch the card's English translation from remote API
3. Search Unsplash for matching image
4. Upload the image via `POST /api/images` (stored in SQLite media table)
5. The API automatically updates the card's `image_url`

No rsync or server restart needed — images are stored in the database and served via `/api/media/{id}`.

## Full Example

```
User: add image to مُفتاح

1. Find card:
   curl -s -H "Authorization: Bearer $API_TOKEN" https://learn.rocksbythesea.uk/api/cards/24 | jq '{id, front, back}'
   → {id: 24, front: "مُفتاح", back: "key"}

2. Query: "key" (or "metal key" for better results)

3. Run:
   python3 scripts/generate-image.py 24 "metal key"

4. Report: "✓ Added image to مُفتاح (key)"
```

## Batch Mode

To add images to multiple cards without images:

```bash
for card_id in 119 120 121; do
  python3 scripts/generate-image.py "$card_id"
  sleep 1  # Be nice to the API
done
```

## Rate Limits

Unsplash free tier: **50 requests/hour**

## Notes

- Requires in .env.local:
  - `API_URL=https://learn.rocksbythesea.uk`
  - `API_TOKEN=<your-api-token>`
  - `UNSPLASH_ACCESS_KEY=...`
- Images are stored in the SQLite `media` table and served via `/api/media/{id}`
- No filesystem sync or server restart needed
- For abstract words (adjectives, verbs), provide a descriptive custom query
