"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import SpeakerButton from "@/components/SpeakerButton";

interface DictionaryResult {
  word: string;
  transliteration?: string;
  language: string;
  definition: string;
  translations: { en: string; pt: string; es: string };
  example: string;
  source: "dictionary" | "ai";
}

interface Deck {
  id: number;
  name: string;
  description?: string;
  language: string;
  total_cards: number;
  learned_cards: number;
}

export default function DictionarySpotlight() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [dictResult, setDictResult] = useState<DictionaryResult | null>(null);
  const [aiResult, setAiResult] = useState<DictionaryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDecks, setShowDecks] = useState(false);
  const [decks, setDecks] = useState<Deck[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const params = useParams();
  const currentLang = (params?.lang as string) || "en";
  const currentDeckId = params?.id ? parseInt(params.id as string) : null;

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        if (showDecks) {
          setShowDecks(false);
        } else if (isOpen) {
          setIsOpen(false);
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, showDecks]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery("");
      setDictResult(null);
      setAiResult(null);
      setError(null);
      setShowDecks(false);
    }
  }, [isOpen]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim() || loading) return;

    setLoading(true);
    setAiLoading(true);
    setError(null);
    setDictResult(null);
    setAiResult(null);
    setShowDecks(false);

    try {
      const res = await fetch("/api/dictionary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: query.trim(), language: currentLang }),
      });

      if (!res.ok || !res.body) throw new Error("Lookup failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line);

            if (event.type === "fast") {
              setDictResult(event.result);
              setLoading(false);
            } else if (event.type === "full") {
              setAiResult(event.result);
              setAiLoading(false);
            } else if (event.type === "error") {
              setError(event.error);
              setLoading(false);
              setAiLoading(false);
            } else if (event.type === "done") {
              setLoading(false);
              setAiLoading(false);
            }
          } catch {
            // ignore parse errors
          }
        }
      }
    } catch {
      setError("Could not look up this word. Try again.");
    } finally {
      setLoading(false);
      setAiLoading(false);
    }
  }

  async function handleAddToCards() {
    // If we're on a deck page, add directly without asking
    if (currentDeckId) {
      handleSelectDeck(currentDeckId);
      return;
    }

    try {
      const res = await fetch("/api/decks");
      if (res.ok) {
        const data: Deck[] = await res.json();
        setDecks(data.filter((d) => d.language === currentLang));
        setShowDecks(true);
        // Scroll to top so deck list is visible
        setTimeout(() => scrollRef.current?.scrollTo({ top: 0 }), 0);
      }
    } catch {
      // silently fail
    }
  }

  async function handleSelectDeck(deckId: number) {
    // Use AI result if available (richer), otherwise dict result
    const result = aiResult || dictResult;
    if (!result) return;

    // Build card: front = word, back = definition + translations
    const backParts = [result.definition];
    const translations: string[] = [];
    if (result.translations.en && result.language !== "en") translations.push(`EN: ${result.translations.en}`);
    if (result.translations.pt) translations.push(`PT: ${result.translations.pt}`);
    if (result.translations.es) translations.push(`ES: ${result.translations.es}`);
    if (translations.length > 0) backParts.push(translations.join(" | "));

    const card = {
      front: result.word,
      back: backParts.join("\n"),
      notes: result.example ? `Example: ${result.example}` : undefined,
    };

    // Close the spotlight immediately
    setIsOpen(false);

    // Add in background
    fetch(`/api/decks/${deckId}/cards`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(card),
    }).catch(() => {
      // silently fail
    });
  }

  const hasResults = dictResult || aiResult;

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-accent text-white transition hover:bg-accent-hover active:scale-95"
        style={{ boxShadow: "var(--shadow-lg)" }}
        title="Dictionary (Cmd+K)"
        aria-label="Open dictionary"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-ink/40 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false);
          }}
        >
          <div
            className="animate-modal mx-4 mt-[15vh] w-full max-w-lg rounded-[var(--radius-lg)] border border-line/50 bg-surface sm:mx-0"
            style={{ boxShadow: "var(--shadow-xl)" }}
          >
            {/* Search input */}
            <form onSubmit={handleSearch} className="flex items-center border-b border-line/50 px-4">
              <svg className="mr-3 h-5 w-5 flex-shrink-0 text-ink-faint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Look up a word..."
                className="flex-1 bg-transparent py-4 text-lg text-ink placeholder:text-ink-faint outline-none"
              />
              {loading ? (
                <svg className="ml-2 h-5 w-5 animate-spin text-accent" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : query.trim() && (
                <button
                  type="submit"
                  className="ml-2 flex h-8 w-8 items-center justify-center rounded-full bg-accent text-white transition hover:bg-accent-hover sm:hidden"
                  aria-label="Search"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
              )}
              <kbd className="ml-2 hidden rounded-[var(--radius-sm)] border border-line bg-surface-hover px-1.5 py-0.5 text-xs text-ink-faint sm:inline">
                esc
              </kbd>
            </form>

            {/* Results */}
            <div ref={scrollRef} className="max-h-[60vh] overflow-y-auto">
              {error && (
                <div className="p-6 text-center text-ink-faint">{error}</div>
              )}

              {/* Deck selection */}
              {showDecks && (
                <div className="p-4 space-y-3">
                  <p className="text-[13px] font-medium uppercase tracking-wide text-ink-faint">Add to deck</p>
                  {decks.length === 0 ? (
                    <p className="text-sm text-ink-faint text-center py-4">No decks for this language yet</p>
                  ) : (
                    <div className="space-y-2">
                      {decks.map((deck) => {
                        const progress = deck.total_cards > 0
                          ? Math.round((deck.learned_cards / deck.total_cards) * 100)
                          : 0;
                        return (
                          <button
                            key={deck.id}
                            onClick={() => handleSelectDeck(deck.id)}
                            className="w-full rounded-[var(--radius-md)] border border-line/50 bg-surface p-3 text-left transition hover:border-accent/30 hover:-translate-y-0.5 active:translate-y-0"
                            style={{ boxShadow: "var(--shadow-card)" }}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-[15px] text-ink">{deck.name}</span>
                              <span className="text-xs text-ink-faint tabular-nums">{deck.total_cards} card{deck.total_cards !== 1 ? "s" : ""}</span>
                            </div>
                            {deck.total_cards > 0 && (
                              <div className="mt-2 flex items-center gap-2">
                                <div className="h-1.5 flex-1 rounded-full bg-surface-active">
                                  <div
                                    className="h-full rounded-full bg-accent transition-all"
                                    style={{ width: `${progress}%` }}
                                  />
                                </div>
                                <span className="text-[11px] text-ink-faint tabular-nums">{progress}%</span>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Dictionary API result */}
              {dictResult && (
                <ResultCard result={dictResult} label="Dictionary" />
              )}

              {/* AI result */}
              {aiResult && (
                <ResultCard result={aiResult} label="AI" />
              )}

              {/* AI loading placeholder */}
              {!aiResult && aiLoading && (dictResult || !loading) && (
                <div className="border-t border-line/50 p-6">
                  <div className="flex items-center gap-2 text-sm text-ink-faint">
                    <svg className="h-4 w-4 animate-spin text-accent" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Loading AI translations...
                  </div>
                </div>
              )}

              {/* Add to cards button */}
              {hasResults && !showDecks && (
                <div className="border-t border-line/50 p-4">
                  <button
                    onClick={handleAddToCards}
                    className="w-full rounded-[var(--radius-md)] bg-accent py-2.5 text-sm font-medium text-white transition hover:bg-accent-hover"
                  >
                    Add to cards
                  </button>
                </div>
              )}

              {!hasResults && !error && !loading && (
                <div className="p-6 text-center text-sm text-ink-faint">
                  Type a word and press Enter
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ResultCard({ result, label }: { result: DictionaryResult; label: string }) {
  const isRtl = result.language === "ar";

  return (
    <div className="border-t border-line/50 first:border-t-0 p-6 space-y-4">
      {/* Source label */}
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-surface-hover px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-ink-faint">
          {label}
        </span>
      </div>

      {/* Word + definition */}
      <div>
        <div dir={isRtl ? "rtl" : "ltr"} className="flex items-center gap-2">
          <h3 className={`text-2xl font-bold text-ink ${isRtl ? "font-[var(--font-arabic)]" : ""}`}>
            {result.word}
          </h3>
          <SpeakerButton text={result.word} language={result.language} size="md" />
        </div>
        {result.transliteration && (
          <p className="text-sm text-ink-faint italic">{result.transliteration}</p>
        )}
        <p className="mt-1 text-ink-soft">{result.definition}</p>
      </div>

      {/* Translations */}
      {((result.translations.en && result.language !== "en") || result.translations.pt || result.translations.es) && (
        <div className="rounded-[var(--radius-md)] border border-line/50 bg-surface-hover p-4 space-y-2">
          {result.translations.en && result.language !== "en" && (
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-ink-faint">English</span>
              <span className="text-ink">{result.translations.en}</span>
            </div>
          )}
          {result.translations.pt && (
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-ink-faint">Português</span>
              <span className="text-ink">{result.translations.pt}</span>
            </div>
          )}
          {result.translations.es && (
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-ink-faint">Español</span>
              <span className="text-ink">{result.translations.es}</span>
            </div>
          )}
        </div>
      )}

      {/* Example */}
      {result.example && (
        <div dir={isRtl ? "rtl" : "ltr"} className="rounded-[var(--radius-md)] border border-line/50 bg-accent-subtle p-4">
          <span className="text-xs font-medium uppercase tracking-wide text-ink-faint">Example</span>
          <p className={`mt-1 text-ink-soft italic ${isRtl ? "font-[var(--font-arabic)]" : ""}`}>
            {result.example}
          </p>
        </div>
      )}
    </div>
  );
}
