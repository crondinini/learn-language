import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import db, { Homework } from "@/lib/db";

/**
 * POST /api/homework/[id]/recording
 * Upload a recording for a homework assignment
 * Body: FormData with 'audio' file
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check homework exists
    const homework = db
      .prepare("SELECT * FROM homework WHERE id = ?")
      .get(id) as Homework | undefined;

    if (!homework) {
      return NextResponse.json(
        { error: "Homework not found" },
        { status: 404 }
      );
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

    // Ensure homework recordings directory exists
    const recordingsDir = path.join(process.cwd(), "public", "homework");
    if (!existsSync(recordingsDir)) {
      await mkdir(recordingsDir, { recursive: true });
    }

    // Generate filename
    const timestamp = Date.now();
    const extension = audioFile.name.split(".").pop() || "webm";
    const filename = `homework-${id}-${timestamp}.${extension}`;
    const filepath = path.join(recordingsDir, filename);

    // Write file
    const arrayBuffer = await audioFile.arrayBuffer();
    await writeFile(filepath, Buffer.from(arrayBuffer));

    // Update homework with recording URL and mark as completed
    const recordingUrl = `/homework/${filename}`;
    db.prepare(
      "UPDATE homework SET recording_url = ?, status = 'completed', completed_at = datetime('now') WHERE id = ?"
    ).run(recordingUrl, id);

    const updated = db
      .prepare("SELECT * FROM homework WHERE id = ?")
      .get(id) as Homework;

    return NextResponse.json({
      message: "Recording uploaded successfully",
      homework: updated,
    });
  } catch (error) {
    console.error("Error uploading recording:", error);
    return NextResponse.json(
      { error: "Failed to upload recording" },
      { status: 500 }
    );
  }
}
