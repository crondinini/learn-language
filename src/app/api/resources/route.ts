import { NextRequest, NextResponse } from "next/server";
import { getAllResources, createResource } from "@/lib/resources";

// GET /api/resources - List all resources
export async function GET() {
  const resources = getAllResources();
  return NextResponse.json(resources);
}

// POST /api/resources - Create a new resource
export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!body.url || typeof body.url !== "string") {
    return NextResponse.json(
      { error: "URL is required" },
      { status: 400 }
    );
  }

  if (!body.title || typeof body.title !== "string") {
    return NextResponse.json(
      { error: "Title is required" },
      { status: 400 }
    );
  }

  const resource = createResource({
    url: body.url,
    title: body.title,
    description: body.description,
  });

  return NextResponse.json(resource, { status: 201 });
}
