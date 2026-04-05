/**
 * Conversation engine — generates Arabic messages using learned vocabulary
 * and handles back-and-forth conversation.
 */

import { sampleWords, addBotPracticeWords } from "./api.js";
import { askClaude } from "./claude.js";

interface Message {
  role: "bot" | "user";
  text: string;
}

// Keep recent conversation history per chat
const conversations = new Map<number, Message[]>();
const MAX_HISTORY = 10;

function getHistory(chatId: number): Message[] {
  if (!conversations.has(chatId)) {
    conversations.set(chatId, []);
  }
  return conversations.get(chatId)!;
}

function addMessage(chatId: number, role: "bot" | "user", text: string) {
  const history = getHistory(chatId);
  history.push({ role, text });
  if (history.length > MAX_HISTORY) {
    history.splice(0, history.length - MAX_HISTORY);
  }
}

const NEW_WORDS_MARKER = "NEW_WORDS:";

/**
 * Parse new words from Claude's response and add them to Bot practice deck.
 * Returns the message without the NEW_WORDS section.
 */
function extractAndSaveNewWords(raw: string): string {
  const markerIndex = raw.indexOf(NEW_WORDS_MARKER);
  if (markerIndex === -1) return raw;

  const message = raw.slice(0, markerIndex).trimEnd();
  const wordsSection = raw.slice(markerIndex + NEW_WORDS_MARKER.length).trim();

  const words: { front: string; back: string }[] = [];
  for (const line of wordsSection.split("\n")) {
    // Expected format: "Arabic|English"
    const parts = line.trim().split("|");
    if (parts.length === 2 && parts[0].trim() && parts[1].trim()) {
      words.push({ front: parts[0].trim(), back: parts[1].trim() });
    }
  }

  if (words.length > 0) {
    // Save in background — don't block the reply
    addBotPracticeWords(words, "ar").catch((err) =>
      console.error("Failed to save new words:", err)
    );
  }

  return message;
}

const NEW_WORDS_INSTRUCTION = `
TEACHING NEW WORDS:
- You may introduce 1-2 new Arabic words that the user hasn't learned yet, to naturally expand their vocabulary.
- When you use a new word NOT in the word list, it's a great teaching moment — the user will learn it from context.
- At the very end of your output (after everything else), add a section listing any new words you used that are NOT in the user's word list:
${NEW_WORDS_MARKER}
Arabic_with_diacritics|English_translation
- Only list words that are NOT already in the word list below. If you only used known words, omit this section entirely.
- Include diacritics on the Arabic.`;

/**
 * Generate a proactive conversation-starting message in Arabic.
 */
export async function generateProactiveMessage(chatId: number): Promise<string> {
  // Clear old conversation — starting fresh
  conversations.set(chatId, []);

  const words = await sampleWords(15);
  if (words.length === 0) {
    return "مرحبا! كيف حالك اليوم؟"; // fallback
  }

  const wordList = words
    .map((w) => `${w.front} (${w.back})`)
    .join("\n");

  const prompt = `You are a friendly Arabic conversation partner. Your job is to send a casual message in Arabic (MSA) as if you're a friend texting. The message should feel natural — like sharing something about your day, asking a question, telling a little story, or making a comment about something.

IMPORTANT RULES:
- Write in Arabic script (MSA) with diacritics (tashkeel) on all words.
- Use vocabulary from the list below as much as possible, but make it sound natural — don't force every word in.
- Keep the message 1-3 sentences. Short and conversational.
- Vary the topics: food, weather, plans, opinions, daily life, feelings, etc.
- Do NOT use a greeting every time — sometimes just jump into a thought.
${NEW_WORDS_INSTRUCTION}

OUTPUT FORMAT (follow exactly):
Line 1: The Arabic message
Line 2: (empty line)
Line 3: Transliteration in Latin script (italic-friendly, lowercase)
Line 4: (empty line)
Line 5: Brief English translation
(then optionally the ${NEW_WORDS_MARKER} section)

Example:
هَلْ شَاهَدْتِ الفِيلْمَ الجَدِيدَ؟ أَنَا سَمِعْتُ أَنَّهُ مُمْتَازٌ!

hal shaahadti al-film al-jadiid? ana sami'tu annahu mumtaaz!

Did you watch the new movie? I heard it's excellent!

${NEW_WORDS_MARKER}
شَاهَدْتِ|you watched
مُمْتَازٌ|excellent

Words the user has learned:
${wordList}`;

  const raw = await askClaude(prompt);
  const message = extractAndSaveNewWords(raw);
  addMessage(chatId, "bot", message);
  return message;
}

/**
 * Generate a reply to the user's Arabic message, continuing the conversation.
 */
export async function generateReply(chatId: number, userMessage: string): Promise<string> {
  addMessage(chatId, "user", userMessage);

  const words = await sampleWords(15);
  const wordList = words
    .map((w) => `${w.front} (${w.back})`)
    .join("\n");

  const history = getHistory(chatId);
  const historyStr = history
    .map((m) => `${m.role === "bot" ? "أنت" : "المستخدم"}: ${m.text}`)
    .join("\n");

  const prompt = `You are a friendly Arabic conversation partner chatting via text messages. Continue the conversation naturally.

IMPORTANT RULES:
- Write in Arabic script (MSA) with diacritics (tashkeel) on all words.
- Use vocabulary from the word list below when it fits naturally.
- Keep your reply 1-3 sentences. Conversational and natural.
- If the user makes a grammar or vocabulary mistake, gently help them:
  - First, respond naturally to what they said
  - Then add a correction on SEPARATE lines (never mix Arabic and English on the same line)
- If the user's message contains ANY English words or is fully in English:
  - First, show how to say what they meant in Arabic on separate lines
  - Then continue the conversation naturally as your reply
- CRITICAL: NEVER put Arabic and English/transliteration on the same line. They must always be on separate lines.
${NEW_WORDS_INSTRUCTION}

OUTPUT FORMAT (follow exactly, each item on its own line):
(optional, if user used English)
💡 [their message in Arabic]
[transliteration]
[English meaning]
(blank line)
[Your Arabic reply]

[Transliteration of your reply]

[English translation of your reply]

(optional, if correction needed)
✏️ [corrected Arabic]
[transliteration of correction]
[explanation in English]
(then optionally the ${NEW_WORDS_MARKER} section)

Words the user has learned:
${wordList}

Conversation so far:
${historyStr}`;

  const raw = await askClaude(prompt);
  const reply = extractAndSaveNewWords(raw);
  addMessage(chatId, "bot", reply);
  return reply;
}
