import { NextRequest, NextResponse } from "next/server";
import { getAllTexts, createText, createTexts, getTextCategories } from "@/lib/texts";

// GET /api/texts - List all texts (optionally filter by category)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const categoriesOnly = searchParams.get("categories");

  if (categoriesOnly === "true") {
    const categories = getTextCategories();
    return NextResponse.json(categories);
  }

  const texts = getAllTexts();
  return NextResponse.json(texts);
}

// POST /api/texts - Create new text(s)
export async function POST(request: NextRequest) {
  const body = await request.json();

  // Support both single text and bulk creation
  if (Array.isArray(body)) {
    // Bulk creation
    for (const text of body) {
      if (!text.arabic || !text.translation) {
        return NextResponse.json(
          { error: "Each text must have arabic and translation fields" },
          { status: 400 }
        );
      }
    }
    const texts = createTexts(body);
    return NextResponse.json(texts, { status: 201 });
  } else {
    // Single text creation
    if (!body.arabic || !body.translation) {
      return NextResponse.json(
        { error: "arabic and translation are required" },
        { status: 400 }
      );
    }

    const text = createText({
      title: body.title,
      arabic: body.arabic,
      translation: body.translation,
      category: body.category,
    });

    return NextResponse.json(text, { status: 201 });
  }
}
