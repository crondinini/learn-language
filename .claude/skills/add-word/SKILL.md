---
name: add-word
description: Add a single word to the flashcard system. Use when the user wants to add a word, add vocabulary, or says something like "add [word]" or "add the word [word]". Checks for duplicates, suggests appropriate deck, and confirms before adding. Works for any language (Arabic, English, etc.).
---

# Add Single Word

This skill adds individual words to the flashcard system on demand. Works for any language — Arabic decks use front=Arabic/back=English, other decks use front=word/back=definition.

## Workflow

1. **Check for duplicates** → Search existing cards
2. **Lookup translation** → Use WebSearch if needed
3. **Fetch decks** → Get available decks for the language
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
# Search across all decks for a language
curl -s -H "Authorization: Bearer $API_TOKEN" "https://learn.rocksbythesea.uk/api/vocab?search=WORD&language=LANG"
```

If found, inform the user with the existing card details.

## Step 2: Lookup Translation (if needed)

If the user only provides the word without translation/definition:
- For Arabic: Use WebSearch to find the English translation
- For other languages: Use WebSearch to find a definition or translation
- Present the result to the user for confirmation

## Step 3: Fetch Available Decks

```bash
# Fetch decks filtered by language
curl -s -H "Authorization: Bearer $API_TOKEN" "https://learn.rocksbythesea.uk/api/decks?language=LANG"
```

List the decks with their card counts to help decide placement.

## Step 4: Suggest Appropriate Deck

For **Arabic** decks, suggest based on word type:

| Word Type | Suggested Deck |
|-----------|----------------|
| Noun (person, place, thing) | Nouns (الأسماء) |
| Adjective (descriptive) | Adjectives (صفات) |
| Verb (action) | Verbs (الأفعال) - create if needed |
| Conjunction, preposition | Arabic Basics |
| Phrase | Phrases - create if needed |
| Unknown/mixed | Arabic Basics or create new |

For **other languages**, pick the best existing deck or suggest creating one.

## Step 5: Confirm with User

Present the word and ask for confirmation:

```
Word (front): [word]
Definition (back): [definition/translation]
Suggested deck: [deck name] (ID: X)

Add this word? Or choose a different deck:
1. [deck option 1]
2. [deck option 2]
3. Create new deck...
```

## Step 6: Add via API

```bash
curl -X POST "https://learn.rocksbythesea.uk/api/decks/{deck_id}/cards" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_TOKEN" \
  -d '[{"front": "word to learn", "back": "definition/translation"}]'
```

For Arabic: front = Arabic word, back = English translation.
For other languages: front = word/phrase, back = definition or translation.

## Step 7: Confirm Success

```
Added "[front]" ([back]) to deck "[deck name]"
```

## Creating a New Deck

If no suitable deck exists for the language:

```bash
curl -X POST "https://learn.rocksbythesea.uk/api/decks" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_TOKEN" \
  -d '{"name": "Deck Name", "language": "LANG"}'
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
- Use WebSearch for translations/definitions when needed
- API Base URL: https://learn.rocksbythesea.uk
- Always include API key header in all requests
