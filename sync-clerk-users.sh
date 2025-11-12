#!/bin/bash

# Clerk User Sync Script
# This script syncs existing Clerk users to Supabase iso_agents table

set -e  # Exit on error

echo "🔄 Clerk User Sync"
echo "=================="
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "❌ Error: .env.local file not found"
    echo ""
    echo "Please create .env.local with the following variables:"
    echo "  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_..."
    echo "  CLERK_SECRET_KEY=sk_test_..."
    echo "  NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co"
    echo "  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key"
    echo ""
    exit 1
fi

# Load environment variables
export $(cat .env.local | grep -v '^#' | xargs)

echo "✅ Environment variables loaded"
echo ""

# Check for dry-run flag
if [ "$1" == "--dry-run" ] || [ "$1" == "-d" ]; then
    echo "🔍 DRY RUN MODE - No changes will be made"
    echo ""
    npm run clerk:sync-users:dry-run
else
    echo "⚠️  This will sync Clerk users to Supabase"
    echo ""
    read -p "Continue? (y/N): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        npm run clerk:sync-users
    else
        echo "Cancelled."
        exit 0
    fi
fi
