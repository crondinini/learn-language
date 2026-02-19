import { NextRequest } from "next/server";
import { spawn } from "child_process";
import { getLessonById, updateLesson } from "@/lib/lessons";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const lesson = getLessonById(Number(id));

  if (!lesson) {
    return new Response(JSON.stringify({ error: "Lesson not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!lesson.transcript.trim()) {
    return new Response(JSON.stringify({ error: "Lesson has no transcript" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const prompt = `You are an Arabic language learning assistant. You will be given a transcript from an Arabic class. Your job is to:

1. Write a concise **summary** of what was covered in the class (2-4 paragraphs)
2. Extract **grammar notes** — key grammar points, rules, and patterns that were taught or practiced

Format your response EXACTLY as follows (use these exact headers):

## Summary
[Your summary here]

## Grammar Notes
[Your grammar notes here, using bullet points]

Here is the class transcript:

---
${lesson.transcript}
---

Write the summary and grammar notes in English, but include Arabic examples with transliteration where relevant.`;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const env = { ...process.env };
      delete env.CLAUDECODE;

      const TIMEOUT_MS = 5 * 60 * 1000;

      const claude = spawn(
        "claude",
        [
          "--print",
          "--verbose",
          "--output-format",
          "stream-json",
          "--include-partial-messages",
          "--model",
          "sonnet",
        ],
        { env, stdio: ["pipe", "pipe", "pipe"] }
      );

      claude.stdin.write(prompt);
      claude.stdin.end();

      const timeout = setTimeout(() => {
        claude.kill();
        send({ type: "error", content: "Process timed out after 5 minutes" });
        closeStream();
      }, TIMEOUT_MS);

      let buffer = "";
      let closed = false;
      let fullText = "";

      function send(event: Record<string, unknown>) {
        if (closed) return;
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      }

      function closeStream() {
        if (closed) return;
        closed = true;
        controller.close();
      }

      function saveSummary(text: string) {
        const summaryMatch = text.match(/## Summary\s*\n([\s\S]*?)(?=## Grammar Notes|$)/i);
        const grammarMatch = text.match(/## Grammar Notes\s*\n([\s\S]*?)$/i);

        const summary = summaryMatch ? summaryMatch[1].trim() : text;
        const grammarNotes = grammarMatch ? grammarMatch[1].trim() : null;

        try {
          updateLesson(Number(id), { summary, grammar_notes: grammarNotes });
        } catch (e) {
          console.error("Failed to save summary:", e);
        }
      }

      send({ type: "status", content: "Starting summarization..." });

      claude.stdout.on("data", (data: Buffer) => {
        buffer += data.toString();
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line);

            if (event.type === "stream_event") {
              const se = event.event;
              if (se.type === "content_block_delta" && se.delta?.type === "text_delta") {
                fullText += se.delta.text;
                send({ type: "delta", content: se.delta.text });
              }
            } else if (event.type === "result") {
              fullText = event.result || fullText;
              saveSummary(fullText);
              send({
                type: "result",
                content: event.result,
                cost: event.total_cost_usd,
                duration: event.duration_ms,
              });
            }
          } catch {
            // ignore parse errors
          }
        }
      });

      claude.stderr.on("data", (data: Buffer) => {
        const msg = data.toString().trim();
        if (msg) send({ type: "status", content: msg });
      });

      claude.on("close", () => {
        clearTimeout(timeout);
        if (buffer.trim()) {
          try {
            const event = JSON.parse(buffer);
            if (event.type === "result") {
              fullText = event.result || fullText;
              saveSummary(fullText);
              send({
                type: "result",
                content: event.result,
                cost: event.total_cost_usd,
                duration: event.duration_ms,
              });
            }
          } catch {
            // ignore
          }
        }
        send({ type: "done" });
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
