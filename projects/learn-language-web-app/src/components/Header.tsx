"use client";

import Link from "next/link";
import { usePathname, useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { SUPPORTED_LANGUAGES, LanguageFeature, hasFeature } from "@/lib/languages";

const LANGUAGE_FLAGS: Record<string, string> = {
  ar: "\u{1F1F8}\u{1F1E6}",
  en: "\u{1F1EC}\u{1F1E7}",
};

export default function Header() {
  const pathname = usePathname();
  const params = useParams();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const lang = (params.lang as string) || "ar";

  const allNavItems: { href: string; label: string; feature?: LanguageFeature }[] = [
    { href: `/${lang}/stats`, label: "Stats" },
    { href: `/${lang}`, label: "Decks" },
    { href: `/${lang}/vocab`, label: "Vocabulary" },
    { href: `/${lang}/conjugation`, label: "Conjugation", feature: "conjugation" },
    { href: `/${lang}/reading`, label: "Reading", feature: "reading" },
    { href: `/${lang}/homework`, label: "Homework", feature: "homework" },
    { href: `/${lang}/lessons`, label: "Lessons", feature: "lessons" },
    { href: `/${lang}/generate`, label: "Generate", feature: "generate" },
  ];

  const navItems = allNavItems.filter(
    (item) => !item.feature || hasFeature(lang, item.feature)
  );

  function isActive(href: string) {
    if (href === `/${lang}`) {
      return pathname === `/${lang}` || pathname.startsWith(`/${lang}/deck`);
    }
    return pathname.startsWith(href);
  }

  function switchLanguage(newLang: string) {
    // Set cookie
    document.cookie = `lang=${newLang};path=/;max-age=${365 * 24 * 60 * 60};samesite=lax`;
    // Navigate to same page under new lang prefix
    let newPath = pathname.replace(`/${lang}`, `/${newLang}`);
    // If the current page is a feature not available in the new language, go to home
    const featureRoutes: { segment: string; feature: LanguageFeature }[] = [
      { segment: "/conjugation", feature: "conjugation" },
      { segment: "/reading", feature: "reading" },
      { segment: "/homework", feature: "homework" },
      { segment: "/lessons", feature: "lessons" },
      { segment: "/generate", feature: "generate" },
    ];
    for (const route of featureRoutes) {
      if (newPath.includes(route.segment) && !hasFeature(newLang, route.feature)) {
        newPath = `/${newLang}`;
        break;
      }
    }
    router.push(newPath);
  }

  return (
    <header className="sticky top-0 z-10 h-14 border-b border-line/50 bg-bg/80 backdrop-blur-xl">
      <div className="flex h-full items-center justify-between px-7">
        <div className="flex h-full items-center gap-8">
          <Link href={`/${lang}`} className="flex items-center flex-shrink-0">
            <span className="text-[17px] font-semibold text-ink">
              Learn<span className="text-accent">.</span>
            </span>
          </Link>
          {/* Desktop nav */}
          <nav className="hidden sm:flex h-full items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center text-sm font-medium transition-all ${
                  isActive(item.href)
                    ? "bg-surface shadow-sm rounded-full px-3 py-1.5 text-ink"
                    : "px-3 py-1.5 rounded-full text-ink-faint hover:text-ink-soft hover:bg-surface-hover"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {/* Language switcher */}
          <select
            value={lang}
            onChange={(e) => switchLanguage(e.target.value)}
            className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm text-ink-soft focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer"
          >
            {Object.values(SUPPORTED_LANGUAGES).map((l) => (
              <option key={l.code} value={l.code}>
                {LANGUAGE_FLAGS[l.code] || ""} {l.name}
              </option>
            ))}
          </select>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="sm:hidden p-2 rounded-[var(--radius-sm)] text-ink-faint hover:bg-surface-hover"
          >
            {mobileMenuOpen ? (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile nav menu */}
      {mobileMenuOpen && (
        <nav className="sm:hidden border-b border-line/50 bg-bg/95 backdrop-blur-xl px-7 py-3">
          <div className="flex flex-wrap gap-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                  isActive(item.href)
                    ? "bg-accent text-white"
                    : "bg-surface-hover text-ink-soft hover:bg-surface-active"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
