import { NextRequest, NextResponse } from "next/server";
import { getAllDecks, createDeck } from "@/lib/decks";
import { getCurrentUser } from "@/lib/auth";

// GET /api/decks - List all decks
export async function GET() {
  const user = await getCurrentUser();
  const decks = getAllDecks(user.id);
  return NextResponse.json(decks);
}

// POST /api/decks - Create a new deck
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
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
    language: body.language,
  }, user.id);

  return NextResponse.json(deck, { status: 201 });
}
