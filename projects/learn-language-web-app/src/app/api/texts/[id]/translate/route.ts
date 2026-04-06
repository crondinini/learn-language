import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";
import db, { Text } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

function generateTranslation(arabic: string): string | null {
  const prompt = `Translate this Arabic text to English. Output ONLY the English translation, nothing else. Preserve line breaks to match the original.\n\n${arabic}`;

  const env = { ...process.env };
  delete env.CLAUDECODE;

  try {
    const result = execSync(
      `echo ${JSON.stringify(prompt)} | claude --print --model haiku --output-format text`,
      { env, cwd: "/tmp", timeout: 60000, encoding: "utf-8" }
    );
    return result.trim() || null;
  } catch (error) {
    console.error("Translation: execSync error:", error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * POST /api/texts/[id]/translate
 * Generate and save English translation for a reading text
 */
export async function POST(_request: NextRequest, { params }: Params) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;

    const text = db
      .prepare("SELECT * FROM texts WHERE id = ? AND user_id = ?")
      .get(id, user.id) as Text | undefined;

    if (!text) {
      return NextResponse.json({ error: "Text not found" }, { status: 404 });
    }

    const translation = generateTranslation(text.arabic);

    if (!translation) {
      return NextResponse.json(
        { error: "Failed to generate translation" },
        { status: 500 }
      );
    }

    db.prepare(
      "UPDATE texts SET translation = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(translation, id);

    return NextResponse.json({ translation });
  } catch (error) {
    console.error("Error generating translation:", error);
    return NextResponse.json(
      { error: "Failed to generate translation" },
      { status: 500 }
    );
  }
}
