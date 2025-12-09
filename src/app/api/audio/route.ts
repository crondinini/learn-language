import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import db from "@/lib/db";
import { getCardById } from "@/lib/cards";

/**
 * Sanitize a string for use in a filename
 */
function sanitizeFilename(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric with dashes
    .replace(/^-+|-+$/g, "")     // Remove leading/trailing dashes
    .substring(0, 30);           // Limit length
}

// TTS Provider config
const TTS_PROVIDER = process.env.TTS_PROVIDER || "elevenlabs"; // "google" or "elevenlabs"

// ElevenLabs config
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ARABIC_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "pMsXgVXv3BLzUgSXRplE";

/**
 * Generate audio using Google Cloud TTS
 */
async function generateWithGoogle(text: string): Promise<Buffer> {
  const textToSpeech = await import("@google-cloud/text-to-speech");
  const client = new textToSpeech.TextToSpeechClient();

  const request = {
    input: { text },
    voice: {
      languageCode: "ar-XA", // Modern Standard Arabic
      ssmlGender: "MALE" as const,
    },
    audioConfig: { audioEncoding: "MP3" as const },
  };

  const [response] = await client.synthesizeSpeech(request);
  return Buffer.from(response.audioContent as Uint8Array);
}

/**
 * Generate audio using ElevenLabs
 */
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
    throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
  }

  const audioBuffer = await response.arrayBuffer();
  return Buffer.from(audioBuffer);
}

/**
 * POST /api/audio
 * Generate audio for a card using configured TTS provider
 * Body: { cardId: number, regenerate?: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cardId, regenerate } = body;

    if (!cardId) {
      return NextResponse.json({ error: "cardId is required" }, { status: 400 });
    }

    // Get the card
    const card = getCardById(cardId);
    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    // Check if audio already exists (unless regenerating)
    if (card.audio_url && !regenerate) {
      return NextResponse.json({
        message: "Audio already exists",
        audio_url: card.audio_url,
      });
    }

    // Generate audio based on provider
    let audioBuffer: Buffer;
    try {
      if (TTS_PROVIDER === "google") {
        audioBuffer = await generateWithGoogle(card.front);
      } else {
        audioBuffer = await generateWithElevenLabs(card.front);
      }
    } catch (error) {
      console.error(`${TTS_PROVIDER} TTS error:`, error);
      return NextResponse.json(
        { error: `TTS generation failed: ${error instanceof Error ? error.message : "Unknown error"}` },
        { status: 500 }
      );
    }

    // Ensure audio directory exists
    const audioDir = path.join(process.cwd(), "public", "audio");
    if (!existsSync(audioDir)) {
      await mkdir(audioDir, { recursive: true });
    }

    // Save audio file with card ID and English translation in filename
    const safeName = sanitizeFilename(card.back);
    const filename = `card-${cardId}-${safeName}.mp3`;
    const filepath = path.join(audioDir, filename);
    await writeFile(filepath, audioBuffer);

    // Update card with audio URL
    const audioUrl = `/api/media/audio/${filename}`;
    const updateStmt = db.prepare(
      "UPDATE cards SET audio_url = ?, updated_at = datetime('now') WHERE id = ?"
    );
    updateStmt.run(audioUrl, cardId);

    return NextResponse.json({
      message: "Audio generated successfully",
      audio_url: audioUrl,
      provider: TTS_PROVIDER,
    });
  } catch (error) {
    console.error("Error generating audio:", error);
    return NextResponse.json(
      { error: "Failed to generate audio" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/audio?cardId=X
 * Delete audio for a card
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const cardId = searchParams.get("cardId");

    if (!cardId) {
      return NextResponse.json({ error: "cardId is required" }, { status: 400 });
    }

    const card = getCardById(parseInt(cardId));
    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    // Delete file if exists
    if (card.audio_url) {
      const filepath = path.join(process.cwd(), "public", card.audio_url);
      const { unlink } = await import("fs/promises");
      try {
        await unlink(filepath);
      } catch {
        // File might not exist, that's ok
      }
    }

    // Clear audio_url in database
    const updateStmt = db.prepare(
      "UPDATE cards SET audio_url = NULL, updated_at = datetime('now') WHERE id = ?"
    );
    updateStmt.run(cardId);

    return NextResponse.json({ message: "Audio deleted" });
  } catch (error) {
    console.error("Error deleting audio:", error);
    return NextResponse.json(
      { error: "Failed to delete audio" },
      { status: 500 }
    );
  }
}
