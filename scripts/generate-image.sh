#!/bin/bash
# Generate image for a vocabulary card using Gemini API
# Usage: ./generate-image.sh <card_id> [custom_prompt]
# Requires: GEMINI_API_KEY in .env.local or environment

set -e

# Load .env.local if it exists
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
if [ -f "$PROJECT_DIR/.env.local" ]; then
  while IFS='=' read -r key value; do
    # Skip comments and empty lines
    [[ "$key" =~ ^#.*$ ]] && continue
    [[ -z "$key" ]] && continue
    # Export the variable
    export "$key=$value"
  done < "$PROJECT_DIR/.env.local"
fi

CARD_ID="$1"
CUSTOM_PROMPT="$2"
API_URL="http://localhost:3001"

if [ -z "$CARD_ID" ]; then
  echo "Usage: ./generate-image.sh <card_id> [custom_prompt]"
  exit 1
fi

if [ -z "$GEMINI_API_KEY" ]; then
  echo "Error: GEMINI_API_KEY not set"
  echo "Export it: export GEMINI_API_KEY=your_key"
  exit 1
fi

# Get card info
echo "Fetching card $CARD_ID..."
CARD=$(curl -s "$API_URL/api/cards/$CARD_ID")
WORD=$(echo "$CARD" | jq -r '.back')  # English translation

if [ "$WORD" = "null" ] || [ -z "$WORD" ]; then
  echo "Error: Card not found or has no translation"
  exit 1
fi

echo "Word: $WORD"

# Build prompt (keep it short to save tokens)
if [ -n "$CUSTOM_PROMPT" ]; then
  PROMPT="$CUSTOM_PROMPT"
else
  PROMPT="Simple clean illustration of: $WORD. White background, minimal style."
fi

echo "Prompt: $PROMPT"

# Call Gemini API
echo "Generating image..."
RESPONSE=$(curl -s -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent" \
  -H "x-goog-api-key: $GEMINI_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"contents\": [{
      \"parts\": [{\"text\": \"$PROMPT\"}]
    }],
    \"generationConfig\": {
      \"responseModalities\": [\"image\", \"text\"]
    }
  }")

# Extract base64 image data
IMAGE_DATA=$(echo "$RESPONSE" | jq -r '.candidates[0].content.parts[] | select(.inlineData) | .inlineData.data' 2>/dev/null)

if [ -z "$IMAGE_DATA" ] || [ "$IMAGE_DATA" = "null" ]; then
  echo "Error: No image in response"
  echo "$RESPONSE" | jq '.error // .candidates[0].content.parts[0].text // .' 2>/dev/null || echo "$RESPONSE"
  exit 1
fi

# Save image
IMAGE_PATH="public/images/card-$CARD_ID.png"
echo "$IMAGE_DATA" | base64 --decode > "$IMAGE_PATH"
echo "Saved: $IMAGE_PATH"

# Update card with image URL
IMAGE_URL="/images/card-$CARD_ID.png"
curl -s -X PATCH "$API_URL/api/cards/$CARD_ID" \
  -H "Content-Type: application/json" \
  -d "{\"image_url\": \"$IMAGE_URL\"}" > /dev/null

echo "✓ Updated card $CARD_ID with image"
