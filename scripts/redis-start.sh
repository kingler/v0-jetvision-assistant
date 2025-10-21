#!/bin/bash

# Redis Start Script for JetVision
# Starts Redis using Docker Compose

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Starting Redis for JetVision"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop first."
    exit 1
fi

# Create volume directory if it doesn't exist
mkdir -p docker/volumes/redis

# Start Redis container
echo "📦 Starting Redis container..."
docker-compose up -d redis

# Wait for Redis to be ready
echo "⏳ Waiting for Redis to be ready..."
for i in {1..30}; do
    if docker exec jetvision-redis redis-cli ping > /dev/null 2>&1; then
        echo "✅ Redis is ready!"
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "  Redis Connection Info"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "Host: localhost"
        echo "Port: 6379"
        echo "URL:  redis://localhost:6379"
        echo ""
        echo "To view logs: docker logs -f jetvision-redis"
        echo "To stop:      npm run redis:stop"
        echo "To check:     npm run redis:status"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        exit 0
    fi
    sleep 1
done

echo "❌ Redis failed to start within 30 seconds"
echo "Check logs with: docker logs jetvision-redis"
exit 1
