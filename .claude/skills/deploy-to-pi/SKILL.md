# Deploy to Raspberry Pi

Use this skill when the user wants to deploy changes to the Raspberry Pi.

## Quick Deploy (Recommended)

```bash
# 1. Commit changes first
git add -A && git commit -m "Your commit message"

# 2. Run deploy script (backs up DB, builds, pushes, restarts, verifies)
./.claude/skills/deploy-to-pi/scripts/deploy.sh
```

The deploy script automatically:
1. Backs up the database on Pi
2. Builds Docker image for arm64
3. Pushes to Pi's local registry
4. Pulls and restarts on Pi
5. Verifies deployment (HTTP 200)

**IMPORTANT**:
- Always commit before deploying to track what's deployed

## Environment Variables

The `.env.local` file on the Pi (`~/learn-language/.env.local`) contains credentials and API keys.
Docker Compose is configured to inject these via `env_file:` directive.

**Required env vars:**
- `AUTH_USERNAME`, `AUTH_PASSWORD`, `AUTH_SECRET` - Login credentials
- `TTS_PROVIDER` - Text-to-speech provider (google/elevenlabs)
- `GOOGLE_APPLICATION_CREDENTIALS` or `ELEVENLABS_API_KEY` - TTS credentials
- `HOSTNAME=0.0.0.0` - Set in docker-compose.yml (required for container networking)

## Verify Deployment

```bash
ssh pi "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/login"
```
Returns `200` if running.

## Useful Commands

```bash
# View logs
ssh pi "cd ~/learn-language && docker compose logs -f"

# Restart
ssh pi "cd ~/learn-language && docker compose restart"

# Stop
ssh pi "cd ~/learn-language && docker compose down"

# Check what's running
ssh pi "docker ps"
```

## Architecture

- **Local Mac**: Build with `docker buildx` for arm64
- **Pi Registry**: `192.168.1.163:5000` - stores images locally
- **Pi Docker**: Pulls from localhost:5000, runs the app
- **Persistence**: Data in `~/learn-language/data/` via volumes
- **Access**: Cloudflare Tunnel at `learn.rocksbythesea.uk`

## Persistence (Volumes)

All data is stored on the Pi in `~/learn-language/data/`:
- `learn-language.db` - SQLite database
- `audio/` - Generated audio files
- `homework/` - Homework recordings
- `images/` - Card images
- `backups/` - Database backups (timestamped)

The `~/learn-language/tts/` folder contains Google Cloud TTS credentials (mounted read-only).

## Initial Setup (Already Done)

### Mac Setup
```bash
# ~/.docker/daemon.json includes:
# "insecure-registries": ["192.168.1.163:5000"]

# buildx builder configured:
docker buildx create --name pi-builder --buildkitd-config /tmp/buildkitd.toml
# Config has: [registry."192.168.1.163:5000"] http = true, insecure = true
```

### Pi Setup
```bash
# Registry running on Pi
docker run -d -p 5000:5000 --restart always --name registry registry:2

# docker-compose.yml uses localhost:5000/learn-language:latest
```

## Syncing Database Back (if needed)

```bash
rsync -avz pi:~/learn-language/data/learn-language.db* ./
```

## Syncing Media from Pi

```bash
rsync -avz pi:~/learn-language/data/audio/ ./public/audio/
rsync -avz pi:~/learn-language/data/homework/ ./public/homework/
rsync -avz pi:~/learn-language/data/images/ ./public/images/
```

## Cloudflare Tunnel

The app is accessible at `https://learn.rocksbythesea.uk` via Cloudflare Tunnel.

To restart the tunnel:
```bash
ssh pi "sudo systemctl restart cloudflared"
```
