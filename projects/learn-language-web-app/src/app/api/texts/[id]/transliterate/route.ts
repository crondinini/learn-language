import { NextRequest, NextResponse } from "next/server";
import { execFileSync } from "child_process";
import { writeFileSync, unlinkSync } from "fs";
import { join } from "path";
import db, { Text } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

function generateTransliteration(arabic: string): string | null {
  const lineCount = arabic.split("\n").length;
  const prompt = `Transliterate this Arabic text to Latin script. Output ONLY the transliteration, nothing else. Preserve line breaks exactly — the input has ${lineCount} line(s), your output must have exactly ${lineCount} line(s). Use standard Arabic transliteration (e.g., "ana ismi..." for "أنا اسمي"). Do not add vowel marks that aren't pronounced. Here is the text:\n\n${arabic}`;

  // Write prompt to temp file to avoid stdin/shell escaping issues
  const tmpFile = join("/tmp", `transliterate-${Date.now()}.txt`);
  writeFileSync(tmpFile, prompt, "utf-8");

  const env = { ...process.env };
  delete env.CLAUDECODE;

  try {
    const result = execFileSync("bash", [
      "-c",
      `cat "${tmpFile}" | claude --print --model haiku --output-format text --mcp-config '{"mcpServers":{}}'`,
    ], {
      env,
      cwd: "/tmp",
      timeout: 60000,
      encoding: "utf-8",
    });
    return result.trim() || null;
  } catch (error: unknown) {
    const e = error as { stderr?: string; message?: string };
    console.error("Transliteration error:", e.stderr?.slice(0, 300) || e.message?.slice(0, 300));
    return null;
  } finally {
    try { unlinkSync(tmpFile); } catch { /* ignore */ }
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

    const text = db
      .prepare("SELECT * FROM texts WHERE id = ? AND user_id = ?")
      .get(id, user.id) as Text | undefined;

    if (!text) {
      return NextResponse.json({ error: "Text not found" }, { status: 404 });
    }

    const transliteration = generateTransliteration(text.arabic);

    if (!transliteration) {
      return NextResponse.json(
        { error: "Failed to generate transliteration" },
        { status: 500 }
      );
    }

    db.prepare(
      "UPDATE texts SET transliteration = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(transliteration, id);

    return NextResponse.json({ transliteration });
  } catch (error) {
    console.error("Error generating transliteration:", error);
    return NextResponse.json(
      { error: "Failed to generate transliteration" },
      { status: 500 }
    );
  }
}
