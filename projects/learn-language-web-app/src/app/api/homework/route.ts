import { NextRequest, NextResponse } from "next/server";
import db, { Homework } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

/**
 * GET /api/homework
 * Get all homework items, optionally filtered by status
 * Query params: status (pending/completed)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");

    let query = "SELECT * FROM homework WHERE user_id = ?";
    const params: (string | number)[] = [user.id];

    if (status) {
      query += " AND status = ?";
      params.push(status);
    }

    query += " ORDER BY created_at DESC";

    const stmt = db.prepare(query);
    const homework = stmt.all(...params) as Homework[];

    return NextResponse.json(homework);
  } catch (error) {
    console.error("Error fetching homework:", error);
    return NextResponse.json(
      { error: "Failed to fetch homework" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/homework
 * Create a new homework assignment
 * Body: { description: string, type?: string, transcription?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await request.json();
    const { description, type = "recording", transcription } = body;

    if (!description?.trim()) {
      return NextResponse.json(
        { error: "Description is required" },
        { status: 400 }
      );
    }

    // For listening type, include transcription at creation time
    const stmt = db.prepare(
      "INSERT INTO homework (description, type, status, transcription, user_id) VALUES (?, ?, 'pending', ?, ?)"
    );
    const result = stmt.run(description.trim(), type, transcription?.trim() || null, user.id);

    const newHomework = db
      .prepare("SELECT * FROM homework WHERE id = ?")
      .get(result.lastInsertRowid) as Homework;

    return NextResponse.json(newHomework, { status: 201 });
  } catch (error) {
    console.error("Error creating homework:", error);
    return NextResponse.json(
      { error: "Failed to create homework" },
      { status: 500 }
    );
  }
}
