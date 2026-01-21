import { NextRequest, NextResponse } from "next/server";
import { getAllVerbs, createVerb, CreateVerbInput } from "@/lib/verbs";

// GET /api/verbs - List all verbs with stats
export async function GET() {
  try {
    const verbs = getAllVerbs();
    return NextResponse.json(verbs);
  } catch (error) {
    console.error("Error fetching verbs:", error);
    return NextResponse.json({ error: "Failed to fetch verbs" }, { status: 500 });
  }
}

// POST /api/verbs - Create a new verb
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateVerbInput;

    if (!body.root || !body.meaning || !body.past_3ms || !body.present_3ms) {
      return NextResponse.json(
        { error: "Missing required fields: root, meaning, past_3ms, present_3ms" },
        { status: 400 }
      );
    }

    if (!body.past_conjugations || Object.keys(body.past_conjugations).length === 0) {
      return NextResponse.json({ error: "At least one past conjugation is required" }, { status: 400 });
    }

    const verb = createVerb(body);
    return NextResponse.json(verb, { status: 201 });
  } catch (error) {
    console.error("Error creating verb:", error);
    return NextResponse.json({ error: "Failed to create verb" }, { status: 500 });
  }
}
