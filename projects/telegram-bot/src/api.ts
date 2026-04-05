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
 * Get learned vocabulary (words in Learning or Review state)
 */
export async function getLearnedWords(): Promise<Card[]> {
  const [learningRes, masteredRes] = await Promise.all([
    apiFetch("/api/vocab?filter=learning&language=ar"),
    apiFetch("/api/vocab?filter=mastered&language=ar"),
  ]);

  const learning: VocabResponse = await learningRes.json();
  const mastered: VocabResponse = await masteredRes.json();

  return [...learning.vocabulary, ...mastered.vocabulary];
}

/**
 * Get a random sample of words for conversation context
 */
export async function sampleWords(count: number): Promise<Card[]> {
  const words = await getLearnedWords();
  // Shuffle and take N
  const shuffled = words.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
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
