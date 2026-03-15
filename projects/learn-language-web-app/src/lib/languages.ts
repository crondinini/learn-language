export interface LanguageConfig {
  code: string;
  name: string;
  nativeName: string;
  dir: 'ltr' | 'rtl';
  font: string | null;  // null means use default font
  speechCode: string;    // for Google TTS
  browserSpeechCode: string;  // for browser SpeechSynthesis
}

export const SUPPORTED_LANGUAGES: Record<string, LanguageConfig> = {
  ar: {
    code: 'ar',
    name: 'Arabic',
    nativeName: 'العربية',
    dir: 'rtl',
    font: 'var(--font-arabic)',
    speechCode: 'ar-XA',
    browserSpeechCode: 'ar-SA',
  },
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    dir: 'ltr',
    font: null,
    speechCode: 'en-US',
    browserSpeechCode: 'en-US',
  },
};

export function getLanguageConfig(code: string): LanguageConfig {
  return SUPPORTED_LANGUAGES[code] || SUPPORTED_LANGUAGES['ar'];
}

export function isRtl(code: string): boolean {
  return getLanguageConfig(code).dir === 'rtl';
}

export function getTextDirection(code: string): 'ltr' | 'rtl' {
  return getLanguageConfig(code).dir;
}

export function getFontFamily(code: string): string | null {
  return getLanguageConfig(code).font;
}

export function getSupportedLanguages(): LanguageConfig[] {
  return Object.values(SUPPORTED_LANGUAGES);
}
