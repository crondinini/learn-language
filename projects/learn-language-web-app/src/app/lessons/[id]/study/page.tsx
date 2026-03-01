"use client";

import { use } from "react";
import ReviewSession from "@/components/ReviewSession";

export default function LessonStudyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <ReviewSession lessonId={id} backUrl={`/lessons/${id}`} backLabel="Back to Lesson" />;
}
