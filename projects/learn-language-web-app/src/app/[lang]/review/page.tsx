"use client";

import { useParams } from "next/navigation";
import ReviewSession from "@/components/ReviewSession";

export default function GlobalReviewPage() {
  const params = useParams();
  const lang = params.lang as string;
  return <ReviewSession backUrl={`/${lang}`} backLabel="Back to Home" />;
}
