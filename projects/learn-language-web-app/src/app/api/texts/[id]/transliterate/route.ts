import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";
import db, { Text } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

function generateTransliteration(arabic: string): string | null {
  const lineCount = arabic.split("\n").length;
  const prompt = `Transliterate this Arabic text to Latin script. Output ONLY the transliteration, nothing else. Preserve line breaks exactly — the input has ${lineCount} line(s), your output must have exactly ${lineCount} line(s). Use standard Arabic transliteration (e.g., "ana ismi..." for "أنا اسمي"). Do not add vowel marks that aren't pronounced. Here is the text:\n\n${arabic}`;

  const env = { ...process.env };
  delete env.CLAUDECODE;

  try {
    const result = execSync(
      `echo ${JSON.stringify(prompt)} | claude --print --model haiku --output-format text`,
      { env, cwd: "/tmp", timeout: 60000, encoding: "utf-8" }
    );
    return result.trim() || null;
  } catch (error) {
    console.error("Transliteration: execSync error:", error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * POST /api/texts/[id]/transliterate
 * Generate and save transliteration for a reading text
 */
export async function POST(_request: NextRequest, { params }: Params) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;

    console.log(`Transliterate: request for text id=${id}, user=${user.id}`);

    const text = db
      .prepare("SELECT * FROM texts WHERE id = ? AND user_id = ?")
      .get(id, user.id) as Text | undefined;

    if (!text) {
      console.log("Transliterate: text not found");
      return NextResponse.json({ error: "Text not found" }, { status: 404 });
    }

    console.log(`Transliterate: found text, arabic length=${text.arabic.length}, generating...`);
    const transliteration = generateTransliteration(text.arabic);
    console.log(`Transliterate: result=${transliteration ? transliteration.slice(0, 100) : "NULL"}`);

    if (!transliteration) {
      return NextResponse.json(
        { error: "Failed to generate transliteration" },
        { status: 500 }
      );
    }

    // Save to database
    db.prepare(
      "UPDATE texts SET transliteration = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(transliteration, id);

    console.log("Transliterate: saved to DB, returning response");
    return NextResponse.json({ transliteration });
  } catch (error) {
    console.error("Error generating transliteration:", error);
    return NextResponse.json(
      { error: "Failed to generate transliteration" },
      { status: 500 }
    );
  }
}
