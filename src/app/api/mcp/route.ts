import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { z } from "zod";

const API_BASE_URL = "https://learn.rocksbythesea.uk";
const API_TOKEN = "EGfYvc4Fm4vzD4QBqouEyLoW";

// AuthInfo type for static client verification
interface AuthInfo {
  token: string;
  clientId: string;
  scopes: string[];
}

// Static client verifier for simple auth
function createStaticClientVerifier(options: {
  clients: Array<{
    clientId: string;
    clientSecret: string;
    scopes?: string[];
  }>;
}) {
  return async (_req: Request, bearerToken?: string): Promise<AuthInfo | undefined> => {
    console.log("[MCP Auth] bearerToken received:", bearerToken ? `"${bearerToken.substring(0, 20)}..."` : "undefined");

    if (!bearerToken) return undefined;

    for (const client of options.clients) {
      const expectedBase64 = Buffer.from(`${client.clientId}:${client.clientSecret}`).toString("base64");
      console.log("[MCP Auth] Checking client:", client.clientId);
      console.log("[MCP Auth] Expected base64:", expectedBase64);
      console.log("[MCP Auth] Received token:", bearerToken);

      // Method 1: Check base64 encoded "clientId:clientSecret"
      if (bearerToken === expectedBase64) {
        console.log("[MCP Auth] Match via Method 1 (base64)");
        return {
          token: bearerToken,
          clientId: client.clientId,
          scopes: client.scopes || [],
        };
      }

      // Method 2: Check if token is just the secret
      if (bearerToken === client.clientSecret) {
        console.log("[MCP Auth] Match via Method 2 (secret only)");
        return {
          token: bearerToken,
          clientId: client.clientId,
          scopes: client.scopes || [],
        };
      }

      // Method 3: Try to decode base64 token and extract clientId:clientSecret
      try {
        const decoded = Buffer.from(bearerToken, "base64").toString("utf-8");
        const [tokenClientId, tokenSecret] = decoded.split(":");
        console.log("[MCP Auth] Method 3 decoded:", decoded);
        if (tokenClientId === client.clientId && tokenSecret === client.clientSecret) {
          console.log("[MCP Auth] Match via Method 3 (decoded base64)");
          return {
            token: bearerToken,
            clientId: client.clientId,
            scopes: client.scopes || [],
          };
        }
      } catch {
        console.log("[MCP Auth] Method 3 failed to decode");
      }
    }

    console.log("[MCP Auth] No match found");

    return undefined;
  };
}

// Configure static clients
const verifyClient = createStaticClientVerifier({
  clients: [
    {
      clientId: "claude",
      clientSecret: process.env.MCP_CLIENT_SECRET || "mcp-secret-change-me",
      scopes: ["add_word"],
    },
  ],
});

// Helper to make authenticated API requests
async function apiRequest(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = `${API_BASE_URL}${path}`;
  const headers = {
    Authorization: `Bearer ${API_TOKEN}`,
    "Content-Type": "application/json",
    ...options.headers,
  };
  return fetch(url, { ...options, headers });
}

const baseHandler = createMcpHandler(
  (server) => {
    server.tool(
      "add_word",
      "Add a new Arabic vocabulary word to a deck",
      {
        arabic_word: z.string().describe("The Arabic word"),
        english_translation: z.string().describe("The English translation"),
        deck_id: z.number().optional().default(15).describe("The deck ID to add the card to. Defaults to 15 (Learning with Claude)"),
        notes: z.string().optional().describe("Optional notes for the card"),
      },
      async ({ arabic_word, english_translation, deck_id, notes }) => {
        try {
          const cardData: { front: string; back: string; notes?: string }[] = [
            { front: arabic_word, back: english_translation },
          ];
          if (notes) {
            cardData[0].notes = notes;
          }

          const response = await apiRequest(`/api/decks/${deck_id}/cards`, {
            method: "POST",
            body: JSON.stringify(cardData),
          });

          if (!response.ok) {
            const errorText = await response.text();
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Failed to add word: ${response.status} ${errorText}`,
                },
              ],
              isError: true,
            };
          }

          const result = await response.json();
          return {
            content: [
              {
                type: "text" as const,
                text: `Successfully added "${arabic_word}" (${english_translation}) to deck ${deck_id}. Card ID: ${result[0]?.id || "unknown"}`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Error adding word: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
            isError: true,
          };
        }
      }
    );
  },
  {},
  {
    basePath: "/api",
    verboseLogs: true,
  }
);

// Wrap with auth
const handler = withMcpAuth(baseHandler, verifyClient, {
  required: true,
});

export { handler as GET, handler as POST };
