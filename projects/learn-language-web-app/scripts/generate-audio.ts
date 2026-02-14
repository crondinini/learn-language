#!/usr/bin/env npx tsx
/**
 * Generate audio from mixed Arabic/English text using ElevenLabs
 * Perfect for language learning content with code-switching
 *
 * Usage:
 *   npx tsx scripts/generate-audio.ts script.txt -o lesson.mp3
 *   npx tsx scripts/generate-audio.ts -o lesson.mp3  # reads from stdin
 */

import { writeFile, mkdir, readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

// Load environment variables from .env.local
async function loadEnv() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (existsSync(envPath)) {
    const content = await readFile(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const [key, ...valueParts] = trimmed.split("=");
        const value = valueParts.join("=").replace(/^["']|["']$/g, "");
        if (key && !process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  }
}

const DEFAULT_VOICE_ID = "pMsXgVXv3BLzUgSXRplE";

async function generateWithElevenLabs(text: string, voiceId: string): Promise<Buffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY not set in .env.local");
  }

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
  }

  const audioBuffer = await response.arrayBuffer();
  return Buffer.from(audioBuffer);
}

function parseArgs(args: string[], defaultVoice: string) {
  const result = {
    input: "",
    output: "output.mp3",
    voice: defaultVoice,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "-o" || arg === "--output") {
      result.output = args[++i];
    } else if (arg === "-v" || arg === "--voice") {
      result.voice = args[++i];
    } else if (arg === "-h" || arg === "--help") {
      console.log(`
Generate audio from mixed Arabic/English text using ElevenLabs

Usage:
  npx tsx scripts/generate-audio.ts <input-file> [options]
  npx tsx scripts/generate-audio.ts [options] < script.txt
  echo "مرحبا hello" | npx tsx scripts/generate-audio.ts -o greeting.mp3

Options:
  -o, --output <file>   Output MP3 file (default: output.mp3)
  -v, --voice <id>      ElevenLabs voice ID (default: ${defaultVoice})
  -h, --help            Show this help

Examples:
  npx tsx scripts/generate-audio.ts script.txt -o lesson.mp3
  npx tsx scripts/generate-audio.ts script.txt -v pMsXgVXv3BLzUgSXRplE
  cat script.txt | npx tsx scripts/generate-audio.ts -o lesson.mp3
`);
      process.exit(0);
    } else if (!arg.startsWith("-")) {
      result.input = arg;
    }
  }

  return result;
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf-8");
}

async function main() {
  await loadEnv();
  const voiceId = process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID;
  const args = parseArgs(process.argv.slice(2), voiceId);

  // Read text from file or stdin
  let text: string;
  if (args.input) {
    const inputPath = path.resolve(args.input);
    if (!existsSync(inputPath)) {
      console.error(`Error: File not found: ${inputPath}`);
      process.exit(1);
    }
    text = await readFile(inputPath, "utf-8");
  } else if (!process.stdin.isTTY) {
    text = await readStdin();
  } else {
    console.error("Error: No input provided");
    console.error("Usage: npx tsx scripts/generate-audio.ts <input-file> [-o output.mp3]");
    console.error("   or: cat script.txt | npx tsx scripts/generate-audio.ts -o output.mp3");
    process.exit(1);
  }

  text = text.trim();
  if (!text) {
    console.error("Error: Empty input");
    process.exit(1);
  }

  const outputPath = path.resolve(args.output);
  const outputDir = path.dirname(outputPath);

  // Ensure output directory exists
  if (!existsSync(outputDir)) {
    await mkdir(outputDir, { recursive: true });
  }

  console.log(`Input: ${text.length} characters`);
  console.log(`Voice: ${args.voice}`);
  console.log(`Output: ${outputPath}`);
  console.log();
  console.log("Generating audio...");

  try {
    const audioBuffer = await generateWithElevenLabs(text, args.voice);
    await writeFile(outputPath, audioBuffer);
    console.log(`Done! Saved to: ${outputPath}`);
  } catch (error) {
    console.error("Error generating audio:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
