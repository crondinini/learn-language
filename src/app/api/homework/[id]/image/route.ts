import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import db, { Homework } from "@/lib/db";

/**
 * POST /api/homework/[id]/image
 * Upload an image for a written homework assignment
 * Body: FormData with 'image' file
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

    // Get the image file from form data
    const formData = await request.formData();
    const imageFile = formData.get("image") as File | null;

    if (!imageFile) {
      return NextResponse.json(
        { error: "No image file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!validTypes.includes(imageFile.type)) {
      return NextResponse.json(
        { error: "Invalid image type. Supported: JPEG, PNG, GIF, WebP" },
        { status: 400 }
      );
    }

    // Ensure homework images directory exists
    const imagesDir = path.join(process.cwd(), "public", "homework", "images");
    if (!existsSync(imagesDir)) {
      await mkdir(imagesDir, { recursive: true });
    }

    // Generate filename
    const timestamp = Date.now();
    const extension = imageFile.name.split(".").pop() || "jpg";
    const filename = `homework-${id}-${timestamp}.${extension}`;
    const filepath = path.join(imagesDir, filename);

    // Write file
    const arrayBuffer = await imageFile.arrayBuffer();
    await writeFile(filepath, Buffer.from(arrayBuffer));

    // Update homework with image URL and mark as completed
    const imageUrl = `/homework/images/${filename}`;
    db.prepare(
      "UPDATE homework SET image_url = ?, status = 'completed', completed_at = datetime('now') WHERE id = ?"
    ).run(imageUrl, id);

    const updated = db
      .prepare("SELECT * FROM homework WHERE id = ?")
      .get(id) as Homework;

    return NextResponse.json({
      message: "Image uploaded successfully",
      homework: updated,
    });
  } catch (error) {
    console.error("Error uploading image:", error);
    return NextResponse.json(
      { error: "Failed to upload image" },
      { status: 500 }
    );
  }
}
