import { NextResponse } from "next/server";

// RFC 9728: OAuth 2.0 Protected Resource Metadata
export async function GET(request: Request) {
  const host = request.headers.get("host") || "learn.rocksbythesea.uk";
  const protocol = request.headers.get("x-forwarded-proto") || "https";
  const baseUrl = `${protocol}://${host}`;

  return NextResponse.json({
    resource: `${baseUrl}/mcp`,
    authorization_servers: [baseUrl],
  }, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
    },
  });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
    },
  });
}
