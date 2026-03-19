// TTS Provider config
const TTS_PROVIDER = process.env.TTS_PROVIDER || "elevenlabs"; // "google" or "elevenlabs"

// ElevenLabs config
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ARABIC_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "pMsXgVXv3BLzUgSXRplE";
const ENGLISH_VOICE_ID = process.env.ELEVENLABS_ENGLISH_VOICE_ID || "21m00Tcm4TlvDq8ikWAM"; // Rachel

// Language-specific config
const GOOGLE_LANGUAGE_CODES: Record<string, string> = {
  ar: "ar-XA",
  en: "en-US",
};

/**
 * Generate audio using Google Cloud TTS
 */
export async function generateWithGoogle(text: string, language: string = "ar"): Promise<Buffer> {
  const textToSpeech = await import("@google-cloud/text-to-speech");
  const client = new textToSpeech.TextToSpeechClient();

  const request = {
    input: { text },
    voice: {
      languageCode: GOOGLE_LANGUAGE_CODES[language] || language,
      ssmlGender: "MALE" as const,
    },
    audioConfig: { audioEncoding: "MP3" as const },
  };

  const [response] = await client.synthesizeSpeech(request);
  return Buffer.from(response.audioContent as Uint8Array);
}

/**
 * Generate audio using ElevenLabs
 */
export async function generateWithElevenLabs(text: string, language: string = "ar"): Promise<Buffer> {
  if (!ELEVENLABS_API_KEY) {
    throw new Error("ElevenLabs API key not configured");
  }

  const voiceId = language === "en" ? ENGLISH_VOICE_ID : ARABIC_VOICE_ID;

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": ELEVENLABS_API_KEY,
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

/**
 * Generate TTS audio using the configured provider
 */
export async function generateTTSAudio(text: string, language: string = "ar"): Promise<Buffer> {
  if (TTS_PROVIDER === "google") {
    return generateWithGoogle(text, language);
  }
  return generateWithElevenLabs(text, language);
}

export { TTS_PROVIDER };
