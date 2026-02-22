import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";
import readline from "readline";

/**
 * GET /api/sessions/[id]
 *
 * Returns the Claude Code conversation transcript for a given session ID.
 * Useful for debugging card generation sessions.
 *
 * Looks for session files in ~/.claude/projects/{encoded-cwd}/{sessionId}.jsonl
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;

  // Validate session ID format (UUID)
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(sessionId)) {
    return NextResponse.json({ error: "Invalid session ID format" }, { status: 400 });
  }

  // Find the session file — search all project directories under ~/.claude/projects/
  const claudeProjectsDir = path.join(os.homedir(), ".claude", "projects");

  if (!fs.existsSync(claudeProjectsDir)) {
    return NextResponse.json({ error: "Claude projects directory not found" }, { status: 404 });
  }

  let sessionFile: string | null = null;

  const projectDirs = fs.readdirSync(claudeProjectsDir);
  for (const dir of projectDirs) {
    const candidate = path.join(claudeProjectsDir, dir, `${sessionId}.jsonl`);
    if (fs.existsSync(candidate)) {
      sessionFile = candidate;
      break;
    }
  }

  if (!sessionFile) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Parse the JSONL file and extract conversation messages
  const messages: Array<{
    type: string;
    role?: string;
    content: Array<{
      type: string;
      text?: string;
      name?: string;
      input?: unknown;
      content?: unknown;
    }>;
    timestamp?: string;
    uuid?: string;
  }> = [];

  const fileStream = fs.createReadStream(sessionFile);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const entry = JSON.parse(line);
      const entryType = entry.type;

      // Skip file-history-snapshot entries
      if (entryType === "file-history-snapshot") continue;

      if (entryType === "user" || entryType === "assistant") {
        const msg = entry.message;
        if (!msg || !msg.content) continue;

        const contentBlocks: Array<{
          type: string;
          text?: string;
          name?: string;
          input?: unknown;
          content?: unknown;
        }> = [];

        for (const block of msg.content) {
          if (typeof block === "string") {
            contentBlocks.push({ type: "text", text: block });
          } else if (block.type === "text") {
            contentBlocks.push({ type: "text", text: block.text });
          } else if (block.type === "tool_use") {
            contentBlocks.push({
              type: "tool_use",
              name: block.name,
              input: block.input,
            });
          } else if (block.type === "tool_result") {
            // Summarize tool results to avoid huge payloads
            let resultContent: unknown;
            if (typeof block.content === "string") {
              resultContent = block.content.length > 2000
                ? block.content.slice(0, 2000) + `... (${block.content.length} chars total)`
                : block.content;
            } else if (Array.isArray(block.content)) {
              resultContent = block.content.map((c: { type: string; text?: string }) => {
                if (c.type === "text" && typeof c.text === "string" && c.text.length > 2000) {
                  return { ...c, text: c.text.slice(0, 2000) + `... (${c.text.length} chars total)` };
                }
                return c;
              });
            } else {
              resultContent = block.content;
            }
            contentBlocks.push({
              type: "tool_result",
              name: block.tool_use_id,
              content: resultContent,
            });
          }
        }

        messages.push({
          type: entryType,
          role: msg.role,
          content: contentBlocks,
          timestamp: entry.timestamp,
          uuid: entry.uuid,
        });
      }
    } catch {
      // Skip malformed lines
    }
  }

  return NextResponse.json({
    sessionId,
    messageCount: messages.length,
    messages,
  });
}
