import { NextRequest, NextResponse } from "next/server";
import db, { Homework } from "@/lib/db";

/**
 * GET /api/homework/[id]
 * Get a specific homework item
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const homework = db
      .prepare("SELECT * FROM homework WHERE id = ?")
      .get(id) as Homework | undefined;

    if (!homework) {
      return NextResponse.json(
        { error: "Homework not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(homework);
  } catch (error) {
    console.error("Error fetching homework:", error);
    return NextResponse.json(
      { error: "Failed to fetch homework" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/homework/[id]
 * Update a homework item (description, status, recording_url, written_text, image_url, audio_url, transcription)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { description, status, recording_url, written_text, image_url, audio_url, transcription } = body;

    const existing = db
      .prepare("SELECT * FROM homework WHERE id = ?")
      .get(id) as Homework | undefined;

    if (!existing) {
      return NextResponse.json(
        { error: "Homework not found" },
        { status: 404 }
      );
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: (string | null)[] = [];

    if (description !== undefined) {
      updates.push("description = ?");
      values.push(description);
    }
    if (status !== undefined) {
      updates.push("status = ?");
      values.push(status);
      if (status === "completed") {
        updates.push("completed_at = datetime('now')");
      }
    }
    if (recording_url !== undefined) {
      updates.push("recording_url = ?");
      values.push(recording_url);
    }
    if (written_text !== undefined) {
      updates.push("written_text = ?");
      values.push(written_text);
    }
    if (image_url !== undefined) {
      updates.push("image_url = ?");
      values.push(image_url);
    }
    if (audio_url !== undefined) {
      updates.push("audio_url = ?");
      values.push(audio_url);
    }
    if (transcription !== undefined) {
      updates.push("transcription = ?");
      values.push(transcription);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: "No updates provided" },
        { status: 400 }
      );
    }

    values.push(id);
    const stmt = db.prepare(
      `UPDATE homework SET ${updates.join(", ")} WHERE id = ?`
    );
    stmt.run(...values);

    const updated = db
      .prepare("SELECT * FROM homework WHERE id = ?")
      .get(id) as Homework;

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating homework:", error);
    return NextResponse.json(
      { error: "Failed to update homework" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/homework/[id]
 * Delete a homework item
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = db
      .prepare("SELECT * FROM homework WHERE id = ?")
      .get(id) as Homework | undefined;

    if (!existing) {
      return NextResponse.json(
        { error: "Homework not found" },
        { status: 404 }
      );
    }

    // Delete associated files if they exist
    const pathModule = await import("path");
    const fs = await import("fs/promises");

    if (existing.recording_url) {
      const filepath = pathModule.join(process.cwd(), "public", existing.recording_url);
      try {
        await fs.unlink(filepath);
      } catch {
        // File might not exist, that's ok
      }
    }

    if (existing.image_url) {
      const filepath = pathModule.join(process.cwd(), "public", existing.image_url);
      try {
        await fs.unlink(filepath);
      } catch {
        // File might not exist, that's ok
      }
    }

    if (existing.audio_url) {
      const filepath = pathModule.join(process.cwd(), "public", existing.audio_url);
      try {
        await fs.unlink(filepath);
      } catch {
        // File might not exist, that's ok
      }
    }

    db.prepare("DELETE FROM homework WHERE id = ?").run(id);

    return NextResponse.json({ message: "Homework deleted" });
  } catch (error) {
    console.error("Error deleting homework:", error);
    return NextResponse.json(
      { error: "Failed to delete homework" },
      { status: 500 }
    );
  }
}
