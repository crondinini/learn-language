"use client";

import { use } from "react";
import ReviewSession from "@/components/ReviewSession";

export default function LessonStudyPage({ params }: { params: Promise<{ lang: string; id: string }> }) {
  const { lang, id } = use(params);
  return <ReviewSession lessonId={id} language={lang} backUrl={`/${lang}/lessons/${id}`} backLabel="Back to Lesson" />;
}
