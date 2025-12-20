import { readFile } from "fs/promises";
import path from "path";

async function transcribeAudio() {
  const filepath = path.join(process.cwd(), "tts", "homework-audio.m4a");
  
  console.log("Reading audio file:", filepath);
  const audioBuffer = await readFile(filepath);
  
  // Import and initialize Google Cloud Speech client
  const speech = await import("@google-cloud/speech");
  const client = new speech.SpeechClient({
    keyFilename: path.join(process.cwd(), "tts", "focal-shape-480400-t0-6cbc4f6540d0.json")
  });
  
  // Prepare the audio content (base64 encoded)
  const audioContent = audioBuffer.toString("base64");
  
  console.log("Sending to Google Speech-to-Text API...");
  
  // Configure the transcription request for Arabic
  // M4A files use AAC encoding
  const [response] = await client.recognize({
    audio: { content: audioContent },
    config: {
      encoding: "MP3", // M4A/AAC can sometimes work with MP3 encoding setting
      sampleRateHertz: 44100, // Common for M4A files
      languageCode: "ar-SA", // Arabic (Saudi Arabia)
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
  
  console.log("\n=== Transcription ===");
  console.log(transcription || "(No speech detected)");
  console.log("=====================\n");
}

transcribeAudio().catch(console.error);
