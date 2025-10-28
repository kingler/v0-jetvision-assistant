#!/bin/bash

# Apply User Management Migrations to Supabase
# This script applies migrations 004-007 to rename iso_agents to users

set -e  # Exit on error

echo "🚀 Jetvision User Management Migrations"
echo "========================================"
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed"
    echo "Install it with: brew install supabase/tap/supabase"
    exit 1
fi

# Check for Supabase access token
if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
    echo "⚠️  SUPABASE_ACCESS_TOKEN environment variable is not set"
    echo ""
    echo "To get your access token:"
    echo "1. Go to https://app.supabase.com/account/tokens"
    echo "2. Create a new access token"
    echo "3. Run: export SUPABASE_ACCESS_TOKEN='your-token-here'"
    echo ""
    echo "Or login interactively: supabase login"
    exit 1
fi

# Check if project is linked
echo "📋 Checking project link..."
if ! supabase projects list &> /dev/null; then
    echo "❌ Not logged in to Supabase"
    echo "Run: supabase login --token $SUPABASE_ACCESS_TOKEN"
    exit 1
fi

echo "✅ Supabase CLI authenticated"
echo ""

# Get project reference
echo "🔗 Getting project reference..."
PROJECT_REF=$(grep -A 5 '\[api\]' .env.local | grep SUPABASE_URL | cut -d'/' -f3 | cut -d'.' -f1)

if [ -z "$PROJECT_REF" ]; then
    echo "⚠️  Could not find project reference in .env.local"
    echo "Please enter your Supabase project reference (found in your Supabase URL):"
    read -r PROJECT_REF
fi

echo "Project Reference: $PROJECT_REF"
echo ""

# Link project if not already linked
echo "🔗 Linking to Supabase project..."
supabase link --project-ref "$PROJECT_REF" || echo "Project already linked"
echo ""

# Check current migration status
echo "📊 Checking current migration status..."
supabase db remote list || echo "Unable to check migration status"
echo ""

# Confirm before proceeding
echo "⚠️  WARNING: This will rename the 'iso_agents' table to 'users'"
echo ""
echo "Migrations to apply:"
echo "  1. 004_update_user_roles.sql - Add new user roles"
echo "  2. 005_rename_iso_agents_to_users.sql - Rename table"
echo "  3. 006_update_foreign_keys.sql - Update foreign keys"
echo "  4. 007_update_rls_for_users.sql - Update RLS policies"
echo ""
read -p "Do you want to proceed? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "❌ Migration cancelled"
    exit 0
fi

echo ""
echo "🔄 Applying migrations..."
echo ""

# Apply migrations using db push
supabase db push

echo ""
echo "✅ Migrations applied successfully!"
echo ""

# Verify the migration
echo "🔍 Verifying table rename..."
echo ""

# You'll need to run this query manually or use psql
echo "Run this query in Supabase SQL Editor to verify:"
echo ""
echo "SELECT table_name"
echo "FROM information_schema.tables"
echo "WHERE table_schema = 'public'"
echo "AND table_name IN ('users', 'iso_agents');"
echo ""
echo "Expected result: Only 'users' should appear"
echo ""
echo "✅ Migration script complete!"
