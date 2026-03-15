"use client";

import { useParams, useSearchParams } from "next/navigation";
import ReviewSession from "@/components/ReviewSession";

export default function GlobalReviewPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const lang = params.lang as string;
  const mode = searchParams.get("mode") as "struggling" | "new" | undefined;
  const backUrl = mode ? `/${lang}/vocab` : `/${lang}`;
  const backLabel = mode ? "Back to Vocabulary" : "Back to Home";
  return <ReviewSession mode={mode || undefined} backUrl={backUrl} backLabel={backLabel} />;
}
