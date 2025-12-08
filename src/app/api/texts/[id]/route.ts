import { NextRequest, NextResponse } from "next/server";
import { getTextById, getTextWithCards, updateText, deleteText } from "@/lib/texts";

type Params = { params: Promise<{ id: string }> };

// GET /api/texts/:id - Get a single text (with linked cards if ?cards=true)
export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const textId = parseInt(id);

  const { searchParams } = new URL(request.url);
  const includeCards = searchParams.get("cards") === "true";

  if (includeCards) {
    const textWithCards = getTextWithCards(textId);
    if (!textWithCards) {
      return NextResponse.json({ error: "Text not found" }, { status: 404 });
    }
    return NextResponse.json(textWithCards);
  }

  const text = getTextById(textId);
  if (!text) {
    return NextResponse.json({ error: "Text not found" }, { status: 404 });
  }
  return NextResponse.json(text);
}

// PUT /api/texts/:id - Update a text
export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const textId = parseInt(id);
  const body = await request.json();

  const text = updateText(textId, {
    title: body.title,
    arabic: body.arabic,
    translation: body.translation,
    category: body.category,
  });

  if (!text) {
    return NextResponse.json({ error: "Text not found" }, { status: 404 });
  }

  return NextResponse.json(text);
}

// DELETE /api/texts/:id - Delete a text
export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const textId = parseInt(id);

  const deleted = deleteText(textId);
  if (!deleted) {
    return NextResponse.json({ error: "Text not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
