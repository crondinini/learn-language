import { Client, Connection } from "@temporalio/client";

const TEMPORAL_ADDRESS = process.env.TEMPORAL_ADDRESS || "localhost:7233";
const TASK_QUEUE = process.env.TEMPORAL_TASK_QUEUE || "learn-language";
const NAMESPACE = process.env.TEMPORAL_NAMESPACE || "default";

let _client: Client | null = null;
let _connection: Connection | null = null;

/**
 * Get a singleton Temporal client instance.
 * The client is reused across requests to avoid creating new connections.
 */
export async function getTemporalClient(): Promise<Client> {
  if (_client) {
    return _client;
  }

  _connection = await Connection.connect({
    address: TEMPORAL_ADDRESS,
  });

  _client = new Client({
    connection: _connection,
    namespace: NAMESPACE,
  });

  return _client;
}

/**
 * Get the configured task queue name.
 */
export function getTaskQueue(): string {
  return TASK_QUEUE;
}

/**
 * Close the Temporal client connection.
 * Call this during application shutdown.
 */
export async function closeTemporalClient(): Promise<void> {
  if (_connection) {
    await _connection.close();
    _connection = null;
    _client = null;
  }
}

// ─── Workflow Starters ──────────────────────────────────────────────────────
// Convenience functions for starting workflows from API routes.

import type {
  GenerateCardAudioResult,
  GenerateDeckAudioResult,
  TranscribeRecordingResult,
} from "./workflows";

/**
 * Start a workflow to generate audio for a single card.
 * Returns the workflow handle ID for tracking.
 */
export async function startGenerateCardAudio(
  cardId: number,
  regenerate: boolean = false
): Promise<{ workflowId: string; result: Promise<GenerateCardAudioResult> }> {
  const client = await getTemporalClient();
  const workflowId = `generate-card-audio-${cardId}-${Date.now()}`;

  const handle = await client.workflow.start("generateCardAudioWorkflow", {
    taskQueue: TASK_QUEUE,
    workflowId,
    args: [cardId, regenerate],
  });

  return {
    workflowId: handle.workflowId,
    result: handle.result(),
  };
}

/**
 * Start a workflow to generate audio for all cards in a deck.
 * Returns the workflow handle ID for tracking.
 */
export async function startGenerateDeckAudio(
  deckId: number
): Promise<{ workflowId: string; result: Promise<GenerateDeckAudioResult> }> {
  const client = await getTemporalClient();
  const workflowId = `generate-deck-audio-${deckId}-${Date.now()}`;

  const handle = await client.workflow.start("generateDeckAudioWorkflow", {
    taskQueue: TASK_QUEUE,
    workflowId,
    args: [deckId],
  });

  return {
    workflowId: handle.workflowId,
    result: handle.result(),
  };
}

/**
 * Start a workflow to transcribe a homework recording.
 * Returns the workflow handle ID for tracking.
 */
export async function startTranscribeRecording(
  homeworkId: number
): Promise<{
  workflowId: string;
  result: Promise<TranscribeRecordingResult>;
}> {
  const client = await getTemporalClient();
  const workflowId = `transcribe-recording-${homeworkId}-${Date.now()}`;

  const handle = await client.workflow.start("transcribeRecordingWorkflow", {
    taskQueue: TASK_QUEUE,
    workflowId,
    args: [homeworkId],
  });

  return {
    workflowId: handle.workflowId,
    result: handle.result(),
  };
}
