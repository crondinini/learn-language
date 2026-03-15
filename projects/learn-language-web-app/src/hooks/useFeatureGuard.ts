"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { hasFeature, LanguageFeature } from "@/lib/languages";

/**
 * Redirects to the language home page if the given feature
 * is not available for the current language.
 * Returns the current language code.
 */
export function useFeatureGuard(feature: LanguageFeature): string {
  const params = useParams();
  const router = useRouter();
  const lang = (params.lang as string) || "ar";

  useEffect(() => {
    if (!hasFeature(lang, feature)) {
      router.replace(`/${lang}`);
    }
  }, [lang, feature, router]);

  return lang;
}
