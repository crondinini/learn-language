# Telegram Arabic Practice Bot

## Overview
Telegram bot that acts as a conversational Arabic practice partner. Sends proactive messages in Arabic using vocabulary from the learn-language-web-app, and continues conversations when the user replies. Supports voice messages via ElevenLabs Scribe transcription.

## Architecture
- `src/index.ts` — Bot setup, command handlers (text + voice), message routing
- `src/conversation.ts` — Prompt engineering for generating Arabic messages and replies; extracts new words and saves to "Bot practice" deck
- `src/claude.ts` — Claude CLI spawn wrapper (same pattern as learn-language-web-app: delete `CLAUDECODE` env var, pass prompt via stdin)
- `src/api.ts` — Client for the learn-language-web-app REST API (fetch vocab, create decks, add cards)
- `src/scheduler.ts` — Random daily message scheduling (picks N random times between 9am-9pm)
- `src/transcribe.ts` — Voice message transcription via ElevenLabs Scribe v2

## Running
```bash
cp .env.example .env  # Fill in values
npm install
npm run dev           # Development with hot reload
npm run build         # Compile TypeScript to dist/
npm start             # Production (runs dist/index.js)
```

## Environment Variables
- `TELEGRAM_BOT_TOKEN` — From @BotFather (bot: @practce_crsr_bot)
- `TELEGRAM_CHAT_ID` — Your Telegram user ID (for authorization + proactive messages)
- `API_URL` — Learn language API (default: https://learn.rocksbythesea.uk)
- `API_TOKEN` — Bearer token for API auth
- `ELEVENLABS_API_KEY` — For Scribe v2 voice transcription
- `MESSAGES_PER_DAY` — How many proactive messages per day (default: 3)

## Deployment

Deployed on **Hetzner VPS** as a systemd service, auto-deployed on push to `main` via GitHub Actions.

### How it works
- **Trigger**: Push to `main` when files in `projects/telegram-bot/**` change
- **Workflow**: `.github/workflows/deploy-telegram-bot.yml`
- **Process**: GitHub Action SSHs to Hetzner → pulls latest → `rsync` to `/opt/telegram-bot/` → `npm ci && npm run build` → restarts systemd service
- **Service**: `telegram-bot.service` (in `deploy/`)

### Server paths
- **Deploy directory**: `/opt/telegram-bot/`
- **Env file**: `/opt/telegram-bot/.env` (persists across deploys, not overwritten by rsync)
- **Service file**: `/etc/systemd/system/telegram-bot.service`

### First-time server setup
Before the first deploy, SSH to the server and create the `.env` file:
```bash
mkdir -p /opt/telegram-bot
cat > /opt/telegram-bot/.env << 'EOF'
TELEGRAM_BOT_TOKEN=<from @BotFather>
TELEGRAM_CHAT_ID=<your telegram user id>
API_URL=https://learn.rocksbythesea.uk
API_TOKEN=<from /mnt/HC_Volume_104464186/learn-language/.env.local>
ELEVENLABS_API_KEY=<from /mnt/HC_Volume_104464186/learn-language/.env.local>
MESSAGES_PER_DAY=3
EOF
```

Also ensure `claude` CLI is installed and authenticated on the server (the web app already requires this).

### Useful commands (on server)
```bash
systemctl status telegram-bot      # Service status
systemctl restart telegram-bot     # Restart
journalctl -u telegram-bot -f      # Follow logs
journalctl -u telegram-bot -n 50   # Last 50 log lines
```

### Dependencies
- **Claude CLI** — Must be installed on the server (used to generate Arabic messages)
- **learn-language-web-app API** — Must be running (provides vocabulary data)
- **ElevenLabs API** — For voice message transcription
