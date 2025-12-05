/**
 * FSRS (Free Spaced Repetition Scheduler) - using ts-fsrs library
 * This file provides a wrapper around ts-fsrs for use in the app.
 */

import {
  createEmptyCard,
  fsrs,
  generatorParameters,
  Rating as FSRSRating,
  State as FSRSState,
  type Card as FSRSCard,
  type RecordLog,
} from "ts-fsrs";

// Re-export Rating for convenience
export const Rating = {
  Again: FSRSRating.Again,
  Hard: FSRSRating.Hard,
  Good: FSRSRating.Good,
  Easy: FSRSRating.Easy,
} as const;

// Re-export State for convenience
export const CardState = {
  New: FSRSState.New,
  Learning: FSRSState.Learning,
  Review: FSRSState.Review,
  Relearning: FSRSState.Relearning,
} as const;

// Our app's Card interface (matches database schema)
export interface Card {
  id: number;
  deck_id: number;
  front: string;
  back: string;
  notes: string | null;
  audio_url: string | null;
  created_at: string;
  updated_at: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: number;
  due: string;
  last_review: string | null;
}

// Initialize FSRS with default parameters
const params = generatorParameters();
const f = fsrs(params);

/**
 * Convert our app's Card to ts-fsrs Card format
 */
function toFSRSCard(card: Card): FSRSCard {
  if (card.state === CardState.New && card.reps === 0) {
    // New card - create empty card
    return createEmptyCard(new Date(card.due));
  }

  return {
    due: new Date(card.due),
    stability: card.stability || 0,
    difficulty: card.difficulty || 0,
    elapsed_days: card.elapsed_days || 0,
    scheduled_days: card.scheduled_days || 0,
    reps: card.reps || 0,
    lapses: card.lapses || 0,
    state: card.state as FSRSState,
    last_review: card.last_review ? new Date(card.last_review) : undefined,
  };
}

/**
 * Scheduling info for a single rating option
 */
export interface SchedulingInfo {
  card: Card;
  reviewLog: {
    rating: number;
    state: number;
    due: string;
    stability: number;
    difficulty: number;
    elapsed_days: number;
    scheduled_days: number;
    review_time: string;
  };
}

/**
 * All scheduling options for a card
 */
export interface SchedulingCards {
  again: SchedulingInfo;
  hard: SchedulingInfo;
  good: SchedulingInfo;
  easy: SchedulingInfo;
}

/**
 * Convert ts-fsrs RecordLog item to our SchedulingInfo format
 */
function toSchedulingInfo(
  originalCard: Card,
  recordLogItem: RecordLog[keyof RecordLog],
  rating: number,
  now: Date
): SchedulingInfo {
  const fsrsCard = recordLogItem.card;

  return {
    card: {
      ...originalCard,
      stability: fsrsCard.stability,
      difficulty: fsrsCard.difficulty,
      elapsed_days: fsrsCard.elapsed_days,
      scheduled_days: fsrsCard.scheduled_days,
      reps: fsrsCard.reps,
      lapses: fsrsCard.lapses,
      state: fsrsCard.state,
      due: fsrsCard.due.toISOString(),
      last_review: now.toISOString(),
      updated_at: now.toISOString(),
    },
    reviewLog: {
      rating,
      state: fsrsCard.state,
      due: fsrsCard.due.toISOString(),
      stability: fsrsCard.stability,
      difficulty: fsrsCard.difficulty,
      elapsed_days: fsrsCard.elapsed_days,
      scheduled_days: fsrsCard.scheduled_days,
      review_time: now.toISOString(),
    },
  };
}

/**
 * Calculate scheduling information for all 4 possible ratings
 */
export function schedulingCards(card: Card, now: Date = new Date()): SchedulingCards {
  const fsrsCard = toFSRSCard(card);
  const recordLog = f.repeat(fsrsCard, now);

  return {
    again: toSchedulingInfo(card, recordLog[FSRSRating.Again], FSRSRating.Again, now),
    hard: toSchedulingInfo(card, recordLog[FSRSRating.Hard], FSRSRating.Hard, now),
    good: toSchedulingInfo(card, recordLog[FSRSRating.Good], FSRSRating.Good, now),
    easy: toSchedulingInfo(card, recordLog[FSRSRating.Easy], FSRSRating.Easy, now),
  };
}

/**
 * Review a card with the given rating
 */
export function reviewCard(card: Card, rating: number, now: Date = new Date()): SchedulingInfo {
  const fsrsCard = toFSRSCard(card);
  const recordLog = f.repeat(fsrsCard, now);

  const ratingKey = rating as FSRSRating;
  return toSchedulingInfo(card, recordLog[ratingKey], rating, now);
}

/**
 * Format interval for display (e.g., "5m", "2h", "3d", "1.2mo", "2.5y")
 */
export function formatInterval(days: number): string {
  if (days < 1) {
    const minutes = Math.round(days * 24 * 60);
    if (minutes < 60) {
      return `${Math.max(1, minutes)}m`;
    }
    const hours = Math.round(minutes / 60);
    return `${hours}h`;
  }
  if (days < 30) {
    return `${Math.round(days)}d`;
  }
  if (days < 365) {
    const months = days / 30;
    return months < 10 ? `${months.toFixed(1)}mo` : `${Math.round(months)}mo`;
  }
  const years = days / 365;
  return years < 10 ? `${years.toFixed(1)}y` : `${Math.round(years)}y`;
}

/**
 * Create a new empty card with default FSRS values
 */
export function createNewCard(): Partial<Card> {
  const emptyCard = createEmptyCard();
  return {
    stability: emptyCard.stability,
    difficulty: emptyCard.difficulty,
    elapsed_days: emptyCard.elapsed_days,
    scheduled_days: emptyCard.scheduled_days,
    reps: emptyCard.reps,
    lapses: emptyCard.lapses,
    state: emptyCard.state,
    due: emptyCard.due.toISOString(),
    last_review: null,
  };
}
