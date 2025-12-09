import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

// Serve media files dynamically (audio, images, homework)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathSegments } = await params;
  const filePath = pathSegments.join("/");

  // Only allow specific directories
  const allowedDirs = ["audio", "images", "homework"];
  const dir = pathSegments[0];

  if (!allowedDirs.includes(dir)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Construct full path - files are in /app/public/ in container or ./public/ locally
  const fullPath = path.join(process.cwd(), "public", filePath);

  if (!existsSync(fullPath)) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  try {
    const file = await readFile(fullPath);

    // Determine content type
    const ext = path.extname(filePath).toLowerCase();
    const contentTypes: Record<string, string> = {
      ".mp3": "audio/mpeg",
      ".wav": "audio/wav",
      ".ogg": "audio/ogg",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp",
    };

    const contentType = contentTypes[ext] || "application/octet-stream";

    return new NextResponse(file, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": file.length.toString(),
        "Cache-Control": "public, max-age=31536000",
      },
    });
  } catch (error) {
    console.error("Error serving media:", error);
    return NextResponse.json({ error: "Failed to read file" }, { status: 500 });
  }
}
