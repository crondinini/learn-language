import { NextRequest, NextResponse } from "next/server";
import { getAllLessons, createLesson } from "@/lib/lessons";

export async function GET() {
  const lessons = getAllLessons();
  return NextResponse.json(lessons);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!body.title || typeof body.title !== "string") {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }
  if (!body.lesson_date || typeof body.lesson_date !== "string") {
    return NextResponse.json({ error: "Date is required" }, { status: 400 });
  }

  const lesson = createLesson({
    title: body.title,
    lesson_date: body.lesson_date,
    transcript: body.transcript,
  });

  return NextResponse.json(lesson, { status: 201 });
}
