"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { schedulingCards, formatInterval } from "@/lib/fsrs";
import SpeakerButton from "@/components/SpeakerButton";

interface Card {
  id: number;
  front: string;
  back: string;
  notes: string | null;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: number;
  due: string;
  last_review: string | null;
  deck_id: number;
  created_at: string;
  updated_at: string;
  audio_url: string | null;
  image_url: string | null;
}

interface ReviewSessionState {
  startTime: number;
  cardsReviewed: number;
  ratings: { [key: number]: number };
}

interface ReviewSessionProps {
  deckId?: string;
  backUrl: string;
  backLabel: string;
}

export default function ReviewSession({ deckId, backUrl, backLabel }: ReviewSessionProps) {
  const [cards, setCards] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [session, setSession] = useState<ReviewSessionState>({
    startTime: Date.now(),
    cardsReviewed: 0,
    ratings: { 1: 0, 2: 0, 3: 0, 4: 0 },
  });
  const [schedulingInfo, setSchedulingInfo] = useState<any>(null);
  const [imageOnly, setImageOnly] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }

  useEffect(() => {
    fetchDueCards();
  }, [deckId]);

  useEffect(() => {
    if (cards.length > 0 && currentIndex < cards.length) {
      const card = cards[currentIndex];
      const info = schedulingCards(card);
      setSchedulingInfo(info);
    }
  }, [currentIndex, cards]);

  async function fetchDueCards() {
    try {
      const url = deckId
        ? `/api/review?deckId=${deckId}&limit=50`
        : `/api/review?limit=50`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setCards(data);
      }
    } catch (error) {
      console.error("Error fetching due cards:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function submitReview(rating: number) {
    if (isSubmitting || isTransitioning || currentIndex >= cards.length) return;

    setIsSubmitting(true);
    const currentCard = cards[currentIndex];

    try {
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardId: currentCard.id,
          rating,
        }),
      });

      if (res.ok) {
        setSession((prev) => ({
          ...prev,
          cardsReviewed: prev.cardsReviewed + 1,
          ratings: {
            ...prev.ratings,
            [rating]: prev.ratings[rating] + 1,
          },
        }));

        if (rating === 1) {
          setCards((prev) => [...prev, currentCard]);
        }

        setIsTransitioning(true);
        setIsFlipped(false);

        setTimeout(() => {
          setCurrentIndex((prev) => prev + 1);
          setIsTransitioning(false);
        }, 300);
      }
    } catch (error) {
      console.error("Error submitting review:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleFlip() {
    setIsFlipped(!isFlipped);
  }

  function handleKeyPress(e: KeyboardEvent) {
    if (isSubmitting || isTransitioning) return;

    if (e.key === "ArrowLeft" && currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setIsFlipped(false);
      return;
    }
    if (e.key === "ArrowRight" && currentIndex < cards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setIsFlipped(false);
      return;
    }

    if (!isFlipped && (e.key === " " || e.key === "Enter")) {
      e.preventDefault();
      setIsFlipped(true);
    } else if (isFlipped) {
      if (e.key === "1") submitReview(1);
      else if (e.key === "2") submitReview(2);
      else if (e.key === "3") submitReview(3);
      else if (e.key === "4") submitReview(4);
    }
  }

  useEffect(() => {
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [isFlipped, isSubmitting, isTransitioning, currentIndex]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="text-slate-500">Loading cards...</div>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="text-center">
          <div className="mb-4 text-6xl">🎉</div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">All Done!</h2>
          <p className="mt-2 text-slate-500">No cards due for review right now.</p>
          <Link
            href={backUrl}
            className="mt-6 inline-block rounded-lg bg-emerald-600 px-6 py-3 text-white transition hover:bg-emerald-700"
          >
            {backLabel}
          </Link>
        </div>
      </div>
    );
  }

  if (currentIndex >= cards.length) {
    const duration = Math.floor((Date.now() - session.startTime) / 1000);
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;

    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-700 dark:bg-slate-800">
          <div className="mb-6 text-center text-6xl">🎉</div>
          <h2 className="text-center text-2xl font-bold text-slate-800 dark:text-white">
            Review Complete!
          </h2>

          <div className="mt-6 space-y-4">
            <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-700/50">
              <div className="text-center">
                <div className="text-3xl font-bold text-emerald-600">{session.cardsReviewed}</div>
                <div className="text-sm text-slate-500">Cards Reviewed</div>
              </div>
            </div>

            <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-700/50">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {minutes}:{seconds.toString().padStart(2, "0")}
                </div>
                <div className="text-sm text-slate-500">Time Spent</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-red-50 p-3 dark:bg-red-900/20">
                <div className="text-center">
                  <div className="text-xl font-bold text-red-600">{session.ratings[1]}</div>
                  <div className="text-xs text-slate-500">Again</div>
                </div>
              </div>
              <div className="rounded-lg bg-amber-50 p-3 dark:bg-amber-900/20">
                <div className="text-center">
                  <div className="text-xl font-bold text-amber-600">{session.ratings[2]}</div>
                  <div className="text-xs text-slate-500">Hard</div>
                </div>
              </div>
              <div className="rounded-lg bg-emerald-50 p-3 dark:bg-emerald-900/20">
                <div className="text-center">
                  <div className="text-xl font-bold text-emerald-600">{session.ratings[3]}</div>
                  <div className="text-xs text-slate-500">Good</div>
                </div>
              </div>
              <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
                <div className="text-center">
                  <div className="text-xl font-bold text-blue-600">{session.ratings[4]}</div>
                  <div className="text-xs text-slate-500">Easy</div>
                </div>
              </div>
            </div>
          </div>

          <Link
            href={backUrl}
            className="mt-6 block w-full rounded-lg bg-emerald-600 py-3 text-center font-medium text-white transition hover:bg-emerald-700"
          >
            {backLabel}
          </Link>
        </div>
      </div>
    );
  }

  const currentCard = cards[currentIndex];
  const progress = ((currentIndex + 1) / cards.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-700 dark:bg-slate-900/80">
        <div className="mx-auto max-w-4xl px-6 py-4">
          <div className="flex items-center justify-between">
            <Link
              href={backUrl}
              className="flex items-center gap-2 text-slate-500 transition hover:text-slate-700 dark:hover:text-slate-300"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-sm font-medium">Back</span>
            </Link>
            <div className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Card {currentIndex + 1} of {cards.length}
            </div>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
            <div
              className="h-full bg-emerald-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </header>

      <main className="flex min-h-[calc(100vh-120px)] items-center justify-center p-6">
        <div className="w-full max-w-2xl">
          <div
            className="group relative cursor-pointer"
            onClick={handleFlip}
            style={{ perspective: "1000px" }}
          >
            <div
              className="relative h-96 transition-transform duration-500"
              style={{
                transformStyle: "preserve-3d",
                transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
              }}
            >
              {/* Front */}
              <div
                className="absolute inset-0 flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 shadow-xl dark:border-slate-700 dark:bg-slate-800"
                style={{ backfaceVisibility: "hidden" }}
              >
                <div className="text-center">
                  {currentCard.image_url && (
                    <img
                      src={currentCard.image_url}
                      alt=""
                      className={`mx-auto rounded-xl object-cover shadow-md ${imageOnly ? "h-48 w-48 mb-4" : "h-32 w-32 mb-6"}`}
                    />
                  )}
                  {(!imageOnly || !currentCard.image_url) && (
                    <div dir="rtl">
                      <p className="text-5xl font-medium text-slate-800 dark:text-white">
                        {currentCard.front}
                      </p>
                    </div>
                  )}
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <SpeakerButton
                      text={currentCard.front}
                      cardId={currentCard.id}
                      audioUrl={currentCard.audio_url}
                      size="lg"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(currentCard.front);
                      }}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700 dark:bg-slate-700 dark:text-slate-400 dark:hover:bg-slate-600"
                      title={copied ? "Copied!" : "Copy Arabic text"}
                    >
                      {copied ? (
                        <svg className="h-5 w-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      )}
                    </button>
                    {currentCard.image_url && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setImageOnly(!imageOnly);
                        }}
                        className={`inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
                          imageOnly
                            ? "bg-emerald-100 text-emerald-600 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400"
                            : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-400"
                        }`}
                        title={imageOnly ? "Show text" : "Image only"}
                      >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {imageOnly ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          )}
                        </svg>
                      </button>
                    )}
                  </div>
                  {!isFlipped && (
                    <p className="mt-4 text-sm text-slate-400">
                      Click or press Space to reveal
                    </p>
                  )}
                </div>
              </div>

              {/* Back */}
              <div
                className="absolute inset-0 flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 shadow-xl dark:border-slate-700 dark:bg-slate-800"
                style={{
                  backfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                }}
              >
                <div className="w-full text-center">
                  <div className="mb-4 flex items-center justify-center gap-2" dir="rtl">
                    <span className="text-2xl text-slate-400 dark:text-slate-500">
                      {currentCard.front}
                    </span>
                    <SpeakerButton
                      text={currentCard.front}
                      cardId={currentCard.id}
                      audioUrl={currentCard.audio_url}
                      size="md"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(currentCard.front);
                      }}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700 dark:bg-slate-700 dark:text-slate-400 dark:hover:bg-slate-600"
                      title={copied ? "Copied!" : "Copy Arabic text"}
                    >
                      {copied ? (
                        <svg className="h-4 w-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <p className="text-4xl font-medium text-slate-800 dark:text-white">
                    {currentCard.back}
                  </p>
                  {currentCard.notes && (
                    <p className="mt-4 text-lg text-slate-500 dark:text-slate-400">
                      {currentCard.notes}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {isFlipped && schedulingInfo && (
            <div className="mt-8 grid grid-cols-4 gap-3">
              <button
                onClick={() => submitReview(1)}
                disabled={isSubmitting}
                className="group relative rounded-xl border-2 border-red-200 bg-red-50 p-4 transition hover:border-red-300 hover:bg-red-100 disabled:opacity-50 dark:border-red-900/50 dark:bg-red-900/20 dark:hover:bg-red-900/30"
              >
                <div className="mb-2 text-2xl font-bold text-red-600">Again</div>
                <div className="text-sm font-medium text-red-500">
                  {formatInterval(schedulingInfo.again.card.scheduled_days)}
                </div>
                <div className="mt-1 text-xs text-slate-400">Press 1</div>
              </button>

              <button
                onClick={() => submitReview(2)}
                disabled={isSubmitting}
                className="group relative rounded-xl border-2 border-amber-200 bg-amber-50 p-4 transition hover:border-amber-300 hover:bg-amber-100 disabled:opacity-50 dark:border-amber-900/50 dark:bg-amber-900/20 dark:hover:bg-amber-900/30"
              >
                <div className="mb-2 text-2xl font-bold text-amber-600">Hard</div>
                <div className="text-sm font-medium text-amber-500">
                  {formatInterval(schedulingInfo.hard.card.scheduled_days)}
                </div>
                <div className="mt-1 text-xs text-slate-400">Press 2</div>
              </button>

              <button
                onClick={() => submitReview(3)}
                disabled={isSubmitting}
                className="group relative rounded-xl border-2 border-emerald-200 bg-emerald-50 p-4 transition hover:border-emerald-300 hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/30"
              >
                <div className="mb-2 text-2xl font-bold text-emerald-600">Good</div>
                <div className="text-sm font-medium text-emerald-500">
                  {formatInterval(schedulingInfo.good.card.scheduled_days)}
                </div>
                <div className="mt-1 text-xs text-slate-400">Press 3</div>
              </button>

              <button
                onClick={() => submitReview(4)}
                disabled={isSubmitting}
                className="group relative rounded-xl border-2 border-blue-200 bg-blue-50 p-4 transition hover:border-blue-300 hover:bg-blue-100 disabled:opacity-50 dark:border-blue-900/50 dark:bg-blue-900/20 dark:hover:bg-blue-900/30"
              >
                <div className="mb-2 text-2xl font-bold text-blue-600">Easy</div>
                <div className="text-sm font-medium text-blue-500">
                  {formatInterval(schedulingInfo.easy.card.scheduled_days)}
                </div>
                <div className="mt-1 text-xs text-slate-400">Press 4</div>
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
