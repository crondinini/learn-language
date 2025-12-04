import { NextRequest, NextResponse } from "next/server";
import { getAllDecks, createDeck } from "@/lib/decks";

// GET /api/decks - List all decks
export async function GET() {
  const decks = getAllDecks();
  return NextResponse.json(decks);
}

// POST /api/decks - Create a new deck
export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!body.name || typeof body.name !== "string") {
    return NextResponse.json(
      { error: "Name is required" },
      { status: 400 }
    );
  }

  const deck = createDeck({
    name: body.name,
    description: body.description,
  });

  return NextResponse.json(deck, { status: 201 });
}
