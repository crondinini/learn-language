import express from "express";
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { RESOURCE_MIME_TYPE, registerAppTool, registerAppResource } from "@modelcontextprotocol/ext-apps/server";
import { z } from "zod";
import fs from "node:fs/promises";
import path from "node:path";
import Database from "better-sqlite3";

const API_BASE_URL = "https://learn.rocksbythesea.uk";
const API_TOKEN = process.env.API_TOKEN || "";
const MCP_CLIENT_SECRET = process.env.MCP_CLIENT_SECRET || "mcp-secret-change-me";

// MCP App dist directory - works from source or compiled
const MCP_APP_DIST_DIR = path.join(process.cwd(), "dist-mcp-app");

// Initialize database connection for OAuth token validation
const dbPath = path.join(process.cwd(), "data", "learn-language.db");
let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
  }
  return db;
}

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

// Auth verification - checks static secret and OAuth tokens from database
function verifyAuth(authHeader: string | undefined): boolean {
  if (!authHeader?.startsWith("Bearer ")) return false;
  const token = authHeader.slice(7);

  // Check against static MCP_CLIENT_SECRET
  if (token === MCP_CLIENT_SECRET) return true;

  // Check base64-encoded client:secret format
  const expectedBase64 = Buffer.from(`claude:${MCP_CLIENT_SECRET}`).toString("base64");
  if (token === expectedBase64) return true;

  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const [clientId, secret] = decoded.split(":");
    if (clientId === "claude" && secret === MCP_CLIENT_SECRET) return true;
  } catch {
    // Not valid base64
  }

  // Check OAuth access tokens from database
  try {
    const database = getDb();
    const row = database.prepare(
      "SELECT client_id, expires_at FROM oauth_tokens WHERE token = ?"
    ).get(token) as { client_id: string; expires_at: number } | undefined;

    if (row) {
      // Check if token is still valid (not expired)
      if (row.expires_at > Date.now()) {
        console.log(`[MCP] OAuth token validated for client: ${row.client_id}`);
        return true;
      } else {
        // Clean up expired token
        database.prepare("DELETE FROM oauth_tokens WHERE token = ?").run(token);
        console.log(`[MCP] OAuth token expired, removed from database`);
      }
    }
  } catch (error) {
    console.error("[MCP] Error checking OAuth token:", error);
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

  // ========== Verb Conjugation Tools ==========

  // Tool: List verbs
  server.tool("list_verbs", "List all Arabic verbs with their practice stats", {}, async () => {
    try {
      const response = await apiRequest("/api/verbs");
      if (!response.ok) {
        return { content: [{ type: "text" as const, text: `Failed: ${response.status}` }], isError: true };
      }
      const verbs = await response.json();
      if (verbs.length === 0) {
        return { content: [{ type: "text" as const, text: "No verbs found. Add verbs with the add_verb tool." }] };
      }
      const verbList = verbs.map((v: { id: number; root: string; meaning: string; past_3ms: string; present_3ms: string; due_count: number; mastered_count: number; total_conjugations: number }) =>
        `- ID ${v.id}: ${v.root} (${v.meaning}) - ${v.past_3ms}/${v.present_3ms} [${v.mastered_count}/${v.total_conjugations} mastered, ${v.due_count} due]`
      ).join("\n");
      return { content: [{ type: "text" as const, text: `Verbs:\n${verbList}` }] };
    } catch (error) {
      return { content: [{ type: "text" as const, text: `Error: ${String(error)}` }], isError: true };
    }
  });

  // Tool: Add verb with conjugations
  server.tool(
    "add_verb",
    "Add a new Arabic verb with its past tense conjugations",
    {
      root: z.string().describe("The Arabic root (e.g., ك-ت-ب)"),
      root_transliteration: z.string().optional().describe("Transliteration (e.g., k-t-b)"),
      form: z.number().optional().default(1).describe("Verb form (1-10, default 1)"),
      meaning: z.string().describe("English meaning"),
      past_3ms: z.string().describe("Past tense 3rd person masculine singular (e.g., كَتَبَ)"),
      present_3ms: z.string().describe("Present tense 3rd person masculine singular (e.g., يَكْتُبُ)"),
      masdar: z.string().optional().describe("Verbal noun/masdar"),
      past_conjugations: z.object({
        ana: z.string().describe("أنا - I"),
        nahnu: z.string().describe("نحن - We"),
        anta: z.string().describe("أنتَ - You (m.s.)"),
        anti: z.string().describe("أنتِ - You (f.s.)"),
        antum: z.string().describe("أنتم - You (m.pl.)"),
        huwa: z.string().describe("هو - He"),
        hiya: z.string().describe("هي - She"),
        hum: z.string().describe("هم - They (m.pl.)"),
        hunna: z.string().describe("هن - They (f.pl.)"),
      }).describe("Past tense conjugations for all persons"),
    },
    async ({ root, root_transliteration, form, meaning, past_3ms, present_3ms, masdar, past_conjugations }) => {
      try {
        const response = await apiRequest("/api/verbs", {
          method: "POST",
          body: JSON.stringify({
            root,
            root_transliteration,
            form,
            meaning,
            past_3ms,
            present_3ms,
            masdar,
            past_conjugations,
          }),
        });
        if (!response.ok) {
          const error = await response.text();
          return { content: [{ type: "text" as const, text: `Failed: ${response.status} - ${error}` }], isError: true };
        }
        const verb = await response.json();
        return { content: [{ type: "text" as const, text: `Added verb "${root}" (${meaning}) with ID: ${verb.id}\nPast: ${past_3ms}, Present: ${present_3ms}\n${Object.keys(past_conjugations).length} conjugations created.` }] };
      } catch (error) {
        return { content: [{ type: "text" as const, text: `Error: ${String(error)}` }], isError: true };
      }
    }
  );

  // ========== MCP App: Flashcard Review ==========
  const flashcardResourceUri = "ui://flashcards/mcp-app.html";

  // Register the flashcard review app tool using registerAppTool for proper _meta.ui linking
  registerAppTool(
    server,
    "review_flashcards",
    {
      title: "Review Flashcards",
      description: "Open an interactive flashcard review UI for Arabic vocabulary",
      inputSchema: {
        deck_id: z.number().optional().describe("Optional deck ID to filter cards"),
      },
      _meta: {
        ui: {
          resourceUri: flashcardResourceUri,
          visibility: ["model", "app"],
        },
      },
    },
    async ({ deck_id }) => {
      try {
        // Fetch decks
        const decksResponse = await apiRequest("/api/decks");
        const decks = decksResponse.ok ? await decksResponse.json() : [];
        const deckList = decks.map((d: { id: number; name: string }) => ({ id: d.id, name: d.name }));

        // Fetch cards
        const endpoint = deck_id ? `/api/decks/${deck_id}/cards` : "/api/vocab";
        const cardsResponse = await apiRequest(endpoint);
        if (!cardsResponse.ok) {
          return { content: [{ type: "text" as const, text: JSON.stringify({ cards: [], decks: deckList, selectedDeckId: deck_id || null }) }] };
        }

        const rawCards = deck_id
          ? await cardsResponse.json()
          : (await cardsResponse.json()).vocabulary || [];

        const cards = rawCards.map((card: { id: number; front: string; back: string; notes?: string; difficulty?: number; state?: number; lapses?: number }) => ({
          id: card.id,
          front: card.front,
          back: card.back,
          notes: card.notes,
          difficulty: (card.difficulty ?? 5) <= 3 ? "easy" : (card.difficulty ?? 5) <= 6 ? "medium" : "hard",
          state: card.state ?? 0,
          lapses: card.lapses ?? 0,
        }));

        const data = {
          cards,
          decks: deckList,
          selectedDeckId: deck_id || null,
        };

        return { content: [{ type: "text" as const, text: JSON.stringify(data) }] };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ cards: [], decks: [], selectedDeckId: null, error: String(error) }) }],
          isError: true,
        };
      }
    },
  );

  // Register the flashcard UI resource using registerAppResource
  registerAppResource(
    server,
    "Flashcard Review UI",
    flashcardResourceUri,
    {
      description: "Interactive flashcard review interface for Arabic vocabulary",
    },
    async () => {
      try {
        const html = await fs.readFile(path.join(MCP_APP_DIST_DIR, "mcp-app.html"), "utf-8");
        return {
          contents: [{ uri: flashcardResourceUri, mimeType: RESOURCE_MIME_TYPE, text: html }],
        };
      } catch (error) {
        const errorHtml = `<!DOCTYPE html><html><body><h1>Error</h1><p>MCP App not built. Run: npm run build:mcp-app</p><p>${String(error)}</p></body></html>`;
        return {
          contents: [{ uri: flashcardResourceUri, mimeType: RESOURCE_MIME_TYPE, text: errorHtml }],
        };
      }
    },
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
    // CORS - include mcp-protocol-version for browser-based MCP clients
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept, mcp-session-id, mcp-protocol-version");
    res.header("Access-Control-Expose-Headers", "mcp-session-id, mcp-protocol-version");

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
