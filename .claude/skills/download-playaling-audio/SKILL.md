---
name: download-playaling-audio
description: Download Arabic audio pronunciation from Playaling's audio dictionary. Use when the user wants to download audio for a word, get pronunciation audio, or says "download audio for [word]" or "get Playaling audio for [word]".
allowed_tools:
  - mcp__chrome-devtools__*
  - Bash
  - Read
  - Write
  - Glob
  - Grep
---

# Download Playaling Audio

This skill downloads MSA (Modern Standard Arabic) audio pronunciations from Playaling's audio dictionary using Chrome DevTools MCP.

## Prerequisites

- User must be logged into Playaling in the browser
- Chrome DevTools MCP must be connected

## Workflow

### Step 1: Navigate to Audio Dictionary

Check if already on the page, otherwise navigate:

```
mcp__chrome-devtools__list_pages
```

If not on audio-dictionary:
```
mcp__chrome-devtools__new_page with url: "https://app.playaling.com/audio-dictionary"
```

### Step 2: Search for the Word

1. Take a snapshot to find the search textbox:
```
mcp__chrome-devtools__take_snapshot
```

2. Find the textbox with placeholder "Type something" and fill it:
```
mcp__chrome-devtools__fill with uid: <textbox_uid>, value: "<arabic_word>"
```

3. Press Enter to search:
```
mcp__chrome-devtools__press_key with key: "Enter"
```

4. Wait for results to load (take another snapshot)

### Step 3: Click MSA Play Button

1. Take a verbose snapshot to see the structure:
```
mcp__chrome-devtools__take_snapshot with verbose: true
```

2. Look for the search results. The structure is:
   - Each result row has: Arabic word, English translation, and play buttons for each dialect
   - The play buttons are image elements in a row: Lev | MSA | Egy
   - Find the image element that corresponds to MSA (middle position)

3. Click the MSA play button:
```
mcp__chrome-devtools__click with uid: <msa_button_uid>
```

### Step 4: Get Audio URL from Network

List network requests filtering for media:
```
mcp__chrome-devtools__list_network_requests with resourceTypes: ["media"]
```

Look for a request URL matching pattern:
```
https://api.playaling.com/upload/audio/*/msa.mp3*
```

Get the full URL from the request details:
```
mcp__chrome-devtools__get_network_request with reqid: <request_id>
```

### Step 5: Download the Audio File

Use curl to download the audio file:
```bash
curl -o "/tmp/word-audio.mp3" "AUDIO_URL"
```

### Step 6: Upload via API

For **cards**, upload the audio file using the media upload endpoint:
```bash
curl -X POST "https://learn.rocksbythesea.uk/api/media" \
  -H "Authorization: Bearer $API_TOKEN" \
  -F "file=@/tmp/word-audio.mp3"
```

This returns `{ "id": 123, "url": "/api/media/123" }`. Then update the card:
```bash
curl -X PATCH "https://learn.rocksbythesea.uk/api/cards/CARD_ID" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"audio_url": "/api/media/123"}'
```

For **verbs**, upload directly:
```bash
curl -X PUT "https://learn.rocksbythesea.uk/api/verbs/VERB_ID/audio" \
  -H "Authorization: Bearer $API_TOKEN" \
  -F "file=@/tmp/word-audio.mp3"
```

Alternatively, if you want to use the Playaling URL directly (external URL), just set it:
```bash
curl -X PATCH "https://learn.rocksbythesea.uk/api/cards/CARD_ID" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"audio_url": "https://api.playaling.com/upload/audio/HASH/msa.mp3"}'
```

### Step 7: Verify Update

Confirm the card was updated by checking the API response. The response should include the updated `audio_url` field.

**The task is only complete when the API returns a successful response with the updated audio_url.**

## Complete Example

For the word "كتاب" (book) on card 42:

1. Navigate to `https://app.playaling.com/audio-dictionary`
2. Fill search box with "كتاب", press Enter
3. Take snapshot, find MSA play button (look for image near "MSA" text)
4. Click MSA button
5. Check network requests for `msa.mp3`
6. Download: `curl -o /tmp/card-42-kitaab.mp3 "https://api.playaling.com/upload/audio/HASH/msa.mp3"`
7. Upload: `curl -X POST .../api/media -H "Authorization: Bearer $API_TOKEN" -F "file=@/tmp/card-42-kitaab.mp3"` → returns `{"id": 456, "url": "/api/media/456"}`
8. **Update card**: `curl -X PATCH .../api/cards/42 -H "Authorization: Bearer $API_TOKEN" -H "Content-Type: application/json" -d '{"audio_url": "/api/media/456"}'`
9. **Verify**: Check that the API response includes the updated `audio_url`

## Available Dialects

| Dialect | Label | Description |
|---------|-------|-------------|
| MSA | "MSA" | Modern Standard Arabic (فصحى) - preferred for learning |
| Egyptian | "Egy" | Egyptian Arabic (مصري) |
| Levantine | "Lev" | Levantine Arabic (شامي) |
| Gulf | appears in expanded view | Gulf Arabic (خليجي) |
| Darija | appears in expanded view | North African Arabic (دارجة) |

## Identifying Play Buttons in Snapshot

When viewing the verbose snapshot, look for this pattern:
- A row with `StaticText "MSA"`
- Nearby `generic` elements containing `image` elements are the play buttons
- The image elements are clickable and will play the audio

Example structure:
```
uid=X_107 ignored
  uid=X_108 generic  <- Lev button
    uid=X_109 StaticText "Lev"
  uid=X_111 generic  <- MSA button (this is what to click)
    uid=X_112 StaticText "MSA"
  uid=X_114 generic  <- Egy button
    uid=X_115 StaticText "Egy"
```

## Finding Cards in the Database

Before downloading audio, you need to find the card ID. Use the vocab API:

```bash
curl -s "https://learn.rocksbythesea.uk/api/vocab" -H "Authorization: Bearer $API_TOKEN" | jq '.vocabulary[] | select(.front) | select(.front | test("ARABIC_WORD")) | {id, front, back, audio_url}'
```

If searching by Arabic text doesn't work (due to diacritics), search by English translation:

```bash
curl -s "https://learn.rocksbythesea.uk/api/vocab" -H "Authorization: Bearer $API_TOKEN" | jq '.vocabulary[] | select(.back) | select(.back | test("ENGLISH_WORD"; "i")) | {id, front, back, audio_url}'
```

**Tips:**
- The vocab API returns `{stats: {...}, vocabulary: [...]}` structure
- Use `.vocabulary[]` to iterate over cards
- Arabic text may have diacritics (tashkeel) - search by English if Arabic doesn't match
- Use `"i"` flag for case-insensitive English search

## Notes

- The audio files are MP3 format
- MSA pronunciation is recommended for formal Arabic learning
- Some words may not have all dialect pronunciations available
- The user must be logged into Playaling for this to work
- Audio URLs include a timestamp parameter `?h=` which can be omitted
- Audio is stored in the SQLite `media` table and served via `/api/media/{id}`
- External Playaling URLs can also be used directly as `audio_url`
