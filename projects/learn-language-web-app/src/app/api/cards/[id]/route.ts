import { NextRequest, NextResponse } from "next/server";
import { getCardById, updateCard, deleteCard, verifyCardOwnership } from "@/lib/cards";
import { getCurrentUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

// GET /api/cards/:id - Get a single card
export async function GET(_request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  const { id } = await params;
  const card = verifyCardOwnership(parseInt(id), user.id);

  if (!card) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  return NextResponse.json(card);
}

// PATCH /api/cards/:id - Update a card
export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  const { id } = await params;
  const cardId = parseInt(id);

  if (!verifyCardOwnership(cardId, user.id)) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  const body = await request.json();
  const card = updateCard(cardId, {
    front: body.front,
    back: body.back,
    notes: body.notes,
    audio_url: body.audio_url,
    image_url: body.image_url,
    deck_id: body.deck_id,
  });

  if (!card) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  return NextResponse.json(card);
}

// DELETE /api/cards/:id - Delete a card
export async function DELETE(_request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  const { id } = await params;
  const cardId = parseInt(id);

  if (!verifyCardOwnership(cardId, user.id)) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  const deleted = deleteCard(cardId);
  if (!deleted) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
