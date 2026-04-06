import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import { getCurrentUser } from "@/lib/auth";

interface DictionaryResult {
  word: string;
  language: string;
  definition: string;
  translations: { en: string; pt: string; es: string };
  example: string;
  source: "dictionary" | "ai";
}

/**
 * Try the Free Dictionary API (English only, instant)
 */
async function lookupFreeDictionary(word: string): Promise<DictionaryResult | null> {
  try {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return null;

    const data = await res.json();
    const entry = data[0];
    if (!entry) return null;

    const meaning = entry.meanings?.[0];
    const def = meaning?.definitions?.[0];

    return {
      word: entry.word,
      language: "en",
      definition: def?.definition || "",
      translations: { en: entry.word, pt: "", es: "" },
      example: def?.example || "",
      source: "dictionary",
    };
  } catch {
    return null;
  }
}

/**
 * Look up via Claude CLI (any language, slower)
 */
function extractJSON(text: string): string {
  // Strip markdown code fences if present
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  // Try to find a JSON object directly
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : text.trim();
}

function lookupClaude(word: string, targetLang?: string): Promise<DictionaryResult | null> {
  const isArabicMode = targetLang === "ar";
  const prompt = isArabicMode
    ? `You are an Arabic dictionary API. The user typed "${word}" which could be an English word, an Arabic word in Latin transliteration, or Arabic script. Identify the Arabic word they mean, then respond with ONLY a JSON object, nothing else. Schema: {"word":"the Arabic word in Arabic script with diacritics","transliteration":"Latin transliteration of the Arabic word","language":"ar","definition":"brief definition in English (1-2 sentences)","translations":{"en":"English translation","pt":"Portuguese translation","es":"Spanish translation"},"example":"one example sentence in Arabic script"}. Keep it concise.`
    : `You are a dictionary API. Given the word "${word}", respond with ONLY a JSON object, nothing else. Schema: {"word":"string","language":"string","definition":"string","translations":{"en":"string","pt":"string","es":"string"},"example":"string"}. If the word is English, set "en" to the word itself. Keep the definition to 1-2 sentences.`;

  const env = { ...process.env };
  delete env.CLAUDECODE;

  return new Promise((resolve) => {
    const claude = spawn(
      "claude",
      ["--print", "--model", "haiku", "--output-format", "text", "--mcp-config", "{\"mcpServers\":{}}"],
      { env, stdio: ["pipe", "pipe", "pipe"] }
    );

    let stdout = "";
    let stderr = "";

    claude.stdout.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    claude.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    const timeout = setTimeout(() => {
      claude.kill();
      resolve(null);
    }, 30000);

    claude.on("close", (code: number | null) => {
      clearTimeout(timeout);
      if (code === 0) {
        try {
          const json = extractJSON(stdout);
          const parsed = JSON.parse(json);
          resolve({ ...parsed, source: "ai" });
        } catch (e) {
          console.error("Failed to parse Claude response:", stdout.slice(0, 200), e);
          resolve(null);
        }
      } else {
        console.error("Claude exited with code", code, stderr.slice(0, 200));
        resolve(null);
      }
    });

    claude.on("error", (err) => {
      clearTimeout(timeout);
      console.error("Claude spawn error:", err.message);
      resolve(null);
    });

    claude.stdin.write(prompt);
    claude.stdin.end();
  });
}

/**
 * POST /api/dictionary
 * Streams two NDJSON results: fast dictionary API first, then Claude AI.
 */
export async function POST(request: NextRequest) {
  await getCurrentUser();
  const { word, language } = await request.json();

  if (!word || typeof word !== "string" || word.trim().length === 0) {
    return NextResponse.json({ error: "word is required" }, { status: 400 });
  }

  const trimmed = word.trim();
  const isArabicMode = language === "ar";
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;

      function send(data: Record<string, unknown>) {
        if (closed) return;
        controller.enqueue(encoder.encode(JSON.stringify(data) + "\n"));
      }

      function close() {
        if (closed) return;
        closed = true;
        controller.close();
      }

      // For Arabic mode, skip free dictionary (English-only) and use only Claude
      const dictPromise = isArabicMode ? Promise.resolve(null) : lookupFreeDictionary(trimmed);
      const claudePromise = lookupClaude(trimmed, language);

      // Send dictionary result as soon as it arrives
      const dictResult = await dictPromise;
      if (dictResult) {
        send({ type: "fast", result: dictResult });
      }

      // Then send Claude result when ready
      const claudeResult = await claudePromise;
      if (claudeResult) {
        send({ type: "full", result: claudeResult });
      } else if (!dictResult) {
        send({ type: "error", error: "Could not look up this word" });
      }

      send({ type: "done" });
      close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
