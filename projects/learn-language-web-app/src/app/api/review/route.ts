import { NextRequest, NextResponse } from "next/server";
import db, { Card } from "@/lib/db";
import { getDueCards, getCardById } from "@/lib/cards";
import { reviewCard } from "@/lib/fsrs";

/**
 * GET /api/review?deckId=X&limit=20
 * Get due cards for review
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const deckId = searchParams.get("deckId");
  const limit = parseInt(searchParams.get("limit") || "20");

  try {
    const dueCards = getDueCards(deckId ? parseInt(deckId) : undefined, limit);
    return NextResponse.json(dueCards);
  } catch (error) {
    console.error("Error fetching due cards:", error);
    return NextResponse.json(
      { error: "Failed to fetch due cards" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/review
 * Submit a review for a card
 * Body: { cardId: number, rating: 1|2|3|4 }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cardId, rating } = body;

    // Validate input
    if (!cardId || typeof cardId !== "number") {
      return NextResponse.json(
        { error: "Invalid cardId" },
        { status: 400 }
      );
    }

    if (!rating || rating < 1 || rating > 4) {
      return NextResponse.json(
        { error: "Invalid rating. Must be 1 (Again), 2 (Hard), 3 (Good), or 4 (Easy)" },
        { status: 400 }
      );
    }

    // Get the card
    const card = getCardById(cardId);
    if (!card) {
      return NextResponse.json(
        { error: "Card not found" },
        { status: 404 }
      );
    }

    // Calculate new scheduling using FSRS
    const now = new Date();
    const schedulingInfo = reviewCard(card, rating, now);

    // Update card in database within a transaction
    const updateCardStmt = db.prepare(`
      UPDATE cards
      SET
        stability = ?,
        difficulty = ?,
        elapsed_days = ?,
        scheduled_days = ?,
        reps = ?,
        lapses = ?,
        state = ?,
        due = ?,
        last_review = ?,
        updated_at = ?
      WHERE id = ?
    `);

    const insertReviewStmt = db.prepare(`
      INSERT INTO reviews (card_id, rating, review_time, elapsed_days, scheduled_days, state)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    // Execute within a transaction
    const transaction = db.transaction(() => {
      // Update the card
      updateCardStmt.run(
        schedulingInfo.card.stability,
        schedulingInfo.card.difficulty,
        schedulingInfo.card.elapsed_days,
        schedulingInfo.card.scheduled_days,
        schedulingInfo.card.reps,
        schedulingInfo.card.lapses,
        schedulingInfo.card.state,
        schedulingInfo.card.due,
        schedulingInfo.card.last_review,
        schedulingInfo.card.updated_at,
        cardId
      );

      // Insert review record
      insertReviewStmt.run(
        cardId,
        rating,
        schedulingInfo.reviewLog.review_time,
        schedulingInfo.reviewLog.elapsed_days,
        schedulingInfo.reviewLog.scheduled_days,
        schedulingInfo.reviewLog.state
      );
    });

    transaction();

    // Get the updated card
    const updatedCard = getCardById(cardId);

    return NextResponse.json({
      card: updatedCard,
      schedulingInfo: schedulingInfo.reviewLog,
    });
  } catch (error) {
    console.error("Error reviewing card:", error);
    return NextResponse.json(
      { error: "Failed to review card" },
      { status: 500 }
    );
  }
}
