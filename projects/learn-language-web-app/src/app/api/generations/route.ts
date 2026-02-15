import { NextRequest } from "next/server";
import { getGenerations } from "@/lib/generations";

export async function GET(request: NextRequest) {
  const limit = Number(request.nextUrl.searchParams.get("limit")) || 20;
  const generations = getGenerations(limit);
  return Response.json(generations);
}
