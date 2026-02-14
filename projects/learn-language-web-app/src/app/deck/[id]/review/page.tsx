"use client";

import { use } from "react";
import ReviewSession from "@/components/ReviewSession";

export default function DeckReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <ReviewSession deckId={id} backUrl={`/deck/${id}`} backLabel="Back to Deck" />;
}
