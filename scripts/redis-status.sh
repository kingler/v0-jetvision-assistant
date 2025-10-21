#!/bin/bash

# Redis Status Script for JetVision
# Shows the status of the Redis container

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Redis Status"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if container exists
if ! docker ps -a --format '{{.Names}}' | grep -q '^jetvision-redis$'; then
    echo "❌ Redis container does not exist"
    echo "Run: npm run redis:start"
    exit 1
fi

# Check if container is running
if docker ps --format '{{.Names}}' | grep -q '^jetvision-redis$'; then
    echo "✅ Redis is running"
    echo ""

    # Test connection
    if docker exec jetvision-redis redis-cli ping > /dev/null 2>&1; then
        echo "✅ Redis is responding to commands"
        echo ""

        # Get Redis info
        echo "Redis Information:"
        docker exec jetvision-redis redis-cli INFO server | grep -E "redis_version|uptime_in_seconds|os"
        echo ""

        # Get memory usage
        echo "Memory Usage:"
        docker exec jetvision-redis redis-cli INFO memory | grep -E "used_memory_human|used_memory_peak_human"
        echo ""

        # Get connected clients
        echo "Connected Clients:"
        docker exec jetvision-redis redis-cli INFO clients | grep -E "connected_clients"
        echo ""
    else
        echo "⚠️  Redis is running but not responding"
    fi
else
    echo "⚠️  Redis container exists but is not running"
    echo "Run: npm run redis:start"
fi
