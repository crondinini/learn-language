import { NextRequest, NextResponse } from "next/server";
import {
  getDueConjugations,
  getNewConjugations,
  startPracticing,
  updateConjugationProgress,
  logConjugationReview,
  DueConjugation,
} from "@/lib/verbs";
import { reviewCard, Rating } from "@/lib/fsrs";

// GET /api/conjugation - Get conjugations for practice
// Query params:
// - verbId: filter by specific verb
// - limit: max items to return (default 20)
// - includeNew: include unpracticed conjugations (default true)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const verbId = searchParams.get("verbId");
    const limit = parseInt(searchParams.get("limit") || "20");
    const includeNew = searchParams.get("includeNew") !== "false";

    // Get due conjugations
    const due = getDueConjugations(limit);

    // Get new conjugations if requested and we have room
    let items: DueConjugation[] = [...due];
    if (includeNew && items.length < limit) {
      const remaining = limit - items.length;
      const newItems = getNewConjugations(verbId ? parseInt(verbId) : undefined, remaining);
      items = [...items, ...newItems];
    }

    // Shuffle
    items.sort(() => Math.random() - 0.5);

    return NextResponse.json(items);
  } catch (error) {
    console.error("Error fetching conjugations:", error);
    return NextResponse.json({ error: "Failed to fetch conjugations" }, { status: 500 });
  }
}

// POST /api/conjugation - Submit a review
// Body: { conjugationId: number, progressId: number | null, rating: 1-4, userAnswer: string }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { conjugationId, progressId, rating } = body as {
      conjugationId: number;
      progressId: number | null;
      rating: number;
    };

    if (!conjugationId || !rating || rating < 1 || rating > 4) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    // Get or create progress record
    let currentProgressId = progressId;
    if (!currentProgressId) {
      const progress = startPracticing(conjugationId);
      currentProgressId = progress.id;
    }

    // Get current state
    const currentProgress = await import("@/lib/db").then((m) =>
      m.default.prepare("SELECT * FROM conjugation_progress WHERE id = ?").get(currentProgressId)
    ) as {
      stability: number;
      difficulty: number;
      elapsed_days: number;
      scheduled_days: number;
      reps: number;
      lapses: number;
      state: number;
      due: string;
      last_review: string | null;
    };

    // Calculate new scheduling using FSRS
    // Create a card-like object for the FSRS function
    const cardForFSRS = {
      id: 0,
      deck_id: 0,
      front: "",
      back: "",
      notes: null,
      audio_url: null,
      created_at: "",
      updated_at: "",
      stability: currentProgress.stability,
      difficulty: currentProgress.difficulty,
      elapsed_days: currentProgress.elapsed_days,
      scheduled_days: currentProgress.scheduled_days,
      reps: currentProgress.reps,
      lapses: currentProgress.lapses,
      state: currentProgress.state,
      due: currentProgress.due,
      last_review: currentProgress.last_review,
    };

    const result = reviewCard(cardForFSRS, rating);

    // Update progress
    // result.card.due is already a string from reviewCard
    const newDue = result.card.due.replace("T", " ").split(".")[0];
    const now = new Date().toISOString().replace("T", " ").split(".")[0];

    updateConjugationProgress(currentProgressId, {
      stability: result.card.stability,
      difficulty: result.card.difficulty,
      elapsed_days: result.card.elapsed_days,
      scheduled_days: result.card.scheduled_days,
      reps: result.card.reps,
      lapses: result.card.lapses,
      state: result.card.state,
      due: newDue,
      last_review: now,
    });

    // Log the review
    logConjugationReview(
      currentProgressId,
      rating,
      result.card.elapsed_days,
      result.card.scheduled_days,
      result.card.state
    );

    return NextResponse.json({
      success: true,
      progressId: currentProgressId,
      nextDue: newDue,
      scheduledDays: result.card.scheduled_days,
    });
  } catch (error) {
    console.error("Error submitting review:", error);
    return NextResponse.json({ error: "Failed to submit review" }, { status: 500 });
  }
}
