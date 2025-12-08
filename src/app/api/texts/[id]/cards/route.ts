import { NextRequest, NextResponse } from "next/server";
import { getTextById, linkCardsToText, unlinkCardFromText, getTextCardsByTextId, findMatchingCards } from "@/lib/texts";

type Params = { params: Promise<{ id: string }> };

// GET /api/texts/:id/cards - Get linked cards or find matching cards
export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const textId = parseInt(id);

  const text = getTextById(textId);
  if (!text) {
    return NextResponse.json({ error: "Text not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const findMatches = searchParams.get("find") === "true";

  if (findMatches) {
    // Find cards that might match words in this text
    const matchingCards = findMatchingCards(textId);
    return NextResponse.json(matchingCards);
  }

  // Return linked cards
  const textCards = getTextCardsByTextId(textId);
  return NextResponse.json(textCards);
}

// POST /api/texts/:id/cards - Link cards to a text
export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const textId = parseInt(id);

  const text = getTextById(textId);
  if (!text) {
    return NextResponse.json({ error: "Text not found" }, { status: 404 });
  }

  const body = await request.json();

  // Accept either { cardIds: [1, 2, 3] } or { cardId: 1 }
  const cardIds: number[] = body.cardIds || (body.cardId ? [body.cardId] : []);

  if (cardIds.length === 0) {
    return NextResponse.json(
      { error: "cardId or cardIds required" },
      { status: 400 }
    );
  }

  const textCards = linkCardsToText(textId, cardIds);
  return NextResponse.json(textCards, { status: 201 });
}

// DELETE /api/texts/:id/cards - Unlink a card from a text
export async function DELETE(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const textId = parseInt(id);

  const { searchParams } = new URL(request.url);
  const cardId = searchParams.get("cardId");

  if (!cardId) {
    return NextResponse.json(
      { error: "cardId query parameter required" },
      { status: 400 }
    );
  }

  const deleted = unlinkCardFromText(textId, parseInt(cardId));
  if (!deleted) {
    return NextResponse.json({ error: "Link not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
