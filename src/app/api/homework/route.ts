import { NextRequest, NextResponse } from "next/server";
import db, { Homework } from "@/lib/db";

/**
 * GET /api/homework
 * Get all homework items, optionally filtered by status
 * Query params: status (pending/completed)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");

    let query = "SELECT * FROM homework";
    const params: string[] = [];

    if (status) {
      query += " WHERE status = ?";
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
      "INSERT INTO homework (description, type, status, transcription) VALUES (?, ?, 'pending', ?)"
    );
    const result = stmt.run(description.trim(), type, transcription?.trim() || null);

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
