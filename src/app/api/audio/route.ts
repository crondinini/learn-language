import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import db from "@/lib/db";
import { getCardById } from "@/lib/cards";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

// ElevenLabs Arabic voice IDs - you can change this to your preferred voice
// Popular Arabic voices: "pMsXgVXv3BLzUgSXRplE" (Arabic male), or use their voice library
const ARABIC_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "pMsXgVXv3BLzUgSXRplE";

/**
 * POST /api/audio
 * Generate audio for a card using ElevenLabs and save locally
 * Body: { cardId: number }
 */
export async function POST(request: NextRequest) {
  try {
    if (!ELEVENLABS_API_KEY) {
      return NextResponse.json(
        { error: "ElevenLabs API key not configured. Add ELEVENLABS_API_KEY to .env.local" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { cardId } = body;

    if (!cardId) {
      return NextResponse.json({ error: "cardId is required" }, { status: 400 });
    }

    // Get the card
    const card = getCardById(cardId);
    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    // Check if audio already exists
    if (card.audio_url) {
      return NextResponse.json({
        message: "Audio already exists",
        audio_url: card.audio_url,
      });
    }

    // Call ElevenLabs API
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${ARABIC_VOICE_ID}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text: card.front, // Arabic text
          model_id: "eleven_multilingual_v2", // Best for Arabic
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
      console.error("ElevenLabs API error:", errorText);
      return NextResponse.json(
        { error: `ElevenLabs API error: ${response.status}` },
        { status: 500 }
      );
    }

    // Get audio buffer
    const audioBuffer = await response.arrayBuffer();

    // Ensure audio directory exists
    const audioDir = path.join(process.cwd(), "public", "audio");
    if (!existsSync(audioDir)) {
      await mkdir(audioDir, { recursive: true });
    }

    // Save audio file with card ID as filename
    const filename = `card-${cardId}.mp3`;
    const filepath = path.join(audioDir, filename);
    await writeFile(filepath, Buffer.from(audioBuffer));

    // Update card with audio URL
    const audioUrl = `/audio/${filename}`;
    const updateStmt = db.prepare(
      "UPDATE cards SET audio_url = ?, updated_at = datetime('now') WHERE id = ?"
    );
    updateStmt.run(audioUrl, cardId);

    return NextResponse.json({
      message: "Audio generated successfully",
      audio_url: audioUrl,
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
