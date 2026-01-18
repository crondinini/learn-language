import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import db, { Homework } from "@/lib/db";

/**
 * POST /api/homework/[id]/transcribe
 * Transcribe a homework recording using Google Cloud Speech-to-Text
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check homework exists and has a recording
    const homework = db
      .prepare("SELECT * FROM homework WHERE id = ?")
      .get(id) as Homework | undefined;

    if (!homework) {
      return NextResponse.json(
        { error: "Homework not found" },
        { status: 404 }
      );
    }

    // Support both recording_url (for recording type) and audio_url (for listening type)
    const audioUrl = homework.recording_url || homework.audio_url;
    if (!audioUrl) {
      return NextResponse.json(
        { error: "No audio to transcribe" },
        { status: 400 }
      );
    }

    // Extract filename from URL (e.g., /api/media/homework/homework-1-123456.webm)
    const filename = audioUrl.split("/").pop();
    if (!filename) {
      return NextResponse.json(
        { error: "Invalid recording URL" },
        { status: 400 }
      );
    }

    // Read the audio file
    const filepath = path.join(process.cwd(), "public", "homework", filename);
    let audioBuffer: Buffer;
    try {
      audioBuffer = await readFile(filepath);
    } catch {
      return NextResponse.json(
        { error: "Recording file not found" },
        { status: 404 }
      );
    }

    // Import and initialize Google Cloud Speech client
    const speech = await import("@google-cloud/speech");
    const client = new speech.SpeechClient();

    // Prepare the audio content (base64 encoded)
    const audioContent = audioBuffer.toString("base64");

    // Determine encoding based on file extension
    const ext = filename.split(".").pop()?.toLowerCase();
    let encoding: "WEBM_OPUS" | "MP3" | "LINEAR16" | "FLAC" | "OGG_OPUS" = "WEBM_OPUS";
    let sampleRateHertz = 48000;

    if (ext === "mp3") {
      encoding = "MP3";
      sampleRateHertz = 44100; // Common MP3 sample rate
    } else if (ext === "flac") {
      encoding = "FLAC";
      sampleRateHertz = 44100;
    } else if (ext === "ogg") {
      encoding = "OGG_OPUS";
      sampleRateHertz = 48000;
    } else if (ext === "wav") {
      encoding = "LINEAR16";
      sampleRateHertz = 44100;
    }
    // Default: webm -> WEBM_OPUS at 48000Hz

    // Configure the transcription request for Arabic
    const [response] = await client.recognize({
      audio: { content: audioContent },
      config: {
        encoding,
        sampleRateHertz,
        languageCode: "ar-SA", // Arabic (Saudi Arabia) - can also use ar-EG, ar-AE, etc.
        alternativeLanguageCodes: ["ar-EG", "ar-AE"], // Fallback dialects
        enableAutomaticPunctuation: true,
        model: "default",
      },
    });

    // Extract transcription from response
    const transcription = response.results
      ?.map((result) => result.alternatives?.[0]?.transcript || "")
      .join(" ")
      .trim();

    if (!transcription) {
      return NextResponse.json(
        { error: "No speech detected in recording", transcription: "" },
        { status: 200 }
      );
    }

    // Save transcription to database
    db.prepare("UPDATE homework SET transcription = ? WHERE id = ?").run(
      transcription,
      id
    );

    const updated = db
      .prepare("SELECT * FROM homework WHERE id = ?")
      .get(id) as Homework;

    return NextResponse.json({
      message: "Transcription successful",
      transcription,
      homework: updated,
    });
  } catch (error) {
    console.error("Error transcribing recording:", error);
    return NextResponse.json(
      { error: "Failed to transcribe recording" },
      { status: 500 }
    );
  }
}
