"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";

interface Card {
  id: number;
  front: string;
  back: string;
  notes: string | null;
  state: number;
  reps: number;
  due: string;
}

interface Deck {
  id: number;
  name: string;
  description: string | null;
  total_cards: number;
  due_cards: number;
  new_cards: number;
}

export default function DeckPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddCard, setShowAddCard] = useState(false);
  const [newFront, setNewFront] = useState("");
  const [newBack, setNewBack] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [editingCard, setEditingCard] = useState<Card | null>(null);

  useEffect(() => {
    fetchDeck();
    fetchCards();
  }, [id]);

  async function fetchDeck() {
    const res = await fetch(`/api/decks/${id}`);
    if (res.ok) {
      setDeck(await res.json());
    }
  }

  async function fetchCards() {
    const res = await fetch(`/api/decks/${id}/cards`);
    if (res.ok) {
      setCards(await res.json());
    }
    setIsLoading(false);
  }

  async function addCard(e: React.FormEvent) {
    e.preventDefault();
    if (!newFront.trim() || !newBack.trim()) return;

    await fetch(`/api/decks/${id}/cards`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        front: newFront,
        back: newBack,
        notes: newNotes || null,
      }),
    });

    setNewFront("");
    setNewBack("");
    setNewNotes("");
    setShowAddCard(false);
    fetchCards();
    fetchDeck();
  }

  async function updateCard(e: React.FormEvent) {
    e.preventDefault();
    if (!editingCard) return;

    await fetch(`/api/cards/${editingCard.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        front: editingCard.front,
        back: editingCard.back,
        notes: editingCard.notes,
      }),
    });

    setEditingCard(null);
    fetchCards();
  }

  async function deleteCard(cardId: number) {
    if (!confirm("Delete this card?")) return;
    await fetch(`/api/cards/${cardId}`, { method: "DELETE" });
    fetchCards();
    fetchDeck();
  }

  const stateLabels = ["New", "Learning", "Review", "Relearning"];
  const stateColors = ["emerald", "blue", "slate", "amber"];

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-slate-500">Loading...</div>
      </div>
    );
  }

  if (!deck) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500">Deck not found</p>
          <Link href="/" className="mt-2 text-emerald-600 hover:underline">
            Go back
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-700 dark:bg-slate-900/80">
        <div className="mx-auto max-w-5xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-slate-800 dark:text-white">{deck.name}</h1>
                {deck.description && (
                  <p className="text-sm text-slate-500">{deck.description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex gap-4 text-sm">
                <span className="text-slate-500">
                  <strong className="text-amber-600">{deck.due_cards}</strong> due
                </span>
                <span className="text-slate-500">
                  <strong className="text-emerald-600">{deck.new_cards}</strong> new
                </span>
              </div>
              <button
                onClick={() => setShowAddCard(true)}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
              >
                + Add Card
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Cards List */}
      <main className="mx-auto max-w-5xl px-6 py-8">
        {cards.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-slate-300 p-12 text-center dark:border-slate-600">
            <p className="text-lg text-slate-500 dark:text-slate-400">No cards yet</p>
            <p className="mt-1 text-sm text-slate-400">Add your first card to start learning</p>
            <button
              onClick={() => setShowAddCard(true)}
              className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
            >
              Add Card
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {cards.map((card) => (
              <div
                key={card.id}
                className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
              >
                <div className="flex flex-1 items-center gap-6">
                  {/* Arabic (front) */}
                  <div className="min-w-[120px] text-right" dir="rtl">
                    <span className="text-xl font-medium text-slate-800 dark:text-white">
                      {card.front}
                    </span>
                  </div>

                  {/* Arrow */}
                  <svg className="h-4 w-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>

                  {/* English (back) */}
                  <div className="flex-1">
                    <span className="text-lg text-slate-600 dark:text-slate-300">{card.back}</span>
                    {card.notes && (
                      <p className="mt-0.5 text-sm text-slate-400">{card.notes}</p>
                    )}
                  </div>

                  {/* State badge */}
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium bg-${stateColors[card.state]}-100 text-${stateColors[card.state]}-700 dark:bg-${stateColors[card.state]}-900/30 dark:text-${stateColors[card.state]}-400`}
                  >
                    {stateLabels[card.state]}
                  </span>
                </div>

                {/* Actions */}
                <div className="ml-4 flex gap-1 opacity-0 transition group-hover:opacity-100">
                  <button
                    onClick={() => setEditingCard(card)}
                    className="rounded p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => deleteCard(card.id)}
                    className="rounded p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Add Card Modal */}
      {showAddCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-slate-800">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white">Add New Card</h2>
            <form onSubmit={addCard} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Arabic (front)
                </label>
                <input
                  type="text"
                  value={newFront}
                  onChange={(e) => setNewFront(e.target.value)}
                  placeholder="مرحبا"
                  dir="rtl"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-right text-lg focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  English (back)
                </label>
                <input
                  type="text"
                  value={newBack}
                  onChange={(e) => setNewBack(e.target.value)}
                  placeholder="Hello"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Notes (optional)
                </label>
                <input
                  type="text"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Common greeting"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCard(false)}
                  className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
                >
                  Add Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Card Modal */}
      {editingCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-slate-800">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white">Edit Card</h2>
            <form onSubmit={updateCard} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Arabic (front)
                </label>
                <input
                  type="text"
                  value={editingCard.front}
                  onChange={(e) => setEditingCard({ ...editingCard, front: e.target.value })}
                  dir="rtl"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-right text-lg focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  English (back)
                </label>
                <input
                  type="text"
                  value={editingCard.back}
                  onChange={(e) => setEditingCard({ ...editingCard, back: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Notes (optional)
                </label>
                <input
                  type="text"
                  value={editingCard.notes || ""}
                  onChange={(e) => setEditingCard({ ...editingCard, notes: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCard(null)}
                  className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
