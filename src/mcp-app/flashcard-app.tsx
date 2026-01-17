/**
 * Flashcard Review MCP App - Arabic Vocabulary
 */
import type { App, McpUiHostContext } from "@modelcontextprotocol/ext-apps";
import { useApp } from "@modelcontextprotocol/ext-apps/react";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { StrictMode, useCallback, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import styles from "./flashcard-app.module.css";

interface VocabCard {
  id: number;
  front: string;
  back: string;
  notes?: string;
  difficulty: "easy" | "medium" | "hard";
  state: number;
  lapses: number;
}

interface Deck {
  id: number;
  name: string;
}

interface FlashcardData {
  cards: VocabCard[];
  decks: Deck[];
  selectedDeckId: number | null;
}

function extractData(result: CallToolResult): FlashcardData | null {
  const textContent = result.content?.find((c) => c.type === "text");
  if (!textContent || textContent.type !== "text") return null;
  try {
    return JSON.parse(textContent.text);
  } catch {
    return null;
  }
}

function FlashcardApp() {
  const [data, setData] = useState<FlashcardData | null>(null);
  const [hostContext, setHostContext] = useState<McpUiHostContext | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { app, error: appError } = useApp({
    appInfo: { name: "Arabic Flashcards", version: "1.0.0" },
    capabilities: {},
    onAppCreated: (app) => {
      app.onteardown = async () => {
        console.info("Flashcard app being torn down");
        return {};
      };

      app.ontoolinput = async (input) => {
        console.info("Received tool input:", input);
      };

      app.ontoolresult = async (result) => {
        console.info("Received tool result:", result);
        const parsed = extractData(result);
        if (parsed) {
          setData(parsed);
          setLoading(false);
        } else {
          setError("Failed to parse vocabulary data");
          setLoading(false);
        }
      };

      app.ontoolcancelled = (params) => {
        console.info("Tool cancelled:", params.reason);
        setError("Request cancelled");
        setLoading(false);
      };

      app.onerror = (err) => {
        console.error("App error:", err);
        setError(String(err));
        setLoading(false);
      };

      app.onhostcontextchanged = (params) => {
        setHostContext((prev) => ({ ...prev, ...params }));
      };
    },
  });

  useEffect(() => {
    if (app) {
      setHostContext(app.getHostContext());
    }
  }, [app]);

  if (appError) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <strong>Connection Error:</strong> {appError.message}
        </div>
      </div>
    );
  }

  if (!app) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <span>Connecting...</span>
        </div>
      </div>
    );
  }

  return (
    <FlashcardAppInner
      app={app}
      data={data}
      loading={loading}
      error={error}
      setData={setData}
      setLoading={setLoading}
      setError={setError}
      hostContext={hostContext}
    />
  );
}

interface FlashcardAppInnerProps {
  app: App;
  data: FlashcardData | null;
  loading: boolean;
  error: string | null;
  setData: (data: FlashcardData | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  hostContext?: McpUiHostContext;
}

function FlashcardAppInner({
  app,
  data,
  loading,
  error,
  setData,
  setLoading,
  setError,
  hostContext,
}: FlashcardAppInnerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [selectedDeckId, setSelectedDeckId] = useState<number | null>(null);

  const fetchCards = useCallback(async (deckId?: number | null) => {
    setLoading(true);
    setError(null);
    try {
      const args = deckId ? { deck_id: deckId } : {};
      const result = await app.callServerTool({ name: "review_flashcards", arguments: args });
      const parsed = extractData(result);
      if (parsed) {
        setData(parsed);
        setCurrentIndex(0);
        setIsFlipped(false);
      } else {
        setError("Failed to load cards");
      }
    } catch (e) {
      console.error("Fetch error:", e);
      setError(String(e));
    }
    setLoading(false);
  }, [app, setData, setLoading, setError]);

  useEffect(() => {
    if (data?.selectedDeckId !== undefined) {
      setSelectedDeckId(data.selectedDeckId);
    }
  }, [data?.selectedDeckId]);

  const handleDeckChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const deckId = e.target.value === "all" ? null : Number(e.target.value);
    setSelectedDeckId(deckId);
    fetchCards(deckId);
  }, [fetchCards]);

  const handleRefresh = useCallback(() => {
    fetchCards(selectedDeckId);
  }, [fetchCards, selectedDeckId]);

  const handleFlip = useCallback(() => {
    setIsFlipped((prev) => !prev);
  }, []);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
    setIsFlipped(false);
  }, []);

  const handleNext = useCallback(() => {
    if (data?.cards) {
      setCurrentIndex((prev) => Math.min(data.cards.length - 1, prev + 1));
      setIsFlipped(false);
    }
  }, [data?.cards]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case " ":
        case "Enter":
          e.preventDefault();
          handleFlip();
          break;
        case "ArrowLeft":
          handlePrev();
          break;
        case "ArrowRight":
          handleNext();
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleFlip, handlePrev, handleNext]);

  const cards = data?.cards || [];
  const decks = data?.decks || [];
  const currentCard = cards[currentIndex];

  const easyCount = cards.filter((c) => c.difficulty === "easy").length;
  const mediumCount = cards.filter((c) => c.difficulty === "medium").length;
  const hardCount = cards.filter((c) => c.difficulty === "hard").length;

  return (
    <main
      className={styles.container}
      style={{
        paddingTop: hostContext?.safeAreaInsets?.top,
        paddingRight: hostContext?.safeAreaInsets?.right,
        paddingBottom: hostContext?.safeAreaInsets?.bottom,
        paddingLeft: hostContext?.safeAreaInsets?.left,
      }}
    >
      <h1 className={styles.title}>Arabic Flashcards</h1>

      {decks.length > 0 && (
        <div className={styles.deckSelector}>
          <select
            className={styles.deckSelect}
            value={selectedDeckId ?? "all"}
            onChange={handleDeckChange}
          >
            <option value="all">All Decks</option>
            {decks.map((deck) => (
              <option key={deck.id} value={deck.id}>
                {deck.name}
              </option>
            ))}
          </select>
          <button className={styles.refreshButton} onClick={handleRefresh}>
            Refresh
          </button>
        </div>
      )}

      {loading ? (
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <span>Loading vocabulary...</span>
        </div>
      ) : error ? (
        <div className={styles.error}>
          <strong>Error:</strong> {error}
          <br />
          <button className={styles.navButton} onClick={handleRefresh} style={{ marginTop: "1rem" }}>
            Try Again
          </button>
        </div>
      ) : cards.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>📚</div>
          <p>No vocabulary cards found.</p>
          <p>Add some words to get started!</p>
        </div>
      ) : (
        <>
          <div className={styles.stats}>
            <span className={styles.stat}>
              <span className={styles.easy} style={{ width: 8, height: 8, borderRadius: "50%", display: "inline-block" }} />
              {easyCount} easy
            </span>
            <span className={styles.stat}>
              <span className={styles.medium} style={{ width: 8, height: 8, borderRadius: "50%", display: "inline-block" }} />
              {mediumCount} medium
            </span>
            <span className={styles.stat}>
              <span className={styles.hard} style={{ width: 8, height: 8, borderRadius: "50%", display: "inline-block" }} />
              {hardCount} hard
            </span>
          </div>

          <div className={styles.flashcard} onClick={handleFlip}>
            <div className={`${styles.flashcardInner} ${isFlipped ? styles.flipped : ""}`}>
              <div className={`${styles.flashcardFace} ${styles.front}`}>
                <span className={`${styles.difficulty} ${styles[currentCard.difficulty]}`}>
                  {currentCard.difficulty}
                </span>
                <div className={styles.arabicWord}>{currentCard.front}</div>
                <div className={styles.hint}>Click to flip</div>
              </div>
              <div className={`${styles.flashcardFace} ${styles.back}`}>
                <span className={`${styles.difficulty} ${styles[currentCard.difficulty]}`}>
                  {currentCard.difficulty}
                </span>
                <div className={styles.englishWord}>{currentCard.back}</div>
                {currentCard.notes && (
                  <div className={styles.notes}>{currentCard.notes}</div>
                )}
                <div className={styles.hint}>Click to flip back</div>
              </div>
            </div>
          </div>

          <div className={styles.navigation}>
            <button
              className={styles.navButton}
              onClick={handlePrev}
              disabled={currentIndex === 0}
            >
              Previous
            </button>
            <span className={styles.counter}>
              {currentIndex + 1} / {cards.length}
            </span>
            <button
              className={styles.navButton}
              onClick={handleNext}
              disabled={currentIndex === cards.length - 1}
            >
              Next
            </button>
          </div>
        </>
      )}
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <FlashcardApp />
  </StrictMode>
);
