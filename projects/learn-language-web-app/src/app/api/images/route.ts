import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getCardById } from "@/lib/cards";
import { saveMedia, deleteMedia, parseMediaId } from "@/lib/media";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * POST /api/images
 * Upload an image for a card
 * Body: FormData with 'cardId' and 'image' file
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const cardId = formData.get("cardId");
    const image = formData.get("image") as File | null;

    if (!cardId) {
      return NextResponse.json({ error: "cardId is required" }, { status: 400 });
    }

    if (!image) {
      return NextResponse.json({ error: "image file is required" }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(image.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: JPEG, PNG, WebP, GIF" },
        { status: 400 }
      );
    }

    // Validate file size
    if (image.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size: 5MB" },
        { status: 400 }
      );
    }

    // Get the card
    const card = getCardById(Number(cardId));
    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    // Delete existing media if present
    if (card.image_url) {
      const oldMediaId = parseMediaId(card.image_url);
      if (oldMediaId) {
        deleteMedia(oldMediaId);
      }
    }

    // Save image to media table
    const buffer = Buffer.from(await image.arrayBuffer());
    const ext = image.type.split("/")[1].replace("jpeg", "jpg");
    const mediaId = saveMedia(buffer, image.type, `card-${cardId}.${ext}`);
    const imageUrl = `/api/media/${mediaId}`;

    // Update card with image URL
    const updateStmt = db.prepare(
      "UPDATE cards SET image_url = ?, updated_at = datetime('now') WHERE id = ?"
    );
    updateStmt.run(imageUrl, cardId);

    return NextResponse.json({
      message: "Image uploaded successfully",
      image_url: imageUrl,
    });
  } catch (error) {
    console.error("Error uploading image:", error);
    return NextResponse.json(
      { error: "Failed to upload image" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/images?cardId=X
 * Delete image for a card
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const cardId = searchParams.get("cardId");

    if (!cardId) {
      return NextResponse.json({ error: "cardId is required" }, { status: 400 });
    }

    const card = getCardById(parseInt(cardId));
    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    // Delete media blob
    if (card.image_url) {
      const mediaId = parseMediaId(card.image_url);
      if (mediaId) {
        deleteMedia(mediaId);
      }
    }

    // Clear image_url in database
    const updateStmt = db.prepare(
      "UPDATE cards SET image_url = NULL, updated_at = datetime('now') WHERE id = ?"
    );
    updateStmt.run(cardId);

    return NextResponse.json({ message: "Image deleted" });
  } catch (error) {
    console.error("Error deleting image:", error);
    return NextResponse.json(
      { error: "Failed to delete image" },
      { status: 500 }
    );
  }
}
