"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Header from "@/components/Header";

interface Deck {
  id: number;
  name: string;
  description: string | null;
  total_cards: number;
  due_cards: number;
  new_cards: number;
  learning_cards: number;
  learned_cards: number;
}

export default function Home() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newDeckName, setNewDeckName] = useState("");
  const [newDeckDesc, setNewDeckDesc] = useState("");

  useEffect(() => {
    fetchDecks();
  }, []);

  async function fetchDecks() {
    const res = await fetch("/api/decks");
    const data = await res.json();
    setDecks(data);
    setIsLoading(false);
  }

  async function createDeck(e: React.FormEvent) {
    e.preventDefault();
    if (!newDeckName.trim()) return;

    await fetch("/api/decks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newDeckName,
        description: newDeckDesc || null,
      }),
    });

    setNewDeckName("");
    setNewDeckDesc("");
    setShowModal(false);
    fetchDecks();
  }

  async function deleteDeck(id: number) {
    if (!confirm("Delete this deck and all its cards?")) return;
    await fetch(`/api/decks/${id}`, { method: "DELETE" });
    fetchDecks();
  }

  const totalDue = decks.reduce((sum, d) => sum + d.due_cards, 0);

  function progressPercent(deck: Deck) {
    if (deck.total_cards === 0) return 0;
    return Math.round((deck.learned_cards / deck.total_cards) * 100);
  }

  return (
    <div className="min-h-screen bg-bg">
      <Header />

      <main className="mx-auto max-w-5xl px-7 pt-11 pb-20">
        {/* Page Head */}
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="text-[28px] font-bold tracking-tight text-ink">Decks</h1>
            {totalDue > 0 && (
              <p className="mt-1 text-sm text-ink-soft">
                <span className="font-medium tabular-nums text-accent">{totalDue}</span> cards due across {decks.length} decks
              </p>
            )}
          </div>
          {totalDue > 0 ? (
            <Link
              href="/review"
              className="rounded-[var(--radius-md)] bg-accent px-5 py-2.5 text-sm font-medium text-white transition hover:bg-accent-hover hover:-translate-y-px"
            >
              Study All Due ({totalDue})
            </Link>
          ) : (
            <span className="rounded-[var(--radius-md)] bg-surface-active px-5 py-2.5 text-sm font-medium text-ink-faint">
              Study Now (0)
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-40 rounded-[var(--radius-md)]" />
            ))}
          </div>
        ) : decks.length === 0 ? (
          <div className="rounded-[var(--radius-md)] border-2 border-dashed border-line p-12 text-center">
            <p className="text-lg text-ink-faint">No decks yet</p>
            <p className="mt-1 text-sm text-ink-faint">
              Create your first deck to start learning Arabic
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-4 rounded-[var(--radius-md)] bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-hover"
            >
              Create Deck
            </button>
          </div>
        ) : (
          <div className="stagger-children grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {decks.map((deck) => {
              const pct = progressPercent(deck);
              return (
                <div
                  key={deck.id}
                  className="group relative rounded-[var(--radius-md)] border border-line/50 bg-surface p-5 transition-all duration-200 hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5"
                  style={{ boxShadow: "var(--shadow-card)" }}
                >
                  <Link href={`/deck/${deck.id}`} className="absolute inset-0 z-[1] rounded-[var(--radius-md)]" />
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-[15px] font-semibold text-ink truncate">{deck.name}</h3>
                      {deck.description && (
                        <p className="mt-0.5 text-sm text-ink-faint truncate">{deck.description}</p>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        deleteDeck(deck.id);
                      }}
                      className="relative z-[2] -mr-1 -mt-1 rounded-full p-1.5 text-ink-faint opacity-0 transition hover:bg-error-subtle hover:text-error group-hover:opacity-100"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Stats */}
                  <div className="mt-4 flex items-center gap-3 text-sm">
                    {deck.due_cards > 0 && (
                      <span className="rounded-full bg-accent-subtle px-2.5 py-0.5 text-xs font-medium text-accent">
                        {deck.due_cards} due
                      </span>
                    )}
                    <span className="text-ink-faint tabular-nums">
                      {deck.total_cards} card{deck.total_cards !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-medium text-ink-faint">Progress</span>
                      <span className="text-[11px] font-medium tabular-nums text-ink-faint">{pct}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-active">
                      <div
                        className="h-full rounded-full bg-accent transition-all duration-500"
                        style={{ width: `${pct}%`, animation: "progress-fill 0.8s ease-out" }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}

            {/* New Deck ghost card */}
            <button
              onClick={() => setShowModal(true)}
              className="flex flex-col items-center justify-center rounded-[var(--radius-md)] border-2 border-dashed border-line p-5 text-ink-faint transition-all hover:border-accent hover:text-accent hover:bg-accent-subtle/50 min-h-[140px]"
            >
              <svg className="h-8 w-8 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-sm font-medium">New Deck</span>
            </button>
          </div>
        )}
      </main>

      {/* Create Deck Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4">
          <div className="animate-modal w-full max-w-md rounded-[var(--radius-lg)] bg-surface p-6 border border-line/50" style={{ boxShadow: "var(--shadow-xl)" }}>
            <h2 className="text-xl font-semibold text-ink">Create New Deck</h2>
            <form onSubmit={createDeck} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink-soft">
                  Name
                </label>
                <input
                  type="text"
                  value={newDeckName}
                  onChange={(e) => setNewDeckName(e.target.value)}
                  placeholder="Arabic Basics"
                  className="mt-1 w-full rounded-[var(--radius-sm)] border border-line px-3 py-2 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-soft">
                  Description (optional)
                </label>
                <input
                  type="text"
                  value={newDeckDesc}
                  onChange={(e) => setNewDeckDesc(e.target.value)}
                  placeholder="Essential vocabulary for beginners"
                  className="mt-1 w-full rounded-[var(--radius-sm)] border border-line px-3 py-2 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 rounded-[var(--radius-sm)] border border-line px-4 py-2 text-sm font-medium text-ink-soft transition hover:bg-surface-hover"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-[var(--radius-sm)] bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-hover"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
