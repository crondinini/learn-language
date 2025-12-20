"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import SpeakerButton from "@/components/SpeakerButton";
import Header from "@/components/Header";
import { MarkdownNotes } from "@/components/MarkdownNotes";

interface Card {
  id: number;
  deck_id: number;
  front: string;
  back: string;
  notes: string | null;
  audio_url: string | null;
  image_url: string | null;
  state: number;
  reps: number;
  due: string;
}

interface DeckOption {
  id: number;
  name: string;
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
  const [totalDueCount, setTotalDueCount] = useState(0);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [previewCard, setPreviewCard] = useState<Card | null>(null);
  const [previewFlipped, setPreviewFlipped] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [allDecks, setAllDecks] = useState<DeckOption[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState<number | null>(null);
  const [editingDeck, setEditingDeck] = useState(false);
  const [editDeckName, setEditDeckName] = useState("");
  const [editDeckDescription, setEditDeckDescription] = useState("");

  useEffect(() => {
    fetchDeck();
    fetchCards();
    fetchTotalDueCount();
    fetchAllDecks();
  }, [id]);

  async function fetchAllDecks() {
    const res = await fetch("/api/decks");
    if (res.ok) {
      const decks = await res.json();
      setAllDecks(decks.map((d: Deck) => ({ id: d.id, name: d.name })));
    }
  }

  // Keyboard navigation for preview modal
  useEffect(() => {
    if (!previewCard) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft" && previewIndex > 0) {
        const newIndex = previewIndex - 1;
        setPreviewIndex(newIndex);
        setPreviewCard(cards[newIndex]);
        setPreviewFlipped(false);
      } else if (e.key === "ArrowRight" && previewIndex < cards.length - 1) {
        const newIndex = previewIndex + 1;
        setPreviewIndex(newIndex);
        setPreviewCard(cards[newIndex]);
        setPreviewFlipped(false);
      } else if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        setPreviewFlipped(!previewFlipped);
      } else if (e.key === "Escape") {
        setPreviewCard(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [previewCard, previewIndex, previewFlipped, cards]);

  async function fetchTotalDueCount() {
    const res = await fetch("/api/decks");
    const decks = await res.json();
    setTotalDueCount(decks.reduce((sum: number, d: Deck) => sum + d.due_cards, 0));
  }

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

  function openEditDeck() {
    if (!deck) return;
    setEditDeckName(deck.name);
    setEditDeckDescription(deck.description || "");
    setEditingDeck(true);
  }

  async function saveDeck(e: React.FormEvent) {
    e.preventDefault();
    if (!editDeckName.trim()) return;

    const res = await fetch(`/api/decks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editDeckName,
        description: editDeckDescription || null,
      }),
    });

    if (res.ok) {
      setEditingDeck(false);
      fetchDeck();
    }
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

    const newDeckId = selectedDeckId ?? editingCard.deck_id;
    const movedToDifferentDeck = newDeckId !== parseInt(id);

    await fetch(`/api/cards/${editingCard.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        front: editingCard.front,
        back: editingCard.back,
        notes: editingCard.notes,
        deck_id: newDeckId,
      }),
    });

    setEditingCard(null);
    setSelectedDeckId(null);
    fetchCards();
    if (movedToDifferentDeck) {
      fetchDeck(); // Update card counts
    }
  }

  async function deleteCard(cardId: number) {
    if (!confirm("Delete this card?")) return;
    await fetch(`/api/cards/${cardId}`, { method: "DELETE" });
    fetchCards();
    fetchDeck();
  }

  async function uploadImage(cardId: number, file: File) {
    setUploadingImage(true);
    const formData = new FormData();
    formData.append("cardId", cardId.toString());
    formData.append("image", file);

    const res = await fetch("/api/images", {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      const data = await res.json();
      if (editingCard && editingCard.id === cardId) {
        setEditingCard({ ...editingCard, image_url: data.image_url });
      }
      fetchCards();
    }
    setUploadingImage(false);
  }

  async function deleteImage(cardId: number) {
    await fetch(`/api/images?cardId=${cardId}`, { method: "DELETE" });
    if (editingCard && editingCard.id === cardId) {
      setEditingCard({ ...editingCard, image_url: null });
    }
    fetchCards();
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
      <Header
        actions={
          <>
            {totalDueCount > 0 && (
              <Link
                href="/review"
                className="rounded-lg bg-blue-600 px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-white transition hover:bg-blue-700"
              >
                Study ({totalDueCount})
              </Link>
            )}
            <Link
              href="/"
              className="hidden sm:block rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
            >
              + New Deck
            </Link>
          </>
        }
      />

      {/* Main Content */}
      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-6 sm:py-8 overflow-hidden">
        {/* Breadcrumb */}
        <nav className="mb-4 flex items-center gap-2 text-sm">
          <Link href="/" className="text-slate-500 hover:text-emerald-600 dark:text-slate-400">
            Decks
          </Link>
          <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-slate-700 dark:text-slate-200">{deck.name}</span>
        </nav>

        {/* Page Title */}
        <div className="mb-6">
          {/* Title row */}
          <div className="flex items-start gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white">{deck.name}</h1>
            <button
              onClick={openEditDeck}
              className="mt-0.5 rounded-full p-1.5 text-slate-400 transition hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
              title="Edit deck"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          </div>
          {deck.description && (
            <p className="mt-1 text-sm sm:text-base text-slate-500">{deck.description}</p>
          )}

          {/* Stats and actions row - stacks on mobile */}
          <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex gap-4 text-sm">
              <span className="text-slate-500">
                <strong className="text-amber-600">{deck.due_cards}</strong> due
              </span>
              <span className="text-slate-500">
                <strong className="text-emerald-600">{deck.new_cards}</strong> new
              </span>
            </div>
            <div className="flex gap-2">
              {deck.due_cards > 0 && (
                <Link
                  href={`/deck/${id}/review`}
                  className="flex-1 sm:flex-none rounded-lg bg-blue-600 px-3 sm:px-4 py-2 text-center text-sm font-medium text-white transition hover:bg-blue-700"
                >
                  Study Now
                </Link>
              )}
              <button
                onClick={() => setShowAddCard(true)}
                className="flex-1 sm:flex-none rounded-lg bg-emerald-600 px-3 sm:px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
              >
                + Add Card
              </button>
            </div>
          </div>
        </div>
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
                className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm transition hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
                onClick={() => {
                  const index = cards.findIndex(c => c.id === card.id);
                  setPreviewIndex(index);
                  setPreviewCard(card);
                  setPreviewFlipped(false);
                }}
              >
                {/* Mobile: Stack vertically, Desktop: Horizontal */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-6">
                  {/* Top row on mobile / Left section on desktop */}
                  <div className="flex items-center gap-3 sm:gap-6">
                    {/* Image thumbnail */}
                    {card.image_url && (
                      <img
                        src={card.image_url}
                        alt=""
                        className="h-10 w-10 rounded object-cover flex-shrink-0"
                      />
                    )}

                    {/* Arabic (front) */}
                    <div className="flex items-center gap-2" dir="rtl">
                      <span className="text-lg sm:text-xl font-medium text-slate-800 dark:text-white">
                        {card.front}
                      </span>
                      <SpeakerButton
                        text={card.front}
                        cardId={card.id}
                        audioUrl={card.audio_url}
                        size="sm"
                      />
                    </div>

                    {/* Arrow - hidden on mobile */}
                    <svg className="hidden sm:block h-4 w-4 flex-shrink-0 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>

                    {/* State badge - shown inline on mobile */}
                    <span
                      className={`sm:hidden ml-auto rounded-full px-2 py-0.5 text-xs font-medium bg-${stateColors[card.state]}-100 text-${stateColors[card.state]}-700 dark:bg-${stateColors[card.state]}-900/30 dark:text-${stateColors[card.state]}-400`}
                    >
                      {stateLabels[card.state]}
                    </span>
                  </div>

                  {/* English (back) - truncated on mobile */}
                  <div className="flex-1 min-w-0">
                    <span className="block truncate text-base sm:text-lg text-slate-600 dark:text-slate-300">{card.back}</span>
                    {/* Notes hidden on mobile - tap to see in preview */}
                    {card.notes && (
                      <div className="hidden sm:block">
                        <MarkdownNotes content={card.notes} className="mt-0.5 text-sm text-slate-400 line-clamp-2" />
                      </div>
                    )}
                  </div>

                  {/* State badge - desktop only (positioned at end) */}
                  <span
                    className={`hidden sm:block flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium bg-${stateColors[card.state]}-100 text-${stateColors[card.state]}-700 dark:bg-${stateColors[card.state]}-900/30 dark:text-${stateColors[card.state]}-400`}
                  >
                    {stateLabels[card.state]}
                  </span>
                  {/* Actions - hidden on mobile, shown on hover for desktop */}
                  <div className="hidden sm:flex flex-shrink-0 gap-1 opacity-0 transition group-hover:opacity-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingCard(card);
                      }}
                      className="rounded p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteCard(card.id);
                      }}
                      className="rounded p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
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
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Deck
                </label>
                <select
                  value={selectedDeckId ?? editingCard.deck_id}
                  onChange={(e) => setSelectedDeckId(parseInt(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                >
                  {allDecks.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Image (optional)
                </label>
                {editingCard.image_url ? (
                  <div className="mt-2 relative">
                    <img
                      src={editingCard.image_url}
                      alt="Card image"
                      className="w-full h-32 object-cover rounded-lg border border-slate-200 dark:border-slate-600"
                    />
                    <button
                      type="button"
                      onClick={() => deleteImage(editingCard.id)}
                      className="absolute top-2 right-2 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <label className="mt-2 flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-slate-300 p-4 transition hover:border-emerald-500 dark:border-slate-600 dark:hover:border-emerald-500">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadImage(editingCard.id, file);
                      }}
                      className="hidden"
                      disabled={uploadingImage}
                    />
                    {uploadingImage ? (
                      <span className="text-sm text-slate-500">Uploading...</span>
                    ) : (
                      <div className="text-center">
                        <svg className="mx-auto h-8 w-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="mt-1 block text-sm text-slate-500">Click to upload image</span>
                      </div>
                    )}
                  </label>
                )}
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

      {/* Preview Card Modal */}
      {previewCard && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setPreviewCard(null)}
        >
          {/* Left arrow */}
          {previewIndex > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                const newIndex = previewIndex - 1;
                setPreviewIndex(newIndex);
                setPreviewCard(cards[newIndex]);
                setPreviewFlipped(false);
              }}
              className="absolute left-4 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          {/* Right arrow */}
          {previewIndex < cards.length - 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                const newIndex = previewIndex + 1;
                setPreviewIndex(newIndex);
                setPreviewCard(cards[newIndex]);
                setPreviewFlipped(false);
              }}
              className="absolute right-4 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          <div
            className="w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setPreviewCard(null)}
              className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Card counter */}
            <div className="mb-4 text-center text-sm text-white/70">
              {previewIndex + 1} / {cards.length}
            </div>

            {/* Flashcard */}
            <div
              className="cursor-pointer"
              onClick={() => setPreviewFlipped(!previewFlipped)}
              style={{ perspective: "1000px" }}
            >
              <div
                className="relative h-80 transition-transform duration-500"
                style={{
                  transformStyle: "preserve-3d",
                  transform: previewFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                }}
              >
                {/* Front */}
                <div
                  className="absolute inset-0 flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-700 dark:bg-slate-800"
                  style={{ backfaceVisibility: "hidden" }}
                >
                  <div className="text-center">
                    {previewCard.image_url && (
                      <img
                        src={previewCard.image_url}
                        alt=""
                        className="mx-auto mb-4 h-28 w-28 rounded-xl object-cover shadow-md"
                      />
                    )}
                    <div dir="rtl">
                      <p className="text-4xl font-medium text-slate-800 dark:text-white">
                        {previewCard.front}
                      </p>
                    </div>
                    <div className="mt-4">
                      <SpeakerButton
                        text={previewCard.front}
                        cardId={previewCard.id}
                        audioUrl={previewCard.audio_url}
                        size="lg"
                      />
                    </div>
                    <p className="mt-4 text-sm text-slate-400">
                      Click to flip
                    </p>
                  </div>
                </div>

                {/* Back */}
                <div
                  className="absolute inset-0 flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-700 dark:bg-slate-800"
                  style={{
                    backfaceVisibility: "hidden",
                    transform: "rotateY(180deg)",
                  }}
                >
                  <div className="w-full text-center">
                    <div className="mb-3 flex items-center justify-center gap-2" dir="rtl">
                      <span className="text-xl text-slate-400 dark:text-slate-500">
                        {previewCard.front}
                      </span>
                      <SpeakerButton
                        text={previewCard.front}
                        cardId={previewCard.id}
                        audioUrl={previewCard.audio_url}
                        size="md"
                      />
                    </div>
                    <p className="text-3xl font-medium text-slate-800 dark:text-white">
                      {previewCard.back}
                    </p>
                    {previewCard.notes && (
                      <MarkdownNotes
                        content={previewCard.notes}
                        className="mt-4 text-base text-slate-500 dark:text-slate-400"
                      />
                    )}
                    <p className="mt-4 text-sm text-slate-400">
                      Click to flip back
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Edit button */}
            <div className="mt-4 flex justify-center">
              <button
                onClick={() => {
                  setEditingCard(previewCard);
                  setPreviewCard(null);
                }}
                className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
              >
                Edit Card
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Deck Modal */}
      {editingDeck && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800">
            <h2 className="mb-4 text-xl font-bold text-slate-800 dark:text-white">Edit Deck</h2>
            <form onSubmit={saveDeck}>
              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Name
                </label>
                <input
                  type="text"
                  value={editDeckName}
                  onChange={(e) => setEditDeckName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  placeholder="Deck name"
                  autoFocus
                />
              </div>
              <div className="mb-6">
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Description (optional)
                </label>
                <textarea
                  value={editDeckDescription}
                  onChange={(e) => setEditDeckDescription(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  placeholder="Deck description"
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingDeck(false)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
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
