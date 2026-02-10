import { writeFile, mkdir, readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import db, { Homework } from "../lib/db";
import { getCardById } from "../lib/cards";
import logger from "../lib/logger";

// ─── TTS Config ─────────────────────────────────────────────────────────────

const TTS_PROVIDER = process.env.TTS_PROVIDER || "elevenlabs";
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ARABIC_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "pMsXgVXv3BLzUgSXRplE";

function sanitizeFilename(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 30);
}

async function generateWithGoogle(text: string): Promise<Buffer> {
  const textToSpeech = await import("@google-cloud/text-to-speech");
  const client = new textToSpeech.TextToSpeechClient();

  const request = {
    input: { text },
    voice: {
      languageCode: "ar-XA",
      ssmlGender: "MALE" as const,
    },
    audioConfig: { audioEncoding: "MP3" as const },
  };

  const [response] = await client.synthesizeSpeech(request);
  return Buffer.from(response.audioContent as Uint8Array);
}

async function generateWithElevenLabs(text: string): Promise<Buffer> {
  if (!ELEVENLABS_API_KEY) {
    throw new Error("ElevenLabs API key not configured");
  }

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${ARABIC_VOICE_ID}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `ElevenLabs API error: ${response.status} - ${errorText}`
    );
  }

  const audioBuffer = await response.arrayBuffer();
  return Buffer.from(audioBuffer);
}

// ─── Activities ─────────────────────────────────────────────────────────────

/**
 * Generate TTS audio for a single vocabulary card.
 * Returns the audio URL path stored in the database.
 */
export async function generateCardAudio(
  cardId: number,
  regenerate: boolean = false
): Promise<string> {
  const card = getCardById(cardId);
  if (!card) {
    throw new Error(`Card not found: ${cardId}`);
  }

  // Skip if audio already exists (unless regenerating)
  if (card.audio_url && !regenerate) {
    logger.info(`Audio already exists for card ${cardId}, skipping`, {
      cardId,
      audio_url: card.audio_url,
    });
    return card.audio_url;
  }

  logger.info(`Generating audio for card ${cardId} using ${TTS_PROVIDER}`, {
    cardId,
    text: card.front,
    provider: TTS_PROVIDER,
  });

  // Generate audio
  let audioBuffer: Buffer;
  if (TTS_PROVIDER === "google") {
    audioBuffer = await generateWithGoogle(card.front);
  } else {
    audioBuffer = await generateWithElevenLabs(card.front);
  }

  // Ensure audio directory exists
  const audioDir = path.join(process.cwd(), "public", "audio");
  if (!existsSync(audioDir)) {
    await mkdir(audioDir, { recursive: true });
  }

  // Save audio file
  const safeName = sanitizeFilename(card.back);
  const filename = `card-${cardId}-${safeName}.mp3`;
  const filepath = path.join(audioDir, filename);
  await writeFile(filepath, audioBuffer);

  // Update card in database
  const audioUrl = `/api/media/audio/${filename}`;
  db.prepare(
    "UPDATE cards SET audio_url = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(audioUrl, cardId);

  logger.info(`Audio generated for card ${cardId}`, {
    cardId,
    audioUrl,
    provider: TTS_PROVIDER,
  });

  return audioUrl;
}

/**
 * Get all card IDs in a deck that don't have audio yet.
 */
export async function getCardsWithoutAudio(
  deckId: number
): Promise<number[]> {
  const cards = db
    .prepare(
      "SELECT id FROM cards WHERE deck_id = ? AND (audio_url IS NULL OR audio_url = '')"
    )
    .all(deckId) as { id: number }[];

  return cards.map((c) => c.id);
}

/**
 * Transcribe a homework recording using Google Cloud Speech-to-Text.
 * Returns the transcription text.
 */
export async function transcribeRecording(
  homeworkId: number
): Promise<string> {
  const homework = db
    .prepare("SELECT * FROM homework WHERE id = ?")
    .get(homeworkId) as Homework | undefined;

  if (!homework) {
    throw new Error(`Homework not found: ${homeworkId}`);
  }

  const audioUrl = homework.recording_url || homework.audio_url;
  if (!audioUrl) {
    throw new Error(`No audio to transcribe for homework ${homeworkId}`);
  }

  // Extract filename from URL
  const filename = audioUrl.split("/").pop();
  if (!filename) {
    throw new Error(`Invalid recording URL: ${audioUrl}`);
  }

  // Read the audio file
  const filepath = path.join(process.cwd(), "public", "homework", filename);
  let audioBuffer: Buffer;
  try {
    audioBuffer = await readFile(filepath);
  } catch {
    throw new Error(`Recording file not found: ${filepath}`);
  }

  logger.info(`Transcribing homework ${homeworkId}`, {
    homeworkId,
    filename,
    fileSize: audioBuffer.length,
  });

  // Initialize Google Cloud Speech client
  const speech = await import("@google-cloud/speech");
  const client = new speech.SpeechClient();

  const audioContent = audioBuffer.toString("base64");

  // Determine encoding based on file extension
  const ext = filename.split(".").pop()?.toLowerCase();
  let encoding:
    | "WEBM_OPUS"
    | "MP3"
    | "LINEAR16"
    | "FLAC"
    | "OGG_OPUS" = "WEBM_OPUS";
  let sampleRateHertz = 48000;

  if (ext === "mp3") {
    encoding = "MP3";
    sampleRateHertz = 44100;
  } else if (ext === "flac") {
    encoding = "FLAC";
    sampleRateHertz = 44100;
  } else if (ext === "ogg") {
    encoding = "OGG_OPUS";
    sampleRateHertz = 48000;
  } else if (ext === "wav") {
    encoding = "LINEAR16";
    sampleRateHertz = 44100;
  }

  const config = {
    encoding,
    sampleRateHertz,
    languageCode: "ar-SA",
    alternativeLanguageCodes: ["ar-EG", "ar-AE"],
    enableAutomaticPunctuation: true,
    model: "default",
  };

  let transcription = "";

  // Use longRunningRecognize for audio > 500KB
  if (audioBuffer.length > 500 * 1024) {
    logger.info(
      `Using longRunningRecognize for large audio (${Math.round(audioBuffer.length / 1024)}KB)`,
      { homeworkId }
    );
    const [operation] = await client.longRunningRecognize({
      audio: { content: audioContent },
      config,
    });

    const [response] = await operation.promise();

    transcription =
      response.results
        ?.map((result) => result.alternatives?.[0]?.transcript || "")
        .join(" ")
        .trim() || "";
  } else {
    const [response] = await client.recognize({
      audio: { content: audioContent },
      config,
    });

    transcription =
      response.results
        ?.map((result) => result.alternatives?.[0]?.transcript || "")
        .join(" ")
        .trim() || "";
  }

  // Save transcription to database
  if (transcription) {
    db.prepare("UPDATE homework SET transcription = ? WHERE id = ?").run(
      transcription,
      homeworkId
    );
  }

  logger.info(`Transcription complete for homework ${homeworkId}`, {
    homeworkId,
    transcriptionLength: transcription.length,
    hasContent: !!transcription,
  });

  return transcription;
}
