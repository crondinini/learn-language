import { proxyActivities, sleep } from "@temporalio/workflow";
import type * as activities from "./activities";

// Proxy activities with appropriate timeouts.
// Activities run in the worker's Node.js process, not in the workflow sandbox.
const {
  generateCardAudio,
  getCardsWithoutAudio,
  transcribeRecording,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: "5 minutes",
  retry: {
    maximumAttempts: 3,
    initialInterval: "2 seconds",
    backoffCoefficient: 2,
    maximumInterval: "30 seconds",
  },
});

// ─── Workflows ──────────────────────────────────────────────────────────────

export interface GenerateCardAudioResult {
  cardId: number;
  audioUrl: string;
}

/**
 * Generate TTS audio for a single vocabulary card.
 */
export async function generateCardAudioWorkflow(
  cardId: number,
  regenerate: boolean = false
): Promise<GenerateCardAudioResult> {
  const audioUrl = await generateCardAudio(cardId, regenerate);
  return { cardId, audioUrl };
}

export interface GenerateDeckAudioResult {
  deckId: number;
  processed: number;
  skipped: number;
  failed: number;
  results: Array<{
    cardId: number;
    audioUrl?: string;
    error?: string;
  }>;
}

/**
 * Generate TTS audio for all cards in a deck that don't have audio yet.
 * Processes cards sequentially to respect TTS API rate limits.
 */
export async function generateDeckAudioWorkflow(
  deckId: number
): Promise<GenerateDeckAudioResult> {
  const cardIds = await getCardsWithoutAudio(deckId);

  const result: GenerateDeckAudioResult = {
    deckId,
    processed: 0,
    skipped: 0,
    failed: 0,
    results: [],
  };

  if (cardIds.length === 0) {
    return result;
  }

  for (const cardId of cardIds) {
    try {
      const audioUrl = await generateCardAudio(cardId, false);
      result.processed++;
      result.results.push({ cardId, audioUrl });
    } catch (err) {
      result.failed++;
      result.results.push({
        cardId,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    // Brief pause between cards to respect API rate limits
    if (cardIds.indexOf(cardId) < cardIds.length - 1) {
      await sleep("1 second");
    }
  }

  return result;
}

export interface TranscribeRecordingResult {
  homeworkId: number;
  transcription: string;
}

/**
 * Transcribe a homework recording using Google Cloud Speech-to-Text.
 */
export async function transcribeRecordingWorkflow(
  homeworkId: number
): Promise<TranscribeRecordingResult> {
  const transcription = await transcribeRecording(homeworkId);
  return { homeworkId, transcription };
}
