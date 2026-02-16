import { NextRequest } from "next/server";
import { createGeneration } from "@/lib/generations";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { words, instructions } = body;

  if (!words || !Array.isArray(words) || words.length === 0) {
    return new Response(JSON.stringify({ error: "words array is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const apiToken = process.env.API_TOKEN;
  const apiUrl = process.env.API_URL || "https://learn.rocksbythesea.uk";
  const claudeProxyUrl = process.env.CLAUDE_PROXY_URL || "http://host.docker.internal:9876";

  const prompt = `You are a vocabulary generation assistant. Your task is to translate English words to Arabic (MSA) and add them to the flashcard system.
${instructions ? `\nAdditional instructions from the user:\n${instructions}\n` : ""}
Here are the English words to process:
${words.join(", ")}

Follow these steps:

1. First, check for duplicates by searching each word:
   For each word, run: curl -s -H "Authorization: Bearer ${apiToken}" "${apiUrl}/api/vocab?search=WORD"
   Check if the word already exists in any card's "back" field.

2. For each non-duplicate word, determine the Arabic translation (MSA / Modern Standard Arabic). Include diacritics (tashkeel) when possible.

3. Fetch available decks:
   curl -s -H "Authorization: Bearer ${apiToken}" "${apiUrl}/api/decks"

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

Do NOT ask for confirmation. Just do it.`;

  // Call the claude proxy running on the host machine
  let proxyResponse: Response;
  try {
    proxyResponse = await fetch(claudeProxyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiToken}`,
      },
      body: JSON.stringify({ prompt }),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({
        error: `Failed to connect to Claude proxy at ${claudeProxyUrl}. Is claude-proxy running on the host? Error: ${msg}`,
      }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!proxyResponse.ok) {
    const text = await proxyResponse.text();
    return new Response(
      JSON.stringify({ error: `Claude proxy error: ${proxyResponse.status} - ${text}` }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!proxyResponse.body) {
    return new Response(
      JSON.stringify({ error: "No response body from Claude proxy" }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  // Stream the proxy response through to the client, processing events along the way
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const reader = proxyResponse.body.getReader();
  let capturedSessionId = "";

  const stream = new ReadableStream({
    async start(controller) {
      // Redact secrets from output sent to the browser
      const secrets = [apiToken].filter(Boolean) as string[];
      function redact(str: string): string {
        let result = str;
        for (const secret of secrets) {
          result = result.replaceAll(secret, "***");
        }
        return result;
      }

      let buffer = "";
      let closed = false;

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

      send({ type: "status", content: "Starting Claude..." });

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
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
                  });
                } catch (e) {
                  console.error("Failed to save generation:", e);
                }
              }
              // Status/error events from proxy
              else if (event.type === "status" || event.type === "error") {
                send(event);
              }
            } catch {
              // Not JSON, pass through
              send({ type: "raw", content: line });
            }
          }
        }

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
                });
              } catch (e) {
                console.error("Failed to save generation:", e);
              }
            }
          } catch {
            send({ type: "raw", content: buffer });
          }
        }

        send({ type: "done", code: 0 });
        closeStream();
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Stream error";
        send({ type: "error", content: msg });
        closeStream();
      }
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
