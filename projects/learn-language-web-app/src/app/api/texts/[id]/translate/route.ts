import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import db, { Text } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

function generateTranslation(arabic: string): Promise<string | null> {
  const prompt = `Translate this Arabic text to English. Output ONLY the English translation, nothing else. Preserve line breaks to match the original.\n\n${arabic}`;

  const env = { ...process.env };
  delete env.CLAUDECODE;

  return new Promise((resolve) => {
    const claude = spawn(
      "claude",
      ["--print", "--model", "haiku", "--output-format", "text", "--tools", ""],
      { env, stdio: ["pipe", "pipe", "pipe"], cwd: "/tmp" }
    );

    let stdout = "";

    claude.stdout.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    const timeout = setTimeout(() => {
      claude.kill();
      resolve(null);
    }, 30000);

    claude.on("close", (code: number | null) => {
      clearTimeout(timeout);
      if (code === 0 && stdout.trim()) {
        resolve(stdout.trim());
      } else {
        resolve(null);
      }
    });

    claude.on("error", () => {
      clearTimeout(timeout);
      resolve(null);
    });

    claude.stdin.write(prompt);
    claude.stdin.end();
  });
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

    const translation = await generateTranslation(text.arabic);

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
