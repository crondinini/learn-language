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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <Header
        actions={
          <>
            {totalDue > 0 ? (
              <Link
                href="/review"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
              >
                Study Now ({totalDue})
              </Link>
            ) : (
              <span className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-medium text-slate-400 dark:bg-slate-700 dark:text-slate-500">
                Study Now (0)
              </span>
            )}
            <button
              onClick={() => setShowModal(true)}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
            >
              + New Deck
            </button>
          </>
        }
      />

      {/* Main Content */}
      <main className="mx-auto max-w-5xl px-6 py-8">
        {isLoading ? (
          <div className="text-center text-slate-500">Loading...</div>
        ) : decks.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-slate-300 p-12 text-center dark:border-slate-600">
            <p className="text-lg text-slate-500 dark:text-slate-400">No decks yet</p>
            <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">
              Create your first deck to start learning Arabic
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
            >
              Create Deck
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {decks.map((deck) => (
              <div
                key={deck.id}
                className="group relative rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
              >
                <Link href={`/deck/${deck.id}`} className="block">
                  <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
                    {deck.name}
                  </h2>
                  {deck.description && (
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {deck.description}
                    </p>
                  )}
                  <div className="mt-4">
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      <span className="font-semibold text-emerald-600">{deck.learned_cards}</span>
                      <span className="text-slate-400"> / </span>
                      <span className="font-semibold">{deck.learning_cards + deck.learned_cards}</span>
                      <span className="text-slate-400"> words learned</span>
                    </p>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all"
                        style={{
                          width: `${deck.learning_cards + deck.learned_cards > 0 ? (deck.learned_cards / (deck.learning_cards + deck.learned_cards)) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                </Link>
                <button
                  onClick={() => deleteDeck(deck.id)}
                  className="absolute right-3 top-3 rounded p-1 text-slate-400 opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 dark:hover:bg-red-900/20"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Deck Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-slate-800">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white">Create New Deck</h2>
            <form onSubmit={createDeck} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Name
                </label>
                <input
                  type="text"
                  value={newDeckName}
                  onChange={(e) => setNewDeckName(e.target.value)}
                  placeholder="Arabic Basics"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Description (optional)
                </label>
                <input
                  type="text"
                  value={newDeckDesc}
                  onChange={(e) => setNewDeckDesc(e.target.value)}
                  placeholder="Essential vocabulary for beginners"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
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
