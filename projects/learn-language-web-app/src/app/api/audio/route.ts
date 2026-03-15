import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getCardById, verifyCardOwnership } from "@/lib/cards";
import { saveMedia, deleteMedia, parseMediaId } from "@/lib/media";
import { generateTTSAudio, TTS_PROVIDER } from "@/lib/tts";
import { getCurrentUser } from "@/lib/auth";

/**
 * POST /api/audio
 * Generate audio for a card using configured TTS provider
 * Body: { cardId: number, regenerate?: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await request.json();
    const { cardId, regenerate } = body;

    if (!cardId) {
      return NextResponse.json({ error: "cardId is required" }, { status: 400 });
    }

    // Get the card and verify ownership
    const card = verifyCardOwnership(cardId, user.id);
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
      audioBuffer = await generateTTSAudio(card.front);
    } catch (error) {
      console.error(`${TTS_PROVIDER} TTS error:`, error);
      return NextResponse.json(
        { error: `TTS generation failed: ${error instanceof Error ? error.message : "Unknown error"}` },
        { status: 500 }
      );
    }

    // Delete old media if regenerating
    if (card.audio_url) {
      const oldMediaId = parseMediaId(card.audio_url);
      if (oldMediaId) {
        deleteMedia(oldMediaId);
      }
    }

    // Save audio to media table
    const mediaId = saveMedia(audioBuffer, "audio/mpeg", `card-${cardId}.mp3`);
    const audioUrl = `/api/media/${mediaId}`;

    // Update card with audio URL
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
    const user = await getCurrentUser();
    const searchParams = request.nextUrl.searchParams;
    const cardId = searchParams.get("cardId");

    if (!cardId) {
      return NextResponse.json({ error: "cardId is required" }, { status: 400 });
    }

    const card = verifyCardOwnership(parseInt(cardId), user.id);
    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    // Delete media blob if it's a DB-stored media
    if (card.audio_url) {
      const mediaId = parseMediaId(card.audio_url);
      if (mediaId) {
        deleteMedia(mediaId);
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

/**
 * PATCH /api/audio
 * Clean up stale audio_url references where the media no longer exists
 */
export async function PATCH() {
  try {
    const cards = db.prepare(
      "SELECT id, audio_url FROM cards WHERE audio_url IS NOT NULL"
    ).all() as { id: number; audio_url: string }[];

    let cleaned = 0;
    const updateStmt = db.prepare(
      "UPDATE cards SET audio_url = NULL, updated_at = datetime('now') WHERE id = ?"
    );

    for (const card of cards) {
      // Skip external URLs (e.g. Playaling links)
      if (card.audio_url.startsWith("http")) continue;

      const mediaId = parseMediaId(card.audio_url);
      if (mediaId) {
        // Check if media exists in DB
        const exists = db.prepare("SELECT 1 FROM media WHERE id = ?").get(mediaId);
        if (!exists) {
          updateStmt.run(card.id);
          cleaned++;
        }
      } else {
        // Old filesystem URL format — media is gone, clear it
        updateStmt.run(card.id);
        cleaned++;
      }
    }

    return NextResponse.json({
      message: `Cleaned ${cleaned} stale audio references out of ${cards.length} total`,
      cleaned,
      total: cards.length,
    });
  } catch (error) {
    console.error("Error cleaning audio:", error);
    return NextResponse.json(
      { error: "Failed to clean audio" },
      { status: 500 }
    );
  }
}
