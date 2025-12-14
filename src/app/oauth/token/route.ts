import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import db from "@/lib/db";

// Import the shared auth codes store
import { authCodes } from "../authorize/route";

const ALLOWED_CLIENT_ID = "claude";
const CLIENT_SECRET = process.env.MCP_CLIENT_SECRET || "mcp-secret-change-me";

// Token expiration times
const ACCESS_TOKEN_EXPIRES_IN = 30 * 24 * 60 * 60; // 30 days in seconds
const REFRESH_TOKEN_EXPIRES_IN = 30 * 24 * 60 * 60; // 30 days in seconds

// Helper to format expiry time for logging
function formatExpiry(expiresAt: number): string {
  const now = Date.now();
  const remainingMs = expiresAt - now;
  const remainingHours = Math.round(remainingMs / 1000 / 60 / 60 * 10) / 10;
  const expiryDate = new Date(expiresAt).toISOString();
  return `${expiryDate} (${remainingHours}h remaining)`;
}

// SQLite-backed token store that mimics the Map interface
const accessTokens = {
  get(token: string): { clientId: string; expiresAt: number } | undefined {
    const row = db.prepare(
      "SELECT client_id, expires_at FROM oauth_tokens WHERE token = ?"
    ).get(token) as { client_id: string; expires_at: number } | undefined;

    if (!row) return undefined;
    return { clientId: row.client_id, expiresAt: row.expires_at };
  },

  set(token: string, data: { clientId: string; expiresAt: number }): void {
    db.prepare(
      "INSERT OR REPLACE INTO oauth_tokens (token, client_id, expires_at) VALUES (?, ?, ?)"
    ).run(token, data.clientId, data.expiresAt);
    console.log(`[OAuth Token] Stored token for ${data.clientId}, expires: ${formatExpiry(data.expiresAt)}`);
  },

  delete(token: string): void {
    db.prepare("DELETE FROM oauth_tokens WHERE token = ?").run(token);
  },
};

// Export for use by MCP auth
export { accessTokens };

// SQLite-backed refresh token store
const refreshTokens = {
  get(token: string): { clientId: string; expiresAt: number } | undefined {
    const row = db.prepare(
      "SELECT client_id, expires_at FROM oauth_refresh_tokens WHERE token = ?"
    ).get(token) as { client_id: string; expires_at: number } | undefined;

    if (!row) return undefined;
    return { clientId: row.client_id, expiresAt: row.expires_at };
  },

  set(token: string, data: { clientId: string; expiresAt: number }): void {
    db.prepare(
      "INSERT OR REPLACE INTO oauth_refresh_tokens (token, client_id, expires_at) VALUES (?, ?, ?)"
    ).run(token, data.clientId, data.expiresAt);
    console.log(`[OAuth Token] Stored refresh token for ${data.clientId}, expires: ${formatExpiry(data.expiresAt)}`);
  },

  delete(token: string): void {
    db.prepare("DELETE FROM oauth_refresh_tokens WHERE token = ?").run(token);
  },
};

// Clean up expired tokens from SQLite
function cleanupExpiredTokens() {
  const now = Date.now();
  const accessResult = db.prepare("DELETE FROM oauth_tokens WHERE expires_at < ?").run(now);
  const refreshResult = db.prepare("DELETE FROM oauth_refresh_tokens WHERE expires_at < ?").run(now);
  if (accessResult.changes > 0 || refreshResult.changes > 0) {
    console.log(`[OAuth Token] Cleaned up ${accessResult.changes} expired access tokens, ${refreshResult.changes} expired refresh tokens`);
  }
}

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function POST(request: NextRequest) {
  cleanupExpiredTokens();

  let body: Record<string, string>;
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const text = await request.text();
    body = Object.fromEntries(new URLSearchParams(text));
  } else if (contentType.includes("application/json")) {
    body = await request.json();
  } else {
    // Try form-urlencoded as default
    const text = await request.text();
    body = Object.fromEntries(new URLSearchParams(text));
  }

  console.log("[OAuth Token] Request body:", { ...body, client_secret: body.client_secret || "NOT PROVIDED" });
  console.log("[OAuth Token] Expected client_secret:", CLIENT_SECRET);

  const { grant_type, code, redirect_uri, client_id, client_secret, code_verifier, refresh_token } = body;

  // Validate grant type
  if (grant_type !== "authorization_code" && grant_type !== "refresh_token") {
    return NextResponse.json(
      { error: "unsupported_grant_type" },
      { status: 400, headers: corsHeaders }
    );
  }

  // Handle refresh_token grant
  if (grant_type === "refresh_token") {
    if (!refresh_token) {
      return NextResponse.json(
        { error: "invalid_request", error_description: "refresh_token required" },
        { status: 400, headers: corsHeaders }
      );
    }

    const tokenData = refreshTokens.get(refresh_token);
    if (!tokenData) {
      console.log("[OAuth Token] Invalid refresh token");
      return NextResponse.json(
        { error: "invalid_grant", error_description: "Invalid refresh token" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Check if refresh token is expired
    if (tokenData.expiresAt < Date.now()) {
      refreshTokens.delete(refresh_token);
      console.log("[OAuth Token] Refresh token expired");
      return NextResponse.json(
        { error: "invalid_grant", error_description: "Refresh token expired" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Generate new access token
    const newAccessToken = crypto.randomBytes(32).toString("hex");

    accessTokens.set(newAccessToken, {
      clientId: tokenData.clientId,
      expiresAt: Date.now() + ACCESS_TOKEN_EXPIRES_IN * 1000,
    });

    // Generate new refresh token (rotate for security)
    const newRefreshToken = crypto.randomBytes(32).toString("hex");

    // Delete old refresh token and create new one
    refreshTokens.delete(refresh_token);
    refreshTokens.set(newRefreshToken, {
      clientId: tokenData.clientId,
      expiresAt: Date.now() + REFRESH_TOKEN_EXPIRES_IN * 1000,
    });

    console.log("[OAuth Token] Refreshed tokens for client:", tokenData.clientId);

    return NextResponse.json(
      {
        access_token: newAccessToken,
        token_type: "Bearer",
        expires_in: ACCESS_TOKEN_EXPIRES_IN,
        refresh_token: newRefreshToken,
      },
      { headers: corsHeaders }
    );
  }

  // Handle authorization_code grant
  // Validate client_id
  if (client_id !== ALLOWED_CLIENT_ID) {
    console.log("[OAuth Token] Invalid client_id:", client_id);
    return NextResponse.json(
      { error: "invalid_client" },
      { status: 401, headers: corsHeaders }
    );
  }

  // Note: We don't validate client_secret for public clients like Claude.ai
  // PKCE (code_verifier) provides sufficient security
  if (client_secret) {
    console.log("[OAuth Token] client_secret provided (ignoring for public client)");
  }

  // Validate authorization code
  const codeData = authCodes.get(code);
  if (!codeData) {
    console.log("[OAuth Token] Invalid or expired code");
    return NextResponse.json(
      { error: "invalid_grant", error_description: "Invalid or expired authorization code" },
      { status: 400, headers: corsHeaders }
    );
  }

  // Check if code is expired
  if (codeData.expiresAt < Date.now()) {
    authCodes.delete(code);
    return NextResponse.json(
      { error: "invalid_grant", error_description: "Authorization code expired" },
      { status: 400, headers: corsHeaders }
    );
  }

  // Validate redirect_uri matches
  if (redirect_uri && redirect_uri !== codeData.redirectUri) {
    console.log("[OAuth Token] redirect_uri mismatch");
    return NextResponse.json(
      { error: "invalid_grant", error_description: "redirect_uri mismatch" },
      { status: 400, headers: corsHeaders }
    );
  }

  // Validate PKCE code_verifier if code_challenge was provided
  if (codeData.codeChallenge) {
    if (!code_verifier) {
      return NextResponse.json(
        { error: "invalid_grant", error_description: "code_verifier required" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Verify S256: base64url(sha256(code_verifier)) === code_challenge
    const hash = crypto.createHash("sha256").update(code_verifier).digest();
    const computedChallenge = hash.toString("base64url");

    if (computedChallenge !== codeData.codeChallenge) {
      console.log("[OAuth Token] PKCE verification failed");
      return NextResponse.json(
        { error: "invalid_grant", error_description: "PKCE verification failed" },
        { status: 400, headers: corsHeaders }
      );
    }
  }

  // Delete the used code (codes are single-use)
  authCodes.delete(code);

  // Generate access token
  const accessToken = crypto.randomBytes(32).toString("hex");

  accessTokens.set(accessToken, {
    clientId: client_id,
    expiresAt: Date.now() + ACCESS_TOKEN_EXPIRES_IN * 1000,
  });

  // Generate refresh token
  const newRefreshToken = crypto.randomBytes(32).toString("hex");

  refreshTokens.set(newRefreshToken, {
    clientId: client_id,
    expiresAt: Date.now() + REFRESH_TOKEN_EXPIRES_IN * 1000,
  });

  console.log("[OAuth Token] Issued access token and refresh token for client:", client_id);

  return NextResponse.json(
    {
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: ACCESS_TOKEN_EXPIRES_IN,
      refresh_token: newRefreshToken,
    },
    { headers: corsHeaders }
  );
}
