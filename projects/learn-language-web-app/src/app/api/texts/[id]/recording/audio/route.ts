import { NextRequest, NextResponse } from "next/server";
import { readFile, readdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/texts/[id]/recording/audio
 * Serve the recording audio file for a text
 */
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    // Find the recording file
    const recordingsDir = path.join(process.cwd(), "data", "readings");

    if (!existsSync(recordingsDir)) {
      return NextResponse.json({ error: "No recordings found" }, { status: 404 });
    }

    // Find files matching this text ID
    const files = await readdir(recordingsDir);
    const matchingFile = files
      .filter((f) => f.startsWith(`text-${id}-`))
      .sort()
      .pop(); // Get the latest one

    if (!matchingFile) {
      return NextResponse.json({ error: "Recording not found" }, { status: 404 });
    }

    const filepath = path.join(recordingsDir, matchingFile);
    const buffer = await readFile(filepath);

    // Determine content type from extension
    const ext = matchingFile.split(".").pop()?.toLowerCase();
    let contentType = "audio/webm";
    if (ext === "mp3") contentType = "audio/mpeg";
    else if (ext === "wav") contentType = "audio/wav";
    else if (ext === "ogg") contentType = "audio/ogg";
    else if (ext === "m4a") contentType = "audio/mp4";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Error serving recording:", error);
    return NextResponse.json(
      { error: "Failed to serve recording" },
      { status: 500 }
    );
  }
}
