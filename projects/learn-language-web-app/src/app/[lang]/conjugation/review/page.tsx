"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useParams } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import SpeakerButton from "@/components/SpeakerButton";

interface ConjugationItem {
  conjugation_id: number;
  progress_id: number | null;
  verb_id: number;
  root: string;
  meaning: string;
  past_3ms: string;
  present_3ms: string;
  tense: string;
  person: string;
  pronoun_arabic: string;
  conjugated_form: string;
  state: number;
  reps: number;
  verb_audio_url: string | null;
  conjugation_audio_url: string | null;
}

type ReviewState = "prompt" | "checking" | "result";

function ConjugationReviewContent() {
  const searchParams = useSearchParams();
  const params = useParams();
  const lang = params.lang as string;
  const verbId = searchParams.get("verbId");

  const [items, setItems] = useState<ConjugationItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [reviewState, setReviewState] = useState<ReviewState>("prompt");
  const [isCorrect, setIsCorrect] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionStats, setSessionStats] = useState({
    total: 0,
    correct: 0,
    incorrect: 0,
  });

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchItems();
  }, [verbId]);

  useEffect(() => {
    if (reviewState === "prompt" && inputRef.current) {
      inputRef.current.focus();
    }
  }, [reviewState, currentIndex]);

  async function fetchItems() {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (verbId) params.set("verbId", verbId);
      params.set("limit", "20");

      const res = await fetch(`/api/conjugation?${params}`);
      const data = await res.json();
      setItems(data);
    } catch (error) {
      console.error("Error fetching conjugations:", error);
    }
    setIsLoading(false);
  }

  const currentItem = items[currentIndex];

  function normalizeArabic(text: string): string {
    // Remove diacritics (tashkeel) for comparison
    return text
      .replace(/[\u064B-\u0652\u0670]/g, "") // Remove Arabic diacritics
      .replace(/\s+/g, "") // Remove spaces
      .trim();
  }

  function checkAnswer() {
    const normalized = normalizeArabic(userAnswer);
    const correct = normalizeArabic(currentItem.conjugated_form);
    const isMatch = normalized === correct;

    setIsCorrect(isMatch);
    setReviewState("result");
    setSessionStats((prev) => ({
      ...prev,
      total: prev.total + 1,
      correct: prev.correct + (isMatch ? 1 : 0),
      incorrect: prev.incorrect + (isMatch ? 0 : 1),
    }));
  }

  async function submitRating(rating: number) {
    try {
      await fetch("/api/conjugation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conjugationId: currentItem.conjugation_id,
          progressId: currentItem.progress_id,
          rating,
        }),
      });

      // If rating is "Again" (1), add to end of queue
      if (rating === 1) {
        setItems((prev) => [...prev, currentItem]);
      }

      // Move to next item
      if (currentIndex < items.length - 1) {
        setCurrentIndex((prev) => prev + 1);
        setUserAnswer("");
        setReviewState("prompt");
      } else {
        // Session complete
        setReviewState("checking");
      }
    } catch (error) {
      console.error("Error submitting rating:", error);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      if (reviewState === "prompt" && userAnswer.trim()) {
        checkAnswer();
      } else if (reviewState === "result") {
        // Enter after seeing result = submit Good (3) if correct, Again (1) if incorrect
        submitRating(isCorrect ? 3 : 1);
      }
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg">
        <Header />
        <div className="py-12 text-center text-ink-faint">Loading...</div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-bg">
        <Header />
        <main className="mx-auto max-w-2xl px-6 py-12 text-center">
          <div className="mb-4 text-6xl">🎉</div>
          <h1 className="mb-2 text-[28px] font-bold tracking-tight text-ink">
            All caught up!
          </h1>
          <p className="mb-6 text-ink-faint">
            No conjugations to practice right now. Add some verbs first!
          </p>
          <Link
            href={`/${lang}/conjugation`}
            className="rounded-[var(--radius-md)] bg-accent px-6 py-3 font-medium text-white hover:bg-accent-hover"
          >
            Go to Conjugation
          </Link>
        </main>
      </div>
    );
  }

  // Session complete
  if (reviewState === "checking" && currentIndex >= items.length - 1 && !currentItem) {
    return (
      <div className="min-h-screen bg-bg">
        <Header />
        <main className="mx-auto max-w-2xl px-6 py-12 text-center">
          <div className="mb-4 text-6xl">✨</div>
          <h1 className="mb-2 text-[28px] font-bold tracking-tight text-ink">
            Practice Complete!
          </h1>
          <div className="mb-6 text-ink-faint">
            <p>
              {sessionStats.correct} correct, {sessionStats.incorrect} incorrect out of{" "}
              {sessionStats.total} attempts
            </p>
            <p className="mt-1 text-lg font-semibold text-accent">
              {Math.round((sessionStats.correct / sessionStats.total) * 100)}% accuracy
            </p>
          </div>
          <div className="flex justify-center gap-4">
            <button
              onClick={() => {
                setCurrentIndex(0);
                setSessionStats({ total: 0, correct: 0, incorrect: 0 });
                setReviewState("prompt");
                setUserAnswer("");
                fetchItems();
              }}
              className="rounded-[var(--radius-md)] bg-accent px-6 py-3 font-medium text-white hover:bg-accent-hover"
            >
              Practice More
            </button>
            <Link
              href={`/${lang}/conjugation`}
              className="rounded-[var(--radius-md)] border border-line px-6 py-3 font-medium text-ink-soft hover:bg-surface-hover"
            >
              Back to Verbs
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // Check if we've gone past all items
  if (!currentItem) {
    return (
      <div className="min-h-screen bg-bg">
        <Header />
        <main className="mx-auto max-w-2xl px-6 py-12 text-center">
          <div className="mb-4 text-6xl">✨</div>
          <h1 className="mb-2 text-[28px] font-bold tracking-tight text-ink">
            Practice Complete!
          </h1>
          <div className="mb-6 text-ink-faint">
            <p>
              {sessionStats.correct} correct, {sessionStats.incorrect} incorrect out of{" "}
              {sessionStats.total} attempts
            </p>
            {sessionStats.total > 0 && (
              <p className="mt-1 text-lg font-semibold text-accent">
                {Math.round((sessionStats.correct / sessionStats.total) * 100)}% accuracy
              </p>
            )}
          </div>
          <div className="flex justify-center gap-4">
            <button
              onClick={() => {
                setCurrentIndex(0);
                setSessionStats({ total: 0, correct: 0, incorrect: 0 });
                setReviewState("prompt");
                setUserAnswer("");
                fetchItems();
              }}
              className="rounded-[var(--radius-md)] bg-accent px-6 py-3 font-medium text-white hover:bg-accent-hover"
            >
              Practice More
            </button>
            <Link
              href={`/${lang}/conjugation`}
              className="rounded-[var(--radius-md)] border border-line px-6 py-3 font-medium text-ink-soft hover:bg-surface-hover"
            >
              Back to Verbs
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <Header />

      <main className="mx-auto max-w-2xl px-6 py-8">
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="mb-2 flex justify-between text-sm text-ink-faint">
            <span>
              {currentIndex + 1} / {items.length}
            </span>
            <span>
              {sessionStats.correct} correct, {sessionStats.incorrect} incorrect
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-hover">
            <div
              className="h-full bg-accent transition-all"
              style={{ width: `${((currentIndex + 1) / items.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Practice Card */}
        <div className="rounded-[var(--radius-md)] border border-line/50 bg-surface p-6" style={{ boxShadow: "var(--shadow-card)" }}>
          {/* Verb Info */}
          <div className="mb-6 text-center">
            <div className="mb-2 text-sm text-ink-faint">
              {currentItem.meaning}
            </div>
            <div className="mb-4 flex items-center justify-center gap-2">
              <div dir="rtl" className="text-2xl font-bold text-ink">
                {currentItem.past_3ms}
              </div>
              <SpeakerButton
                text={currentItem.past_3ms}
                audioUrl={currentItem.verb_audio_url}
                entityType="verb"
                entityId={currentItem.verb_id}
                size="md"
              />
            </div>

            {/* Prompt */}
            <div className="rounded-[var(--radius-sm)] bg-surface-hover p-4">
              <div className="mb-1 text-sm text-ink-faint">
                Conjugate in the{" "}
                <span className="font-semibold">
                  {currentItem.tense === "present" ? "present (المضارع)" : "past (الماضي)"}
                </span>{" "}
                for:
              </div>
              <div dir="rtl" className="text-3xl font-bold text-accent">
                {currentItem.pronoun_arabic}
              </div>
            </div>
          </div>

          {/* Input Area */}
          <div className="mb-6">
            {reviewState === "prompt" && (
              <div>
                <input
                  ref={inputRef}
                  type="text"
                  dir="rtl"
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your answer..."
                  className="w-full rounded-[var(--radius-sm)] border-2 border-line px-4 py-4 text-center text-2xl focus:border-accent focus:outline-none"
                  autoComplete="off"
                  autoCapitalize="off"
                />
                <button
                  onClick={checkAnswer}
                  disabled={!userAnswer.trim()}
                  className="mt-4 w-full rounded-[var(--radius-sm)] bg-accent py-3 text-lg font-medium text-white hover:bg-accent-hover disabled:opacity-50"
                >
                  Check Answer
                </button>
              </div>
            )}

            {reviewState === "result" && (
              <div>
                {/* Result Display */}
                <div
                  className={`mb-4 rounded-[var(--radius-sm)] p-4 text-center ${
                    isCorrect
                      ? "bg-success-subtle"
                      : "bg-error-subtle"
                  }`}
                >
                  <div
                    className={`mb-2 text-lg font-medium ${
                      isCorrect
                        ? "text-success"
                        : "text-ink"
                    }`}
                  >
                    {isCorrect ? "Correct! ✓" : "Not quite..."}
                  </div>

                  {!isCorrect && (
                    <div className="mb-2">
                      <div className="text-sm text-ink-faint">Your answer:</div>
                      <div dir="rtl" className="text-xl text-red-600 line-through">
                        {userAnswer || "(empty)"}
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="text-sm text-ink-faint">Correct answer:</div>
                    <div dir="rtl" className="flex items-center justify-center gap-2 text-2xl font-bold text-ink">
                      {currentItem.conjugated_form}
                      <SpeakerButton
                        text={currentItem.conjugated_form}
                        audioUrl={currentItem.conjugation_audio_url}
                        entityType="conjugation"
                        entityId={currentItem.conjugation_id}
                        size="md"
                      />
                    </div>
                  </div>
                </div>

                {/* Rating Buttons */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <button
                    onClick={() => submitRating(1)}
                    className="rounded-[var(--radius-sm)] bg-surface border border-line py-3 font-medium text-ink transition hover:bg-surface-hover"
                  >
                    Again
                  </button>
                  <button
                    onClick={() => submitRating(2)}
                    className="rounded-[var(--radius-sm)] bg-surface border border-line py-3 font-medium text-ink transition hover:bg-surface-hover"
                  >
                    Hard
                  </button>
                  <button
                    onClick={() => submitRating(3)}
                    className="rounded-[var(--radius-sm)] border-2 border-accent bg-accent py-3 font-medium text-white transition hover:bg-accent-hover"
                  >
                    Good
                  </button>
                  <button
                    onClick={() => submitRating(4)}
                    className="rounded-[var(--radius-sm)] bg-surface border border-line py-3 font-medium text-ink transition hover:bg-surface-hover"
                  >
                    Easy
                  </button>
                </div>

                <p className="mt-3 text-center text-sm text-ink-faint">
                  Press Enter for {isCorrect ? "Good" : "Again"}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Skip / Exit */}
        <div className="mt-4 flex justify-between">
          <Link
            href={`/${lang}/conjugation`}
            className="text-sm text-ink-faint hover:text-ink-soft"
          >
            ← Exit Practice
          </Link>
          {reviewState === "prompt" && (
            <button
              onClick={() => {
                if (currentIndex < items.length - 1) {
                  setCurrentIndex((prev) => prev + 1);
                  setUserAnswer("");
                }
              }}
              className="text-sm text-ink-faint hover:text-ink-soft"
            >
              Skip →
            </button>
          )}
        </div>
      </main>
    </div>
  );
}

export default function ConjugationReviewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-bg">
          <Header />
          <div className="py-12 text-center text-ink-faint">Loading...</div>
        </div>
      }
    >
      <ConjugationReviewContent />
    </Suspense>
  );
}
