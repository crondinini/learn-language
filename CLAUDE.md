## Deployment

The app is deployed on a **Hetzner server** and automatically deploys on push to `main` via GitHub Actions.

- **URL**: https://learn.rocksbythesea.uk
- **Deployment**: Automatic via GitHub Actions on push to `main`
- **How it works**: GitHub Action SSHs to Hetzner, pulls latest code, builds Docker image locally, restarts containers
- **Database**: SQLite on Hetzner volume at `/mnt/HC_Volume_104464186/learn-language/data/`
- **HTTPS**: Cloudflare Tunnel (runs as systemd service)

### Manual deployment (if needed)

SSH to the server and run:
```bash
cd ~/learn-language
git pull
docker compose -f docker-compose.hetzner.yml build
docker compose -f docker-compose.hetzner.yml up -d
```

### Data locations on Hetzner
- Database: `/mnt/HC_Volume_104464186/learn-language/data/learn-language.db`
- Images: `/mnt/HC_Volume_104464186/learn-language/data/images/`
- Audio: `/mnt/HC_Volume_104464186/learn-language/data/audio/`
- Env file: `/mnt/HC_Volume_104464186/learn-language/.env.local`

## Available Skills

- **add-word**: Add a single Arabic word to the flashcard system
- **import-vocabulary**: Import vocabulary from Word documents (.docx)
- **generate-card-image**: Download an image for a vocabulary card using Unsplash
- **download-playaling-audio**: Download MSA audio pronunciation from Playaling
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
| `review_flashcards` | **MCP App** - Interactive flashcard review UI |

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

Environment variables in `.env.local` on Hetzner:
- `MCP_CLIENT_SECRET` - Secret for MCP client authentication
- `API_TOKEN` - Token for backend API calls (used by MCP server internally)

### MCP App (Flashcard Review UI)

The MCP server includes an interactive flashcard review UI that runs inside MCP-enabled hosts like Claude Desktop.

**Tool**: `review_flashcards`
**Resource**: `ui://flashcards/mcp-app.html`

**Features**:
- Displays Arabic words with flip-to-reveal English translations
- Keyboard navigation (Space/Enter to flip, Arrow keys to navigate)
- Deck filtering
- Difficulty indicators (easy/medium/hard)
- Statistics summary

**Building the MCP App**:
```bash
npm run build:mcp-app
```

The bundled single-file HTML is output to `dist-mcp-app/mcp-app.html`.

**Development**:
```bash
npm run watch:mcp-app  # Watch mode for development
```

**Files**:
- `src/mcp-app/flashcard-app.tsx` - React component
- `src/mcp-app/flashcard-app.module.css` - Styles
- `mcp-app.html` - Entry HTML
- `vite.mcp-app.config.ts` - Vite build config