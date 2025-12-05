"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

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
  0: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
  1: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  2: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  3: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
};

export default function VocabDashboard() {
  const [stats, setStats] = useState<VocabStats | null>(null);
  const [vocabulary, setVocabulary] = useState<VocabCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const [dueCount, setDueCount] = useState(0);

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-700 dark:bg-slate-900/80">
        <div className="mx-auto max-w-5xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <Link href="/" className="text-2xl font-bold text-slate-800 dark:text-white">
                تعلم
                <span className="ml-2 text-sm font-normal text-slate-500">Learn Arabic</span>
              </Link>
              <nav className="flex items-center gap-6">
                <Link
                  href="/"
                  className="text-sm font-medium text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  Decks
                </Link>
                <Link
                  href="/vocab"
                  className="text-sm font-medium text-emerald-600 dark:text-emerald-400"
                >
                  Vocabulary
                </Link>
              </nav>
            </div>
            <div className="flex items-center gap-3">
              {dueCount > 0 ? (
                <Link
                  href="/review"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
                >
                  Study Now ({dueCount})
                </Link>
              ) : (
                <span className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-medium text-slate-400 dark:bg-slate-700 dark:text-slate-500">
                  Study Now (0)
                </span>
              )}
              <Link
                href="/?newDeck=true"
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
              >
                + New Deck
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        {/* Breadcrumb */}
        <nav className="mb-4 flex items-center gap-2 text-sm">
          <Link href="/" className="text-slate-500 hover:text-emerald-600 dark:text-slate-400">
            Home
          </Link>
          <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-slate-700 dark:text-slate-200">Vocabulary</span>
        </nav>

        {/* Page Title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Vocabulary</h1>
          <p className="mt-1 text-sm text-slate-500">Track your learning progress across all decks</p>
        </div>
        {/* Stats Cards */}
        {stats && (
          <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-5">
            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
              <div className="text-3xl font-bold text-slate-700 dark:text-slate-200">
                {stats.total}
              </div>
              <div className="text-sm text-slate-500">Total Words</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
              <div className="text-3xl font-bold text-slate-500">{stats.new}</div>
              <div className="text-sm text-slate-500">Not Learned</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
              <div className="text-3xl font-bold text-amber-600">{stats.learning}</div>
              <div className="text-sm text-slate-500">Learning</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
              <div className="text-3xl font-bold text-emerald-600">{stats.mastered}</div>
              <div className="text-sm text-slate-500">Mastered</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
              <div className="text-3xl font-bold text-blue-600">{stats.learnedThisWeek}</div>
              <div className="text-sm text-slate-500">This Week</div>
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
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  filter === f.key
                    ? "bg-emerald-600 text-white"
                    : "bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                }`}
              >
                {f.label}
                {f.count !== undefined && (
                  <span className={`ml-1.5 ${filter === f.key ? "text-emerald-200" : "text-slate-400"}`}>
                    {f.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search words..."
              className="w-48 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            />
            <button
              type="submit"
              className="rounded-lg bg-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
            >
              Search
            </button>
          </form>
        </div>

        {/* Vocabulary List */}
        {isLoading ? (
          <div className="py-12 text-center text-slate-500">Loading...</div>
        ) : vocabulary.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-slate-300 py-12 text-center dark:border-slate-600">
            <p className="text-slate-500 dark:text-slate-400">
              {filter === "all" ? "No vocabulary yet" : "No words match this filter"}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
            <table className="w-full">
              <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3 text-right text-sm font-medium text-slate-500 dark:text-slate-400">
                    Arabic
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-500 dark:text-slate-400">
                    English
                  </th>
                  <th className="hidden px-4 py-3 text-left text-sm font-medium text-slate-500 dark:text-slate-400 sm:table-cell">
                    Deck
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-500 dark:text-slate-400">
                    Status
                  </th>
                  <th className="hidden px-4 py-3 text-left text-sm font-medium text-slate-500 dark:text-slate-400 md:table-cell">
                    Reviews
                  </th>
                  <th className="hidden px-4 py-3 text-left text-sm font-medium text-slate-500 dark:text-slate-400 lg:table-cell">
                    Last Review
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {vocabulary.map((card) => (
                  <tr
                    key={card.id}
                    className="transition hover:bg-slate-50 dark:hover:bg-slate-700/50"
                  >
                    <td className="px-4 py-3">
                      <span
                        dir="rtl"
                        className="text-lg font-medium text-slate-800 dark:text-white"
                      >
                        {card.front}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {card.back}
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <Link
                        href={`/deck/${card.deck_id}`}
                        className="text-sm text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400"
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
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        {card.reps}
                        {card.lapses > 0 && (
                          <span className="ml-1 text-orange-500">({card.lapses} lapses)</span>
                        )}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 lg:table-cell">
                      <span className="text-sm text-slate-500 dark:text-slate-400">
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
