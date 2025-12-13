import { createMcpHandler } from "mcp-handler";
import { z } from "zod";

const API_BASE_URL = "https://learn.rocksbythesea.uk";
const API_TOKEN = "EGfYvc4Fm4vzD4QBqouEyLoW";

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

const handler = createMcpHandler(
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
  {
    name: "learn-language",
    version: "1.0.0",
  },
  {
    basePath: "/api/mcp",
    verboseLogs: true,
  }
);

export { handler as GET, handler as POST };
