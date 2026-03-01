import { NextRequest, NextResponse } from "next/server";
import { getMedia } from "@/lib/media";

/**
 * GET /api/media/[id]
 * Serve a media blob by ID with correct Content-Type and caching headers
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const mediaId = parseInt(id);

  if (isNaN(mediaId)) {
    return NextResponse.json({ error: "Invalid media ID" }, { status: 400 });
  }

  const media = getMedia(mediaId);
  if (!media) {
    return NextResponse.json({ error: "Media not found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(media.data), {
    headers: {
      "Content-Type": media.content_type,
      "Content-Length": media.data.length.toString(),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
