import { NextRequest, NextResponse } from "next/server";
import { getDeckById } from "@/lib/decks";
import { getCardsByDeckId, createCard, createCards } from "@/lib/cards";

type Params = { params: Promise<{ id: string }> };

// GET /api/decks/:id/cards - List all cards in a deck
export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const deckId = parseInt(id);

  const deck = getDeckById(deckId);
  if (!deck) {
    return NextResponse.json({ error: "Deck not found" }, { status: 404 });
  }

  const cards = getCardsByDeckId(deckId);
  return NextResponse.json(cards);
}

// POST /api/decks/:id/cards - Create card(s) in a deck
export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const deckId = parseInt(id);

  const deck = getDeckById(deckId);
  if (!deck) {
    return NextResponse.json({ error: "Deck not found" }, { status: 404 });
  }

  const body = await request.json();

  // Support both single card and bulk creation
  if (Array.isArray(body)) {
    // Bulk creation
    const cardsInput = body.map((card) => ({
      deck_id: deckId,
      front: card.front,
      back: card.back,
      notes: card.notes,
      audio_url: card.audio_url,
      image_url: card.image_url,
    }));

    // Validate all cards have required fields
    for (const card of cardsInput) {
      if (!card.front || !card.back) {
        return NextResponse.json(
          { error: "Each card must have front and back fields" },
          { status: 400 }
        );
      }
    }

    const cards = createCards(cardsInput);
    return NextResponse.json(cards, { status: 201 });
  } else {
    // Single card creation
    if (!body.front || !body.back) {
      return NextResponse.json(
        { error: "front and back are required" },
        { status: 400 }
      );
    }

    const card = createCard({
      deck_id: deckId,
      front: body.front,
      back: body.back,
      notes: body.notes,
      audio_url: body.audio_url,
      image_url: body.image_url,
    });

    return NextResponse.json(card, { status: 201 });
  }
}
