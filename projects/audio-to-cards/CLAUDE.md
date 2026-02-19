# Audio to Cards

Local Python tools for extracting Arabic vocabulary from audio recordings.

## Setup

```bash
python3.13 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Requires `ffmpeg` installed via Homebrew.

## Scripts

- `transcribe.py` - Transcribe Arabic audio → translate words → select & cut clips
- `cut.py` - Re-select and cut words from a previously saved JSON
- `summarize_class.py` - Transcribe long class recordings, optionally summarize with Claude

## Architecture

- Uses WhisperX for word-level timestamp alignment (transcribe.py)
- Uses faster-whisper directly for class recordings (summarize_class.py) - no alignment needed
- CPU-only inference (MPS not fully supported by WhisperX)
- `int8` compute type for lighter CPU usage
