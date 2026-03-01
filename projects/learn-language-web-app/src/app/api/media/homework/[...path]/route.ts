import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

// Serve homework files from filesystem (homework stays on filesystem for now)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathSegments } = await params;
  const filePath = pathSegments.join("/");

  // Construct full path under public/homework/
  const fullPath = path.join(process.cwd(), "public", "homework", filePath);

  if (!existsSync(fullPath)) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  try {
    const file = await readFile(fullPath);

    const ext = path.extname(filePath).toLowerCase();
    const contentTypes: Record<string, string> = {
      ".mp3": "audio/mpeg",
      ".wav": "audio/wav",
      ".ogg": "audio/ogg",
      ".webm": "audio/webm",
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
    console.error("Error serving homework media:", error);
    return NextResponse.json({ error: "Failed to read file" }, { status: 500 });
  }
}
