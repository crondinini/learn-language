import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

// Simple in-memory store for auth codes (in production, use Redis or DB)
// This will reset on server restart, but that's fine for this use case
const authCodes = new Map<string, {
  clientId: string;
  redirectUri: string;
  codeChallenge?: string;
  expiresAt: number;
}>();

// Clean up expired codes periodically
function cleanupExpiredCodes() {
  const now = Date.now();
  for (const [code, data] of authCodes.entries()) {
    if (data.expiresAt < now) {
      authCodes.delete(code);
    }
  }
}

// Export for use by token endpoint
export { authCodes };

const ALLOWED_CLIENT_ID = "claude";

export async function GET(request: NextRequest) {
  cleanupExpiredCodes();

  const searchParams = request.nextUrl.searchParams;
  const clientId = searchParams.get("client_id");
  const redirectUri = searchParams.get("redirect_uri");
  const responseType = searchParams.get("response_type");
  const state = searchParams.get("state");
  const codeChallenge = searchParams.get("code_challenge");
  const codeChallengeMethod = searchParams.get("code_challenge_method");

  console.log("[OAuth Authorize] Request params:", {
    clientId,
    redirectUri,
    responseType,
    state,
    codeChallenge: codeChallenge ? "present" : "missing",
    codeChallengeMethod,
  });

  // Validate required params
  if (!clientId || !redirectUri || responseType !== "code") {
    return NextResponse.json(
      { error: "invalid_request", error_description: "Missing required parameters" },
      { status: 400 }
    );
  }

  // Validate client_id
  if (clientId !== ALLOWED_CLIENT_ID) {
    return NextResponse.json(
      { error: "unauthorized_client", error_description: "Unknown client_id" },
      { status: 401 }
    );
  }

  // Validate PKCE if provided
  if (codeChallenge && codeChallengeMethod !== "S256") {
    return NextResponse.json(
      { error: "invalid_request", error_description: "Only S256 code_challenge_method supported" },
      { status: 400 }
    );
  }

  // Generate authorization code
  const code = crypto.randomBytes(32).toString("hex");

  // Store the code with metadata (expires in 10 minutes)
  authCodes.set(code, {
    clientId,
    redirectUri,
    codeChallenge: codeChallenge || undefined,
    expiresAt: Date.now() + 10 * 60 * 1000,
  });

  console.log("[OAuth Authorize] Generated code for client:", clientId);

  // Auto-approve and redirect back with code
  const redirectUrl = new URL(redirectUri);
  redirectUrl.searchParams.set("code", code);
  if (state) {
    redirectUrl.searchParams.set("state", state);
  }

  return NextResponse.redirect(redirectUrl.toString());
}
