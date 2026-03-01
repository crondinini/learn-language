#!/usr/bin/env python3
"""
Download image for a vocabulary card using Unsplash API.
Usage: python3 generate-image.py <card_id> [custom_query]
"""

import sys
import os
import requests
from pathlib import Path
from urllib.parse import quote

# Load .env.local
project_dir = Path(__file__).parent.parent
env_file = project_dir / ".env.local"
if env_file.exists():
    for line in env_file.read_text().splitlines():
        if line and not line.startswith("#") and "=" in line:
            key, value = line.split("=", 1)
            os.environ[key] = value

API_URL = os.environ.get("API_URL", "https://learn.rocksbythesea.uk")
API_TOKEN = os.environ.get("API_TOKEN", "")
UNSPLASH_ACCESS_KEY = os.environ.get("UNSPLASH_ACCESS_KEY")

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 generate-image.py <card_id> [custom_query]")
        sys.exit(1)

    card_id = sys.argv[1]
    custom_query = sys.argv[2] if len(sys.argv) > 2 else None

    if not UNSPLASH_ACCESS_KEY:
        print("Error: UNSPLASH_ACCESS_KEY not set in .env.local")
        sys.exit(1)

    # Headers for API requests
    api_headers = {"Authorization": f"Bearer {API_TOKEN}"} if API_TOKEN else {}

    # Get card info
    print(f"Fetching card {card_id}...")
    card = requests.get(f"{API_URL}/api/cards/{card_id}", headers=api_headers).json()
    word = card.get("back")

    if not word:
        print("Error: Card not found or has no translation")
        sys.exit(1)

    print(f"Word: {word}")

    # Build query
    query = custom_query or word
    print(f"Query: {query}")

    # Search Unsplash API
    print("Searching Unsplash...")
    search_url = f"https://api.unsplash.com/search/photos?query={quote(query)}&per_page=1"
    search_response = requests.get(
        search_url,
        headers={"Authorization": f"Client-ID {UNSPLASH_ACCESS_KEY}"}
    )

    if search_response.status_code != 200:
        print(f"Error: Unsplash search failed (status {search_response.status_code})")
        print(search_response.text[:200])
        sys.exit(1)

    results = search_response.json().get("results", [])
    if not results:
        print(f"Error: No images found for '{query}'")
        sys.exit(1)

    # Get the image URL (small size for cards)
    image_url_remote = results[0]["urls"]["small"]  # 400px wide
    print(f"Found: {image_url_remote[:60]}...")

    # Download image
    print("Downloading image...")
    image_response = requests.get(image_url_remote)

    if image_response.status_code != 200:
        print(f"Error: Failed to download image (status {image_response.status_code})")
        sys.exit(1)

    # Upload image via API (stored in SQLite media table)
    safe_word = "".join(c if c.isalnum() else "-" for c in word.split(",")[0].strip()).lower()
    filename = f"card-{card_id}-{safe_word}.jpg"
    print(f"Uploading {filename} via API...")

    result = requests.post(
        f"{API_URL}/api/images",
        headers=api_headers,
        files={"image": (filename, image_response.content, "image/jpeg")},
        data={"cardId": card_id}
    )

    if result.status_code == 200:
        image_url = result.json().get("image_url", "")
        print(f"✓ Uploaded and updated card {card_id} with image ({image_url})")
    else:
        print(f"Error: Upload failed (status {result.status_code})")
        print(result.text[:200])
        sys.exit(1)

if __name__ == "__main__":
    main()
