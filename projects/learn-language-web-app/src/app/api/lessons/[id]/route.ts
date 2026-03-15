import { NextRequest, NextResponse } from "next/server";
import { getLessonWithCards, updateLesson, deleteLesson } from "@/lib/lessons";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  const { id } = await params;
  const lesson = getLessonWithCards(Number(id), user.id);

  if (!lesson) {
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  }

  return NextResponse.json(lesson);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  const { id } = await params;

  // Verify ownership before updating
  const { getLessonById } = await import("@/lib/lessons");
  const existing = getLessonById(Number(id), user.id);
  if (!existing) {
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  }

  const body = await request.json();
  const lesson = updateLesson(Number(id), body);

  if (!lesson) {
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  }

  return NextResponse.json(lesson);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  const { id } = await params;
  const deleted = deleteLesson(Number(id), user.id);

  if (!deleted) {
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  }

  return NextResponse.json({ message: "Lesson deleted" });
}
