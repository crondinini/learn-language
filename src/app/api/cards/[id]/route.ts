import { NextRequest, NextResponse } from "next/server";
import { getCardById, updateCard, deleteCard } from "@/lib/cards";

type Params = { params: Promise<{ id: string }> };

// GET /api/cards/:id - Get a single card
export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const card = getCardById(parseInt(id));

  if (!card) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  return NextResponse.json(card);
}

// PATCH /api/cards/:id - Update a card
export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json();

  const card = updateCard(parseInt(id), {
    front: body.front,
    back: body.back,
    notes: body.notes,
    audio_url: body.audio_url,
  });

  if (!card) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  return NextResponse.json(card);
}

// DELETE /api/cards/:id - Delete a card
export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const deleted = deleteCard(parseInt(id));

  if (!deleted) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
