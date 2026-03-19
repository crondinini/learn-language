/**
 * Web Speech API utility for text-to-speech
 */

// Language-specific voice preferences
const VOICE_PREFERENCES: Record<string, string[]> = {
  ar: ["ar-SA", "ar-EG", "ar"],
  en: ["en-US", "en-GB", "en"],
};

// Check if speech synthesis is available
export function isSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

// Get available voices for a language
export function getVoicesForLanguage(language: string = "ar"): SpeechSynthesisVoice[] {
  if (!isSpeechSupported()) return [];

  const voices = window.speechSynthesis.getVoices();
  return voices.filter((voice) => voice.lang.startsWith(language));
}

// Get the best available voice for a language
export function getBestVoice(language: string = "ar"): SpeechSynthesisVoice | null {
  const voices = getVoicesForLanguage(language);

  if (voices.length === 0) return null;

  const preferred = VOICE_PREFERENCES[language] || [language];

  for (const lang of preferred) {
    const voice = voices.find((v) => v.lang === lang || v.lang.startsWith(lang));
    if (voice) return voice;
  }

  return voices[0];
}

// Backward-compatible aliases
export const getArabicVoices = () => getVoicesForLanguage("ar");
export const getBestArabicVoice = () => getBestVoice("ar");

// Speak text in a given language
export function speakText(
  text: string,
  language: string = "ar",
  options?: {
    rate?: number;
    pitch?: number;
    volume?: number;
    onEnd?: () => void;
    onError?: (error: string) => void;
  }
): SpeechSynthesisUtterance | null {
  if (!isSpeechSupported()) {
    options?.onError?.("Speech synthesis not supported in this browser");
    return null;
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);

  const voice = getBestVoice(language);
  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang;
  } else {
    const fallbacks: Record<string, string> = { ar: "ar-SA", en: "en-US" };
    utterance.lang = fallbacks[language] || language;
  }

  utterance.rate = options?.rate ?? 0.9;
  utterance.pitch = options?.pitch ?? 1;
  utterance.volume = options?.volume ?? 1;

  if (options?.onEnd) {
    utterance.onend = options.onEnd;
  }

  if (options?.onError) {
    utterance.onerror = (event) => {
      options.onError?.(event.error || "Speech synthesis error");
    };
  }

  window.speechSynthesis.speak(utterance);

  return utterance;
}

// Backward-compatible alias
export const speakArabic = (
  text: string,
  options?: Parameters<typeof speakText>[2]
) => speakText(text, "ar", options);

// Stop speaking
export function stopSpeaking(): void {
  if (isSpeechSupported()) {
    window.speechSynthesis.cancel();
  }
}

// Check if currently speaking
export function isSpeaking(): boolean {
  if (!isSpeechSupported()) return false;
  return window.speechSynthesis.speaking;
}
