#!/usr/bin/env node

/**
 * Claude Proxy - runs on the HOST machine (outside Docker).
 * Listens for HTTP requests from the Docker container and spawns the local `claude` CLI.
 * This lets the containerized app use the host's authenticated Claude CLI session.
 *
 * Usage:
 *   API_TOKEN=your-token node scripts/claude-proxy.js
 *   # or with systemd (see claude-proxy.service)
 *
 * Environment:
 *   API_TOKEN       - Required. Must match the app's API_TOKEN for auth.
 *   CLAUDE_PROXY_PORT - Port to listen on (default: 9876)
 */

const http = require("http");
const { spawn } = require("child_process");

const PORT = parseInt(process.env.CLAUDE_PROXY_PORT || "9876", 10);
const AUTH_TOKEN = process.env.API_TOKEN;

if (!AUTH_TOKEN) {
  console.error("ERROR: API_TOKEN environment variable is required");
  process.exit(1);
}

const server = http.createServer((req, res) => {
  if (req.method !== "POST") {
    res.writeHead(405, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  // Auth check
  const auth = req.headers.authorization;
  if (auth !== `Bearer ${AUTH_TOKEN}`) {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Unauthorized" }));
    return;
  }

  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", () => {
    let parsed;
    try {
      parsed = JSON.parse(body);
    } catch {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid JSON" }));
      return;
    }

    const { prompt } = parsed;
    if (!prompt) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "prompt is required" }));
      return;
    }

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    });

    const env = { ...process.env };
    delete env.CLAUDECODE;

    const claude = spawn(
      "claude",
      [
        "--print",
        "--verbose",
        "--dangerously-skip-permissions",
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
      res.write(
        JSON.stringify({ type: "error", content: "Process timed out after 10 minutes" }) + "\n"
      );
      res.end();
    }, 10 * 60 * 1000);

    claude.stdout.on("data", (data) => {
      res.write(data);
    });

    claude.stderr.on("data", (data) => {
      const msg = data.toString().trim();
      if (msg) {
        res.write(JSON.stringify({ type: "status", content: msg }) + "\n");
      }
    });

    claude.on("close", () => {
      clearTimeout(timeout);
      res.end();
    });

    claude.on("error", (err) => {
      clearTimeout(timeout);
      res.write(
        JSON.stringify({ type: "error", content: err.message }) + "\n"
      );
      res.end();
    });

    // Handle client disconnect
    req.on("close", () => {
      clearTimeout(timeout);
      claude.kill();
    });
  });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Claude proxy listening on 127.0.0.1:${PORT}`);
});
