import { NextRequest, NextResponse } from "next/server";
import { getVerbById, updateVerb, deleteVerb, UpdateVerbInput } from "@/lib/verbs";

// GET /api/verbs/[id] - Get a single verb with conjugations
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const verb = getVerbById(parseInt(id));

    if (!verb) {
      return NextResponse.json({ error: "Verb not found" }, { status: 404 });
    }

    return NextResponse.json(verb);
  } catch (error) {
    console.error("Error fetching verb:", error);
    return NextResponse.json({ error: "Failed to fetch verb" }, { status: 500 });
  }
}

// PATCH /api/verbs/[id] - Update a verb
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = (await request.json()) as UpdateVerbInput;

    const verb = updateVerb(parseInt(id), body);

    if (!verb) {
      return NextResponse.json({ error: "Verb not found" }, { status: 404 });
    }

    return NextResponse.json(verb);
  } catch (error) {
    console.error("Error updating verb:", error);
    return NextResponse.json({ error: "Failed to update verb" }, { status: 500 });
  }
}

// DELETE /api/verbs/[id] - Delete a verb
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const success = deleteVerb(parseInt(id));

    if (!success) {
      return NextResponse.json({ error: "Verb not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting verb:", error);
    return NextResponse.json({ error: "Failed to delete verb" }, { status: 500 });
  }
}
