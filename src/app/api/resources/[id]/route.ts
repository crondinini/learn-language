import { NextRequest, NextResponse } from "next/server";
import { getResourceById, updateResource, deleteResource } from "@/lib/resources";

type Params = { params: Promise<{ id: string }> };

// GET /api/resources/:id - Get a single resource
export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const resource = getResourceById(parseInt(id));

  if (!resource) {
    return NextResponse.json({ error: "Resource not found" }, { status: 404 });
  }

  return NextResponse.json(resource);
}

// PATCH /api/resources/:id - Update a resource
export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json();

  const resource = updateResource(parseInt(id), {
    url: body.url,
    title: body.title,
    description: body.description,
  });

  if (!resource) {
    return NextResponse.json({ error: "Resource not found" }, { status: 404 });
  }

  return NextResponse.json(resource);
}

// DELETE /api/resources/:id - Delete a resource
export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const deleted = deleteResource(parseInt(id));

  if (!deleted) {
    return NextResponse.json({ error: "Resource not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
