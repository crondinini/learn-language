"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

interface HeaderProps {
  actions?: ReactNode;
}

const navItems = [
  { href: "/", label: "Decks" },
  { href: "/vocab", label: "Vocabulary" },
  { href: "/reading", label: "Reading" },
  { href: "/homework", label: "Homework" },
];

export default function Header({ actions }: HeaderProps) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/") {
      return pathname === "/" || pathname.startsWith("/deck");
    }
    return pathname.startsWith(href);
  }

  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-700 dark:bg-slate-900/80">
      <div className="mx-auto max-w-5xl px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center">
              <Image src="/logo.png" alt="Learn" width={60} height={32} className="dark:hidden" unoptimized />
              <Image src="/logo-white.png" alt="Learn" width={60} height={32} className="hidden dark:block" unoptimized />
            </Link>
            <nav className="flex items-center gap-6">
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
          {actions && <div className="flex items-center gap-3">{actions}</div>}
        </div>
      </div>
    </header>
  );
}
