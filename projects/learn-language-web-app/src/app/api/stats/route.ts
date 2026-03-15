import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

interface DayStats {
  date: string;
  reviews: number;
  cards_learned: number;
  cards_added: number;
}

interface WeekStats {
  week_start: string;
  reviews: number;
  cards_learned: number;
  cards_added: number;
  days_practiced: number;
}

/**
 * GET /api/stats?language=ar&range=90
 * Get study statistics
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  const searchParams = request.nextUrl.searchParams;
  const language = searchParams.get("language") || "ar";
  const range = parseInt(searchParams.get("range") || "90"); // days

  try {
    // Daily review counts (vocab cards)
    const dailyReviews = db
      .prepare(
        `
      SELECT
        date(r.review_time) as date,
        COUNT(*) as reviews,
        COUNT(DISTINCT r.card_id) as unique_cards
      FROM reviews r
      JOIN cards c ON r.card_id = c.id
      JOIN decks d ON c.deck_id = d.id
      WHERE d.language = ?
        AND d.user_id = ?
        AND r.review_time >= datetime('now', ?)
      GROUP BY date(r.review_time)
      ORDER BY date ASC
    `
      )
      .all(language, user.id, `-${range} days`) as {
      date: string;
      reviews: number;
      unique_cards: number;
    }[];

    // Daily conjugation review counts (conjugations are Arabic-only for now)
    const dailyConjReviews = language === "ar"
      ? db
          .prepare(
            `
        SELECT
          date(cr.review_time) as date,
          COUNT(*) as reviews
        FROM conjugation_reviews cr
        JOIN conjugation_progress cp ON cr.conjugation_progress_id = cp.id
        JOIN verb_conjugations vc ON cp.verb_conjugation_id = vc.id
        JOIN verbs v ON vc.verb_id = v.id
        WHERE v.user_id = ?
          AND cr.review_time >= datetime('now', ?)
        GROUP BY date(cr.review_time)
        ORDER BY date ASC
      `
          )
          .all(user.id, `-${range} days`) as { date: string; reviews: number }[]
      : [];

    // Daily cards added
    const dailyAdded = db
      .prepare(
        `
      SELECT
        date(c.created_at) as date,
        COUNT(*) as cards_added
      FROM cards c
      JOIN decks d ON c.deck_id = d.id
      WHERE d.language = ?
        AND d.user_id = ?
        AND c.created_at >= datetime('now', ?)
      GROUP BY date(c.created_at)
      ORDER BY date ASC
    `
      )
      .all(language, user.id, `-${range} days`) as {
      date: string;
      cards_added: number;
    }[];

    // Merge vocab + conjugation reviews + cards added per day
    const conjMap = new Map(dailyConjReviews.map((d) => [d.date, d.reviews]));
    const addedMap = new Map(dailyAdded.map((d) => [d.date, d.cards_added]));
    const allDatesSet = new Set([
      ...dailyReviews.map((d) => d.date),
      ...dailyConjReviews.map((d) => d.date),
      ...dailyAdded.map((d) => d.date),
    ]);

    const dailyStats: DayStats[] = [];
    for (const date of Array.from(allDatesSet).sort()) {
      const vocabDay = dailyReviews.find((d) => d.date === date);
      dailyStats.push({
        date,
        reviews: (vocabDay?.reviews || 0) + (conjMap.get(date) || 0),
        cards_learned: vocabDay?.unique_cards || 0,
        cards_added: addedMap.get(date) || 0,
      });
    }

    // Cards learned per week: count cards whose first-ever review falls in each week
    const weeklyLearned = db
      .prepare(
        `
      SELECT
        date(first_review, 'weekday 1', '-7 days') as week_start,
        COUNT(*) as cards_learned
      FROM (
        SELECT r.card_id, MIN(r.review_time) as first_review
        FROM reviews r
        JOIN cards c ON r.card_id = c.id
        JOIN decks d ON c.deck_id = d.id
        WHERE d.language = ?
          AND d.user_id = ?
        GROUP BY r.card_id
        HAVING MIN(r.review_time) >= datetime('now', ?)
      )
      GROUP BY week_start
      ORDER BY week_start ASC
    `
      )
      .all(language, user.id, `-${range} days`) as {
      week_start: string;
      cards_learned: number;
    }[];

    // Aggregate weekly stats
    const weekMap = new Map<
      string,
      { reviews: number; cards_learned: number; cards_added: number; days: Set<string> }
    >();
    for (const day of dailyStats) {
      // Get Monday of this day's week
      const d = new Date(day.date + "T00:00:00Z");
      const dayOfWeek = d.getUTCDay();
      const monday = new Date(d);
      monday.setUTCDate(
        d.getUTCDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1)
      );
      const weekStart = monday.toISOString().split("T")[0];

      if (!weekMap.has(weekStart)) {
        weekMap.set(weekStart, { reviews: 0, cards_learned: 0, cards_added: 0, days: new Set() });
      }
      const week = weekMap.get(weekStart)!;
      week.reviews += day.reviews;
      week.cards_added += day.cards_added;
      if (day.reviews > 0) week.days.add(day.date);
    }

    // Add cards_learned from the dedicated query
    for (const wl of weeklyLearned) {
      if (weekMap.has(wl.week_start)) {
        weekMap.get(wl.week_start)!.cards_learned = wl.cards_learned;
      } else {
        weekMap.set(wl.week_start, { reviews: 0, cards_learned: wl.cards_learned, cards_added: 0, days: new Set() });
      }
    }

    const weeklyStats: WeekStats[] = Array.from(weekMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week_start, data]) => ({
        week_start,
        reviews: data.reviews,
        cards_learned: data.cards_learned,
        cards_added: data.cards_added,
        days_practiced: data.days.size,
      }));

    // Current streak (consecutive days practiced, ending today or yesterday)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const practicedDates = new Set(dailyStats.map((d) => d.date));

    let streak = 0;
    const checkDate = new Date(today);
    // Check if practiced today
    const todayStr = checkDate.toISOString().split("T")[0];
    if (!practicedDates.has(todayStr)) {
      // Maybe yesterday - allow one day gap for "current" streak
      checkDate.setDate(checkDate.getDate() - 1);
      const yesterdayStr = checkDate.toISOString().split("T")[0];
      if (!practicedDates.has(yesterdayStr)) {
        streak = 0;
      } else {
        streak = 1;
        checkDate.setDate(checkDate.getDate() - 1);
        while (practicedDates.has(checkDate.toISOString().split("T")[0])) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        }
      }
    } else {
      streak = 1;
      checkDate.setDate(checkDate.getDate() - 1);
      while (practicedDates.has(checkDate.toISOString().split("T")[0])) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      }
    }

    // Best streak ever (within range)
    const sortedDates = Array.from(practicedDates).sort();
    let bestStreak = 0;
    let currentRun = 0;
    let prevDate: Date | null = null;
    for (const dateStr of sortedDates) {
      const d = new Date(dateStr + "T00:00:00");
      if (
        prevDate &&
        d.getTime() - prevDate.getTime() === 24 * 60 * 60 * 1000
      ) {
        currentRun++;
      } else {
        currentRun = 1;
      }
      bestStreak = Math.max(bestStreak, currentRun);
      prevDate = d;
    }

    // Total stats
    const totalReviews = dailyStats.reduce((s, d) => s + d.reviews, 0);
    const totalDaysPracticed = practicedDates.size;

    // Card state distribution
    const cardStates = db
      .prepare(
        `
      SELECT
        c.state,
        COUNT(*) as count
      FROM cards c
      JOIN decks d ON c.deck_id = d.id
      WHERE d.language = ? AND d.user_id = ?
      GROUP BY c.state
    `
      )
      .all(language, user.id) as { state: number; count: number }[];

    const totalCards = cardStates.reduce((s, c) => s + c.count, 0);
    const stateMap = new Map(cardStates.map((c) => [c.state, c.count]));

    // Top 10 most difficult words with per-card rating history
    const hardestWords = db
      .prepare(
        `
      SELECT
        c.id,
        c.front,
        c.back,
        c.difficulty,
        c.lapses,
        c.reps,
        c.state,
        c.audio_url
      FROM cards c
      JOIN decks d ON c.deck_id = d.id
      WHERE d.language = ? AND d.user_id = ?
        AND c.reps > 0
        AND (c.difficulty > 5 OR c.lapses > 0)
      ORDER BY c.difficulty DESC, c.lapses DESC
      LIMIT 10
    `
      )
      .all(language, user.id) as {
      id: number;
      front: string;
      back: string;
      difficulty: number;
      lapses: number;
      reps: number;
      state: number;
      audio_url: string | null;
    }[];

    // Get review history (ratings) for each hard word
    const hardestWordIds = hardestWords.map((w) => w.id);
    const reviewHistories = hardestWordIds.length > 0
      ? db
          .prepare(
            `
        SELECT card_id, rating
        FROM reviews
        WHERE card_id IN (${hardestWordIds.map(() => "?").join(",")})
        ORDER BY review_time ASC
      `
          )
          .all(...hardestWordIds) as { card_id: number; rating: number }[]
      : [];

    // Group ratings by card_id
    const ratingsMap = new Map<number, number[]>();
    for (const r of reviewHistories) {
      if (!ratingsMap.has(r.card_id)) ratingsMap.set(r.card_id, []);
      ratingsMap.get(r.card_id)!.push(r.rating);
    }

    const hardestWordsWithRatings = hardestWords.map((w) => ({
      ...w,
      ratings: ratingsMap.get(w.id) || [],
    }));

    return NextResponse.json({
      daily: dailyStats,
      weekly: weeklyStats,
      streak: {
        current: streak,
        best: bestStreak,
      },
      totals: {
        reviews: totalReviews,
        days_practiced: totalDaysPracticed,
        total_cards: totalCards,
        new_cards: stateMap.get(0) || 0,
        learning_cards: (stateMap.get(1) || 0) + (stateMap.get(3) || 0),
        mastered_cards: stateMap.get(2) || 0,
      },
      hardest_words: hardestWordsWithRatings,
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
