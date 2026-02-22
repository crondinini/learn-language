import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getLessonById, linkCardsToLesson } from "@/lib/lessons";

/**
 * PUT /api/lessons/[id]/cards
 * Replace all linked cards for a lesson.
 * Body: { card_ids: number[] }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const lessonId = Number(id);
  const lesson = getLessonById(lessonId);

  if (!lesson) {
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  }

  const body = await request.json();
  const { card_ids } = body;

  if (!Array.isArray(card_ids)) {
    return NextResponse.json({ error: "card_ids array is required" }, { status: 400 });
  }

  // Replace: delete all existing links, then insert new ones
  db.prepare("DELETE FROM lesson_cards WHERE lesson_id = ?").run(lessonId);

  if (card_ids.length > 0) {
    linkCardsToLesson(lessonId, card_ids);
  }

  return NextResponse.json({ linked: card_ids.length });
}
