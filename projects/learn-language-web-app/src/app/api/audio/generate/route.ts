import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { saveMedia, deleteMedia, parseMediaId } from "@/lib/media";
import { generateTTSAudio, TTS_PROVIDER } from "@/lib/tts";

type EntityType = "card" | "verb" | "conjugation";

interface EntityConfig {
  table: string;
  textColumn: string;
  audioColumn: string;
  filenamePrefix: string;
}

const ENTITY_CONFIG: Record<EntityType, EntityConfig> = {
  card: {
    table: "cards",
    textColumn: "front",
    audioColumn: "audio_url",
    filenamePrefix: "card",
  },
  verb: {
    table: "verbs",
    textColumn: "past_3ms",
    audioColumn: "audio_url",
    filenamePrefix: "verb",
  },
  conjugation: {
    table: "verb_conjugations",
    textColumn: "conjugated_form",
    audioColumn: "audio_url",
    filenamePrefix: "conj",
  },
};

function getConfig(entityType: string): EntityConfig | null {
  return ENTITY_CONFIG[entityType as EntityType] || null;
}

/**
 * POST /api/audio/generate
 * Generate audio for any entity type
 * Body: { entityType: "card" | "verb" | "conjugation", entityId: number, regenerate?: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { entityType, entityId, regenerate } = body;

    if (!entityType || !entityId) {
      return NextResponse.json(
        { error: "entityType and entityId are required" },
        { status: 400 }
      );
    }

    const config = getConfig(entityType);
    if (!config) {
      return NextResponse.json(
        { error: `Invalid entityType: ${entityType}` },
        { status: 400 }
      );
    }

    // Look up the entity
    const entity = db
      .prepare(`SELECT id, ${config.textColumn}, ${config.audioColumn} FROM ${config.table} WHERE id = ?`)
      .get(entityId) as Record<string, unknown> | undefined;

    if (!entity) {
      return NextResponse.json(
        { error: `${entityType} not found` },
        { status: 404 }
      );
    }

    const existingAudioUrl = entity[config.audioColumn] as string | null;
    const text = entity[config.textColumn] as string;

    // Check if audio already exists (unless regenerating)
    if (existingAudioUrl && !regenerate) {
      return NextResponse.json({
        message: "Audio already exists",
        audio_url: existingAudioUrl,
      });
    }

    // Generate audio
    let audioBuffer: Buffer;
    try {
      audioBuffer = await generateTTSAudio(text);
    } catch (error) {
      console.error(`${TTS_PROVIDER} TTS error:`, error);
      return NextResponse.json(
        { error: `TTS generation failed: ${error instanceof Error ? error.message : "Unknown error"}` },
        { status: 500 }
      );
    }

    // Delete old media if regenerating
    if (existingAudioUrl) {
      const oldMediaId = parseMediaId(existingAudioUrl);
      if (oldMediaId) {
        deleteMedia(oldMediaId);
      }
    }

    // Save audio to media table
    const mediaId = saveMedia(
      audioBuffer,
      "audio/mpeg",
      `${config.filenamePrefix}-${entityId}.mp3`
    );
    const audioUrl = `/api/media/${mediaId}`;

    // Update entity with audio URL
    db.prepare(
      `UPDATE ${config.table} SET ${config.audioColumn} = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(audioUrl, entityId);

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
 * DELETE /api/audio/generate?entityType=card&entityId=123
 * Delete audio for any entity type
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const entityType = searchParams.get("entityType");
    const entityId = searchParams.get("entityId");

    if (!entityType || !entityId) {
      return NextResponse.json(
        { error: "entityType and entityId are required" },
        { status: 400 }
      );
    }

    const config = getConfig(entityType);
    if (!config) {
      return NextResponse.json(
        { error: `Invalid entityType: ${entityType}` },
        { status: 400 }
      );
    }

    const entity = db
      .prepare(`SELECT id, ${config.audioColumn} FROM ${config.table} WHERE id = ?`)
      .get(parseInt(entityId)) as Record<string, unknown> | undefined;

    if (!entity) {
      return NextResponse.json(
        { error: `${entityType} not found` },
        { status: 404 }
      );
    }

    const existingAudioUrl = entity[config.audioColumn] as string | null;

    // Delete media blob if it's a DB-stored media
    if (existingAudioUrl) {
      const mediaId = parseMediaId(existingAudioUrl);
      if (mediaId) {
        deleteMedia(mediaId);
      }
    }

    // Clear audio_url in database
    db.prepare(
      `UPDATE ${config.table} SET ${config.audioColumn} = NULL, updated_at = datetime('now') WHERE id = ?`
    ).run(parseInt(entityId));

    return NextResponse.json({ message: "Audio deleted" });
  } catch (error) {
    console.error("Error deleting audio:", error);
    return NextResponse.json(
      { error: "Failed to delete audio" },
      { status: 500 }
    );
  }
}
