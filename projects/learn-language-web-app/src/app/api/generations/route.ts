import { NextRequest } from "next/server";
import { getGenerations } from "@/lib/generations";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  const limit = Number(request.nextUrl.searchParams.get("limit")) || 20;
  const generations = getGenerations(user.id, limit);
  return Response.json(generations);
}
