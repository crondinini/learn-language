---
name: add-word
description: Add a single word to the flashcard system. Use when the user wants to add a word, add vocabulary, or says something like "add [word]" or "add the word [word]". Checks for duplicates, suggests appropriate deck, and confirms before adding.
---

# Add Single Word

This skill adds individual vocabulary words to the flashcard system on demand. It supports any language — for Arabic decks, front=Arabic and back=English; for other languages, front=word to learn and back=definition/translation.

## Determining the Language

Check which language context the user is working in:
- If the user is on an Arabic deck or explicitly mentions Arabic, use Arabic workflow
- If the user mentions a specific language or deck, use that
- If unclear, check the available decks to see what languages exist and ask

## Workflow

1. **Check for duplicates** → Search existing cards
2. **Lookup translation** → Use WebSearch if needed
3. **Fetch decks** → Get available decks (filtered by language)
4. **Suggest deck** → Recommend based on word type
5. **Confirm** → Ask user before adding
6. **Add via API** → Create the card

## API Configuration

- **Base URL:** `https://learn.rocksbythesea.uk`
- **API Token:** Get from `.env.local` (`API_TOKEN`)
- All API requests must include the header: `-H "Authorization: Bearer $API_TOKEN"`

## Step 1: Check for Duplicates

Search all cards to see if the word already exists:

```bash
# Search across all decks for the word
curl -s -H "Authorization: Bearer $API_TOKEN" "https://learn.rocksbythesea.uk/api/vocab?search=WORD"
```

Check if the word exists in any card's "front" or "back" field.

If found, inform the user:
```
"كلب" already exists in deck "Nouns (الأسماء)" with translation "dog"
```

## Step 2: Lookup Translation (if needed)

If the user only provides the word without a translation:
- Use WebSearch to find the translation/definition
- Present it to the user for confirmation

For Arabic: search "Arabic word كلب meaning English translation"
For other languages: search appropriately for the target language

## Step 3: Fetch Available Decks

```bash
# For Arabic
curl -s -H "Authorization: Bearer $API_TOKEN" "https://learn.rocksbythesea.uk/api/decks?language=ar"

# For English
curl -s -H "Authorization: Bearer $API_TOKEN" "https://learn.rocksbythesea.uk/api/decks?language=en"
```

List the decks with their card counts to help decide placement.

## Step 4: Suggest Appropriate Deck

Based on the word type, suggest a deck. If no suitable deck exists for the language, create one:

```bash
curl -X POST "https://learn.rocksbythesea.uk/api/decks" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_TOKEN" \
  -d '{"name": "Deck Name", "language": "en"}'
```

### Arabic deck suggestions:

| Word Type | Suggested Deck |
|-----------|----------------|
| Noun (person, place, thing) | Nouns (الأسماء) |
| Adjective (descriptive) | Adjectives (صفات) |
| Verb (action) | Verbs (الأفعال) - create if needed |
| Conjunction, preposition | Arabic Basics |
| Phrase | Phrases - create if needed |
| Unknown/mixed | Arabic Basics or create new |

### Other languages:

Pick the best matching existing deck, or create a new one with an appropriate name.

## Step 5: Confirm with User

Present the word and ask for confirmation:

```
Word: كتاب
Translation: book
Suggested deck: Nouns (الأسماء) (ID: 6)

Add this word? Or choose a different deck:
1. Nouns (الأسماء)
2. Adjectives (صفات)
3. Arabic Basics
4. Create new deck...
```

## Step 6: Add via API

```bash
curl -X POST "https://learn.rocksbythesea.uk/api/decks/{deck_id}/cards" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_TOKEN" \
  -d '[{"front": "word to learn", "back": "definition/translation"}]'
```

For Arabic: front = Arabic word, back = English translation
For other languages: front = word to learn, back = definition/translation/meaning

## Step 7: Confirm Success

```
Added "كتاب" (book) to deck "Nouns (الأسماء)"
```

## Examples

### Example 1: Arabic word only
```
User: add the word مطبخ

1. Check duplicates → Not found
2. WebSearch "مطبخ Arabic meaning" → kitchen
3. Fetch decks → [Arabic Basics, Adjectives, Nouns]
4. Suggest: Nouns (it's a place/thing)
5. Confirm: "Add مطبخ (kitchen) to Nouns?"
6. User confirms → Add via API
7. Report: "Added مطبخ (kitchen) to Nouns"
```

### Example 2: English word for English deck
```
User: add "ubiquitous"

1. Check duplicates → Not found
2. Look up definition: "present, appearing, or found everywhere"
3. Fetch English decks
4. Suggest: Vocabulary deck (or create one)
5. Confirm: "Add ubiquitous (present everywhere) to Vocabulary?"
6. User confirms → Add via API
7. Report: "Added ubiquitous to Vocabulary"
```

### Example 3: Word already exists
```
User: add كلب

1. Check duplicates → Found in Nouns deck
2. Report: "كلب already exists in 'Nouns (الأسماء)' as 'dog'"
3. Ask: "Would you like to add it to a different deck anyway?"
```

## Moving Cards Between Decks

The API doesn't support changing a card's deck_id directly. To move a card:

1. Delete the card from the original deck:
```bash
curl -X DELETE "https://learn.rocksbythesea.uk/api/cards/{card_id}" \
  -H "Authorization: Bearer $API_TOKEN"
```

2. Recreate it in the new deck:
```bash
curl -X POST "https://learn.rocksbythesea.uk/api/decks/{new_deck_id}/cards" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_TOKEN" \
  -d '[{"front": "...", "back": "...", "notes": "..."}]'
```

**Note:** This resets the card's FSRS scheduling data (reviews, stability, etc.)

## Notes

- Always check for duplicates first to avoid redundant cards
- For Arabic: preserve diacritics (tashkeel) if provided
- If user provides notes or context, include in the notes field
- Use WebSearch for translations when needed
- API Base URL: https://learn.rocksbythesea.uk
- Always include API key header in all requests
