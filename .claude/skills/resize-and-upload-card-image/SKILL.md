---
name: resize-and-upload-card-image
description: Resize and upload images for vocabulary cards. Use when the user wants to resize and upload an image for a card, process images from a folder, or says "resize and upload [image]" or "upload images from [folder]". Resizes to 500px JPEG, uploads via API.
---

# Resize and Upload Card Image

This skill resizes and uploads images for vocabulary cards via the API.

## Workflow

1. **Identify image(s)** → Find image file(s) to upload
2. **Match to card(s)** → Find card ID by word or use provided ID
3. **Resize image** → Use sips to resize to 500px, convert to JPEG 85%
4. **Upload via API** → POST to /api/images (stored in SQLite media table)

## API Configuration

- **Base URL:** `https://learn.rocksbythesea.uk`
- **API Token:** Get from `.env.local` (`API_TOKEN`)

## Image Specifications

- **Max dimension:** 500px (maintains aspect ratio)
- **Format:** JPEG
- **Quality:** 85%
- **Naming:** `card-{id}-{word}.jpg`

## Step 1: Identify Images

Images can come from:
- Single file: `/path/to/image.png`
- Folder: `/Users/camilarondinini/Documents/project/learn-language/new-image-input/`

List images in the input folder:
```bash
ls -la /Users/camilarondinini/Documents/project/learn-language/new-image-input/*.{png,jpg,jpeg} 2>/dev/null
```

## Step 2: Match to Cards

### Option A: User provides card ID
If user says "upload image for card 123", use that ID directly.

### Option B: Match by filename/word
If image is named `behind.png`, search for a card with "behind" in the back:

```bash
# Search all decks for a word
for id in $(curl -s -H "Authorization: Bearer $API_TOKEN" https://learn.rocksbythesea.uk/api/decks | jq -r '.[].id'); do
  curl -s -H "Authorization: Bearer $API_TOKEN" "https://learn.rocksbythesea.uk/api/decks/$id/cards" | jq -r --arg word "behind" '.[] | select(.back | ascii_downcase | contains($word | ascii_downcase)) | "\(.id) - \(.back)"'
done
```

## Step 3: Resize Image

Use macOS `sips` to resize and convert:

```bash
# Single image
sips -Z 500 input.png --out /tmp/card-{id}-{word}.jpg -s format jpeg -s formatOptions 85
```

The `-Z 500` flag resizes to fit within 500x500 while maintaining aspect ratio.

## Step 4: Upload via API

Upload the resized image using the `/api/images` endpoint:

```bash
curl -X POST "https://learn.rocksbythesea.uk/api/images" \
  -H "Authorization: Bearer $API_TOKEN" \
  -F "cardId={id}" \
  -F "image=@/tmp/card-{id}-{word}.jpg"
```

This stores the image in the SQLite `media` table and automatically updates the card's `image_url`. No rsync or server restart needed.

## Examples

### Example 1: Single image with known card ID
```
User: upload behind.png for card 121

1. Resize: sips -Z 500 behind.png --out /tmp/card-121-behind.jpg -s format jpeg -s formatOptions 85
2. Upload: curl -X POST .../api/images -H "Authorization: Bearer $API_TOKEN" -F "cardId=121" -F "image=@/tmp/card-121-behind.jpg"
3. Report: "Uploaded image for card 121 (behind)"
```

### Example 2: Image matched by filename
```
User: upload hospital.png

1. Search cards for "hospital" → Found card 122
2. Resize: sips -Z 500 hospital.png --out /tmp/card-122-hospital.jpg ...
3. Upload via API
4. Report: "Uploaded image for card 122 (hospital)"
```

### Example 3: Batch upload from folder
```
User: upload all images from new-image-input

1. List images: behind.png, below.png, hospital.png
2. For each image:
   - Match filename to card (ask user if ambiguous)
   - Resize to /tmp/card-{id}-{word}.jpg
3. Upload each via curl -X POST .../api/images
4. Report summary
```

## Verify Upload

Test image URL returned by the API:
```bash
curl -s -o /dev/null -w '%{http_code}' "https://learn.rocksbythesea.uk/api/media/{media_id}"
```

## Notes

- Images are stored in the SQLite `media` table and served via `/api/media/{id}`
- No rsync, no server restart needed
- Original images in `new-image-input/` are preserved
- Always confirm card match with user if multiple matches found
- File size typically reduces from ~1.5MB to ~50-150KB after resize
