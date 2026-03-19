---
name: generate-words
description: Generate vocabulary cards from a list of words. For Arabic decks, translates English→Arabic. For English decks, generates dictionary-style definitions with synonyms. Use when the user wants to generate translations/definitions for a list of words, or says "generate words from [text/file]".
---

# Generate Vocabulary Cards from Words

This skill takes a list of words (from text or a file), generates card content based on the target language, checks for duplicates, and adds them to a selected deck.

**Language modes:**
- **Arabic decks**: front = Arabic word, back = English translation
- **English decks**: front = English word, back = dictionary definition + synonyms

## Workflow

1. **Get input** → From file path or pasted text
2. **Parse words** → Split by newlines, commas, or whitespace
3. **Fetch existing cards** → Check for duplicates across all decks
4. **Translate each word** → Use WebSearch for Arabic translations
5. **Show preview table** → Display translations with duplicates marked
6. **Confirm with user** → Ask before adding
7. **Add to deck via API** → Bulk create cards

## API Configuration

- **Base URL:** `https://learn.rocksbythesea.uk`
- **API Token:** Get from `.env.local` (`API_TOKEN`)
- All API requests must include the header: `-H "Authorization: Bearer $API_TOKEN"`

## Step 1: Get Input

The user provides either:
- **Text**: A list of English words pasted directly (e.g., `/generate-words book, table, chair`)
- **File path**: A path to a text file containing words (e.g., `/generate-words /path/to/words.txt`)

If a file path is provided, read it with the Read tool.

## Step 2: Parse Words

Split input into individual words:
- Split by newlines, commas, semicolons
- Trim whitespace from each word
- Remove empty entries and duplicates within the input
- Normalize to lowercase for comparison

Example input: `"book, table, chair\nwindow"`
Parsed: `["book", "table", "chair", "window"]`

## Step 3: Check for Duplicates

Search existing cards to find words that are already in the system:

```bash
# Get all vocabulary with search
curl -s -H "Authorization: Bearer $API_TOKEN" "https://learn.rocksbythesea.uk/api/vocab?search=WORD"
```

For each word in the list, search the vocab endpoint. If the word appears in any card's `front` field (for English decks) or `back` field (for Arabic decks), mark it as a duplicate.

## Step 4: Generate Card Content

### For Arabic decks (language = ar)

For each non-duplicate word, look up the Arabic translation:

- Use WebSearch: `"{word} in Arabic translation MSA Modern Standard Arabic"`
- Extract the Arabic word (in MSA / Modern Standard Arabic)
- Include diacritics (tashkeel) when available
- For nouns, include the definite article form if commonly used

Format each result as:
```
English: book → Arabic: كِتاب (kitāb)
```

### For English decks (language = en)

For each non-duplicate word, generate a dictionary-style back:

- Use WebSearch: `"define {word}" OR "{word} definition synonyms"`
- Compose the back with:
  1. **A concise definition** (1-2 sentences, plain language)
  2. **Synonyms** (3-5 relevant synonyms, comma-separated)

Format the card back like:
```
To speak in a very loud voice; to shout.
Synonyms: shout, cry, holler, scream, roar
```

Card mapping for English decks:
- `front` = the English word (e.g., "yell")
- `back` = definition + synonyms (as above)

## Step 5: Show Preview Table

### For Arabic decks:
```
| # | English | Arabic | Status |
|---|---------|--------|--------|
| 1 | book | كِتاب | NEW |
| 2 | table | طاولة | NEW |
| 3 | dog | كلب | DUPLICATE (in Nouns deck) |
| 4 | chair | كُرسي | NEW |
```

### For English decks:
```
| # | Word | Definition | Status |
|---|------|-----------|--------|
| 1 | yell | To speak in a very loud voice; to shout. Syn: shout, cry, holler | NEW |
| 2 | happy | Feeling pleasure or contentment. Syn: glad, joyful, pleased | NEW |
| 3 | run | ... | DUPLICATE (in Verbs deck) |
```

Mark duplicates clearly so the user can decide whether to skip or re-add them.

## Step 6: Confirm with User

Ask the user:
1. Which deck to add the new words to (fetch available decks first)
2. Whether to skip duplicates (default: yes)
3. Whether the translations/definitions look correct

```bash
# Fetch available decks (filter by language to show relevant decks)
curl -s -H "Authorization: Bearer $API_TOKEN" https://learn.rocksbythesea.uk/api/decks | jq '.[] | "\(.id): \(.name) (\(.cardCount) cards, \(.language))"'
```

Determine the language from the selected deck's `language` field. This determines whether to use Arabic or English card format.

## Step 7: Add to Deck via API

Bulk-add all confirmed cards:

### For Arabic decks:
```bash
curl -X POST "https://learn.rocksbythesea.uk/api/decks/{deck_id}/cards" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_TOKEN" \
  -d '[
    {"front": "كِتاب", "back": "book"},
    {"front": "طاولة", "back": "table"}
  ]'
```
Note: `front` = Arabic, `back` = English.

### For English decks:
```bash
curl -X POST "https://learn.rocksbythesea.uk/api/decks/{deck_id}/cards" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_TOKEN" \
  -d '[
    {"front": "yell", "back": "To speak in a very loud voice; to shout.\nSynonyms: shout, cry, holler, scream, roar"},
    {"front": "happy", "back": "Feeling pleasure or contentment.\nSynonyms: glad, joyful, pleased, cheerful, delighted"}
  ]'
```
Note: `front` = English word, `back` = definition + synonyms.

## Step 8: Report Results

```
Added 3 words to deck "Nouns (الأسماء)":
  - كِتاب (book)
  - طاولة (table)
  - كُرسي (chair)

Skipped 1 duplicate:
  - كلب (dog) - already in Nouns
```

## Examples

### Example 1: Comma-separated words
```
User: /generate-words book, table, chair, window, door

1. Parse → ["book", "table", "chair", "window", "door"]
2. Check duplicates → none found
3. Translate each word via WebSearch
4. Show preview table
5. User selects deck → Nouns (ID: 6)
6. POST 5 cards to /api/decks/6/cards
7. Report: "Added 5 words to Nouns"
```

### Example 2: From file
```
User: /generate-words ~/words.txt

1. Read file → "kitchen\nbathroom\nbedroom\nliving room"
2. Parse → ["kitchen", "bathroom", "bedroom", "living room"]
3. Check duplicates → "kitchen" already exists
4. Translate remaining 3 words
5. Show preview with kitchen marked as duplicate
6. User confirms → skip duplicate, add to "Home" deck
7. POST 3 cards
8. Report results
```

### Example 3: With duplicates
```
User: /generate-words cat, dog, bird, fish

1. Parse → ["cat", "dog", "bird", "fish"]
2. Check duplicates → "cat" and "dog" found in Nouns
3. Translate "bird" and "fish"
4. Show preview:
   | cat  | قطة | DUPLICATE |
   | dog  | كلب | DUPLICATE |
   | bird | طائر | NEW |
   | fish | سمكة | NEW |
5. User confirms → add new words only
6. POST 2 cards
7. Report results
```

## Notes

- Determine language from the selected deck's `language` field (`ar` or `en`)
- **Arabic decks**: front = Arabic, back = English. Always preserve diacritics (tashkeel). Use MSA (Modern Standard Arabic), not dialect.
- **English decks**: front = English word, back = definition + synonyms. Keep definitions concise (1-2 sentences). Include 3-5 relevant synonyms.
- The API supports bulk creation - send all cards in a single request
- Check `.env.local` for the API_TOKEN value
