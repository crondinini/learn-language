import { NextRequest } from "next/server";
import { spawn } from "child_process";
import { createGeneration } from "@/lib/generations";
import { getCurrentUser } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  const body = await request.json();
  const { words, instructions, language } = body;
  const lang = language || "ar";

  if (!words || !Array.isArray(words) || words.length === 0) {
    return new Response(JSON.stringify({ error: "words array is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const apiToken = process.env.API_TOKEN;
  const apiUrl = process.env.API_URL || "https://learn.rocksbythesea.uk";

  const languageNames: Record<string, string> = {
    ar: "Arabic (MSA / Modern Standard Arabic)",
    en: "English",
    fr: "French",
    es: "Spanish",
    de: "German",
    it: "Italian",
    pt: "Portuguese",
    ja: "Japanese",
    zh: "Chinese (Mandarin)",
    ko: "Korean",
  };
  const targetLangName = languageNames[lang] || lang;
  const isArabic = lang === "ar";

  const prompt = isArabic
    ? `You are a vocabulary generation assistant. Your task is to translate English words to Arabic (MSA) and add them to the flashcard system.
${instructions ? `\nAdditional instructions from the user:\n${instructions}\n` : ""}
Here are the English words to process:
${words.join(", ")}

Follow these steps:

1. First, check for duplicates by searching each word:
   For each word, run: curl -s -H "Authorization: Bearer ${apiToken}" "${apiUrl}/api/vocab?search=WORD&language=ar"
   Check if the word already exists in any card's "back" field.

2. For each non-duplicate word, determine the Arabic translation (MSA / Modern Standard Arabic). Include diacritics (tashkeel) when possible.

3. Fetch available decks:
   curl -s -H "Authorization: Bearer ${apiToken}" "${apiUrl}/api/decks?language=ar"

4. Choose the most appropriate deck based on word types:
   - Nouns → Nouns deck
   - Adjectives → Adjectives deck
   - Verbs → Verbs deck
   - Mixed/other → pick the best fit

5. Add all new words to the chosen deck in a single bulk request:
   curl -X POST "${apiUrl}/api/decks/{deck_id}/cards" \\
     -H "Content-Type: application/json" \\
     -H "Authorization: Bearer ${apiToken}" \\
     -d '[{"front": "Arabic word", "back": "English word"}, ...]'

   Remember: front = Arabic, back = English.

6. At the end, output a summary in this exact format:
   SUMMARY:
   - Added: [list of "arabic (english)" pairs that were added]
   - Duplicates: [list of words that were skipped]
   - Deck: [name of deck used]

Do NOT ask for confirmation. Just do it.`
    : `You are a vocabulary generation assistant. Your task is to create ${targetLangName} flashcards and add them to the flashcard system.
${instructions ? `\nAdditional instructions from the user:\n${instructions}\n` : ""}
Here are the words to process:
${words.join(", ")}

Follow these steps:

1. First, check for duplicates by searching each word:
   For each word, run: curl -s -H "Authorization: Bearer ${apiToken}" "${apiUrl}/api/vocab?search=WORD&language=${lang}"
   Check if the word already exists in any card's "front" or "back" field.

2. For each non-duplicate word, create a flashcard with "front" as the word/phrase to learn and "back" as the definition, translation, or explanation.

3. Fetch available decks:
   curl -s -H "Authorization: Bearer ${apiToken}" "${apiUrl}/api/decks?language=${lang}"

4. Choose the most appropriate deck for the words. If no suitable deck exists, create one:
   curl -X POST "${apiUrl}/api/decks" \\
     -H "Content-Type: application/json" \\
     -H "Authorization: Bearer ${apiToken}" \\
     -d '{"name": "Deck Name", "language": "${lang}"}'

5. Add all new words to the chosen deck in a single bulk request:
   curl -X POST "${apiUrl}/api/decks/{deck_id}/cards" \\
     -H "Content-Type: application/json" \\
     -H "Authorization: Bearer ${apiToken}" \\
     -d '[{"front": "word to learn", "back": "definition/translation"}, ...]'

6. At the end, output a summary in this exact format:
   SUMMARY:
   - Added: [list of "front (back)" pairs that were added]
   - Duplicates: [list of words that were skipped]
   - Deck: [name of deck used]

Do NOT ask for confirmation. Just do it.`;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const env = { ...process.env };
      delete env.CLAUDECODE;

      const TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

      const claude = spawn(
        "claude",
        [
          "--print",
          "--verbose",
          "--allowedTools",
          "Bash",
          "--output-format",
          "stream-json",
          "--include-partial-messages",
          "--model",
          "sonnet",
        ],
        { env, stdio: ["pipe", "pipe", "pipe"] }
      );

      // Pass prompt via stdin
      claude.stdin.write(prompt);
      claude.stdin.end();

      const timeout = setTimeout(() => {
        claude.kill();
        controller.enqueue(
          encoder.encode(
            JSON.stringify({
              type: "error",
              content: "Process timed out after 10 minutes",
            }) + "\n"
          )
        );
        closeStream();
      }, TIMEOUT_MS);

      let buffer = "";
      let closed = false;
      let capturedSessionId = "";

      // Redact secrets from output sent to the browser
      const secrets = [apiToken].filter(Boolean) as string[];
      function redact(str: string): string {
        let result = str;
        for (const secret of secrets) {
          result = result.replaceAll(secret, "***");
        }
        return result;
      }

      function send(event: Record<string, unknown>) {
        if (closed) return;
        controller.enqueue(
          encoder.encode(redact(JSON.stringify(event)) + "\n")
        );
      }

      function closeStream() {
        if (closed) return;
        closed = true;
        controller.close();
      }

      // Send an immediate status so the client knows we've started
      send({ type: "status", content: "Starting Claude..." });

      claude.stdout.on("data", (data: Buffer) => {
        buffer += data.toString();
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line);

            // Init event - extract session_id
            if (event.type === "system" && event.subtype === "init") {
              capturedSessionId = event.session_id || "";
              send({
                type: "init",
                sessionId: event.session_id,
              });
            }
            // Real-time text streaming
            else if (event.type === "stream_event") {
              const se = event.event;
              if (
                se.type === "content_block_delta" &&
                se.delta?.type === "text_delta"
              ) {
                send({ type: "delta", content: se.delta.text });
              } else if (
                se.type === "content_block_start" &&
                se.content_block?.type === "tool_use"
              ) {
                send({
                  type: "tool_start",
                  tool: se.content_block.name,
                  toolId: se.content_block.id,
                });
              } else if (se.type === "content_block_stop") {
                send({ type: "block_end" });
              }
            }
            // Complete assistant message (tool use details)
            else if (event.type === "assistant" && event.message?.content) {
              for (const block of event.message.content) {
                if (block.type === "tool_use") {
                  send({
                    type: "tool",
                    tool: block.name,
                    input:
                      typeof block.input === "string"
                        ? block.input
                        : JSON.stringify(block.input, null, 2),
                  });
                }
              }
            }
            // Final result
            else if (event.type === "result") {
              send({
                type: "result",
                content: event.result,
                sessionId: event.session_id,
                cost: event.total_cost_usd,
                duration: event.duration_ms,
              });
              try {
                createGeneration({
                  session_id: event.session_id || capturedSessionId,
                  input_words: words,
                  result: event.result,
                  cost: event.total_cost_usd,
                  duration: event.duration_ms,
                }, user.id);
              } catch (e) {
                console.error("Failed to save generation:", e);
              }
            }
          } catch {
            // Not JSON, pass through
            send({ type: "raw", content: line });
          }
        }
      });

      claude.stderr.on("data", (data: Buffer) => {
        const msg = data.toString().trim();
        if (msg) {
          send({ type: "status", content: msg });
        }
      });

      claude.on("close", (code: number | null) => {
        clearTimeout(timeout);
        // Flush remaining buffer
        if (buffer.trim()) {
          try {
            const event = JSON.parse(buffer);
            if (event.type === "result") {
              send({
                type: "result",
                content: event.result,
                sessionId: event.session_id,
                cost: event.total_cost_usd,
                duration: event.duration_ms,
              });
              try {
                createGeneration({
                  session_id: event.session_id || capturedSessionId,
                  input_words: words,
                  result: event.result,
                  cost: event.total_cost_usd,
                  duration: event.duration_ms,
                }, user.id);
              } catch (e) {
                console.error("Failed to save generation:", e);
              }
            }
          } catch {
            send({ type: "raw", content: buffer });
          }
        }
        send({ type: "done", code });
        closeStream();
      });

      claude.on("error", (err: Error) => {
        clearTimeout(timeout);
        send({ type: "error", content: err.message });
        closeStream();
      });
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
