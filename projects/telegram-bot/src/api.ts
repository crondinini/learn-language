/**
 * Client for the Learn Language API — fetches vocabulary data.
 */

interface Card {
  id: number;
  front: string; // Arabic
  back: string; // English
  notes: string | null;
  state: number; // 0=New, 1=Learning, 2=Review, 3=Relearning
  stability: number;
  difficulty: number;
  reps: number;
  deck_name?: string;
}

interface Deck {
  id: number;
  name: string;
  language: string;
}

interface VocabResponse {
  stats: {
    total: number;
    new: number;
    learning: number;
    mastered: number;
  };
  vocabulary: Card[];
}

const API_URL = process.env.API_URL || "https://learn.rocksbythesea.uk";
const API_TOKEN = process.env.API_TOKEN || "";

async function apiFetch(path: string, options?: RequestInit): Promise<Response> {
  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${API_TOKEN}`,
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
}

/**
 * Get recent vocabulary — the API returns words sorted by
 * last_review DESC, created_at DESC so newest/most recently
 * reviewed words come first.
 */
export async function getRecentWords(count: number): Promise<Card[]> {
  const res = await apiFetch("/api/vocab?language=ar");
  const data: VocabResponse = await res.json();
  return data.vocabulary.slice(0, Math.min(count, data.vocabulary.length));
}

/**
 * Get or create the "Bot practice" deck for a given language.
 */
let botDeckCache: Record<string, number> = {};

export async function getBotPracticeDeckId(language: string): Promise<number> {
  if (botDeckCache[language]) return botDeckCache[language];

  const res = await apiFetch(`/api/decks?language=${language}`);
  const decks: Deck[] = await res.json();

  const existing = decks.find((d) => d.name === "Bot practice");
  if (existing) {
    botDeckCache[language] = existing.id;
    return existing.id;
  }

  // Create it
  const createRes = await apiFetch("/api/decks", {
    method: "POST",
    body: JSON.stringify({ name: "Bot practice", language }),
  });
  const newDeck: Deck = await createRes.json();
  botDeckCache[language] = newDeck.id;
  return newDeck.id;
}

/**
 * Add new words to the "Bot practice" deck.
 * Expects an array of { front: "Arabic", back: "English" }.
 */
export async function addBotPracticeWords(
  words: { front: string; back: string }[],
  language = "ar"
): Promise<void> {
  if (words.length === 0) return;

  const deckId = await getBotPracticeDeckId(language);
  const res = await apiFetch(`/api/decks/${deckId}/cards`, {
    method: "POST",
    body: JSON.stringify(words),
  });

  if (!res.ok) {
    console.error("Failed to add bot practice words:", await res.text());
  } else {
    console.log(`📚 Added ${words.length} new words to Bot practice deck`);
  }
}
