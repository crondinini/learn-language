import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import db, { Text } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/texts/[id]/recording
 * Upload a recording for a reading text
 * Body: FormData with 'audio' file
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    // Check text exists
    const text = db
      .prepare("SELECT * FROM texts WHERE id = ?")
      .get(id) as Text | undefined;

    if (!text) {
      return NextResponse.json({ error: "Text not found" }, { status: 404 });
    }

    // Get the audio file from form data
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File | null;

    if (!audioFile) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      );
    }

    // Ensure recordings directory exists
    const recordingsDir = path.join(process.cwd(), "data", "readings");
    if (!existsSync(recordingsDir)) {
      await mkdir(recordingsDir, { recursive: true });
    }

    // Generate filename
    const timestamp = Date.now();
    const extension = audioFile.name.split(".").pop() || "webm";
    const filename = `text-${id}-${timestamp}.${extension}`;
    const filepath = path.join(recordingsDir, filename);

    // Write file
    const arrayBuffer = await audioFile.arrayBuffer();
    await writeFile(filepath, Buffer.from(arrayBuffer));

    // Update text with recording URL
    const recordingUrl = `/api/texts/${id}/recording/audio`;
    db.prepare(
      "UPDATE texts SET recording_url = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(recordingUrl, id);

    const updated = db
      .prepare("SELECT * FROM texts WHERE id = ?")
      .get(id) as Text;

    return NextResponse.json({
      message: "Recording uploaded successfully",
      text: updated,
    });
  } catch (error) {
    console.error("Error uploading recording:", error);
    return NextResponse.json(
      { error: "Failed to upload recording" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/texts/[id]/recording
 * Delete the recording for a text
 */
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    const text = db
      .prepare("SELECT * FROM texts WHERE id = ?")
      .get(id) as Text | undefined;

    if (!text) {
      return NextResponse.json({ error: "Text not found" }, { status: 404 });
    }

    // Clear the recording URL
    db.prepare(
      "UPDATE texts SET recording_url = NULL, updated_at = datetime('now') WHERE id = ?"
    ).run(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting recording:", error);
    return NextResponse.json(
      { error: "Failed to delete recording" },
      { status: 500 }
    );
  }
}
