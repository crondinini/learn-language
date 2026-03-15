"use client";

import { use } from "react";
import ReviewSession from "@/components/ReviewSession";

export default function DeckReviewPage({ params }: { params: Promise<{ lang: string; id: string }> }) {
  const { lang, id } = use(params);
  return <ReviewSession deckId={id} backUrl={`/${lang}/deck/${id}`} backLabel="Back to Deck" />;
}
