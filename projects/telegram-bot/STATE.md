# Telegram Arabic Practice Bot

## Stack
- **Runtime**: Node.js + TypeScript (ESM)
- **Telegram**: grammy
- **AI**: Claude CLI (haiku model, spawned as child process)
- **Scheduling**: node-cron + random time slots
- **API**: Calls learn-language-web-app REST API for vocabulary data

## Features
- Proactive daily messages in Arabic using learned vocabulary
- Conversational replies that continue naturally in Arabic
- Grammar corrections when the user makes mistakes
- Uses FSRS-tracked vocabulary (Learning + Mastered words) for context
- Configurable message frequency (default: 3/day between 9am-9pm)
- Single-user mode (locked to TELEGRAM_CHAT_ID)

## Hosting
- TBD — designed to run on Hetzner alongside the web app

## Recent Changes
- Initial implementation
