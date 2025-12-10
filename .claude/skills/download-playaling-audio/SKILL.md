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

This skill downloads MSA (Modern Standard Arabic) audio pronunciations from Playaling's audio dictionary.

## Method 1: Direct API Call (Preferred)

The Playaling search API returns audio URLs directly in the response. This is faster and more reliable than browser automation.

### Step 1: Search for the Word

```bash
curl -s -X POST "https://api.playaling.com/index.php/api/v1/dictionary/search?page=1&limit=5" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"searchText":"ARABIC_WORD","searchIn":"special","dialects":[1,2,3],"sortBy":"popularityOfCluster","sortReverse":1}'
```

Replace `ARABIC_WORD` with the Arabic word to search for (e.g., "كتاب").

### Step 2: Parse the Response

The response JSON contains audio URLs for each dialect:

```json
{
  "vocabulary": {
    "data": [{
      "substring_title": "كتاب",
      "translation_title": "book",
      "audio": {
        "msa": {
          "url": "https://api.playaling.com/upload/audio/HASH/msa.mp3?h=TIMESTAMP",
          "applicable": 1,
          "verified": 1
        },
        "egyptian": { "url": "...", ... },
        "levantine": { "url": "...", ... },
        "gulf": { "url": "...", ... },
        "darija": { "url": "...", ... }
      }
    }]
  }
}
```

Use `jq` to extract the MSA audio URL:

```bash
curl -s -X POST "https://api.playaling.com/index.php/api/v1/dictionary/search?page=1&limit=5" \
  -H "Content-Type: application/json" \
  -d '{"searchText":"كتاب","searchIn":"special","dialects":[1,2,3],"sortBy":"popularityOfCluster","sortReverse":1}' \
  | jq -r '.vocabulary.data[0].audio.msa.url'
```

### Step 3: Download the Audio

```bash
# Get the URL
AUDIO_URL=$(curl -s -X POST "https://api.playaling.com/index.php/api/v1/dictionary/search?page=1&limit=5" \
  -H "Content-Type: application/json" \
  -d '{"searchText":"كتاب","searchIn":"special","dialects":[1,2,3],"sortBy":"popularityOfCluster","sortReverse":1}' \
  | jq -r '.vocabulary.data[0].audio.msa.url')

# Download the file
curl -o "audio-kitaab.mp3" "$AUDIO_URL"
```

### Step 4: Send to Pi

```bash
rsync audio-kitaab.mp3 pi:~/learn-language/public/audio/
```

Or use scp:
```bash
scp audio-kitaab.mp3 pi:~/learn-language/public/audio/
```

## Method 2: Browser Automation (Chrome MCP)

Use this method if the API is unavailable or returns errors.

### Step 1: Navigate to Audio Dictionary

```
mcp__chrome-devtools__new_page with url: https://app.playaling.com/audio-dictionary
```

### Step 2: Search for the Word

1. Take a snapshot to find the search textbox
2. Fill the textbox with the Arabic word:
   ```
   mcp__chrome-devtools__fill with uid: TEXTBOX_UID, value: "كتاب"
   ```
3. Press Enter:
   ```
   mcp__chrome-devtools__press_key with key: "Enter"
   ```

### Step 3: Click MSA Play Button

1. Take a verbose snapshot to find the MSA play button in the results
2. The play buttons are typically image elements near the "MSA" label
3. Click the MSA play button to trigger audio loading

### Step 4: Get Audio URL from Network

```
mcp__chrome-devtools__list_network_requests with resourceTypes: ["media"]
```

Look for requests to `api.playaling.com/upload/audio/*/msa.mp3`

### Step 5: Download and Transfer

Same as Method 1, Steps 3-4.

## Complete Example Script

```bash
#!/bin/bash
# Download Playaling audio for a word and send to Pi

WORD="$1"
OUTPUT_NAME="$2"

if [ -z "$WORD" ] || [ -z "$OUTPUT_NAME" ]; then
  echo "Usage: $0 <arabic-word> <output-name>"
  exit 1
fi

# Search and get MSA audio URL
AUDIO_URL=$(curl -s -X POST "https://api.playaling.com/index.php/api/v1/dictionary/search?page=1&limit=5" \
  -H "Content-Type: application/json" \
  -d "{\"searchText\":\"$WORD\",\"searchIn\":\"special\",\"dialects\":[1,2,3],\"sortBy\":\"popularityOfCluster\",\"sortReverse\":1}" \
  | jq -r '.vocabulary.data[0].audio.msa.url')

if [ "$AUDIO_URL" == "null" ] || [ -z "$AUDIO_URL" ]; then
  echo "No MSA audio found for '$WORD'"
  exit 1
fi

# Download locally
TEMP_FILE="/tmp/${OUTPUT_NAME}.mp3"
curl -s -o "$TEMP_FILE" "$AUDIO_URL"

if [ ! -s "$TEMP_FILE" ]; then
  echo "Failed to download audio"
  exit 1
fi

echo "Downloaded: $TEMP_FILE"

# Send to Pi
rsync "$TEMP_FILE" pi:~/learn-language/public/audio/
echo "Uploaded to Pi: ~/learn-language/public/audio/${OUTPUT_NAME}.mp3"

# Cleanup
rm "$TEMP_FILE"
```

## Available Dialects

| Dialect | Key in JSON | Description |
|---------|-------------|-------------|
| MSA | `msa` | Modern Standard Arabic (فصحى) |
| Egyptian | `egyptian` | Egyptian Arabic (مصري) |
| Levantine | `levantine` | Levantine Arabic (شامي) |
| Gulf | `gulf` | Gulf Arabic (خليجي) |
| Darija | `darija` | North African Arabic (دارجة) |

## Notes

- The API is public but may have rate limits
- Some words may not have audio for all dialects (check `applicable` and `verified` fields)
- Audio files are MP3 format
- The `?h=` timestamp parameter is optional and can be omitted
- Results are sorted by popularity, so the first result is usually the most common meaning
