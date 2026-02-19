# Audio to Cards - Current State

## Stack

- **Language**: Python 3.13
- **Speech-to-text**: WhisperX (with faster-whisper backend)
- **Translation**: deep-translator (Google Translate)
- **Audio processing**: ffmpeg
- **Hosting**: Local only (Mac M4, CPU inference)

## Features

- **Word extraction** (`transcribe.py`): Transcribe Arabic audio with word-level timestamps, translate to English, select and cut individual word clips
- **Re-cut from saved results** (`cut.py`): Reload a saved word JSON and select different words to cut without re-transcribing
- **Class summarization** (`summarize_class.py`): Transcribe long class recordings (mixed English/Arabic), optionally summarize with Claude CLI

## Usage

```bash
source .venv/bin/activate

# Extract words from short Arabic audio
python transcribe.py audio.wav small

# Re-select words from saved results
python cut.py audio_words.json

# Transcribe a class recording
python summarize_class.py class.m4a small
python summarize_class.py class.m4a small --no-summary
```

## Notes

- Whisper `small` model is a good balance of speed/quality for Arabic
- `large-v3` is best quality but very slow on CPU
- Arabic words in mixed-language audio often get transliterated rather than captured as Arabic script
- Phone transcription quality is comparable to Whisper `small` for class recordings
- Server (4GB RAM) is too constrained to run WhisperX; keep this local only

## Recent Changes

- Initial creation with word extraction, cutting, and class summarization scripts
