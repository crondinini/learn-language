import { NextRequest, NextResponse } from "next/server";
import db, { Text } from "@/lib/db";
import { saveMedia, deleteMedia, parseMediaId } from "@/lib/media";
import { generateTTSAudio, TTS_PROVIDER } from "@/lib/tts";
import { getCurrentUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/texts/[id]/generate-audio
 * Generate TTS audio (ElevenLabs) for a reading text and save it
 */
export async function POST(_request: NextRequest, { params }: Params) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;

    const text = db
      .prepare("SELECT * FROM texts WHERE id = ? AND user_id = ?")
      .get(id, user.id) as Text | undefined;

    if (!text) {
      return NextResponse.json({ error: "Text not found" }, { status: 404 });
    }

    // Generate audio
    let audioBuffer: Buffer;
    try {
      audioBuffer = await generateTTSAudio(text.arabic, text.language || "ar");
    } catch (error) {
      console.error(`${TTS_PROVIDER} TTS error:`, error);
      return NextResponse.json(
        { error: `TTS generation failed: ${error instanceof Error ? error.message : "Unknown error"}` },
        { status: 500 }
      );
    }

    // Delete old TTS audio if exists
    if (text.tts_audio_url) {
      const oldMediaId = parseMediaId(text.tts_audio_url);
      if (oldMediaId) {
        deleteMedia(oldMediaId);
      }
    }

    // Save audio to media table
    const mediaId = saveMedia(
      audioBuffer,
      "audio/mpeg",
      `text-tts-${id}.mp3`
    );
    const audioUrl = `/api/media/${mediaId}`;

    // Update text with TTS audio URL
    db.prepare(
      "UPDATE texts SET tts_audio_url = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(audioUrl, id);

    return NextResponse.json({
      tts_audio_url: audioUrl,
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
 * DELETE /api/texts/[id]/generate-audio
 * Delete TTS audio for a reading text
 */
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;

    const text = db
      .prepare("SELECT * FROM texts WHERE id = ? AND user_id = ?")
      .get(id, user.id) as Text | undefined;

    if (!text) {
      return NextResponse.json({ error: "Text not found" }, { status: 404 });
    }

    if (text.tts_audio_url) {
      const mediaId = parseMediaId(text.tts_audio_url);
      if (mediaId) {
        deleteMedia(mediaId);
      }
    }

    db.prepare(
      "UPDATE texts SET tts_audio_url = NULL, updated_at = datetime('now') WHERE id = ?"
    ).run(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting audio:", error);
    return NextResponse.json(
      { error: "Failed to delete audio" },
      { status: 500 }
    );
  }
}
