import { NextRequest } from "next/server";
import { spawn } from "child_process";
import db from "@/lib/db";
import { getLessonById, updateLesson, linkCardsToLesson } from "@/lib/lessons";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idStr } = await params;
  const lessonId = Number(idStr);
  const lesson = getLessonById(lessonId);

  if (!lesson) {
    return new Response(JSON.stringify({ error: "Lesson not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await request.json();
  const { message } = body;

  if (!message || typeof message !== "string") {
    return new Response(JSON.stringify({ error: "message is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const apiToken = process.env.API_TOKEN;
  const apiUrl = process.env.API_URL || "https://learn.rocksbythesea.uk";

  const isResume = !!lesson.session_id;

  // Build the prompt — for first message, include context; for follow-ups, just the message
  let prompt: string;
  if (!isResume) {
    prompt = `You are a vocabulary card generation assistant for an Arabic learning app. You have access to a class transcript and summary. Your job is to create flashcards based on the user's instructions.

CONTEXT:
- Class title: ${lesson.title}
- Date: ${lesson.lesson_date}

${lesson.summary ? `SUMMARY:\n${lesson.summary}\n` : ""}
${lesson.grammar_notes ? `GRAMMAR NOTES:\n${lesson.grammar_notes}\n` : ""}
TRANSCRIPT:
${lesson.transcript}

INSTRUCTIONS FOR CREATING CARDS:
1. First, fetch available decks:
   curl -s -H "Authorization: Bearer ${apiToken}" "${apiUrl}/api/decks"

2. For each card, choose the most appropriate deck (Nouns, Verbs, Adjectives, etc.)

3. Add cards in bulk to the appropriate deck:
   curl -X POST "${apiUrl}/api/decks/{deck_id}/cards" \\
     -H "Content-Type: application/json" \\
     -H "Authorization: Bearer ${apiToken}" \\
     -d '[{"front": "...", "back": "...", "notes": "optional context"}]'

   CARD FORMAT RULES:
   - Vocabulary cards: front = Arabic word with diacritics, back = English translation
   - Grammar cards: front = English question that tests the grammar concept (e.g. "What case is used for the subject of a sentence?" or "What noun form do numbers 3-10 require?"), back = the answer with Arabic terms and examples. Do NOT put Arabic grammar terminology as the front — the student should be quizzed with an English question and recall the Arabic grammar rule.

4. At the end, output a summary:
   SUMMARY:
   - Added: [list of "arabic (english)" pairs]
   - Deck: [deck name(s) used]

USER REQUEST: ${message}

Do NOT ask for confirmation. Just create the cards.`;
  } else {
    prompt = message;
  }

  // Snapshot ALL card IDs before generation so we can diff after to find newly created ones
  const cardIdsBefore = getAllCardIds();

  const encoder = new TextEncoder();
  const secrets = [apiToken].filter(Boolean) as string[];

  const stream = new ReadableStream({
    start(controller) {
      const env = { ...process.env };
      delete env.CLAUDECODE;

      const TIMEOUT_MS = 10 * 60 * 1000;

      const args = [
        "--print",
        "--verbose",
        "--allowedTools",
        "Bash",
        "--output-format",
        "stream-json",
        "--include-partial-messages",
        "--model",
        "sonnet",
      ];

      if (isResume && lesson.session_id) {
        args.push("--resume", lesson.session_id);
      }

      const claude = spawn("claude", args, {
        env,
        stdio: ["pipe", "pipe", "pipe"],
      });

      claude.stdin.write(prompt);
      claude.stdin.end();

      const timeout = setTimeout(() => {
        claude.kill();
        send({ type: "error", content: "Process timed out after 10 minutes" });
        closeStream();
      }, TIMEOUT_MS);

      let buffer = "";
      let closed = false;
      let capturedSessionId = lesson.session_id || "";

      function redact(str: string): string {
        let result = str;
        for (const secret of secrets) {
          result = result.replaceAll(secret, "***");
        }
        return result;
      }

      function send(event: Record<string, unknown>) {
        if (closed) return;
        controller.enqueue(encoder.encode(redact(JSON.stringify(event)) + "\n"));
      }

      function closeStream() {
        if (closed) return;
        closed = true;
        controller.close();
      }

      function linkNewCards() {
        try {
          // Get all card IDs now and find new ones
          const allCardIds = getAllCardIds();
          const newCardIds = allCardIds.filter((cid) => !cardIdsBefore.includes(cid));
          if (newCardIds.length > 0) {
            linkCardsToLesson(lessonId, newCardIds);
            send({ type: "cards_linked", count: newCardIds.length });
          }
        } catch (e) {
          console.error("Failed to link cards:", e);
        }
      }

      send({ type: "status", content: "Starting card generation..." });

      claude.stdout.on("data", (data: Buffer) => {
        buffer += data.toString();
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line);

            if (event.type === "system" && event.subtype === "init") {
              capturedSessionId = event.session_id || capturedSessionId;
              send({ type: "init", sessionId: event.session_id });
            } else if (event.type === "stream_event") {
              const se = event.event;
              if (se.type === "content_block_delta" && se.delta?.type === "text_delta") {
                send({ type: "delta", content: se.delta.text });
              } else if (se.type === "content_block_start" && se.content_block?.type === "tool_use") {
                send({ type: "tool_start", tool: se.content_block.name, toolId: se.content_block.id });
              } else if (se.type === "content_block_stop") {
                send({ type: "block_end" });
              }
            } else if (event.type === "assistant" && event.message?.content) {
              for (const block of event.message.content) {
                if (block.type === "tool_use") {
                  send({
                    type: "tool",
                    tool: block.name,
                    input: typeof block.input === "string" ? block.input : JSON.stringify(block.input, null, 2),
                  });
                }
              }
            } else if (event.type === "result") {
              // Save session_id for future resumes
              const sessionId = event.session_id || capturedSessionId;
              try {
                updateLesson(lessonId, { session_id: sessionId });
              } catch (e) {
                console.error("Failed to save session_id:", e);
              }
              linkNewCards();
              send({
                type: "result",
                content: event.result,
                sessionId,
                cost: event.total_cost_usd,
                duration: event.duration_ms,
              });
            }
          } catch {
            send({ type: "raw", content: line });
          }
        }
      });

      claude.stderr.on("data", (data: Buffer) => {
        const msg = data.toString().trim();
        if (msg) send({ type: "status", content: msg });
      });

      claude.on("close", (code: number | null) => {
        clearTimeout(timeout);
        if (buffer.trim()) {
          try {
            const event = JSON.parse(buffer);
            if (event.type === "result") {
              const sessionId = event.session_id || capturedSessionId;
              try {
                updateLesson(lessonId, { session_id: sessionId });
              } catch (e) {
                console.error("Failed to save session_id:", e);
              }
              linkNewCards();
              send({
                type: "result",
                content: event.result,
                sessionId,
                cost: event.total_cost_usd,
                duration: event.duration_ms,
              });
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

/** Get all card IDs from the database */
function getAllCardIds(): number[] {
  const rows = db.prepare("SELECT id FROM cards ORDER BY id").all() as { id: number }[];
  return rows.map((r) => r.id);
}
