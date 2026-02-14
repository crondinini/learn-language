import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, unlink } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import db from "@/lib/db";

/**
 * Sanitize a string for use in a filename
 */
function sanitizeFilename(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 30);
}

// TTS Provider config
const TTS_PROVIDER = process.env.TTS_PROVIDER || "elevenlabs";

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
      languageCode: "ar-XA",
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
    const { id } = await params;
    const verbId = parseInt(id);
    const body = await request.json().catch(() => ({}));
    const regenerate = body.regenerate || false;

    // Get the verb
    const verb = db.prepare("SELECT id, past_3ms, meaning, audio_url FROM verbs WHERE id = ?").get(verbId) as Verb | undefined;
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
      if (TTS_PROVIDER === "google") {
        audioBuffer = await generateWithGoogle(verb.past_3ms);
      } else {
        audioBuffer = await generateWithElevenLabs(verb.past_3ms);
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

    // Save audio file with verb ID and meaning in filename
    const safeName = sanitizeFilename(verb.meaning);
    const filename = `verb-${verbId}-${safeName}.mp3`;
    const filepath = path.join(audioDir, filename);
    await writeFile(filepath, audioBuffer);

    // Update verb with audio URL
    const audioUrl = `/api/media/audio/${filename}`;
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
    const { id } = await params;
    const verbId = parseInt(id);

    // Get the verb
    const verb = db.prepare("SELECT id, meaning, audio_url FROM verbs WHERE id = ?").get(verbId) as Verb | undefined;
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

    // Delete old audio file if exists
    if (verb.audio_url) {
      const oldFilename = verb.audio_url.split("/").pop();
      if (oldFilename) {
        const oldFilepath = path.join(process.cwd(), "public", "audio", oldFilename);
        try {
          await unlink(oldFilepath);
        } catch {
          // File might not exist
        }
      }
    }

    // Ensure audio directory exists
    const audioDir = path.join(process.cwd(), "public", "audio");
    if (!existsSync(audioDir)) {
      await mkdir(audioDir, { recursive: true });
    }

    // Get file extension from original filename or default to mp3
    const ext = file.name.split(".").pop()?.toLowerCase() || "mp3";
    const safeName = sanitizeFilename(verb.meaning);
    const filename = `verb-${verbId}-${safeName}.${ext}`;
    const filepath = path.join(audioDir, filename);

    // Write file
    const arrayBuffer = await file.arrayBuffer();
    await writeFile(filepath, Buffer.from(arrayBuffer));

    // Update verb with audio URL
    const audioUrl = `/api/media/audio/${filename}`;
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
    const { id } = await params;
    const verbId = parseInt(id);
    const body = await request.json();
    const { audio_url } = body;

    if (!audio_url) {
      return NextResponse.json({ error: "audio_url is required" }, { status: 400 });
    }

    // Check verb exists
    const verb = db.prepare("SELECT id FROM verbs WHERE id = ?").get(verbId) as { id: number } | undefined;
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
    const { id } = await params;
    const verbId = parseInt(id);

    const verb = db.prepare("SELECT id, audio_url FROM verbs WHERE id = ?").get(verbId) as Verb | undefined;
    if (!verb) {
      return NextResponse.json({ error: "Verb not found" }, { status: 404 });
    }

    // Delete file if exists
    if (verb.audio_url) {
      const filename = verb.audio_url.split("/").pop();
      if (filename) {
        const filepath = path.join(process.cwd(), "public", "audio", filename);
        try {
          await unlink(filepath);
        } catch {
          // File might not exist, that's ok
        }
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
