import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { accessTokens } from "../../oauth/token/route";
import logger from "@/lib/logger";

const API_BASE_URL = "https://learn.rocksbythesea.uk";
const API_TOKEN = process.env.API_TOKEN || "";

// AuthInfo type for client verification
interface AuthInfo {
  token: string;
  clientId: string;
  scopes: string[];
}

// OAuth token verifier - checks access tokens issued by our OAuth flow
function verifyOAuthToken(bearerToken: string): AuthInfo | undefined {
  const tokenData = accessTokens.get(bearerToken);
  if (!tokenData) {
    return undefined;
  }

  // Check if token is expired
  if (tokenData.expiresAt < Date.now()) {
    logger.warn("mcp_token_expired", {
      clientId: tokenData.clientId,
      expiresAt: new Date(tokenData.expiresAt).toISOString(),
    });
    accessTokens.delete(bearerToken);
    return undefined;
  }

  logger.info("mcp_token_valid", {
    clientId: tokenData.clientId,
    expiresAt: new Date(tokenData.expiresAt).toISOString(),
    expiresInHours: Math.round((tokenData.expiresAt - Date.now()) / 1000 / 60 / 60 * 10) / 10,
  });
  return {
    token: bearerToken,
    clientId: tokenData.clientId,
    scopes: ["add_word"],
  };
}

// Static client verifier for direct API access (base64 clientId:clientSecret)
function verifyStaticToken(bearerToken: string): AuthInfo | undefined {
  const clientId = "claude";
  const clientSecret = process.env.MCP_CLIENT_SECRET || "mcp-secret-change-me";

  // Method 1: Check base64 encoded "clientId:clientSecret"
  const expectedBase64 = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  if (bearerToken === expectedBase64) {
    return { token: bearerToken, clientId, scopes: ["add_word"] };
  }

  // Method 2: Check if token is just the secret
  if (bearerToken === clientSecret) {
    return { token: bearerToken, clientId, scopes: ["add_word"] };
  }

  // Method 3: Try to decode base64 token
  try {
    const decoded = Buffer.from(bearerToken, "base64").toString("utf-8");
    const [tokenClientId, tokenSecret] = decoded.split(":");
    if (tokenClientId === clientId && tokenSecret === clientSecret) {
      return { token: bearerToken, clientId, scopes: ["add_word"] };
    }
  } catch {
    // Not valid base64
  }

  return undefined;
}

// Combined verifier: tries OAuth tokens first, then static tokens
const verifyClient = async (_req: Request, bearerToken?: string): Promise<AuthInfo | undefined> => {
  logger.debug("mcp_auth_request", { hasToken: !!bearerToken });

  if (!bearerToken) return undefined;

  // Try OAuth token first
  const oauthResult = verifyOAuthToken(bearerToken);
  if (oauthResult) {
    logger.info("mcp_auth_oauth_valid", { clientId: oauthResult.clientId });
    return oauthResult;
  }

  // Try static token
  const staticResult = verifyStaticToken(bearerToken);
  if (staticResult) {
    logger.info("mcp_auth_static_valid", { clientId: staticResult.clientId });
    return staticResult;
  }

  logger.warn("mcp_auth_failed");
  return undefined;
};

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
    // Resource: Instructions for adding words
    server.resource(
      "instructions",
      "instructions://add-words",
      async () => {
        return {
          contents: [
            {
              uri: "instructions://add-words",
              mimeType: "text/plain",
              text: `# How to Add Arabic Vocabulary Words

## Word Format
- arabic_word: The Arabic word in Arabic script (e.g., "كتاب")
- english_translation: The English meaning (e.g., "book")
- notes (optional): Additional context, example sentences, or grammar notes

## Best Practices
1. Always use Arabic script for the arabic_word, not transliteration
2. Keep translations concise but clear
3. Add notes for words with multiple meanings or special usage
4. Group related words in the same deck

## Available Decks
Use the "decks" resource to see all available decks and their IDs.
The default deck is "Learning with Claude" (ID: 15).

## Example
To add the word "مرحبا" (hello):
- arabic_word: "مرحبا"
- english_translation: "hello"
- notes: "Common greeting, can be used formally and informally"
- deck_id: 15 (or omit to use default)
`,
            },
          ],
        };
      }
    );

    // Resource: List of all decks with names and IDs
    server.resource(
      "decks",
      "decks://list",
      async () => {
        try {
          const response = await apiRequest("/api/decks");
          if (!response.ok) {
            return {
              contents: [
                {
                  uri: "decks://list",
                  mimeType: "application/json",
                  text: JSON.stringify({ error: "Failed to fetch decks" }),
                },
              ],
            };
          }
          const decks = await response.json();
          const deckList = decks.map((deck: { id: number; name: string }) => ({
            id: deck.id,
            name: deck.name,
          }));
          return {
            contents: [
              {
                uri: "decks://list",
                mimeType: "application/json",
                text: JSON.stringify(deckList, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            contents: [
              {
                uri: "decks://list",
                mimeType: "application/json",
                text: JSON.stringify({ error: String(error) }),
              },
            ],
          };
        }
      }
    );

    // Resource Template: Individual deck instruction - "Use Deck X"
    const useDeckTemplate = new ResourceTemplate("deck://{deckId}", {
      list: async () => {
        try {
          const response = await apiRequest("/api/decks");
          if (!response.ok) {
            return { resources: [] };
          }
          const decks = await response.json();
          return {
            resources: decks.map((deck: { id: number; name: string }) => ({
              uri: `deck://${deck.id}`,
              name: `Use Deck ${deck.name}`,
              description: `Deck ID: ${deck.id}`,
            })),
          };
        } catch {
          return { resources: [] };
        }
      },
    });

    server.resource(
      "use-deck",
      useDeckTemplate,
      async (uri: URL, variables: { deckId?: string }) => {
        const deckId = variables.deckId || "unknown";

        return {
          contents: [
            {
              uri: uri.href,
              mimeType: "text/plain",
              text: `Use Deck with ID ${deckId} for whatever action you are taking`,
            },
          ],
        };
      }
    );

    // Resource: All Words - all vocabulary with difficulty levels
    server.resource(
      "all-words",
      "words://all",
      async () => {
        try {
          const response = await apiRequest("/api/vocab");
          if (!response.ok) {
            return {
              contents: [
                {
                  uri: "words://all",
                  mimeType: "application/json",
                  text: JSON.stringify({ error: "Failed to fetch words" }),
                },
              ],
            };
          }
          const data = await response.json();
          const allCards = data.vocabulary || [];

          const words = allCards.map((card: {
            front: string;
            back: string;
            difficulty: number;
          }) => ({
            arabic: card.front,
            meaning: card.back,
            difficulty: card.difficulty <= 3 ? "easy" : card.difficulty <= 6 ? "medium" : "hard",
          }));

          return {
            contents: [
              {
                uri: "words://all",
                mimeType: "application/json",
                text: JSON.stringify(words, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            contents: [
              {
                uri: "words://all",
                mimeType: "application/json",
                text: JSON.stringify({ error: String(error) }),
              },
            ],
          };
        }
      }
    );

    server.tool(
      "get_learning_words",
      "Get words that are new, still being learned, or difficult (forgotten multiple times)",
      {
        deck_id: z.number().optional().describe("Filter by deck ID (optional, defaults to all decks)"),
        include_difficult: z.boolean().optional().default(true).describe("Include words marked 'again' 2+ times"),
      },
      async ({ deck_id, include_difficult }) => {
        try {
          // Get all cards from the review endpoint or specific deck
          const endpoint = deck_id ? `/api/decks/${deck_id}/cards` : "/api/review";
          const response = await apiRequest(endpoint);
          if (!response.ok) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Failed to fetch words: ${response.status}`,
                },
              ],
              isError: true,
            };
          }
          const allCards = await response.json();

          // Filter for learning words:
          // - state 0 = new (never reviewed)
          // - state 1 = learning (still in initial learning phase)
          // - lapses >= 2 = difficult (marked "again" multiple times)
          const learningCards = allCards.filter((card: {
            state: number;
            lapses: number;
          }) =>
            card.state === 0 ||
            card.state === 1 ||
            (include_difficult && card.lapses >= 2)
          );

          if (learningCards.length === 0) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: "No new or learning words found. All words have been learned!",
                },
              ],
            };
          }

          // Group by category
          const newWords = learningCards.filter((c: { state: number }) => c.state === 0);
          const inProgress = learningCards.filter((c: { state: number; lapses: number }) => c.state === 1 && c.lapses < 2);
          const difficult = learningCards.filter((c: { lapses: number }) => c.lapses >= 2);

          const formatWord = (card: { front: string; back: string; notes?: string; lapses: number }) =>
            `  - ${card.front} (${card.back})${card.lapses >= 2 ? ` [difficult - ${card.lapses} lapses]` : ""}`;

          let result = "";

          if (newWords.length > 0) {
            result += `📚 New words (${newWords.length}):\n`;
            result += newWords.map(formatWord).join("\n") + "\n\n";
          }

          if (inProgress.length > 0) {
            result += `📖 Learning in progress (${inProgress.length}):\n`;
            result += inProgress.map(formatWord).join("\n") + "\n\n";
          }

          if (difficult.length > 0 && include_difficult) {
            result += `⚠️ Difficult words (${difficult.length}):\n`;
            result += difficult.map(formatWord).join("\n");
          }

          return {
            content: [
              {
                type: "text" as const,
                text: result.trim(),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Error fetching words: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    server.tool(
      "list_decks",
      "List all available decks with their IDs and names",
      {},
      async () => {
        try {
          const response = await apiRequest("/api/decks");
          if (!response.ok) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Failed to fetch decks: ${response.status}`,
                },
              ],
              isError: true,
            };
          }
          const decks = await response.json();
          const deckList = decks
            .map((deck: { id: number; name: string }) => `- ID ${deck.id}: ${deck.name}`)
            .join("\n");
          return {
            content: [
              {
                type: "text" as const,
                text: `Available decks:\n${deckList}`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Error fetching decks: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    server.tool(
      "create_deck",
      "Create a new deck for organizing vocabulary",
      {
        name: z.string().describe("The name of the new deck"),
      },
      async ({ name }) => {
        try {
          const response = await apiRequest("/api/decks", {
            method: "POST",
            body: JSON.stringify({ name }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Failed to create deck: ${response.status} ${errorText}`,
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
                text: `Successfully created deck "${name}" with ID: ${result.id}`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Error creating deck: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
            isError: true,
          };
        }
      }
    );

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

    server.tool(
      "add_words",
      "Add multiple Arabic vocabulary words to a deck at once",
      {
        words: z.array(z.object({
          arabic_word: z.string().describe("The Arabic word"),
          english_translation: z.string().describe("The English translation"),
          notes: z.string().optional().describe("Optional notes for the card"),
        })).describe("Array of words to add"),
        deck_id: z.number().optional().default(15).describe("The deck ID to add the cards to. Defaults to 15 (Learning with Claude)"),
      },
      async ({ words, deck_id }) => {
        try {
          const cardData = words.map((word) => ({
            front: word.arabic_word,
            back: word.english_translation,
            ...(word.notes && { notes: word.notes }),
          }));

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
                  text: `Failed to add words: ${response.status} ${errorText}`,
                },
              ],
              isError: true,
            };
          }

          const result = await response.json();
          const addedWords = words.map((w, i) =>
            `- ${w.arabic_word} (${w.english_translation}) [ID: ${result[i]?.id || "unknown"}]`
          ).join("\n");

          return {
            content: [
              {
                type: "text" as const,
                text: `Successfully added ${words.length} words to deck ${deck_id}:\n${addedWords}`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Error adding words: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    server.tool(
      "update_deck",
      "Update a deck's name and/or description",
      {
        deck_id: z.number().describe("The ID of the deck to update"),
        name: z.string().optional().describe("The new name for the deck"),
        description: z.string().optional().describe("The new description for the deck"),
      },
      async ({ deck_id, name, description }) => {
        try {
          if (!name && !description) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: "Please provide at least a name or description to update",
                },
              ],
              isError: true,
            };
          }

          const response = await apiRequest(`/api/decks/${deck_id}`, {
            method: "PATCH",
            body: JSON.stringify({ name, description }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Failed to update deck: ${response.status} ${errorText}`,
                },
              ],
              isError: true,
            };
          }

          const result = await response.json();
          const updates = [];
          if (name) updates.push(`name: "${result.name}"`);
          if (description) updates.push(`description: "${result.description}"`);

          return {
            content: [
              {
                type: "text" as const,
                text: `Successfully updated deck ${deck_id}: ${updates.join(", ")}`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Error updating deck: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    server.tool(
      "move_word",
      "Move a word (card) from one deck to another",
      {
        card_id: z.number().describe("The ID of the card/word to move"),
        target_deck_id: z.number().describe("The ID of the deck to move the card to"),
      },
      async ({ card_id, target_deck_id }) => {
        try {
          // First get the card to show what we're moving
          const getResponse = await apiRequest(`/api/cards/${card_id}`);
          if (!getResponse.ok) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Card not found: ${card_id}`,
                },
              ],
              isError: true,
            };
          }
          const card = await getResponse.json();
          const sourceDeckId = card.deck_id;

          // Move the card by updating its deck_id
          const response = await apiRequest(`/api/cards/${card_id}`, {
            method: "PATCH",
            body: JSON.stringify({ deck_id: target_deck_id }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Failed to move card: ${response.status} ${errorText}`,
                },
              ],
              isError: true,
            };
          }

          return {
            content: [
              {
                type: "text" as const,
                text: `Successfully moved "${card.front}" (${card.back}) from deck ${sourceDeckId} to deck ${target_deck_id}`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Error moving card: ${error instanceof Error ? error.message : String(error)}`,
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

// CORS headers for browser-based MCP clients
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept",
};

// Wrap with auth
const authHandler = withMcpAuth(baseHandler, verifyClient, {
  required: true,
});

// Add CORS headers to responses
async function handler(req: Request): Promise<Response> {
  const response = await authHandler(req);

  // Clone response and add CORS headers
  const newHeaders = new Headers(response.headers);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    newHeaders.set(key, value);
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

// Handle CORS preflight requests
function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export { handler as GET, handler as POST, OPTIONS };
