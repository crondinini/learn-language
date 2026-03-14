"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navItems = [
  { href: "/", label: "Decks" },
  { href: "/vocab", label: "Vocabulary" },
  { href: "/conjugation", label: "Conjugation" },
  { href: "/reading", label: "Reading" },
  { href: "/homework", label: "Homework" },
  { href: "/lessons", label: "Lessons" },
  { href: "/generate", label: "Generate" },
];

export default function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  function isActive(href: string) {
    if (href === "/") {
      return pathname === "/" || pathname.startsWith("/deck");
    }
    return pathname.startsWith(href);
  }

  return (
    <header className="sticky top-0 z-10 h-14 border-b border-line/50 bg-bg/80 backdrop-blur-xl">
      <div className="flex h-full items-center justify-between px-7">
        <div className="flex h-full items-center gap-8">
          <Link href="/" className="flex items-center flex-shrink-0">
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
