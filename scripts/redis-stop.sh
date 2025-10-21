#!/bin/bash

# Redis Stop Script for JetVision
# Stops the Redis Docker container

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Stopping Redis for JetVision"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Stop Redis container
docker-compose stop redis

echo "✅ Redis stopped"
echo ""
echo "Data is preserved in docker/volumes/redis"
echo "To start again: npm run redis:start"
