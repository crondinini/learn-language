/**
 * Transcribe audio using ElevenLabs Scribe v2 API.
 * Telegram sends voice messages as OGG/Opus.
 */

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || "";

interface ScribeResponse {
  text: string;
  language_code: string;
}

/**
 * Transcribe an audio buffer using ElevenLabs Speech-to-Text.
 */
export async function transcribeAudio(audioBuffer: Buffer): Promise<string> {
  const formData = new FormData();
  formData.append("file", new Blob([new Uint8Array(audioBuffer)], { type: "audio/ogg" }), "voice.ogg");
  formData.append("model_id", "scribe_v2");
  formData.append("language_code", "ar");
  formData.append("tag_audio_events", "false");

  const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
    method: "POST",
    headers: {
      "xi-api-key": ELEVENLABS_API_KEY,
    },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`ElevenLabs STT failed (${res.status}): ${err}`);
  }

  const data: ScribeResponse = await res.json();
  return data.text;
}
