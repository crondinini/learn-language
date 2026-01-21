"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";

interface ConjugationItem {
  conjugation_id: number;
  progress_id: number | null;
  verb_id: number;
  root: string;
  meaning: string;
  past_3ms: string;
  tense: string;
  person: string;
  pronoun_arabic: string;
  conjugated_form: string;
  state: number;
  reps: number;
}

type ReviewState = "prompt" | "checking" | "result";

function ConjugationReviewContent() {
  const searchParams = useSearchParams();
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <Header />
        <div className="py-12 text-center text-slate-500">Loading...</div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <Header />
        <main className="mx-auto max-w-2xl px-6 py-12 text-center">
          <div className="mb-4 text-6xl">🎉</div>
          <h1 className="mb-2 text-2xl font-bold text-slate-800 dark:text-white">
            All caught up!
          </h1>
          <p className="mb-6 text-slate-500">
            No conjugations to practice right now. Add some verbs first!
          </p>
          <Link
            href="/conjugation"
            className="rounded-lg bg-emerald-600 px-6 py-3 font-medium text-white hover:bg-emerald-700"
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <Header />
        <main className="mx-auto max-w-2xl px-6 py-12 text-center">
          <div className="mb-4 text-6xl">✨</div>
          <h1 className="mb-2 text-2xl font-bold text-slate-800 dark:text-white">
            Practice Complete!
          </h1>
          <div className="mb-6 text-slate-500">
            <p>
              {sessionStats.correct} correct, {sessionStats.incorrect} incorrect out of{" "}
              {sessionStats.total} attempts
            </p>
            <p className="mt-1 text-lg font-semibold text-emerald-600">
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
              className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700"
            >
              Practice More
            </button>
            <Link
              href="/conjugation"
              className="rounded-lg border border-slate-300 px-6 py-3 font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <Header />
        <main className="mx-auto max-w-2xl px-6 py-12 text-center">
          <div className="mb-4 text-6xl">✨</div>
          <h1 className="mb-2 text-2xl font-bold text-slate-800 dark:text-white">
            Practice Complete!
          </h1>
          <div className="mb-6 text-slate-500">
            <p>
              {sessionStats.correct} correct, {sessionStats.incorrect} incorrect out of{" "}
              {sessionStats.total} attempts
            </p>
            {sessionStats.total > 0 && (
              <p className="mt-1 text-lg font-semibold text-emerald-600">
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
              className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700"
            >
              Practice More
            </button>
            <Link
              href="/conjugation"
              className="rounded-lg border border-slate-300 px-6 py-3 font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Back to Verbs
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <Header />

      <main className="mx-auto max-w-2xl px-6 py-8">
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="mb-2 flex justify-between text-sm text-slate-500">
            <span>
              {currentIndex + 1} / {items.length}
            </span>
            <span>
              {sessionStats.correct} correct, {sessionStats.incorrect} incorrect
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
            <div
              className="h-full bg-emerald-500 transition-all"
              style={{ width: `${((currentIndex + 1) / items.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Practice Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-lg dark:border-slate-700 dark:bg-slate-800">
          {/* Verb Info */}
          <div className="mb-6 text-center">
            <div className="mb-2 text-sm text-slate-500 dark:text-slate-400">
              {currentItem.meaning}
            </div>
            <div dir="rtl" className="mb-4 text-2xl font-bold text-slate-800 dark:text-white">
              {currentItem.past_3ms}
            </div>

            {/* Prompt */}
            <div className="rounded-lg bg-slate-100 p-4 dark:bg-slate-700">
              <div className="mb-1 text-sm text-slate-500 dark:text-slate-400">
                Conjugate for:
              </div>
              <div dir="rtl" className="text-3xl font-bold text-blue-600 dark:text-blue-400">
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
                  className="w-full rounded-lg border-2 border-slate-300 px-4 py-4 text-center text-2xl focus:border-blue-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:focus:border-blue-400"
                  autoComplete="off"
                  autoCapitalize="off"
                />
                <button
                  onClick={checkAnswer}
                  disabled={!userAnswer.trim()}
                  className="mt-4 w-full rounded-lg bg-blue-600 py-3 text-lg font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  Check Answer
                </button>
              </div>
            )}

            {reviewState === "result" && (
              <div>
                {/* Result Display */}
                <div
                  className={`mb-4 rounded-lg p-4 text-center ${
                    isCorrect
                      ? "bg-emerald-100 dark:bg-emerald-900/30"
                      : "bg-red-100 dark:bg-red-900/30"
                  }`}
                >
                  <div
                    className={`mb-2 text-lg font-medium ${
                      isCorrect
                        ? "text-emerald-700 dark:text-emerald-400"
                        : "text-red-700 dark:text-red-400"
                    }`}
                  >
                    {isCorrect ? "Correct! ✓" : "Not quite..."}
                  </div>

                  {!isCorrect && (
                    <div className="mb-2">
                      <div className="text-sm text-slate-500">Your answer:</div>
                      <div dir="rtl" className="text-xl text-red-600 line-through dark:text-red-400">
                        {userAnswer || "(empty)"}
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="text-sm text-slate-500">Correct answer:</div>
                    <div dir="rtl" className="text-2xl font-bold text-slate-800 dark:text-white">
                      {currentItem.conjugated_form}
                    </div>
                  </div>
                </div>

                {/* Rating Buttons */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <button
                    onClick={() => submitRating(1)}
                    className="rounded-lg bg-red-100 py-3 font-medium text-red-700 transition hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
                  >
                    Again
                  </button>
                  <button
                    onClick={() => submitRating(2)}
                    className="rounded-lg bg-amber-100 py-3 font-medium text-amber-700 transition hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50"
                  >
                    Hard
                  </button>
                  <button
                    onClick={() => submitRating(3)}
                    className="rounded-lg bg-emerald-100 py-3 font-medium text-emerald-700 transition hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50"
                  >
                    Good
                  </button>
                  <button
                    onClick={() => submitRating(4)}
                    className="rounded-lg bg-blue-100 py-3 font-medium text-blue-700 transition hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50"
                  >
                    Easy
                  </button>
                </div>

                <p className="mt-3 text-center text-sm text-slate-500">
                  Press Enter for {isCorrect ? "Good" : "Again"}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Skip / Exit */}
        <div className="mt-4 flex justify-between">
          <Link
            href="/conjugation"
            className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
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
              className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
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
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
          <Header />
          <div className="py-12 text-center text-slate-500">Loading...</div>
        </div>
      }
    >
      <ConjugationReviewContent />
    </Suspense>
  );
}
