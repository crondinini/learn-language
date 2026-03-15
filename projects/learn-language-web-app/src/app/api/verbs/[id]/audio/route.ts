import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { saveMedia, deleteMedia, parseMediaId } from "@/lib/media";
import { generateTTSAudio, TTS_PROVIDER } from "@/lib/tts";
import { getCurrentUser } from "@/lib/auth";

interface Verb {
  id: number;
  past_3ms: string;
  meaning: string;
  audio_url: string | null;
}

/**
 * POST /api/verbs/[id]/audio
 * Generate audio for a verb's past_3ms form
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;
    const verbId = parseInt(id);
    const body = await request.json().catch(() => ({}));
    const regenerate = body.regenerate || false;

    // Get the verb
    const verb = db.prepare("SELECT id, past_3ms, meaning, audio_url FROM verbs WHERE id = ? AND user_id = ?").get(verbId, user.id) as Verb | undefined;
    if (!verb) {
      return NextResponse.json({ error: "Verb not found" }, { status: 404 });
    }

    // Check if audio already exists (unless regenerating)
    if (verb.audio_url && !regenerate) {
      return NextResponse.json({
        message: "Audio already exists",
        audio_url: verb.audio_url,
      });
    }

    // Generate audio based on provider
    let audioBuffer: Buffer;
    try {
      audioBuffer = await generateTTSAudio(verb.past_3ms);
    } catch (error) {
      console.error(`${TTS_PROVIDER} TTS error:`, error);
      return NextResponse.json(
        { error: `TTS generation failed: ${error instanceof Error ? error.message : "Unknown error"}` },
        { status: 500 }
      );
    }

    // Delete old media if regenerating
    if (verb.audio_url) {
      const oldMediaId = parseMediaId(verb.audio_url);
      if (oldMediaId) {
        deleteMedia(oldMediaId);
      }
    }

    // Save audio to media table
    const mediaId = saveMedia(audioBuffer, "audio/mpeg", `verb-${verbId}.mp3`);
    const audioUrl = `/api/media/${mediaId}`;

    // Update verb with audio URL
    db.prepare("UPDATE verbs SET audio_url = ?, updated_at = datetime('now') WHERE id = ?").run(audioUrl, verbId);

    return NextResponse.json({
      message: "Audio generated successfully",
      audio_url: audioUrl,
      provider: TTS_PROVIDER,
    });
  } catch (error) {
    console.error("Error generating verb audio:", error);
    return NextResponse.json(
      { error: "Failed to generate audio" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/verbs/[id]/audio
 * Upload an audio file for a verb
 * Content-Type: multipart/form-data with 'file' field
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;
    const verbId = parseInt(id);

    // Get the verb
    const verb = db.prepare("SELECT id, meaning, audio_url FROM verbs WHERE id = ? AND user_id = ?").get(verbId, user.id) as Verb | undefined;
    if (!verb) {
      return NextResponse.json({ error: "Verb not found" }, { status: 404 });
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "audio/webm"];
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|ogg|webm)$/i)) {
      return NextResponse.json({ error: "Invalid file type. Allowed: mp3, wav, ogg, webm" }, { status: 400 });
    }

    // Delete old media if exists
    if (verb.audio_url) {
      const oldMediaId = parseMediaId(verb.audio_url);
      if (oldMediaId) {
        deleteMedia(oldMediaId);
      }
    }

    // Save to media table
    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split(".").pop()?.toLowerCase() || "mp3";
    const mediaId = saveMedia(buffer, file.type || "audio/mpeg", `verb-${verbId}.${ext}`);
    const audioUrl = `/api/media/${mediaId}`;

    // Update verb with audio URL
    db.prepare("UPDATE verbs SET audio_url = ?, updated_at = datetime('now') WHERE id = ?").run(audioUrl, verbId);

    return NextResponse.json({
      message: "Audio uploaded successfully",
      audio_url: audioUrl,
    });
  } catch (error) {
    console.error("Error uploading verb audio:", error);
    return NextResponse.json(
      { error: "Failed to upload audio" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/verbs/[id]/audio
 * Update the audio URL for a verb (e.g., set a Playaling audio URL)
 * Body: { audio_url: string }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;
    const verbId = parseInt(id);
    const body = await request.json();
    const { audio_url } = body;

    if (!audio_url) {
      return NextResponse.json({ error: "audio_url is required" }, { status: 400 });
    }

    // Check verb exists and belongs to user
    const verb = db.prepare("SELECT id FROM verbs WHERE id = ? AND user_id = ?").get(verbId, user.id) as { id: number } | undefined;
    if (!verb) {
      return NextResponse.json({ error: "Verb not found" }, { status: 404 });
    }

    // Update verb with audio URL
    db.prepare("UPDATE verbs SET audio_url = ?, updated_at = datetime('now') WHERE id = ?").run(audio_url, verbId);

    return NextResponse.json({
      message: "Audio URL updated",
      audio_url,
    });
  } catch (error) {
    console.error("Error updating verb audio:", error);
    return NextResponse.json(
      { error: "Failed to update audio" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/verbs/[id]/audio
 * Delete audio for a verb
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;
    const verbId = parseInt(id);

    const verb = db.prepare("SELECT id, audio_url FROM verbs WHERE id = ? AND user_id = ?").get(verbId, user.id) as Verb | undefined;
    if (!verb) {
      return NextResponse.json({ error: "Verb not found" }, { status: 404 });
    }

    // Delete media blob
    if (verb.audio_url) {
      const mediaId = parseMediaId(verb.audio_url);
      if (mediaId) {
        deleteMedia(mediaId);
      }
    }

    // Clear audio_url in database
    db.prepare("UPDATE verbs SET audio_url = NULL, updated_at = datetime('now') WHERE id = ?").run(verbId);

    return NextResponse.json({ message: "Audio deleted" });
  } catch (error) {
    console.error("Error deleting verb audio:", error);
    return NextResponse.json(
      { error: "Failed to delete audio" },
      { status: 500 }
    );
  }
}
