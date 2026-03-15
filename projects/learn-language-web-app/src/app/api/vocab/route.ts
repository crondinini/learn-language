import { NextRequest, NextResponse } from "next/server";
import db, { Card, CardState } from "@/lib/db";

interface VocabStats {
  total: number;
  new: number;
  learning: number;
  mastered: number;
  learnedThisWeek: number;
  struggling: number;
}

interface VocabCard extends Card {
  deck_name: string;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const filter = searchParams.get("filter"); // 'new', 'learning', 'mastered', 'week'
  const search = searchParams.get("search");
  const deckId = searchParams.get("deckId");
  const language = searchParams.get("language");

  // Get stats (filtered by language if provided)
  const langStatsFilter = language ? " JOIN decks ON cards.deck_id = decks.id WHERE decks.language = ?" : "";
  const statsQuery = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN cards.state = 0 THEN 1 ELSE 0 END) as new,
      SUM(CASE WHEN cards.state IN (1, 3) THEN 1 ELSE 0 END) as learning,
      SUM(CASE WHEN cards.state = 2 THEN 1 ELSE 0 END) as mastered,
      SUM(CASE WHEN cards.state = 2 AND cards.last_review >= datetime('now', '-7 days') THEN 1 ELSE 0 END) as learnedThisWeek,
      SUM(CASE WHEN cards.reps > 0 AND (cards.difficulty > 7 OR cards.lapses > 0) THEN 1 ELSE 0 END) as struggling
    FROM cards${langStatsFilter}
  `);
  const stats = (language ? statsQuery.get(language) : statsQuery.get()) as VocabStats;

  // Build vocabulary query with filters
  let query = `
    SELECT cards.*, decks.name as deck_name
    FROM cards
    JOIN decks ON cards.deck_id = decks.id
    WHERE 1=1
  `;
  const params: (string | number)[] = [];

  if (language) {
    query += " AND decks.language = ?";
    params.push(language);
  }

  if (deckId) {
    query += " AND cards.deck_id = ?";
    params.push(parseInt(deckId));
  }

  if (filter === "new") {
    query += " AND cards.state = ?";
    params.push(CardState.New);
  } else if (filter === "learning") {
    query += " AND cards.state IN (?, ?)";
    params.push(CardState.Learning, CardState.Relearning);
  } else if (filter === "mastered") {
    query += " AND cards.state = ?";
    params.push(CardState.Review);
  } else if (filter === "week") {
    query += " AND cards.state = ? AND cards.last_review >= datetime('now', '-7 days')";
    params.push(CardState.Review);
  } else if (filter === "struggling") {
    query += " AND cards.reps > 0 AND (cards.difficulty > 7 OR cards.lapses > 0)";
  }

  if (search) {
    query += " AND (cards.front LIKE ? OR cards.back LIKE ? OR cards.notes LIKE ?)";
    const searchPattern = `%${search}%`;
    params.push(searchPattern, searchPattern, searchPattern);
  }

  query += " ORDER BY cards.last_review DESC NULLS LAST, cards.created_at DESC";

  const vocabStmt = db.prepare(query);
  const vocabulary = vocabStmt.all(...params) as VocabCard[];

  return NextResponse.json({ stats, vocabulary });
}
