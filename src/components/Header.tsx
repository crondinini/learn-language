"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useState } from "react";

interface HeaderProps {
  actions?: ReactNode;
}

const navItems = [
  { href: "/", label: "Decks" },
  { href: "/vocab", label: "Vocabulary" },
  { href: "/conjugation", label: "Conjugation" },
  { href: "/reading", label: "Reading" },
  { href: "/homework", label: "Homework" },
  { href: "/resources", label: "Resources" },
];

export default function Header({ actions }: HeaderProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  function isActive(href: string) {
    if (href === "/") {
      return pathname === "/" || pathname.startsWith("/deck");
    }
    return pathname.startsWith(href);
  }

  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-700 dark:bg-slate-900/80">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-3 sm:py-4">
        {/* Desktop layout */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 sm:gap-8">
            <Link href="/" className="flex items-center flex-shrink-0">
              <Image src="/logo.png" alt="Learn" width={50} height={27} className="dark:hidden sm:w-[60px]" unoptimized />
              <Image src="/logo-white.png" alt="Learn" width={50} height={27} className="hidden dark:block sm:w-[60px]" unoptimized />
            </Link>
            {/* Desktop nav */}
            <nav className="hidden sm:flex items-center gap-4 md:gap-6">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-sm font-medium transition ${
                    isActive(item.href)
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            {/* Actions - hide on mobile if menu is open */}
            {actions && <div className="flex items-center gap-2 sm:gap-3">{actions}</div>}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="sm:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
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
          <nav className="sm:hidden mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
            <div className="flex flex-wrap gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                    isActive(item.href)
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
