# 🚀 Run Migrations - Ready to Execute

Your automated migration scripts are ready! The database connection couldn't be established from this environment, but you can easily run it from your terminal.

---

## ⚡ Quick Start (5 Minutes)

### Method 1: Automated Script (Recommended)

```bash
# Navigate to project directory
cd /Volumes/SeagatePortableDrive/Projects/v0-jetvision-assistant

# Ensure you're on the feature branch
git checkout feat/apply-user-table-migrations

# Run the migration script
./scripts/apply-migrations.sh
```

The script will:
1. Prompt you for your database URL (or auto-detect from Supabase CLI)
2. Test the connection
3. Show you what will be migrated
4. Ask for confirmation
5. Apply all 4 migrations
6. Verify success
7. Show summary

---

### Method 2: Direct psql (Alternative)

If you prefer to run migrations directly:

```bash
# Set your database URL
export DB_URL="postgresql://postgres:YOUR_PASSWORD@sbzaevawnjlrsjsuevli.supabase.co:5432/postgres"

# Apply each migration
psql "$DB_URL" -f supabase/migrations/005_update_user_roles.sql
psql "$DB_URL" -f supabase/migrations/006_rename_iso_agents_to_users.sql
psql "$DB_URL" -f supabase/migrations/007_update_foreign_keys.sql
psql "$DB_URL" -f supabase/migrations/008_update_rls_for_users.sql

# Verify
psql "$DB_URL" -c "SELECT table_name FROM information_schema.tables WHERE table_name = 'users';"
```

---

### Method 3: Supabase Dashboard (Manual)

If you prefer the Dashboard method, use [APPLY_MIGRATIONS_NOW.md](APPLY_MIGRATIONS_NOW.md)

---

## 🔑 Get Your Database Password

From `.env.local`:
```
SUPABASE_DB_PASSWORD=91iSJglKzv2nIvHM
```

**Full Connection String:**
```
postgresql://postgres:91iSJglKzv2nIvHM@sbzaevawnjlrsjsuevli.supabase.co:5432/postgres
```

---

## 📋 Prerequisites

### Install PostgreSQL Client (if not installed)

**macOS:**
```bash
brew install postgresql
```

**Verify installation:**
```bash
psql --version
# Should show: psql (PostgreSQL) 14.x or higher
```

---

## ✅ What Gets Migrated

### Migration 005: Update User Roles ⏱️ 30 seconds
- Adds 4 new roles: `sales_rep`, `admin`, `customer`, `operator`
- Migrates existing `iso_agent` → `sales_rep`

### Migration 006: Rename Table ⏱️ 1 minute
- Renames: `iso_agents` → `users`
- Adds 5 columns: `avatar_url`, `phone`, `timezone`, `preferences`, `last_login_at`

### Migration 007: Update Foreign Keys ⏱️ 1 minute
- Updates: `iso_agent_id` → `user_id`
- 5 tables: `client_profiles`, `requests`, `quotes`, `workflow_states`, `agent_executions`

### Migration 008: Update RLS Policies ⏱️ 1 minute
- Updates Row Level Security policies for `users` table

**Total Time:** ~3-4 minutes

---

## 🛡️ Safety Features

The script includes:
- ✅ Pre-flight checks (psql installed, files exist)
- ✅ Connection test before starting
- ✅ Detects if already migrated
- ✅ Confirmation prompt
- ✅ Progress indicators
- ✅ Automatic rollback on failure
- ✅ Post-migration verification

---

## 🆘 Troubleshooting

### "psql not found"
```bash
brew install postgresql
```

### "Connection failed"
1. Check password is correct (from `.env.local`)
2. Try with quotes around URL:
   ```bash
   psql "postgresql://postgres:91iSJglKzv2nIvHM@sbzaevawnjlrsjsuevli.supabase.co:5432/postgres" -c "SELECT 1;"
   ```
3. Ensure IP is whitelisted in Supabase:
   - Dashboard → Settings → Database → Network Restrictions
   - Add your IP or allow all (0.0.0.0/0) temporarily

### "Already migrated" warning
The script detected `users` table already exists. You can:
- Skip migration (already done!)
- Continue anyway if you want to re-apply
- Check database state manually:
  ```bash
  psql "$DB_URL" -c "SELECT table_name FROM information_schema.tables WHERE table_name IN ('users', 'iso_agents');"
  ```

### Migration fails mid-way
The script will ask what to do:
1. **Continue** - Try next migration (risky)
2. **Rollback** - Automatic revert (safe)
3. **Abort** - Stop and check manually

---

## ✅ Verification Queries

After migration, verify success:

```sql
-- 1. Check table exists
SELECT table_name
FROM information_schema.tables
WHERE table_name = 'users' AND table_schema = 'public';
-- Expected: users

-- 2. Check iso_agents is gone
SELECT table_name
FROM information_schema.tables
WHERE table_name = 'iso_agents' AND table_schema = 'public';
-- Expected: (no rows)

-- 3. Check roles
SELECT DISTINCT role FROM users ORDER BY role;
-- Expected: admin, customer, operator, sales_rep

-- 4. Check new columns
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name IN ('avatar_url', 'phone', 'timezone', 'preferences', 'last_login_at')
ORDER BY column_name;
-- Expected: 5 rows

-- 5. Check foreign keys updated
SELECT table_name, column_name
FROM information_schema.columns
WHERE column_name = 'user_id'
AND table_name IN ('client_profiles', 'requests', 'quotes', 'workflow_states', 'agent_executions')
ORDER BY table_name;
-- Expected: 5 rows
```

---

## 🎉 After Migration

1. **Update Linear Issues**
   ```bash
   # Mark as Done:
   # - ONEK-49 (Rename iso_agents to users)
   # - ONEK-50 (Add user roles)
   # - ONEK-51 (Update foreign keys)
   ```

2. **Test Authentication**
   ```bash
   npm run dev
   # Test login with different user roles
   ```

3. **Deploy Changes**
   ```bash
   # Merge to main and deploy
   git checkout main
   git merge feat/apply-user-table-migrations
   git push
   ```

---

## 📁 Migration Files Location

All files are in the `feat/apply-user-table-migrations` branch:

- **Scripts:**
  - `scripts/apply-migrations.sh` - Automated PostgreSQL script
  - `scripts/migrate-user-table.sh` - Supabase CLI alternative

- **SQL Migrations:**
  - `supabase/migrations/005_update_user_roles.sql`
  - `supabase/migrations/006_rename_iso_agents_to_users.sql`
  - `supabase/migrations/007_update_foreign_keys.sql`
  - `supabase/migrations/008_update_rls_for_users.sql`
  - `supabase/migrations/009_rollback_to_iso_agents.sql` (emergency only)

- **Documentation:**
  - `MIGRATE_NOW.md` - Quick start guide
  - `APPLY_MIGRATIONS_NOW.md` - Manual Dashboard method
  - `docs/database/MIGRATION_EXECUTION_GUIDE.md` - Detailed walkthrough

---

## 🔥 Ready to Execute?

**Recommended command:**
```bash
cd /Volumes/SeagatePortableDrive/Projects/v0-jetvision-assistant
git checkout feat/apply-user-table-migrations
./scripts/apply-migrations.sh
```

The script will guide you through everything step-by-step!

---

**Questions?** Check the comprehensive guide: [docs/database/APPLY_USER_MIGRATIONS.md](docs/database/APPLY_USER_MIGRATIONS.md)

**Prefer manual?** Use the Dashboard method: [APPLY_MIGRATIONS_NOW.md](APPLY_MIGRATIONS_NOW.md)
