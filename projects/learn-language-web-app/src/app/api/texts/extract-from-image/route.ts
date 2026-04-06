import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import { writeFile, unlink, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { getCurrentUser } from "@/lib/auth";

function extractJSON(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : text.trim();
}

function extractTextFromImage(imagePath: string): Promise<{
  arabic: string;
  translation: string;
  title: string;
} | null> {
  const prompt = `Look at this image. It contains Arabic text (possibly handwritten or printed). Extract ALL the Arabic text you can see, preserving line breaks where they appear in the image. Then provide an English translation. Respond with ONLY a JSON object: {"arabic":"the Arabic text with line breaks preserved","translation":"English translation with matching line breaks","title":"a short descriptive title in English (3-5 words)"}. If you cannot find Arabic text, return {"arabic":"","translation":"","title":""}`;

  const env = { ...process.env };
  delete env.CLAUDECODE;

  return new Promise((resolve) => {
    const claude = spawn(
      "claude",
      ["--print", "--model", "haiku", "--output-format", "text", "--allowedTools", "Read"],
      { env, stdio: ["pipe", "pipe", "pipe"] }
    );

    let stdout = "";

    claude.stdout.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    const timeout = setTimeout(() => {
      claude.kill();
      resolve(null);
    }, 60000);

    claude.on("close", (code: number | null) => {
      clearTimeout(timeout);
      if (code === 0 && stdout.trim()) {
        try {
          const json = extractJSON(stdout);
          const parsed = JSON.parse(json);
          resolve(parsed);
        } catch (e) {
          console.error("Failed to parse Claude response:", stdout.slice(0, 300), e);
          resolve(null);
        }
      } else {
        resolve(null);
      }
    });

    claude.on("error", () => {
      clearTimeout(timeout);
      resolve(null);
    });

    // Send prompt with image path reference
    claude.stdin.write(`${prompt}\n\nImage file: ${imagePath}`);
    claude.stdin.end();
  });
}

/**
 * POST /api/texts/extract-from-image
 * Upload an image, extract Arabic text using Claude vision, return extracted text
 */
export async function POST(request: NextRequest) {
  try {
    await getCurrentUser();

    const formData = await request.formData();
    const imageFile = formData.get("image") as File | null;

    if (!imageFile) {
      return NextResponse.json(
        { error: "No image file provided" },
        { status: 400 }
      );
    }

    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!validTypes.includes(imageFile.type)) {
      return NextResponse.json(
        { error: "Invalid image type. Supported: JPEG, PNG, GIF, WebP" },
        { status: 400 }
      );
    }

    // Save temp file for Claude to read
    const tmpDir = path.join(process.cwd(), "data", "tmp");
    if (!existsSync(tmpDir)) {
      await mkdir(tmpDir, { recursive: true });
    }

    const ext = imageFile.name.split(".").pop() || "jpg";
    const tmpFilename = `extract-${Date.now()}.${ext}`;
    const tmpPath = path.join(tmpDir, tmpFilename);

    const arrayBuffer = await imageFile.arrayBuffer();
    await writeFile(tmpPath, Buffer.from(arrayBuffer));

    try {
      const result = await extractTextFromImage(tmpPath);

      if (!result || !result.arabic) {
        return NextResponse.json(
          { error: "Could not extract Arabic text from the image" },
          { status: 422 }
        );
      }

      return NextResponse.json(result);
    } finally {
      // Clean up temp file
      await unlink(tmpPath).catch(() => {});
    }
  } catch (error) {
    console.error("Error extracting text from image:", error);
    return NextResponse.json(
      { error: "Failed to extract text from image" },
      { status: 500 }
    );
  }
}
