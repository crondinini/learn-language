/**
 * Web Speech API utility for Arabic text-to-speech
 */

// Check if speech synthesis is available
export function isSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

// Get available Arabic voices
export function getArabicVoices(): SpeechSynthesisVoice[] {
  if (!isSpeechSupported()) return [];

  const voices = window.speechSynthesis.getVoices();
  return voices.filter(
    (voice) => voice.lang.startsWith("ar") || voice.lang === "ar-SA" || voice.lang === "ar-EG"
  );
}

// Get the best available Arabic voice
export function getBestArabicVoice(): SpeechSynthesisVoice | null {
  const arabicVoices = getArabicVoices();

  if (arabicVoices.length === 0) return null;

  // Prefer voices in this order: ar-SA (Saudi), ar-EG (Egyptian), any Arabic
  const preferred = ["ar-SA", "ar-EG", "ar"];

  for (const lang of preferred) {
    const voice = arabicVoices.find((v) => v.lang === lang || v.lang.startsWith(lang));
    if (voice) return voice;
  }

  return arabicVoices[0];
}

// Speak Arabic text
export function speakArabic(
  text: string,
  options?: {
    rate?: number; // 0.1 to 10, default 0.9 (slightly slower for learning)
    pitch?: number; // 0 to 2, default 1
    volume?: number; // 0 to 1, default 1
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

  // Set Arabic voice if available
  const arabicVoice = getBestArabicVoice();
  if (arabicVoice) {
    utterance.voice = arabicVoice;
    utterance.lang = arabicVoice.lang;
  } else {
    // Fallback to Arabic language code (browser will try to find a voice)
    utterance.lang = "ar-SA";
  }

  // Apply options
  utterance.rate = options?.rate ?? 0.9; // Slightly slower for learning
  utterance.pitch = options?.pitch ?? 1;
  utterance.volume = options?.volume ?? 1;

  // Event handlers
  if (options?.onEnd) {
    utterance.onend = options.onEnd;
  }

  if (options?.onError) {
    utterance.onerror = (event) => {
      options.onError?.(event.error || "Speech synthesis error");
    };
  }

  // Speak
  window.speechSynthesis.speak(utterance);

  return utterance;
}

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
