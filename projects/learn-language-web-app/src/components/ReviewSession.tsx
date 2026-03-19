"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { schedulingCards, formatInterval } from "@/lib/fsrs";
import SpeakerButton from "@/components/SpeakerButton";
import { MarkdownNotes } from "@/components/MarkdownNotes";

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
  lessonId?: string;
  mode?: "struggling" | "new";
  language?: string;
  backUrl: string;
  backLabel: string;
}

export default function ReviewSession({ deckId, lessonId, mode, language, backUrl, backLabel }: ReviewSessionProps) {
  const isArabic = language === "ar" || !language;
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
    fetchCards();
  }, [deckId, lessonId, mode, language]);

  useEffect(() => {
    if (cards.length > 0 && currentIndex < cards.length) {
      const card = cards[currentIndex];
      const info = schedulingCards(card);
      setSchedulingInfo(info);
    }
  }, [currentIndex, cards]);

  async function fetchCards() {
    try {
      let url: string;
      if (lessonId) {
        url = `/api/review?lessonId=${lessonId}`;
      } else {
        const params = new URLSearchParams();
        if (deckId) params.set("deckId", deckId);
        if (mode) params.set("mode", mode);
        if (language) params.set("language", language);
        params.set("limit", "10");
        url = `/api/review?${params}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setCards(data);
      }
    } catch (error) {
      console.error("Error fetching cards:", error);
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
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <div className="text-ink-faint">Loading cards...</div>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <div className="text-center">
          <div className="mb-4 text-6xl">🎉</div>
          <h2 className="text-2xl font-bold text-ink">All Done!</h2>
          <p className="mt-2 text-ink-faint">
            {lessonId
              ? "This lesson has no cards yet."
              : mode === "struggling"
                ? "No struggling cards — great job!"
                : mode === "new"
                  ? "No new cards to learn."
                  : "No cards due for review right now."}
          </p>
          <Link
            href={backUrl}
            className="mt-6 inline-block rounded-[var(--radius-md)] bg-accent px-6 py-3 text-white transition hover:bg-accent-hover"
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
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <div className="animate-modal w-full max-w-md rounded-[var(--radius-lg)] border border-line/50 bg-surface p-8" style={{ boxShadow: "var(--shadow-lg)" }}>
          <div className="mb-6 text-center text-6xl">🎉</div>
          <h2 className="text-center text-2xl font-bold text-ink">
            Review Complete!
          </h2>

          <div className="mt-6 space-y-4">
            <div className="rounded-[var(--radius-md)] bg-surface-hover p-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-ink">{session.cardsReviewed}</div>
                <div className="text-sm text-ink-faint">Cards Reviewed</div>
              </div>
            </div>

            <div className="rounded-[var(--radius-md)] bg-surface-hover p-4">
              <div className="text-center">
                <div className="font-mono text-3xl font-bold text-ink-soft">
                  {minutes}:{seconds.toString().padStart(2, "0")}
                </div>
                <div className="text-sm text-ink-faint">Time Spent</div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              <div className="rounded-[var(--radius-sm)] border border-error/20 bg-error-subtle p-3">
                <div className="text-center">
                  <div className="text-xl font-bold text-error">{session.ratings[1]}</div>
                  <div className="text-xs text-ink-faint">Again</div>
                </div>
              </div>
              <div className="rounded-[var(--radius-sm)] border border-amber-200 bg-amber-50 p-3">
                <div className="text-center">
                  <div className="text-xl font-bold text-amber-600">{session.ratings[2]}</div>
                  <div className="text-xs text-ink-faint">Hard</div>
                </div>
              </div>
              <div className="rounded-[var(--radius-sm)] border border-accent/20 bg-accent-subtle p-3">
                <div className="text-center">
                  <div className="text-xl font-bold text-accent">{session.ratings[3]}</div>
                  <div className="text-xs text-ink-faint">Good</div>
                </div>
              </div>
              <div className="rounded-[var(--radius-sm)] border border-success/20 bg-success-subtle p-3">
                <div className="text-center">
                  <div className="text-xl font-bold text-success">{session.ratings[4]}</div>
                  <div className="text-xs text-ink-faint">Easy</div>
                </div>
              </div>
            </div>
          </div>

          <Link
            href={backUrl}
            className="mt-6 block w-full rounded-[var(--radius-md)] bg-accent py-3 text-center font-medium text-white transition hover:bg-accent-hover"
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
    <div className="min-h-screen bg-bg">
      <header className="sticky top-0 z-10 h-14 border-b border-line/50 bg-bg/80 backdrop-blur-xl">
        <div className="mx-auto max-w-4xl h-full px-7 flex flex-col justify-center">
          <div className="flex items-center justify-between">
            <Link
              href={backUrl}
              className="flex items-center gap-2 text-ink-faint transition hover:text-ink-soft"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-sm font-medium">Back</span>
            </Link>
            <div className="text-sm font-medium text-ink-soft">
              Card {currentIndex + 1} of {cards.length}
            </div>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface-active">
            <div
              className="h-full rounded-full bg-accent transition-all duration-300"
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
                className="absolute inset-0 flex items-center justify-center rounded-[var(--radius-lg)] border border-line/50 bg-surface p-12"
                style={{ backfaceVisibility: "hidden", boxShadow: "var(--shadow-lg)" }}
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
                    <div dir={isArabic ? "rtl" : "ltr"}>
                      <p className={`${isArabic ? "text-5xl" : "text-4xl"} font-medium text-ink`}>
                        {currentCard.front}
                      </p>
                    </div>
                  )}
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <SpeakerButton
                      text={currentCard.front}
                      entityType="card" entityId={currentCard.id}
                      audioUrl={currentCard.audio_url}
                      language={language}
                      size="lg"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(currentCard.front);
                      }}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-surface-hover text-ink-faint transition-colors hover:bg-surface-active hover:text-ink-soft"
                      title={copied ? "Copied!" : "Copy text"}
                    >
                      {copied ? (
                        <svg className="h-5 w-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                            ? "bg-accent-subtle text-accent"
                            : "bg-surface-hover text-ink-faint hover:bg-surface-active"
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
                    <p className="mt-4 text-sm text-ink-faint">
                      Click or press Space to reveal
                    </p>
                  )}
                </div>
              </div>

              {/* Back */}
              <div
                className="absolute inset-0 flex flex-col rounded-[var(--radius-lg)] border border-line/50 bg-surface p-8"
                style={{
                  backfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                  boxShadow: "var(--shadow-lg)",
                }}
              >
                {/* Fixed header: Front + Back */}
                <div className="flex-shrink-0 text-center">
                  <div className="mb-3 flex items-center justify-center gap-2" dir={isArabic ? "rtl" : "ltr"}>
                    <span className="text-2xl text-ink-faint">
                      {currentCard.front}
                    </span>
                    <SpeakerButton
                      text={currentCard.front}
                      entityType="card" entityId={currentCard.id}
                      audioUrl={currentCard.audio_url}
                      language={language}
                      size="md"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(currentCard.front);
                      }}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-surface-hover text-ink-faint transition-colors hover:bg-surface-active hover:text-ink-soft"
                      title={copied ? "Copied!" : "Copy text"}
                    >
                      {copied ? (
                        <svg className="h-4 w-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <p className="text-4xl font-medium text-ink">
                    {currentCard.back}
                  </p>
                </div>
                {/* Scrollable notes section */}
                {currentCard.notes && (
                  <div className="mt-4 flex-1 overflow-y-auto">
                    <MarkdownNotes
                      content={currentCard.notes}
                      className="text-lg text-ink-faint"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {isFlipped && schedulingInfo && (
            <div className="mt-8 grid grid-cols-4 gap-1.5 sm:gap-3">
              <button
                onClick={() => submitReview(1)}
                disabled={isSubmitting}
                className="group relative rounded-[var(--radius-md)] border border-error/20 bg-error-subtle p-2 sm:p-4 transition hover:border-error/40 disabled:opacity-50"
              >
                <div className="mb-1 sm:mb-2 text-base sm:text-2xl font-bold text-error">Again</div>
                <div className="font-mono text-xs sm:text-sm text-ink-faint">
                  {formatInterval(schedulingInfo.again.card.scheduled_days)}
                </div>
                <div className="mt-1 text-xs text-ink-faint hidden sm:block">Press 1</div>
              </button>

              <button
                onClick={() => submitReview(2)}
                disabled={isSubmitting}
                className="group relative rounded-[var(--radius-md)] border border-amber-200 bg-amber-50 p-2 sm:p-4 transition hover:border-amber-300 disabled:opacity-50"
              >
                <div className="mb-1 sm:mb-2 text-base sm:text-2xl font-bold text-amber-600">Hard</div>
                <div className="font-mono text-xs sm:text-sm text-ink-faint">
                  {formatInterval(schedulingInfo.hard.card.scheduled_days)}
                </div>
                <div className="mt-1 text-xs text-ink-faint hidden sm:block">Press 2</div>
              </button>

              <button
                onClick={() => submitReview(3)}
                disabled={isSubmitting}
                className="group relative rounded-[var(--radius-md)] border-2 border-accent bg-accent text-white p-2 sm:p-4 transition hover:bg-accent-hover disabled:opacity-50"
              >
                <div className="mb-1 sm:mb-2 text-base sm:text-2xl font-bold">Good</div>
                <div className="font-mono text-xs sm:text-sm text-white/70">
                  {formatInterval(schedulingInfo.good.card.scheduled_days)}
                </div>
                <div className="mt-1 text-xs text-white/50 hidden sm:block">Press 3</div>
              </button>

              <button
                onClick={() => submitReview(4)}
                disabled={isSubmitting}
                className="group relative rounded-[var(--radius-md)] border border-success/20 bg-success-subtle p-2 sm:p-4 transition hover:border-success/40 disabled:opacity-50"
              >
                <div className="mb-1 sm:mb-2 text-base sm:text-2xl font-bold text-success">Easy</div>
                <div className="font-mono text-xs sm:text-sm text-ink-faint">
                  {formatInterval(schedulingInfo.easy.card.scheduled_days)}
                </div>
                <div className="mt-1 text-xs text-ink-faint hidden sm:block">Press 4</div>
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
