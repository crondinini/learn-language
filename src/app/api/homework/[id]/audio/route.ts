import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import db, { Homework } from "@/lib/db";

/**
 * POST /api/homework/[id]/audio
 * Upload an audio file for a listening homework assignment
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

    // Ensure homework directory exists
    const homeworkDir = path.join(process.cwd(), "public", "homework");
    if (!existsSync(homeworkDir)) {
      await mkdir(homeworkDir, { recursive: true });
    }

    // Generate filename
    const timestamp = Date.now();
    const extension = audioFile.name.split(".").pop() || "mp3";
    const filename = `listening-${id}-${timestamp}.${extension}`;
    const filepath = path.join(homeworkDir, filename);

    // Write file
    const arrayBuffer = await audioFile.arrayBuffer();
    await writeFile(filepath, Buffer.from(arrayBuffer));

    // Update homework with audio URL (don't mark as completed - this is the exercise audio)
    const audioUrl = `/api/media/homework/${filename}`;
    db.prepare(
      "UPDATE homework SET audio_url = ? WHERE id = ?"
    ).run(audioUrl, id);

    const updated = db
      .prepare("SELECT * FROM homework WHERE id = ?")
      .get(id) as Homework;

    return NextResponse.json({
      message: "Audio uploaded successfully",
      homework: updated,
    });
  } catch (error) {
    console.error("Error uploading audio:", error);
    return NextResponse.json(
      { error: "Failed to upload audio" },
      { status: 500 }
    );
  }
}
