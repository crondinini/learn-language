// Features that can be enabled per language
export type LanguageFeature = 'conjugation' | 'reading' | 'homework' | 'lessons' | 'generate';

export interface LanguageConfig {
  code: string;
  name: string;
  nativeName: string;
  dir: 'ltr' | 'rtl';
  font: string | null;  // null means use default font
  speechCode: string;    // for Google TTS
  browserSpeechCode: string;  // for browser SpeechSynthesis
  features: LanguageFeature[];  // enabled features for this language
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
    features: ['conjugation', 'reading', 'homework', 'lessons', 'generate'],
  },
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    dir: 'ltr',
    font: null,
    speechCode: 'en-US',
    browserSpeechCode: 'en-US',
    features: [],  // only decks, vocab, review for now
  },
};

export function hasFeature(langCode: string, feature: LanguageFeature): boolean {
  return getLanguageConfig(langCode).features.includes(feature);
}

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
