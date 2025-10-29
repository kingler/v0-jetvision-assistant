#!/bin/bash

#############################################
# User Table Migration Script
# Applies migrations 005-009 to Supabase
# Uses Supabase CLI for automated deployment
#############################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
MIGRATIONS_DIR="$PROJECT_ROOT/supabase/migrations"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}   User Table Migration Script${NC}"
echo -e "${BLUE}   iso_agents → users (Migrations 005-009)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo

#############################################
# Pre-flight Checks
#############################################

echo -e "${YELLOW}⚡ Running pre-flight checks...${NC}"

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI not found!${NC}"
    echo -e "${YELLOW}Install with: npm install -g supabase${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} Supabase CLI installed: $(supabase --version)"

# Check if we're in a Supabase project
if [ ! -f "$PROJECT_ROOT/supabase/config.toml" ]; then
    echo -e "${RED}❌ Not a Supabase project (missing config.toml)${NC}"
    echo -e "${YELLOW}Run: supabase init${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} Supabase project detected"

# Check if migration files exist
MIGRATIONS=(
    "005_update_user_roles.sql"
    "006_rename_iso_agents_to_users.sql"
    "007_update_foreign_keys.sql"
    "008_update_rls_for_users.sql"
)

for migration in "${MIGRATIONS[@]}"; do
    if [ ! -f "$MIGRATIONS_DIR/$migration" ]; then
        echo -e "${RED}❌ Migration file not found: $migration${NC}"
        exit 1
    fi
done

echo -e "${GREEN}✓${NC} All migration files found (005-008)"

# Check Supabase connection
echo -e "${YELLOW}Checking Supabase connection...${NC}"
if ! supabase status &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not connected to Supabase${NC}"
    echo -e "${YELLOW}Linking project...${NC}"

    # Try to link project
    if ! supabase link; then
        echo -e "${RED}❌ Failed to link Supabase project${NC}"
        echo -e "${YELLOW}Please run manually: supabase link --project-ref YOUR_PROJECT_REF${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✓${NC} Connected to Supabase"

#############################################
# Display Migration Plan
#############################################

echo
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}   Migration Plan${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo
echo -e "${YELLOW}The following migrations will be applied:${NC}"
echo
echo -e "  1️⃣  005_update_user_roles.sql"
echo -e "      → Add 4 new roles (sales_rep, admin, customer, operator)"
echo
echo -e "  2️⃣  006_rename_iso_agents_to_users.sql"
echo -e "      → Rename table: iso_agents → users"
echo -e "      → Add columns: avatar_url, phone, timezone, preferences, last_login_at"
echo
echo -e "  3️⃣  007_update_foreign_keys.sql"
echo -e "      → Update foreign keys: iso_agent_id → user_id"
echo -e "      → Affected tables: client_profiles, requests, quotes, workflow_states, agent_executions"
echo
echo -e "  4️⃣  008_update_rls_for_users.sql"
echo -e "      → Update Row Level Security policies for users table"
echo
echo -e "${YELLOW}Rollback available:${NC} 009_rollback_to_iso_agents.sql"
echo

#############################################
# Confirmation Prompt
#############################################

echo -e "${YELLOW}⚠️  WARNING: This will modify your production database!${NC}"
echo -e "${YELLOW}   Make sure you have a backup before proceeding.${NC}"
echo
read -p "$(echo -e ${YELLOW}Continue with migration? [y/N]: ${NC})" -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Migration cancelled by user${NC}"
    exit 0
fi

#############################################
# Apply Migrations
#############################################

echo
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}   Applying Migrations${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo

MIGRATION_COUNT=0
FAILED=0

for migration in "${MIGRATIONS[@]}"; do
    MIGRATION_COUNT=$((MIGRATION_COUNT + 1))
    echo -e "${YELLOW}[$MIGRATION_COUNT/4] Applying $migration...${NC}"

    # Apply migration using Supabase CLI
    if supabase db push --db-url "$(supabase status | grep 'DB URL' | awk '{print $NF}')" < "$MIGRATIONS_DIR/$migration"; then
        echo -e "${GREEN}✓${NC} $migration applied successfully"
    else
        echo -e "${RED}❌ Failed to apply $migration${NC}"
        FAILED=1

        # Ask if user wants to continue or rollback
        echo
        echo -e "${YELLOW}Migration failed! What would you like to do?${NC}"
        echo -e "  1) Continue with next migration (not recommended)"
        echo -e "  2) Rollback all changes"
        echo -e "  3) Abort (leave database in current state)"
        echo
        read -p "$(echo -e ${YELLOW}Choice [1/2/3]: ${NC})" -n 1 -r
        echo

        case $REPLY in
            1)
                echo -e "${YELLOW}Continuing...${NC}"
                ;;
            2)
                echo -e "${YELLOW}Rolling back all changes...${NC}"
                if supabase db push --db-url "$(supabase status | grep 'DB URL' | awk '{print $NF}')" < "$MIGRATIONS_DIR/009_rollback_to_iso_agents.sql"; then
                    echo -e "${GREEN}✓${NC} Rollback completed"
                else
                    echo -e "${RED}❌ Rollback failed!${NC}"
                    echo -e "${RED}Please manually run: supabase/migrations/009_rollback_to_iso_agents.sql${NC}"
                fi
                exit 1
                ;;
            *)
                echo -e "${YELLOW}Aborting migration${NC}"
                exit 1
                ;;
        esac
    fi

    echo
done

#############################################
# Verification
#############################################

if [ $FAILED -eq 0 ]; then
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}   Verifying Migration${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo

    echo -e "${YELLOW}Running verification queries...${NC}"

    # Check if users table exists
    echo -e "${YELLOW}1. Checking if 'users' table exists...${NC}"
    if supabase db execute "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public';" | grep -q "1"; then
        echo -e "${GREEN}✓${NC} 'users' table exists"
    else
        echo -e "${RED}❌ 'users' table not found${NC}"
        FAILED=1
    fi

    # Check if iso_agents table is gone
    echo -e "${YELLOW}2. Checking if 'iso_agents' table is removed...${NC}"
    if supabase db execute "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'iso_agents' AND table_schema = 'public';" | grep -q "0"; then
        echo -e "${GREEN}✓${NC} 'iso_agents' table removed"
    else
        echo -e "${RED}❌ 'iso_agents' table still exists${NC}"
        FAILED=1
    fi

    # Check roles
    echo -e "${YELLOW}3. Checking user roles...${NC}"
    echo -e "   Current roles in database:"
    supabase db execute "SELECT DISTINCT role FROM users ORDER BY role;" || FAILED=1

    echo
fi

#############################################
# Summary
#############################################

echo
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}   ✅ Migration Completed Successfully!${NC}"
else
    echo -e "${RED}   ⚠️  Migration Completed with Warnings${NC}"
fi
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}Summary:${NC}"
    echo -e "  ✓ iso_agents table renamed to users"
    echo -e "  ✓ 4 new user roles added (sales_rep, admin, customer, operator)"
    echo -e "  ✓ Foreign keys updated across 5 tables"
    echo -e "  ✓ RLS policies updated"
    echo
    echo -e "${YELLOW}Next steps:${NC}"
    echo -e "  1. Update Linear issues (ONEK-49, ONEK-50, ONEK-51) to 'Done'"
    echo -e "  2. Test authentication flow with new user roles"
    echo -e "  3. Deploy application changes"
    echo
    echo -e "${GREEN}Migration completed at: $(date)${NC}"
else
    echo -e "${YELLOW}Please review the warnings above and verify your database manually.${NC}"
    echo
    echo -e "${YELLOW}Rollback available if needed:${NC}"
    echo -e "  supabase db push < supabase/migrations/009_rollback_to_iso_agents.sql"
fi

echo
