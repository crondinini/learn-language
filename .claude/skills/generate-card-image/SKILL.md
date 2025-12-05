---
name: generate-card-image
description: Download an image for a vocabulary card using Unsplash. Use when the user wants to add an image to a card, get an image for a word, or says "add image to [word]" or "generate image for card [id]".
---

# Generate Card Image

This skill downloads images for vocabulary cards using the Unsplash API.

## Workflow

1. **Find card** → Get card ID and English translation
2. **Create query** → Use translation or custom search term
3. **Run script** → Execute generate-image.py
4. **Verify** → Confirm image was saved and card updated

## Step 1: Find the Card

Get the card by searching for the Arabic word:

```bash
curl -s http://localhost:3001/api/decks | jq -r '.[].id' | while read id; do
  curl -s "http://localhost:3001/api/decks/$id/cards" | jq '.[] | select(.front | contains("WORD")) | {id, front, back, image_url}'
done
```

Or get a specific card by ID:
```bash
curl -s http://localhost:3001/api/cards/{card_id} | jq '{id, front, back, image_url}'
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
1. Load UNSPLASH_ACCESS_KEY from .env.local
2. Fetch the card's English translation
3. Search Unsplash for matching image
4. Save to public/images/card-{id}.jpg
5. PATCH the card with image_url

## Full Example

```
User: add image to مُفتاح

1. Find card:
   curl -s http://localhost:3001/api/cards/24 | jq '{id, front, back}'
   → {id: 24, front: "مُفتاح", back: "key"}

2. Query: "key" (or "metal key" for better results)

3. Run:
   python3 scripts/generate-image.py 24 "metal key"

4. Report: "✓ Added image to مُفتاح (key)"
```

## Batch Mode

To add images to multiple cards without images:

```bash
for id in $(curl -s http://localhost:3001/api/decks | jq -r '.[].id'); do
  curl -s "http://localhost:3001/api/decks/$id/cards" | jq -r '.[] | select(.image_url == null) | .id'
done | head -5 | while read card_id; do
  python3 scripts/generate-image.py "$card_id"
  sleep 1  # Be nice to the API
done
```

## Rate Limits

Unsplash free tier: **50 requests/hour**

## Notes

- Requires UNSPLASH_ACCESS_KEY in .env.local
- Images saved as JPG to public/images/card-{id}.jpg
- Server must be running on localhost:3001
- For abstract words (adjectives, verbs), provide a descriptive custom query
