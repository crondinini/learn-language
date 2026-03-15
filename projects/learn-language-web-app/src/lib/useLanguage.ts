"use client";

import { useState, useCallback } from "react";

const COOKIE_NAME = "lang";
const DEFAULT_LANG = "ar";

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
}

export function getLanguageFromCookie(): string {
  return getCookie(COOKIE_NAME) || DEFAULT_LANG;
}

export function useLanguage() {
  const [language, setLanguageState] = useState(() => getLanguageFromCookie());

  const setLanguage = useCallback((lang: string) => {
    setCookie(COOKIE_NAME, lang);
    setLanguageState(lang);
    // Reload to re-fetch data for the new language
    window.location.reload();
  }, []);

  return { language, setLanguage };
}
