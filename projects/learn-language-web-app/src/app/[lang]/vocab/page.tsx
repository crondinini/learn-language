"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Header from "@/components/Header";

interface VocabStats {
  total: number;
  new: number;
  learning: number;
  mastered: number;
  learnedThisWeek: number;
}

interface VocabCard {
  id: number;
  deck_id: number;
  front: string;
  back: string;
  notes: string | null;
  deck_name: string;
  state: number;
  reps: number;
  lapses: number;
  last_review: string | null;
  due: string;
}

type FilterType = "all" | "new" | "learning" | "mastered" | "week";

const stateLabels: Record<number, string> = {
  0: "New",
  1: "Learning",
  2: "Mastered",
  3: "Relearning",
};

const stateColors: Record<number, string> = {
  0: "bg-accent-subtle text-accent",
  1: "bg-amber-50 text-amber-600",
  2: "bg-success-subtle text-success",
  3: "bg-error-subtle text-error",
};

export default function VocabDashboard() {
  const params = useParams();
  const lang = params.lang as string;
  const [stats, setStats] = useState<VocabStats | null>(null);
  const [vocabulary, setVocabulary] = useState<VocabCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const [dueCount, setDueCount] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    fetchVocabulary();
    fetchDueCount();
  }, [filter]);

  async function fetchDueCount() {
    const res = await fetch("/api/decks");
    const decks = await res.json();
    setDueCount(decks.reduce((sum: number, d: { due_cards: number }) => sum + d.due_cards, 0));
  }

  async function fetchVocabulary() {
    setIsLoading(true);
    const params = new URLSearchParams();
    if (filter !== "all") params.set("filter", filter);
    if (search) params.set("search", search);

    const res = await fetch(`/api/vocab?${params}`);
    const data = await res.json();
    setStats(data.stats);
    setVocabulary(data.vocabulary);
    setIsLoading(false);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    fetchVocabulary();
  }

  async function handleExport() {
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      if (filter !== "all") params.set("filter", filter);
      if (search) params.set("search", search);

      const res = await fetch(`/api/vocab/export?${params}`);
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Export failed");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const disposition = res.headers.get("Content-Disposition");
      const filenameMatch = disposition?.match(/filename="(.+)"/);
      a.download = filenameMatch?.[1] || "arabic-vocabulary.apkg";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return "Never";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  }

  const filters: { key: FilterType; label: string; count?: number }[] = [
    { key: "all", label: "All", count: stats?.total },
    { key: "new", label: "Not Learned", count: stats?.new },
    { key: "learning", label: "Learning", count: stats?.learning },
    { key: "mastered", label: "Mastered", count: stats?.mastered },
    { key: "week", label: "This Week", count: stats?.learnedThisWeek },
  ];

  return (
    <div className="min-h-screen bg-bg">
      <Header />

      <main className="mx-auto max-w-5xl px-7 pt-11 pb-20">
        {/* Breadcrumb */}
        <nav className="mb-4 flex items-center gap-2 text-sm">
          <Link href={`/${lang}`} className="text-ink-faint hover:text-accent">
            Home
          </Link>
          <svg className="h-4 w-4 text-ink-faint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-ink">Vocabulary</span>
        </nav>

        {/* Page Title */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-[28px] font-bold tracking-tight text-ink">Vocabulary</h1>
            <p className="mt-1 text-sm text-ink-faint">Track your learning progress across all decks</p>
          </div>
          <div className="flex gap-2">
            {dueCount > 0 ? (
              <Link
                href={`/${lang}/review`}
                className="rounded-[var(--radius-md)] bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-hover hover:-translate-y-px"
              >
                Study Now ({dueCount})
              </Link>
            ) : (
              <span className="rounded-[var(--radius-md)] bg-surface-active px-4 py-2 text-sm font-medium text-ink-faint">
                Study Now (0)
              </span>
            )}
          </div>
        </div>
        {/* Stats Cards */}
        {stats && (
          <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-5">
            <div className="rounded-[var(--radius-md)] border border-line/50 bg-surface p-4" style={{ boxShadow: "var(--shadow-card)" }}>
              <div className="text-3xl font-bold text-ink">
                {stats.total}
              </div>
              <div className="text-sm text-ink-faint">Total Words</div>
            </div>
            <div className="rounded-[var(--radius-md)] border border-line/50 bg-surface p-4" style={{ boxShadow: "var(--shadow-card)" }}>
              <div className="text-3xl font-bold text-ink-faint">{stats.new}</div>
              <div className="text-sm text-ink-faint">Not Learned</div>
            </div>
            <div className="rounded-[var(--radius-md)] border border-line/50 bg-surface p-4" style={{ boxShadow: "var(--shadow-card)" }}>
              <div className="text-3xl font-bold text-accent">{stats.learning}</div>
              <div className="text-sm text-ink-faint">Learning</div>
            </div>
            <div className="rounded-[var(--radius-md)] border border-line/50 bg-surface p-4" style={{ boxShadow: "var(--shadow-card)" }}>
              <div className="text-3xl font-bold text-success">{stats.mastered}</div>
              <div className="text-sm text-ink-faint">Mastered</div>
            </div>
            <div className="rounded-[var(--radius-md)] border border-line/50 bg-surface p-4" style={{ boxShadow: "var(--shadow-card)" }}>
              <div className="text-3xl font-bold text-ink-soft">{stats.learnedThisWeek}</div>
              <div className="text-sm text-ink-faint">This Week</div>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                  filter === f.key
                    ? "bg-accent text-white"
                    : "bg-surface text-ink-soft hover:bg-surface-hover"
                }`}
              >
                {f.label}
                {f.count !== undefined && (
                  <span className={`ml-1.5 ${filter === f.key ? "text-surface/60" : "text-ink-faint"}`}>
                    {f.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Search and Export */}
          <div className="flex gap-2">
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search words..."
                className="w-48 rounded-[5px] border border-line bg-surface px-3 py-1.5 text-sm text-ink focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <button
                type="submit"
                className="rounded-[5px] bg-surface-active px-3 py-1.5 text-sm font-medium text-ink-soft transition hover:bg-surface-active"
              >
                Search
              </button>
            </form>
            <button
              onClick={handleExport}
              disabled={isExporting || vocabulary.length === 0}
              className="rounded-[var(--radius-sm)] bg-accent px-3 py-1.5 text-sm font-medium text-white transition hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? "Exporting..." : "Export"}
            </button>
          </div>
        </div>

        {/* Vocabulary List */}
        {isLoading ? (
          <div className="py-12 text-center text-ink-faint">Loading...</div>
        ) : vocabulary.length === 0 ? (
          <div className="rounded-[5px] border-2 border-dashed border-line py-12 text-center">
            <p className="text-ink-faint">
              {filter === "all" ? "No vocabulary yet" : "No words match this filter"}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-[var(--radius-md)] border border-line/50 bg-surface" style={{ boxShadow: "var(--shadow-card)" }}>
            <table className="w-full">
              <thead className="border-b border-line bg-surface-hover">
                <tr>
                  <th className="px-4 py-3 text-right text-sm font-medium text-ink-faint">
                    Arabic
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-ink-faint">
                    English
                  </th>
                  <th className="hidden px-4 py-3 text-left text-sm font-medium text-ink-faint sm:table-cell">
                    Deck
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-ink-faint">
                    Status
                  </th>
                  <th className="hidden px-4 py-3 text-left text-sm font-medium text-ink-faint md:table-cell">
                    Reviews
                  </th>
                  <th className="hidden px-4 py-3 text-left text-sm font-medium text-ink-faint lg:table-cell">
                    Last Review
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {vocabulary.map((card) => (
                  <tr
                    key={card.id}
                    className="transition hover:bg-surface-hover"
                  >
                    <td className="px-4 py-3">
                      <span
                        dir="rtl"
                        className="text-lg font-medium text-ink"
                      >
                        {card.front}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">
                      {card.back}
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <Link
                        href={`/${lang}/deck/${card.deck_id}`}
                        className="text-sm text-ink-faint hover:text-accent"
                      >
                        {card.deck_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${stateColors[card.state]}`}
                      >
                        {stateLabels[card.state]}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      <span className="text-sm text-ink-faint">
                        {card.reps}
                        {card.lapses > 0 && (
                          <span className="ml-1 text-orange-500">({card.lapses} lapses)</span>
                        )}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 lg:table-cell">
                      <span className="text-sm text-ink-faint">
                        {formatDate(card.last_review)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
