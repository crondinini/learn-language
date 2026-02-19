#!/usr/bin/env python3
"""Transcribe Arabic audio, translate words, and cut selected word clips."""

import sys
import os
import json
import subprocess
import re
import whisperx
from deep_translator import GoogleTranslator


def is_arabic(text: str) -> bool:
    """Check if text contains Arabic characters."""
    return bool(re.search(r'[\u0600-\u06FF]', text))


def transcribe(audio_path: str, model_size: str = "large-v3"):
    device = "cpu"
    compute_type = "int8"

    print(f"Loading model ({model_size})...")
    model = whisperx.load_model(model_size, device, compute_type=compute_type, language="ar")

    print(f"Transcribing {audio_path}...")
    audio = whisperx.load_audio(audio_path)
    result = model.transcribe(audio, batch_size=4, language="ar")

    print("\n--- Transcription ---")
    for seg in result["segments"]:
        print(f"  [{seg['start']:.1f}s - {seg['end']:.1f}s] {seg['text']}")

    print("\nAligning words...")
    align_model, metadata = whisperx.load_align_model(language_code="ar", device=device)
    aligned = whisperx.align(result["segments"], align_model, metadata, audio, device)

    # Collect Arabic words with timestamps
    words = []
    for seg in aligned["segments"]:
        for word in seg.get("words", []):
            if word.get("start") is not None and word.get("end") is not None and is_arabic(word["word"]):
                words.append(word)

    return words, audio_path


def translate_words(words: list[dict]) -> list[dict]:
    """Add English translations to each word."""
    translator = GoogleTranslator(source='ar', target='en')
    unique_texts = list({w["word"] for w in words})

    print(f"\nTranslating {len(unique_texts)} unique Arabic words...")
    translations = {}
    for text in unique_texts:
        try:
            translations[text] = translator.translate(text)
        except Exception:
            translations[text] = "?"

    for word in words:
        word["english"] = translations.get(word["word"], "?")

    return words


def display_words(words: list[dict]):
    """Show numbered list of words with translations."""
    print("\n" + "=" * 60)
    print(f"{'#':>3}  {'Arabic':<15} {'English':<20} {'Time':>12}  {'Conf':>5}")
    print("-" * 60)
    for i, w in enumerate(words):
        time_range = f"{w['start']:.1f}s-{w['end']:.1f}s"
        score = f"{w.get('score', 0):.0%}"
        print(f"{i:>3}  {w['word']:<15} {w['english']:<20} {time_range:>12}  {score:>5}")
    print("=" * 60)


def cut_words(audio_path: str, words: list[dict], indices: list[int], output_dir: str):
    """Cut selected words from audio using ffmpeg."""
    os.makedirs(output_dir, exist_ok=True)

    for idx in indices:
        w = words[idx]
        # Add small padding around the word for natural sound
        start = max(0, w["start"] - 0.05)
        duration = (w["end"] - w["start"]) + 0.1

        safe_name = w["word"].replace(" ", "_")
        out_file = os.path.join(output_dir, f"{idx:03d}_{safe_name}.wav")

        subprocess.run([
            "ffmpeg", "-y", "-i", audio_path,
            "-ss", str(start), "-t", str(duration),
            "-ar", "44100", "-ac", "1",
            out_file
        ], capture_output=True)

        print(f"  Cut: {w['word']} ({w['english']}) -> {out_file}")

    print(f"\n{len(indices)} clips saved to {output_dir}/")


def parse_selection(selection: str, max_idx: int) -> list[int]:
    """Parse user selection like '1,3,5-10,12' into a list of indices."""
    indices = []
    for part in selection.split(","):
        part = part.strip()
        if "-" in part:
            start, end = part.split("-", 1)
            indices.extend(range(int(start), int(end) + 1))
        elif part == "*":
            return list(range(max_idx + 1))
        elif part.isdigit():
            indices.append(int(part))
    return [i for i in indices if 0 <= i <= max_idx]


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python transcribe.py <audio_file> [model_size]")
        print("  model_size: tiny, base, small, medium, large-v3 (default)")
        sys.exit(1)

    audio_file = sys.argv[1]
    model_size = sys.argv[2] if len(sys.argv) > 2 else "large-v3"

    # Step 1: Transcribe
    words, audio_path = transcribe(audio_file, model_size)

    # Step 2: Translate
    words = translate_words(words)

    # Step 3: Display
    display_words(words)

    # Save word list for later use
    json_path = audio_file.rsplit(".", 1)[0] + "_words.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump({"audio_path": audio_path, "words": words}, f, ensure_ascii=False, indent=2)
    print(f"\nWord list saved to {json_path}")

    # Step 4: Select and cut
    print("\nEnter word numbers to cut (e.g. '0,3,5-10' or '*' for all, 'q' to quit):")
    selection = input("> ").strip()

    if selection.lower() == "q":
        print("Done.")
        sys.exit(0)

    indices = parse_selection(selection, len(words) - 1)
    if not indices:
        print("No valid selections.")
        sys.exit(0)

    output_dir = audio_file.rsplit(".", 1)[0] + "_clips"
    cut_words(audio_path, words, indices, output_dir)
