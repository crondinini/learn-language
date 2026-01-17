- for this project, the code should be changed in this host, but the deployment, database and running of the app needs to happen in the raspberry (using ssh pi)
- **IMPORTANT**: Whenever there is a new feature or code change, read the deploy-to-pi skill to know how to deploy. Always commit before deploying.
- Images on Pi are at ~/learn-language/data/images/
- Audio on Pi is at ~/learn-language/data/audio/

## Available Skills

- **add-word**: Add a single Arabic word to the flashcard system
- **import-vocabulary**: Import vocabulary from Word documents (.docx)
- **generate-card-image**: Download an image for a vocabulary card using Unsplash
- **download-playaling-audio**: Download MSA audio pronunciation from Playaling
- **deploy-to-pi**: Deploy code changes to the Raspberry Pi
- when I ask to make a change, check if you can use the API in https://learn.rocksbythesea.uk using the bearer token from `.env.local` (`API_TOKEN`)

## MCP Server

The app includes an MCP (Model Context Protocol) server that allows AI assistants to interact with the vocabulary system.

### Architecture

```
Client Request → Next.js (:3000) → Rewrite → Express MCP Server (:3001)
```

- **`src/mcp-server.ts`** - Standalone Express server using `@modelcontextprotocol/sdk` with `StreamableHTTPServerTransport`
- **`src/instrumentation.ts`** - Starts MCP server on Next.js boot (port 3001)
- **`next.config.ts`** - Rewrites `/mcp` requests to internal server
- **`src/middleware.ts`** - Allows `/mcp` requests to bypass auth middleware

### Endpoint

- **URL**: `https://learn.rocksbythesea.uk/mcp`
- **Auth**: `Authorization: Bearer <MCP_CLIENT_SECRET>` (from `.env.local`)
- **Protocol**: Streamable HTTP (single endpoint, SSE responses)

### Available Tools

| Tool | Description |
|------|-------------|
| `list_decks` | List all vocabulary decks |
| `create_deck` | Create a new deck |
| `update_deck` | Update deck name/description |
| `add_word` | Add a single vocabulary word |
| `add_words` | Add multiple words at once |
| `move_word` | Move word to another deck |
| `get_learning_words` | Get new/learning/difficult words |

### Available Resources

| Resource | URI | Description |
|----------|-----|-------------|
| Instructions | `instructions://add-words` | How to add vocabulary words |
| Decks List | `decks://list` | List of all decks (JSON) |
| Individual Deck | `deck://{deckId}` | Use a specific deck |
| All Words | `words://all` | All vocabulary with difficulty levels |

### Testing

```bash
# Test MCP endpoint
curl -X POST https://learn.rocksbythesea.uk/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Authorization: Bearer <MCP_CLIENT_SECRET>" \
  -d '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}},"id":1}'
```

### Configuration

Environment variables in `.env.local` on Pi:
- `MCP_CLIENT_SECRET` - Secret for MCP client authentication
- `API_TOKEN` - Token for backend API calls (used by MCP server internally)