#!/usr/bin/env python3
"""Transcribe and summarize an Arabic class recording."""

import sys
import json
import subprocess
from faster_whisper import WhisperModel


def transcribe(audio_path: str, model_size: str = "small"):
    print(f"Loading model ({model_size})...")
    model = WhisperModel(model_size, device="cpu", compute_type="int8")

    print(f"Transcribing {audio_path}...")
    print("(This may take a while for long recordings)\n")

    segments, info = model.transcribe(
        audio_path,
        beam_size=5,
        vad_filter=True,  # skip silence - speeds things up a lot
        vad_parameters=dict(min_silence_duration_ms=500),
    )

    print(f"Detected language: {info.language} (probability {info.language_probability:.0%})")
    print(f"Duration: {info.duration:.0f}s ({info.duration/60:.1f} min)\n")

    transcript_lines = []
    for seg in segments:
        minutes = int(seg.start // 60)
        seconds = int(seg.start % 60)
        timestamp = f"[{minutes:02d}:{seconds:02d}]"
        line = f"{timestamp} {seg.text.strip()}"
        print(line)
        transcript_lines.append(line)

    transcript = "\n".join(transcript_lines)

    # Save transcript
    out_path = audio_path.rsplit(".", 1)[0] + "_transcript.txt"
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(transcript)
    print(f"\nTranscript saved to {out_path}")

    return transcript, out_path


def summarize(transcript_path: str):
    """Use Claude CLI to summarize the transcript."""
    print("\nSummarizing with Claude...")

    with open(transcript_path, encoding="utf-8") as f:
        transcript = f.read()

    prompt = f"""This is a transcript of an Arabic language class. The class is mostly in English with Arabic words and phrases mixed in.

Please provide:

1. **Class Summary** - A brief overview of what was covered (2-3 sentences)

2. **Key Topics** - Bullet points of the main topics/grammar concepts taught

3. **Arabic Vocabulary** - A table of Arabic words/phrases mentioned, with:
   - Arabic text
   - Transliteration
   - English meaning
   - Example sentence if one was given in class

4. **Grammar Notes** - Any grammar rules or patterns that were explained

5. **Homework/Practice** - Anything mentioned for practice or next class

Keep it concise and useful for review.

---
TRANSCRIPT:
{transcript}"""

    summary_path = transcript_path.rsplit("_transcript.txt", 1)[0] + "_summary.md"

    result = subprocess.run(
        ["claude", "--print", "--model", "sonnet", "--output-format", "text"],
        input=prompt,
        capture_output=True,
        text=True,
        timeout=120,
    )

    if result.returncode == 0:
        summary = result.stdout
        with open(summary_path, "w", encoding="utf-8") as f:
            f.write(summary)
        print(f"Summary saved to {summary_path}")
        print("\n" + summary)
    else:
        print(f"Claude summarization failed: {result.stderr}")
        print("You can manually summarize the transcript at:", transcript_path)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python summarize_class.py <audio_file> [model_size] [--no-summary]")
        print("  model_size: tiny, base, small (default), medium, large-v3")
        print("  --no-summary: only transcribe, skip Claude summarization")
        sys.exit(1)

    audio_file = sys.argv[1]
    model_size = "small"
    skip_summary = False

    for arg in sys.argv[2:]:
        if arg == "--no-summary":
            skip_summary = True
        else:
            model_size = arg

    # Step 1: Transcribe
    transcript, transcript_path = transcribe(audio_file, model_size)

    # Step 2: Summarize (optional)
    if not skip_summary:
        summarize(transcript_path)
    else:
        print("\nSkipped summarization. Run again without --no-summary, or feed the transcript to Claude manually.")
