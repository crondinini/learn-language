import { NextRequest, NextResponse } from "next/server";
import { getDeckById, updateDeck, deleteDeck } from "@/lib/decks";

type Params = { params: Promise<{ id: string }> };

// GET /api/decks/:id - Get a single deck
export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const deck = getDeckById(parseInt(id));

  if (!deck) {
    return NextResponse.json({ error: "Deck not found" }, { status: 404 });
  }

  return NextResponse.json(deck);
}

// PATCH /api/decks/:id - Update a deck
export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json();

  const deck = updateDeck(parseInt(id), {
    name: body.name,
    description: body.description,
  });

  if (!deck) {
    return NextResponse.json({ error: "Deck not found" }, { status: 404 });
  }

  return NextResponse.json(deck);
}

// DELETE /api/decks/:id - Delete a deck
export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const deleted = deleteDeck(parseInt(id));

  if (!deleted) {
    return NextResponse.json({ error: "Deck not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
