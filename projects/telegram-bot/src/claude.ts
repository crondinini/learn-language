/**
 * Spawn Claude CLI to generate Arabic conversation messages.
 * Uses the same pattern as learn-language-web-app.
 */

import { spawn } from "child_process";

export function askClaude(prompt: string, model = "haiku"): Promise<string> {
  const env = { ...process.env };
  delete env.CLAUDECODE;

  return new Promise((resolve, reject) => {
    const claude = spawn(
      "claude",
      ["--print", "--model", model, "--output-format", "text"],
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
      reject(new Error(`Claude timed out after 120 seconds. stderr: ${stderr.slice(0, 300)}`));
    }, 120_000);

    claude.on("close", (code: number | null) => {
      clearTimeout(timeout);
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        reject(new Error(`Claude exited with code ${code}: ${stderr.slice(0, 200)}`));
      }
    });

    claude.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    claude.stdin.write(prompt);
    claude.stdin.end();
  });
}
