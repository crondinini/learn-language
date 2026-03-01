import { NextRequest, NextResponse } from "next/server";
import { saveMedia } from "@/lib/media";

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * POST /api/media
 * Upload a media file, returns { id, url }
 * Body: FormData with 'file' field
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size: 10MB" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const id = saveMedia(buffer, file.type, file.name);

    return NextResponse.json({
      id,
      url: `/api/media/${id}`,
    });
  } catch (error) {
    console.error("Error uploading media:", error);
    return NextResponse.json(
      { error: "Failed to upload media" },
      { status: 500 }
    );
  }
}
