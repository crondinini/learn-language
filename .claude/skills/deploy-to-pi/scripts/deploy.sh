#!/bin/bash
set -e

echo "=== Deploy to Raspberry Pi ==="

# 1. Backup database
echo "Backing up database..."
ssh pi "cp ~/learn-language/data/learn-language.db ~/learn-language/data/backups/learn-language-\$(date +%Y%m%d-%H%M%S).db"

# 2. Build and push
echo "Building and pushing Docker image..."
docker buildx build --platform linux/arm64 \
  -t 192.168.1.163:5000/learn-language:latest --push .

# 3. Pull and restart on Pi
echo "Pulling and restarting on Pi..."
ssh pi "docker pull localhost:5000/learn-language:latest && \
  cd ~/learn-language && docker compose up -d"

# 4. Verify
echo "Verifying deployment..."
sleep 3
STATUS=$(ssh pi "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/login")
if [ "$STATUS" = "200" ]; then
  echo "✓ Deployment successful! (HTTP $STATUS)"
else
  echo "✗ Deployment may have failed (HTTP $STATUS)"
  exit 1
fi
