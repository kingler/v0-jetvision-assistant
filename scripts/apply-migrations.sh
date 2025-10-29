#!/bin/bash

#############################################
# Direct PostgreSQL Migration Script
# Applies migrations 005-009 directly via psql
# More reliable than Supabase CLI
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
echo -e "${BLUE}   User Table Migration Script (PostgreSQL)${NC}"
echo -e "${BLUE}   iso_agents → users (Migrations 005-009)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo

#############################################
# Get Database Connection String
#############################################

echo -e "${YELLOW}⚡ Retrieving database connection...${NC}"

# Try to get from Supabase CLI first
if command -v supabase &> /dev/null; then
    DB_URL=$(supabase status 2>/dev/null | grep "DB URL:" | awk '{print $NF}')
fi

# If not available, prompt user
if [ -z "$DB_URL" ]; then
    echo -e "${YELLOW}Could not auto-detect database URL${NC}"
    echo -e "${YELLOW}Please provide your Supabase database connection string:${NC}"
    echo -e "${BLUE}Format: postgresql://postgres:[YOUR-PASSWORD]@[PROJECT-REF].supabase.co:5432/postgres${NC}"
    echo
    read -p "Database URL: " DB_URL
fi

# Validate DB_URL
if [ -z "$DB_URL" ]; then
    echo -e "${RED}❌ Database URL is required${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} Database connection configured"

#############################################
# Pre-flight Checks
#############################################

echo -e "${YELLOW}⚡ Running pre-flight checks...${NC}"

# Check if psql is installed
if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ psql not found!${NC}"
    echo -e "${YELLOW}Install PostgreSQL client:${NC}"
    echo -e "  macOS: brew install postgresql"
    echo -e "  Ubuntu: sudo apt-get install postgresql-client"
    exit 1
fi

echo -e "${GREEN}✓${NC} psql installed: $(psql --version)"

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

# Test database connection
echo -e "${YELLOW}Testing database connection...${NC}"
if ! psql "$DB_URL" -c "SELECT 1;" &> /dev/null; then
    echo -e "${RED}❌ Failed to connect to database${NC}"
    echo -e "${YELLOW}Please check your connection string${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} Database connection successful"

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

# Check current database state
echo -e "${YELLOW}Current database state:${NC}"
CURRENT_TABLE=$(psql "$DB_URL" -tAc "SELECT table_name FROM information_schema.tables WHERE table_name IN ('users', 'iso_agents') AND table_schema = 'public';")

if [[ "$CURRENT_TABLE" == *"iso_agents"* ]]; then
    echo -e "  • Table: ${YELLOW}iso_agents${NC} (needs migration)"
elif [[ "$CURRENT_TABLE" == *"users"* ]]; then
    echo -e "  • Table: ${GREEN}users${NC} (already migrated!)"
    echo
    echo -e "${YELLOW}⚠️  WARNING: It appears migrations may already be applied!${NC}"
    read -p "$(echo -e ${YELLOW}Continue anyway? [y/N]: ${NC})" -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}Migration cancelled${NC}"
        exit 0
    fi
else
    echo -e "${RED}❌ Neither 'users' nor 'iso_agents' table found!${NC}"
    exit 1
fi

#############################################
# Confirmation Prompt
#############################################

echo
echo -e "${YELLOW}⚠️  WARNING: This will modify your database!${NC}"
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

    # Apply migration using psql
    if psql "$DB_URL" -f "$MIGRATIONS_DIR/$migration" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} $migration applied successfully"
    else
        echo -e "${RED}❌ Failed to apply $migration${NC}"

        # Show error details
        echo -e "${RED}Error details:${NC}"
        psql "$DB_URL" -f "$MIGRATIONS_DIR/$migration" 2>&1 | tail -n 10

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
                if psql "$DB_URL" -f "$MIGRATIONS_DIR/009_rollback_to_iso_agents.sql"; then
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
    USERS_EXISTS=$(psql "$DB_URL" -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public';")
    if [ "$USERS_EXISTS" = "1" ]; then
        echo -e "${GREEN}✓${NC} 'users' table exists"
    else
        echo -e "${RED}❌ 'users' table not found${NC}"
        FAILED=1
    fi

    # Check if iso_agents table is gone
    echo -e "${YELLOW}2. Checking if 'iso_agents' table is removed...${NC}"
    ISO_EXISTS=$(psql "$DB_URL" -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'iso_agents' AND table_schema = 'public';")
    if [ "$ISO_EXISTS" = "0" ]; then
        echo -e "${GREEN}✓${NC} 'iso_agents' table removed"
    else
        echo -e "${RED}❌ 'iso_agents' table still exists${NC}"
        FAILED=1
    fi

    # Check new columns exist
    echo -e "${YELLOW}3. Checking new columns...${NC}"
    NEW_COLS=$(psql "$DB_URL" -tAc "SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name IN ('avatar_url', 'phone', 'timezone', 'preferences', 'last_login_at') AND table_schema = 'public';" | wc -l | tr -d ' ')
    if [ "$NEW_COLS" = "5" ]; then
        echo -e "${GREEN}✓${NC} All 5 new columns exist"
    else
        echo -e "${RED}❌ Expected 5 new columns, found $NEW_COLS${NC}"
        FAILED=1
    fi

    # Check roles
    echo -e "${YELLOW}4. Checking user roles...${NC}"
    echo -e "   Current roles in database:"
    psql "$DB_URL" -c "SELECT role, COUNT(*) as count FROM users GROUP BY role ORDER BY role;" || FAILED=1

    # Check foreign keys
    echo -e "${YELLOW}5. Checking foreign keys updated...${NC}"
    FK_COUNT=$(psql "$DB_URL" -tAc "SELECT COUNT(*) FROM information_schema.columns WHERE column_name = 'user_id' AND table_name IN ('client_profiles', 'requests', 'quotes', 'workflow_states', 'agent_executions') AND table_schema = 'public';" | tr -d ' ')
    if [ "$FK_COUNT" = "5" ]; then
        echo -e "${GREEN}✓${NC} All 5 foreign keys updated to user_id"
    else
        echo -e "${RED}❌ Expected 5 user_id columns, found $FK_COUNT${NC}"
        FAILED=1
    fi

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
    echo -e "${RED}   ⚠️  Migration Completed with Errors${NC}"
fi
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}Summary:${NC}"
    echo -e "  ✓ iso_agents table renamed to users"
    echo -e "  ✓ 4 new user roles added (sales_rep, admin, customer, operator)"
    echo -e "  ✓ 5 new columns added (avatar_url, phone, timezone, preferences, last_login_at)"
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
    echo -e "${YELLOW}Please review the errors above and verify your database manually.${NC}"
    echo
    echo -e "${YELLOW}Rollback available if needed:${NC}"
    echo -e "  ./scripts/apply-migrations.sh --rollback"
fi

echo
