import express from "express";
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

const API_BASE_URL = "https://learn.rocksbythesea.uk";
const API_TOKEN = process.env.API_TOKEN || "";
const MCP_CLIENT_SECRET = process.env.MCP_CLIENT_SECRET || "mcp-secret-change-me";

// Helper to make authenticated API requests
async function apiRequest(path: string, options: RequestInit = {}): Promise<Response> {
  const url = `${API_BASE_URL}${path}`;
  const headers = {
    Authorization: `Bearer ${API_TOKEN}`,
    "Content-Type": "application/json",
    ...options.headers,
  };
  return fetch(url, { ...options, headers });
}

// Auth verification
function verifyAuth(authHeader: string | undefined): boolean {
  if (!authHeader?.startsWith("Bearer ")) return false;
  const token = authHeader.slice(7);

  if (token === MCP_CLIENT_SECRET) return true;

  const expectedBase64 = Buffer.from(`claude:${MCP_CLIENT_SECRET}`).toString("base64");
  if (token === expectedBase64) return true;

  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const [clientId, secret] = decoded.split(":");
    if (clientId === "claude" && secret === MCP_CLIENT_SECRET) return true;
  } catch {
    // Not valid base64
  }

  return false;
}

// Create and configure the MCP server
function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "learn-language",
    version: "1.0.0",
  });

  // Resource: Instructions
  server.resource("instructions", "instructions://add-words", async () => ({
    contents: [{
      uri: "instructions://add-words",
      mimeType: "text/plain",
      text: `# How to Add Arabic Vocabulary Words

## Word Format
- arabic_word: The Arabic word in Arabic script (e.g., "كتاب")
- english_translation: The English meaning (e.g., "book")
- notes (optional): Additional context

## Best Practices
1. Always use Arabic script
2. Keep translations concise
3. Add notes for words with multiple meanings
4. Group related words in the same deck

## Default deck: "Learning with Claude" (ID: 15)
`,
    }],
  }));

  // Resource: List of all decks
  server.resource("decks", "decks://list", async () => {
    try {
      const response = await apiRequest("/api/decks");
      if (!response.ok) {
        return { contents: [{ uri: "decks://list", mimeType: "application/json", text: JSON.stringify({ error: "Failed to fetch decks" }) }] };
      }
      const decks = await response.json();
      const deckList = decks.map((deck: { id: number; name: string }) => ({ id: deck.id, name: deck.name }));
      return { contents: [{ uri: "decks://list", mimeType: "application/json", text: JSON.stringify(deckList, null, 2) }] };
    } catch (error) {
      return { contents: [{ uri: "decks://list", mimeType: "application/json", text: JSON.stringify({ error: String(error) }) }] };
    }
  });

  // Resource Template: Individual deck
  const useDeckTemplate = new ResourceTemplate("deck://{deckId}", {
    list: async () => {
      try {
        const response = await apiRequest("/api/decks");
        if (!response.ok) return { resources: [] };
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

  server.resource("use-deck", useDeckTemplate, async (uri: URL, variables: { deckId?: string }) => ({
    contents: [{
      uri: uri.href,
      mimeType: "text/plain",
      text: `Use Deck with ID ${variables.deckId || "unknown"}`,
    }],
  }));

  // Resource: All Words
  server.resource("all-words", "words://all", async () => {
    try {
      const response = await apiRequest("/api/vocab");
      if (!response.ok) {
        return { contents: [{ uri: "words://all", mimeType: "application/json", text: JSON.stringify({ error: "Failed to fetch words" }) }] };
      }
      const data = await response.json();
      const words = (data.vocabulary || []).map((card: { front: string; back: string; difficulty: number }) => ({
        arabic: card.front,
        meaning: card.back,
        difficulty: card.difficulty <= 3 ? "easy" : card.difficulty <= 6 ? "medium" : "hard",
      }));
      return { contents: [{ uri: "words://all", mimeType: "application/json", text: JSON.stringify(words, null, 2) }] };
    } catch (error) {
      return { contents: [{ uri: "words://all", mimeType: "application/json", text: JSON.stringify({ error: String(error) }) }] };
    }
  });

  // Tool: Get learning words
  server.tool(
    "get_learning_words",
    "Get words that are new, learning, or difficult",
    {
      deck_id: z.number().optional().describe("Filter by deck ID"),
      include_difficult: z.boolean().optional().default(true).describe("Include difficult words"),
    },
    async ({ deck_id, include_difficult }) => {
      try {
        const endpoint = deck_id ? `/api/decks/${deck_id}/cards` : "/api/review";
        const response = await apiRequest(endpoint);
        if (!response.ok) {
          return { content: [{ type: "text" as const, text: `Failed: ${response.status}` }], isError: true };
        }
        const allCards = await response.json();
        const learningCards = allCards.filter((card: { state: number; lapses: number }) =>
          card.state === 0 || card.state === 1 || (include_difficult && card.lapses >= 2)
        );

        if (learningCards.length === 0) {
          return { content: [{ type: "text" as const, text: "No learning words found!" }] };
        }

        const formatWord = (card: { front: string; back: string; lapses: number }) =>
          `  - ${card.front} (${card.back})${card.lapses >= 2 ? " [difficult]" : ""}`;

        const newWords = learningCards.filter((c: { state: number }) => c.state === 0);
        const inProgress = learningCards.filter((c: { state: number; lapses: number }) => c.state === 1 && c.lapses < 2);
        const difficult = learningCards.filter((c: { lapses: number }) => c.lapses >= 2);

        let result = "";
        if (newWords.length > 0) result += `📚 New (${newWords.length}):\n${newWords.map(formatWord).join("\n")}\n\n`;
        if (inProgress.length > 0) result += `📖 Learning (${inProgress.length}):\n${inProgress.map(formatWord).join("\n")}\n\n`;
        if (difficult.length > 0 && include_difficult) result += `⚠️ Difficult (${difficult.length}):\n${difficult.map(formatWord).join("\n")}`;

        return { content: [{ type: "text" as const, text: result.trim() }] };
      } catch (error) {
        return { content: [{ type: "text" as const, text: `Error: ${String(error)}` }], isError: true };
      }
    }
  );

  // Tool: List decks
  server.tool("list_decks", "List all decks", {}, async () => {
    try {
      const response = await apiRequest("/api/decks");
      if (!response.ok) {
        return { content: [{ type: "text" as const, text: `Failed: ${response.status}` }], isError: true };
      }
      const decks = await response.json();
      const deckList = decks.map((d: { id: number; name: string }) => `- ID ${d.id}: ${d.name}`).join("\n");
      return { content: [{ type: "text" as const, text: `Decks:\n${deckList}` }] };
    } catch (error) {
      return { content: [{ type: "text" as const, text: `Error: ${String(error)}` }], isError: true };
    }
  });

  // Tool: Create deck
  server.tool("create_deck", "Create a new deck", { name: z.string() }, async ({ name }) => {
    try {
      const response = await apiRequest("/api/decks", { method: "POST", body: JSON.stringify({ name }) });
      if (!response.ok) {
        return { content: [{ type: "text" as const, text: `Failed: ${response.status}` }], isError: true };
      }
      const result = await response.json();
      return { content: [{ type: "text" as const, text: `Created "${name}" (ID: ${result.id})` }] };
    } catch (error) {
      return { content: [{ type: "text" as const, text: `Error: ${String(error)}` }], isError: true };
    }
  });

  // Tool: Add word
  server.tool(
    "add_word",
    "Add a vocabulary word",
    {
      arabic_word: z.string(),
      english_translation: z.string(),
      deck_id: z.number().optional().default(15),
      notes: z.string().optional(),
    },
    async ({ arabic_word, english_translation, deck_id, notes }) => {
      try {
        const cardData = [{ front: arabic_word, back: english_translation, ...(notes && { notes }) }];
        const response = await apiRequest(`/api/decks/${deck_id}/cards`, { method: "POST", body: JSON.stringify(cardData) });
        if (!response.ok) {
          return { content: [{ type: "text" as const, text: `Failed: ${response.status}` }], isError: true };
        }
        const result = await response.json();
        return { content: [{ type: "text" as const, text: `Added "${arabic_word}" (${english_translation}) ID: ${result[0]?.id}` }] };
      } catch (error) {
        return { content: [{ type: "text" as const, text: `Error: ${String(error)}` }], isError: true };
      }
    }
  );

  // Tool: Add multiple words
  server.tool(
    "add_words",
    "Add multiple words",
    {
      words: z.array(z.object({ arabic_word: z.string(), english_translation: z.string(), notes: z.string().optional() })),
      deck_id: z.number().optional().default(15),
    },
    async ({ words, deck_id }) => {
      try {
        const cardData = words.map((w) => ({ front: w.arabic_word, back: w.english_translation, ...(w.notes && { notes: w.notes }) }));
        const response = await apiRequest(`/api/decks/${deck_id}/cards`, { method: "POST", body: JSON.stringify(cardData) });
        if (!response.ok) {
          return { content: [{ type: "text" as const, text: `Failed: ${response.status}` }], isError: true };
        }
        const result = await response.json();
        const added = words.map((w, i) => `- ${w.arabic_word} (${w.english_translation}) [${result[i]?.id}]`).join("\n");
        return { content: [{ type: "text" as const, text: `Added ${words.length} words:\n${added}` }] };
      } catch (error) {
        return { content: [{ type: "text" as const, text: `Error: ${String(error)}` }], isError: true };
      }
    }
  );

  // Tool: Update deck
  server.tool(
    "update_deck",
    "Update deck name/description",
    { deck_id: z.number(), name: z.string().optional(), description: z.string().optional() },
    async ({ deck_id, name, description }) => {
      try {
        if (!name && !description) {
          return { content: [{ type: "text" as const, text: "Provide name or description" }], isError: true };
        }
        const response = await apiRequest(`/api/decks/${deck_id}`, { method: "PATCH", body: JSON.stringify({ name, description }) });
        if (!response.ok) {
          return { content: [{ type: "text" as const, text: `Failed: ${response.status}` }], isError: true };
        }
        return { content: [{ type: "text" as const, text: `Updated deck ${deck_id}` }] };
      } catch (error) {
        return { content: [{ type: "text" as const, text: `Error: ${String(error)}` }], isError: true };
      }
    }
  );

  // Tool: Move word
  server.tool(
    "move_word",
    "Move word to another deck",
    { card_id: z.number(), target_deck_id: z.number() },
    async ({ card_id, target_deck_id }) => {
      try {
        const getResponse = await apiRequest(`/api/cards/${card_id}`);
        if (!getResponse.ok) {
          return { content: [{ type: "text" as const, text: `Card not found: ${card_id}` }], isError: true };
        }
        const card = await getResponse.json();
        const response = await apiRequest(`/api/cards/${card_id}`, { method: "PATCH", body: JSON.stringify({ deck_id: target_deck_id }) });
        if (!response.ok) {
          return { content: [{ type: "text" as const, text: `Failed: ${response.status}` }], isError: true };
        }
        return { content: [{ type: "text" as const, text: `Moved "${card.front}" to deck ${target_deck_id}` }] };
      } catch (error) {
        return { content: [{ type: "text" as const, text: `Error: ${String(error)}` }], isError: true };
      }
    }
  );

  return server;
}

// Start the MCP server with StreamableHTTP
export function startMcpServer(port: number = 3001) {
  const app = express();

  // Session management
  const sessions = new Map<string, { server: McpServer; transport: StreamableHTTPServerTransport }>();

  // Handle /mcp endpoint
  app.all("/mcp", express.json(), async (req, res) => {
    // CORS
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept, mcp-session-id");
    res.header("Access-Control-Expose-Headers", "mcp-session-id");

    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }

    // Auth check
    if (!verifyAuth(req.headers.authorization)) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Session handling
    const sessionId = req.headers["mcp-session-id"] as string || crypto.randomUUID();

    let session = sessions.get(sessionId);
    if (!session) {
      const server = createMcpServer();
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => sessionId,
      });
      await server.connect(transport);
      session = { server, transport };
      sessions.set(sessionId, session);
      console.log(`[MCP] New session: ${sessionId}`);
    }

    // Handle DELETE for session cleanup
    if (req.method === "DELETE") {
      if (session) {
        await session.server.close();
        sessions.delete(sessionId);
        console.log(`[MCP] Session closed: ${sessionId}`);
      }
      return res.sendStatus(204);
    }

    // Handle the request via transport
    try {
      await session.transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error("[MCP] Error:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal error" });
      }
    }
  });

  // Health check
  app.get("/health", (req, res) => {
    res.json({ status: "ok", sessions: sessions.size });
  });

  app.listen(port, () => {
    console.log(`[MCP] Server running on http://localhost:${port}/mcp`);
  });
}
